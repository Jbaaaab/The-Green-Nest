import { Box3, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import type { Updatable, Viewport } from './stage';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const Z = new Vector3(0, 0, 1);
const X = new Vector3(1, 0, 0);

/**
 * La bague : mouvement de disque d'Euler (précession de l'axe d'inclinaison autour
 * de l'axe de vue) + lent déplacement en Lissajous autour du centre.
 *
 * Hiérarchie : root (position) → wobble (orientation) → model (recentré, normalisé, face caméra).
 */
export class Ring implements Updatable {
  readonly root = new Group();
  private wobble = new Group();
  private viewport!: Viewport;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private phi = 0; // angle de précession
  private psi = 0; // rotation propre (roulement)

  private qa = new Quaternion();
  private qb = new Quaternion();
  private qc = new Quaternion();

  private constructor(model: Object3D) {
    this.root.add(this.wobble);
    this.wobble.add(model);
  }

  static async load(): Promise<Ring> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(config.ring.url);
    return new Ring(normalize(gltf.scene));
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    const d = vp.mobile ? config.ring.diameter.mobile : config.ring.diameter.desktop;
    this.root.scale.setScalar(d * vp.unit);
  }

  update(time: number, delta: number): void {
    const cfg = config.ring;
    const reduced = this.reduced.matches;
    const period = reduced ? cfg.reducedMotion.precessionPeriod : cfg.precessionPeriod;

    // Inclinaison de la normale par rapport à l'axe de vue (90° - angle plan/verticale), avec souffle.
    const tilt = cfg.tiltDeg + (reduced ? 0 : cfg.breathDeg * Math.sin((TAU * time) / cfg.breathPeriod));
    const beta = (90 - tilt) * DEG;

    // Précession à vitesse constante ; la rotation propre suit le roulement sans glissement.
    const dPhi = (TAU * delta) / period;
    this.phi += dPhi;
    this.psi += dPhi * (-1 + cfg.rollFactor * (1 - Math.cos(beta)));

    // q = Rz(phi) · Rx(beta) · Rz(psi)
    this.qa.setFromAxisAngle(Z, this.phi);
    this.qb.setFromAxisAngle(X, beta);
    this.qc.setFromAxisAngle(Z, this.psi);
    this.wobble.quaternion.copy(this.qa).multiply(this.qb).multiply(this.qc);

    // Déplacement lent (désactivé en reduced motion).
    if (!reduced) {
      const { width, height } = this.viewport;
      const { amplitudeX, amplitudeY, periodX, periodY } = cfg.drift;
      this.root.position.set(
        amplitudeX * width * Math.sin((TAU * time) / periodX),
        amplitudeY * height * Math.sin((TAU * time) / periodY),
        0,
      );
    } else {
      this.root.position.set(0, 0, 0);
    }
  }
}

// Recentre le modèle sur son centre géométrique, ramène son diamètre à 1
// et le tourne pour que sa face regarde la caméra (le GLB est posé à plat, normale = +Y).
function normalize(scene: Object3D): Object3D {
  const holder = new Group();
  holder.add(scene);
  holder.rotation.x = Math.PI / 2;
  holder.updateMatrixWorld(true);

  const box = new Box3().setFromObject(holder);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const diameter = Math.max(size.x, size.y);

  const wrapper = new Group();
  holder.position.sub(center);
  wrapper.add(holder);
  wrapper.scale.setScalar(1 / diameter);

  scene.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
      o.material.envMapIntensity = config.ring.material.envIntensity;
    }
  });

  return wrapper;
}
