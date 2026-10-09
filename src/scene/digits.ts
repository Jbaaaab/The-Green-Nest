import {
  AlwaysStencilFunc,
  Box3,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  NotEqualStencilFunc,
  PlaneGeometry,
  ReplaceStencilOp,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import { nav } from '../nav';
import { PROJECTS } from '../works/projects';
import { buildMatcap } from './environment';
import { steppedFrame, type Stage, type Updatable, type Viewport } from './stage';

const TAU = Math.PI * 2;
const MAX_OCCLUDERS = 6;

/**
 * Le numéro de la page courante, entouré, en 3D (GLB digit/n), à la place du numéro dans la rangée 1-8.
 * Façon écran de chargement PS3 : chrome vert-bleu, rotation continue et régulière sur lui-même,
 * léger flottement ; les reflets glissent en tournant. Changement de page : petit « pop ».
 *
 * Comme la rangée, il est derrière les vidéos des pages : il est dessiné dans la couche overlay du
 * canvas (au premier plan), mais masqué (stencil) là où une fenêtre de la page le recouvre.
 */
export class Digits3D implements Updatable {
  private root = new Group();
  private spinner = new Group();
  private occluders: Mesh[] = [];
  private viewport: Viewport;
  private current = 0;
  private pop = 1;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private constructor(stage: Stage, private digits: Map<number, Group>) {
    this.viewport = stage.viewport;
    for (const d of digits.values()) {
      d.visible = false;
      this.spinner.add(d);
    }
    this.root.add(this.spinner);
    this.root.visible = false;
    stage.overlay.add(this.root);

    // Rectangles invisibles qui marquent le stencil là où les fenêtres de la page passent devant.
    const plane = new PlaneGeometry(1, 1);
    const mask = new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: AlwaysStencilFunc,
      stencilZPass: ReplaceStencilOp,
    });
    for (let i = 0; i < MAX_OCCLUDERS; i++) {
      const m = new Mesh(plane, mask);
      m.renderOrder = -1; // avant le chiffre
      m.visible = false;
      m.frustumCulled = false;
      this.occluders.push(m);
      stage.overlay.add(m);
    }
    document.documentElement.classList.add('has-3d-digits');
  }

  static async load(stage: Stage, numbers: number[]): Promise<Digits3D> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const entries = await Promise.all(
      numbers.map(async (n) => {
        const gltf = await loader.loadAsync(`/digits/${n}.glb`);
        return [n, normalize(gltf.scene)] as const;
      }),
    );
    return new Digits3D(stage, new Map(entries));
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
  }

  update(time: number, delta: number): void {
    // Numéro du projet affiché (il peut sauter : Social Media est le 7).
    const number = PROJECTS.find((p) => p.section === nav.section)?.number ?? 0;
    if (number !== this.current) {
      const prev = this.digits.get(this.current);
      if (prev) prev.visible = false;
      this.current = number;
      const next = this.digits.get(number);
      if (next) next.visible = true;
      this.pop = 0.4;
    }
    this.pop += (1 - this.pop) * (1 - Math.exp(-10 * delta));

    const slot = document.querySelector<HTMLElement>('.works-nav__item.is-current');
    // Apparaît et s'efface avec la rangée 1-8 (opacité réglée par worksView.ts).
    const show = slot ? parseFloat(slot.parentElement!.style.opacity || '0') : 0;
    const brands = document.documentElement.classList.contains('is-brands'); // popup « Brands » ouverte
    if (!slot || !this.digits.has(number) || show < 0.01 || brands) {
      this.root.visible = false;
      for (const m of this.occluders) m.visible = false;
      return;
    }

    // Même position et taille que le cercle du numéro dans la rangée.
    const r = slot.getBoundingClientRect();
    const { width, height } = this.viewport;
    const size = r.width * show * this.pop;
    const bob = this.reduced.matches ? 0 : Math.sin(time * 1.7) * config.works.digitBob * r.width;
    this.root.visible = true;
    this.root.position.set(r.left + r.width / 2 - width / 2, height / 2 - (r.top + r.height / 2) + bob, 0);
    this.root.scale.setScalar(size);
    this.mask(r.left - r.width, r.top - r.height, r.right + r.width, r.bottom + r.height);

    // Rotation continue et régulière, légère inclinaison qui respire ; « on twos » (voir config.stepped).
    if (!this.reduced.matches) {
      if (!steppedFrame()) return;
      this.spinner.rotation.y = (time / config.works.digitSpinPeriod) * TAU;
      this.spinner.rotation.x = Math.sin(time * 0.9) * 0.18;
    } else {
      this.spinner.rotation.set(0, 0, 0);
    }
  }

  // Place un masque sur chaque fenêtre de page (vidéo, carré) qui recouvre la zone du chiffre.
  private mask(x0: number, y0: number, x1: number, y1: number): void {
    const { width, height } = this.viewport;
    let n = 0;
    for (const el of document.querySelectorAll<HTMLElement>('.project__main, .project__side, .strip__tile.is-top')) {
      if (n >= MAX_OCCLUDERS) break;
      if (el.hidden || el.style.visibility === 'hidden' || !el.offsetParent) continue;
      const b = el.getBoundingClientRect();
      if (b.right <= x0 || b.left >= x1 || b.bottom <= y0 || b.top >= y1) continue;
      const m = this.occluders[n++];
      m.visible = true;
      m.position.set(b.left + b.width / 2 - width / 2, height / 2 - (b.top + b.height / 2), 0);
      m.scale.set(b.width, b.height, 1);
    }
    for (let i = n; i < MAX_OCCLUDERS; i++) this.occluders[i].visible = false;
  }
}

// Chiffre redressé face caméra (GLB posé à plat, normale = +Y), centré, cercle ramené à 1 de diamètre.
// Dessiné seulement hors des masques (stencil ≠ 1).
function normalize(scene: Group): Group {
  scene.traverse((o) => {
    if (o instanceof Mesh)
      o.material = new MeshMatcapMaterial({
        matcap: buildMatcap(config.works.digitAmbience),
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: NotEqualStencilFunc,
      });
  });
  const holder = new Group();
  holder.add(scene);
  holder.rotation.x = Math.PI / 2;
  holder.updateMatrixWorld(true);
  const box = new Box3().setFromObject(holder);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  holder.position.sub(center);
  const digit = new Group();
  digit.add(holder);
  digit.scale.setScalar(1 / Math.max(size.x, size.y));
  return digit;
}
