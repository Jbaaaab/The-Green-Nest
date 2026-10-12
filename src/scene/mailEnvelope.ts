import { ExtrudeGeometry, Group, Mesh, MeshMatcapMaterial, Shape } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import { MAIL_SCENE_BACK, MAIL_TOAST_MS, mailFreeze } from '../ui/mailToast';
import { buildMatcap } from './environment';
import { steppedFrame, type Stage, type Updatable, type Viewport } from './stage';

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

/**
 * Enveloppe 3D du « MAIL COPIED » (demande du DA) : façon écran de chargement PS3, comme les chiffres de la
 * rangée (chrome, rotation continue sur elle-même, léger flottement), pile au centre de l'écran après la copie
 * de l'adresse. Dans la couche overlay du canvas (toujours devant), au-dessus du voile sombre et flou et de son
 * halo (src/ui/mailToast.ts) ; au clic, le reste de la scène est figé sous le voile (Stage.snapshot). Elle repart
 * avant le voile, quand la scène revient (MAIL_SCENE_BACK). Rotations « on twos ».
 */
export class MailEnvelope implements Updatable {
  private root = new Group();
  private spinner = new Group();
  private start = -1;
  private pending = false;
  private viewport: Viewport;
  private stage: Stage;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(stage: Stage) {
    this.stage = stage;
    this.viewport = stage.viewport;
    const material = new MeshMatcapMaterial({ matcap: buildMatcap(config.works.digitAmbience) });
    // Le corps : un rectangle aux bords arrondis (1,5 × 1, à plat).
    const body = new Mesh(new RoundedBoxGeometry(1.5, 1, 0.12, 4, 0.05), material);
    // Le rabat (un triangle en relief) et les deux plis du bas, sur la face avant.
    const relief = (points: [number, number][], depth = 0.05) => {
      const shape = new Shape();
      points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      const mesh = new Mesh(
        new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }),
        material,
      );
      mesh.position.z = 0.05;
      return mesh;
    };
    const flap = relief([
      [-0.68, 0.46],
      [0.68, 0.46],
      [0, -0.06],
    ]);
    const fold = (dir: number) =>
      relief(
        [
          [dir * 0.7, -0.46],
          [dir * 0.7, -0.38],
          [dir * 0.12, 0.02],
          [dir * 0.06, -0.04],
        ],
        0.03,
      );
    this.spinner.add(body, flap, fold(-1), fold(1));
    this.root.add(this.spinner);
    this.root.visible = false;
    stage.overlay.add(this.root);
    // mailToast.ts écoute avant (il crée le voile et .mail-freeze) : la scène y est figée au prochain rendu.
    window.addEventListener('mail:copied', () => {
      this.pending = true;
      const freeze = mailFreeze();
      if (freeze) this.stage.snapshot(freeze);
    });
    document.documentElement.classList.add('has-mail-3d'); // l'enveloppe SVG de secours n'est plus utile
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
  }

  update(time: number): void {
    if (this.pending) {
      this.pending = false;
      this.start = time;
    }
    const t = this.start < 0 ? -1 : time - this.start;
    const d = (MAIL_TOAST_MS / 1000) * MAIL_SCENE_BACK; // elle repart quand la scène revient sous le voile
    if (t < 0 || t > d) {
      this.start = -1;
      this.root.visible = false;
      return;
    }
    // Arrive en rebondissant, repart en rétrécissant.
    const s = easeOutBack(clamp01(t / 0.2)) * (1 - Math.pow(clamp01((t - d + 0.22) / 0.22), 2));
    const u = this.viewport.unit;
    this.root.visible = true;
    this.root.scale.setScalar(config.mail.size * u * s);
    this.root.position.set(0, config.mail.lift * u, 0); // pile au centre (le texte est dessous)
    if (this.reduced.matches) {
      this.spinner.rotation.set(0, 0, 0);
    } else if (steppedFrame()) {
      this.spinner.rotation.y = (t / config.mail.spinPeriod) * TAU;
      this.spinner.rotation.x = Math.sin(t * 5) * 0.18;
    }
  }
}
