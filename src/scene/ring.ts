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
 * La bague roule comme une pièce sur une table vue de dessus (l'écran = la table) :
 * - précession : l'axe d'inclinaison tourne autour de l'axe de vue (disque d'Euler) ;
 * - le centre décrit un cercle autour du centre de l'écran, en phase avec la précession
 *   (le point de contact, le bord le plus « bas », est toujours vers l'extérieur) ;
 * - rotation propre par roulement sans glissement le long de ce cercle.
 *
 * Hiérarchie : root (position) → wobble (orientation) → model (recentré, normalisé, face caméra).
 */
export class Ring implements Updatable {
  readonly root = new Group();
  private wobble = new Group();
  private viewport!: Viewport;
  private radius = 1; // rayon de la bague à l'écran, en px
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private phi = 0; // angle de précession (direction du point de contact)
  private psi = 0; // rotation propre

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
    this.radius = (d * vp.unit) / 2;
    this.root.scale.setScalar(d * vp.unit);
  }

  update(time: number, delta: number): void {
    const cfg = config.ring;
    const reduced = this.reduced.matches;

    // alpha : angle entre la bague et la « table » (l'écran), avec un léger souffle.
    const tilt = cfg.tiltDeg + (reduced ? 0 : cfg.breathDeg * Math.sin((TAU * time) / cfg.breathPeriod));
    const alpha = (90 - tilt) * DEG;
    const alpha0 = (90 - cfg.tiltDeg) * DEG;

    // Précession. Disque d'Euler : la vitesse varie comme 1/√sin(alpha) (plus à plat = plus vite).
    const period = reduced ? cfg.reducedMotion.precessionPeriod : cfg.precessionPeriod;
    const omega = (TAU / period) * Math.sqrt(Math.sin(alpha0) / Math.sin(alpha));
    const dPhi = omega * delta;
    this.phi += dPhi;

    // Rayon du cercle décrit par le centre, qui respire lentement (cercles concentriques).
    const { radiusMin, radiusMax, period: orbitPeriod } = cfg.orbit;
    const wave = 0.5 - 0.5 * Math.cos((TAU * time) / orbitPeriod);
    const rho = reduced ? 0 : (radiusMin + (radiusMax - radiusMin) * wave) * this.viewport.unit;

    // Roulement sans glissement : le point de contact parcourt un cercle de rayon rho + r·cos(alpha),
    // la bague tourne sur elle-même d'autant. Rotation visible = phi' + psi'.
    const r = this.radius;
    const spin = cfg.rollFactor * dPhi * (1 - (rho + r * Math.cos(alpha)) / r);
    this.psi += spin - dPhi;

    // q = Rz(phi) · Rx(alpha) · Rz(psi) : le bord le plus bas pointe vers (sin phi, -cos phi).
    this.qa.setFromAxisAngle(Z, this.phi);
    this.qb.setFromAxisAngle(X, alpha);
    this.qc.setFromAxisAngle(Z, this.psi);
    this.wobble.quaternion.copy(this.qa).multiply(this.qb).multiply(this.qc);

    // La bague penche vers l'intérieur du cercle : son centre est sur le même rayon que le point
    // de contact, plus près du centre de l'écran. Il tourne donc en phase avec la précession.
    this.root.position.set(rho * Math.sin(this.phi), -rho * Math.cos(this.phi), 0);
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
