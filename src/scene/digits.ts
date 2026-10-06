import { Box3, Group, Mesh, MeshMatcapMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import { nav } from '../nav';
import { ps3Matcap } from './environment';
import type { Stage, Updatable, Viewport } from './stage';

const TAU = Math.PI * 2;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Le numéro de la page courante, entouré, en 3D (GLB digit/n), à la place du numéro dans la rangée 1-8.
 * Façon écran de chargement PS3 : chrome froid, rotation continue et régulière sur lui-même,
 * léger flottement ; les reflets glissent en tournant. Changement de page : petit « pop ».
 */
export class Digits3D implements Updatable {
  private root = new Group();
  private spinner = new Group();
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
    const section = nav.section;
    if (section !== this.current) {
      const prev = this.digits.get(this.current);
      if (prev) prev.visible = false;
      this.current = section;
      const next = this.digits.get(section);
      if (next) next.visible = true;
      this.pop = 0.4;
    }
    this.pop += (1 - this.pop) * (1 - Math.exp(-10 * delta));

    const slot = document.querySelector('.works-nav__item.is-current');
    const show = smooth(0.45, 0.85, nav.scroll / nav.sectionHeight);
    if (!slot || !this.digits.has(section) || show < 0.01) {
      this.root.visible = false;
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

    // Rotation continue et régulière (pas d'à-coups), légère inclinaison qui respire.
    if (!this.reduced.matches) {
      this.spinner.rotation.y = (time / config.works.digitSpinPeriod) * TAU;
      this.spinner.rotation.x = Math.sin(time * 0.9) * 0.18;
    } else {
      this.spinner.rotation.set(0, 0, 0);
    }
  }
}

// Chiffre redressé face caméra (GLB posé à plat, normale = +Y), centré, cercle ramené à 1 de diamètre.
function normalize(scene: Group): Group {
  scene.traverse((o) => {
    if (o instanceof Mesh) o.material = new MeshMatcapMaterial({ matcap: ps3Matcap() });
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
