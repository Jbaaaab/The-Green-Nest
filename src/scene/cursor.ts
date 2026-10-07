import { Box3, Group, Mesh, MeshMatcapMaterial, Vector2, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import { buildMatcap } from './environment';
import type { Stage, Updatable, Viewport } from './stage';

export const CURSORS = ['click', 'great', 'iluvyou', 'iwannahire', 'super', 'wow'] as const;
export type CursorName = (typeof CURSORS)[number];

const CLICKABLE = 'a, button, [role="button"], label, select, summary';
const TAU = Math.PI * 2;

/**
 * Curseur 3D : un mot en 3D suit la souris (lissé) en tournant sur lui-même.
 * Rendu dans la couche overlay du canvas principal : pas de second contexte WebGL,
 * et la boucle de rendu tourne déjà pour la bague.
 *
 * - au repos : le curseur choisi (WOW! au chargement), changé par l'icône du header ;
 * - au survol d'un élément cliquable : CLICK!.
 */
export class Cursor3D implements Updatable {
  private root = new Group(); // position
  private spinner = new Group(); // rotation sur lui-même
  private words = new Map<CursorName, Group>();
  private viewport: Viewport;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private rest: CursorName = config.cursor.default;
  private hovering = false;
  private suppressed: Element | null = null; // élément dont on ignore le survol (juste après un changement)
  private current: CursorName | null = null;

  private target = new Vector2();
  private pos = new Vector2();
  private hasPointer = false;
  private visible = 0; // 0 → 1, apparition / disparition
  private pop = 1; // petit rebond quand le mot change
  private angle = 0;

  private constructor(stage: Stage, words: Map<CursorName, Group>) {
    this.viewport = stage.viewport;
    this.words = words;
    for (const w of words.values()) {
      w.visible = false;
      this.spinner.add(w);
    }
    this.root.add(this.spinner);
    this.root.visible = false;
    stage.overlay.add(this.root);
    this.listen();
    document.documentElement.classList.add('has-3d-cursor');
  }

  static async load(stage: Stage): Promise<Cursor3D> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const entries = await Promise.all(
      CURSORS.map(async (name) => {
        const gltf = await loader.loadAsync(`${config.cursor.dir}/${name}.glb`);
        return [name, normalize(gltf.scene)] as const;
      }),
    );
    return new Cursor3D(stage, new Map(entries));
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
  }

  update(_time: number, delta: number): void {
    const cfg = config.cursor;

    // Mot affiché : CLICK! au survol d'un élément cliquable, sinon le curseur de repos.
    const wanted: CursorName = this.hovering ? cfg.hover : this.rest;
    if (wanted !== this.current) {
      if (this.current) this.words.get(this.current)!.visible = false;
      this.words.get(wanted)!.visible = true;
      this.current = wanted;
      this.pop = 0.35;
    }

    // Suivi lissé (lerp indépendant du nombre d'images par seconde).
    const follow = 1 - Math.exp(-cfg.follow * delta);
    this.pos.lerp(this.target, follow);
    this.pop += (1 - this.pop) * (1 - Math.exp(-cfg.popSpeed * delta));
    this.visible += ((this.hasPointer ? 1 : 0) - this.visible) * (1 - Math.exp(-cfg.fadeSpeed * delta));

    if (!this.reduced.matches) this.angle += (TAU * delta) / cfg.spinPeriod;
    this.spinner.rotation.y = this.angle;

    const { width, height, unit } = this.viewport;
    this.root.position.set(this.pos.x - width / 2 + cfg.offset.x * unit, height / 2 - this.pos.y - cfg.offset.y * unit, 0);
    this.root.scale.setScalar(cfg.height * unit * this.pop * this.visible);
    this.root.visible = this.visible > 0.01;
  }

  private listen(): void {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.target.set(e.clientX, e.clientY);
      if (!this.hasPointer) this.pos.copy(this.target); // pas de glissade depuis le coin à la 1re apparition
      this.hasPointer = true;
    });
    document.documentElement.addEventListener('pointerleave', () => (this.hasPointer = false));
    window.addEventListener('blur', () => (this.hasPointer = false));

    document.addEventListener('pointerover', (e) => {
      const el = (e.target as Element).closest?.(CLICKABLE) ?? null;
      this.hovering = !!el && el !== this.suppressed;
    });
    document.addEventListener('pointerout', (e) => {
      const to = (e.relatedTarget as Element | null)?.closest?.(CLICKABLE) ?? null;
      const from = (e.target as Element).closest?.(CLICKABLE) ?? null;
      if (from && from === this.suppressed && to !== from) this.suppressed = null;
      if (!to) this.hovering = false;
    });

    // L'icône du header passe au curseur suivant, affiché tout de suite même si on la survole encore.
    window.addEventListener('cursor:next', () => {
      const i = CURSORS.indexOf(this.rest);
      this.rest = CURSORS[(i + 1) % CURSORS.length];
      this.suppressed = document.querySelector('.cursor-btn');
      this.hovering = false;
    });
  }
}

// Mot redressé face caméra (le GLB est posé à plat, normale = +Y), centré,
// hauteur des lettres ramenée à 1, chrome vert-bleu intense (config.cursor.ambience).
function normalize(scene: Group): Group {
  scene.traverse((o) => {
    if (o instanceof Mesh) o.material = new MeshMatcapMaterial({ matcap: buildMatcap(config.cursor.ambience) });
  });
  const holder = new Group();
  holder.add(scene);
  holder.rotation.x = Math.PI / 2;
  holder.updateMatrixWorld(true);

  const box = new Box3().setFromObject(holder);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  holder.position.sub(center);

  const word = new Group();
  word.add(holder);
  word.scale.setScalar(1 / size.y);
  return word;
}
