import { Box3, Color, Group, Mesh, MeshMatcapMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import { nav } from '../nav';
import { studioMatcap } from './environment';
import type { Stage, Updatable, Viewport } from './stage';

const TAU = Math.PI * 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Le numéro de la page courante, entouré, en 3D (GLB digit/n). Il prend la place du numéro
 * dans la rangée 1-8 et fait un tour sur lui-même chaque fois que sa page arrive.
 */
export class Digits3D implements Updatable {
  private root = new Group();
  private spinner = new Group();
  private viewport: Viewport;
  private current = 0;
  private spinStart = -Infinity;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private constructor(stage: Stage, private digits: Map<number, Group>) {
    this.viewport = stage.viewport;
    for (const d of digits.values()) {
      d.visible = false;
      this.spinner.add(d);
    }
    this.root.add(this.spinner);
    this.root.visible = false;
    stage.scene.add(this.root);
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

  update(time: number): void {
    const section = Math.round(nav.p);
    if (section !== this.current) {
      const prev = this.digits.get(this.current);
      if (prev) prev.visible = false;
      this.current = section;
      const next = this.digits.get(section);
      if (next) next.visible = true;
      this.spinStart = time;
    }

    const slot = document.querySelector('.works-nav__item.is-current');
    const show = smooth(0.35, 0.85, nav.p);
    if (!slot || !this.digits.has(section) || show < 0.01) {
      this.root.visible = false;
      return;
    }

    // Même position et taille que le cercle du numéro dans la rangée.
    const r = slot.getBoundingClientRect();
    const { width, height } = this.viewport;
    this.root.visible = true;
    this.root.position.set(r.left + r.width / 2 - width / 2, height / 2 - (r.top + r.height / 2), 0);
    this.root.scale.setScalar(r.width * show);

    // Un tour sur lui-même (axe vertical) qui ralentit jusqu'à s'arrêter de face.
    const { digitSpinSeconds, digitSpinTurns } = config.works;
    const t = this.reduced.matches ? 1 : Math.min(1, (time - this.spinStart) / digitSpinSeconds);
    this.spinner.rotation.y = digitSpinTurns * TAU * (1 - easeOutCubic(t));
  }
}

// Chiffre redressé face caméra (GLB posé à plat, normale = +Y), centré, cercle ramené à 1 de diamètre.
function normalize(scene: Group): Group {
  scene.traverse((o) => {
    if (o instanceof Mesh) o.material = new MeshMatcapMaterial({ color: new Color(0x1a1a1a), matcap: studioMatcap() });
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
