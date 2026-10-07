import { Box3, BufferAttribute, DoubleSide, Group, Mesh, MeshMatcapMaterial, Quaternion, Vector2, Vector3, type BufferGeometry, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { config } from '../config';
import { nav } from '../nav';
import { drum } from '../works/scrollFx';
import { asperityNormalMap } from './environment';
import { ringMatcap } from './ringMatcap';
import { createFractalNoise1D } from './noise';
import type { Updatable, Viewport } from './stage';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const Z = new Vector3(0, 0, 1);
const X = new Vector3(1, 0, 0);

/**
 * La bague roule comme une pièce sur une table légèrement creuse, vue de dessus (l'écran = la table) :
 * - précession : l'axe d'inclinaison tourne autour de l'axe de vue (disque d'Euler), plus vite quand elle s'aplatit ;
 * - roulement : le centre avance perpendiculairement au point de contact (le bord le plus « bas »),
 *   sur une courbe dont le rayon varie au hasard → des boucles imprévisibles plutôt qu'un cercle parfait ;
 * - le creux de la table la ramène doucement vers sa position de repos (config.ring.center) ;
 * - rotation propre par roulement sans glissement.
 *
 * Hiérarchie : root (position) → wobble (orientation) → model (recentré, normalisé, face caméra).
 */
export class Ring implements Updatable {
  readonly root = new Group();
  private wobble = new Group();
  private viewport!: Viewport;
  private radius = 1; // rayon de la bague à l'écran, en px
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  private phi = Math.random() * TAU; // angle de précession (direction du point de contact)
  private psi = 0; // rotation propre
  private pos = new Vector2(); // position du centre, en px depuis le centre de l'écran
  private started = false;

  private tiltNoise = createFractalNoise1D();
  private curveNoise = createFractalNoise1D();

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
    const unit = this.viewport.unit;

    // alpha : angle entre la bague et la « table » (l'écran). Le souffle varie au hasard.
    const breath = reduced ? 0 : cfg.breathDeg * this.tiltNoise(time / cfg.breathPeriod);
    const alpha = (90 - (cfg.tiltDeg + breath)) * DEG;
    const alpha0 = (90 - cfg.tiltDeg) * DEG;

    // Rayon de courbure de la trajectoire, qui change au hasard (réduit sur mobile).
    const { radiusMin, radiusMax, changeEvery, pull, maxOffset, bigLoopSlowdown, mobileScale } = cfg.orbit;
    const scale = unit * (this.viewport.mobile ? mobileScale : 1);
    const wave = 0.5 + 0.5 * this.curveNoise(time / changeEvery);
    const rho = reduced ? 0 : (radiusMin + (radiusMax - radiusMin) * wave) * scale;

    // Précession. Disque d'Euler : la vitesse varie comme 1/√sin(alpha) (plus à plat = plus vite).
    // Pièce qui roule : sur une grande boucle elle tourne moins vite (~ 1/√rayon).
    const period = reduced ? cfg.reducedMotion.precessionPeriod : cfg.precessionPeriod;
    const omega =
      ((TAU / period) * Math.sqrt(Math.sin(alpha0) / Math.sin(alpha))) / Math.sqrt(1 + rho / (bigLoopSlowdown * scale));
    const dPhi = omega * delta;
    this.phi += dPhi;

    // Point de contact dans la direction u = (sin phi, -cos phi). En roulant, le centre avance
    // perpendiculairement, à la vitesse rho·omega : il décrit une courbe de rayon rho.
    if (!this.started) {
      this.pos.set(rho * Math.sin(this.phi), -rho * Math.cos(this.phi)); // premier tour autour du centre
      this.started = true;
    }
    const speed = rho * omega;
    this.pos.x += Math.cos(this.phi) * speed * delta;
    this.pos.y += Math.sin(this.phi) * speed * delta;

    // Table légèrement creuse : rappel vers le centre, qui se renforce au-delà de maxOffset.
    const far = this.pos.length() / (maxOffset * scale);
    const k = reduced ? 4 : pull * (1 + far * far);
    this.pos.multiplyScalar(Math.exp(-k * delta));

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

    // Creux de la table : position de repos de la maquette (px de maquette, y vers le bas).
    const [cx, cy] = this.viewport.mobile ? cfg.center.mobile : cfg.center.desktop;

    // Quand on scrolle, la bague monte avec l'accueil (parallaxe) et se courbe avec le twist de la page.
    const y = this.pos.y - cy * unit + nav.scroll * config.works.parallax.ring; // 3D : y vers le haut
    const fx = reduced ? { rotX: 0, z: 0 } : drum(-y, this.viewport.height, nav.velocity);
    this.root.position.set(this.pos.x + cx * unit, y, fx.z);
    this.root.rotation.x = -fx.rotX; // rotateX CSS et rotation.x Three.js sont de sens opposés
    this.root.visible = y - this.radius < this.viewport.height / 2 + 50;
  }
}

// Matériau calibré sur la maquette, recentrage sur le centre géométrique, diamètre ramené à 1,
// face tournée vers la caméra (le GLB est posé à plat, normale = +Y).
function normalize(scene: Object3D): Object3D {
  const a = config.ring.look.asperity;
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const material = new MeshMatcapMaterial({ matcap: ringMatcap(), side: DoubleSide });
    if (a > 0) {
      // UV par projection plane (le GLB n'en a pas) pour poser le micro-relief des aspérités.
      const geo = o.geometry as BufferGeometry;
      const pos = geo.getAttribute('position');
      const uv = new Float32Array(pos.count * 2);
      const rep = config.ring.look.asperityRepeat;
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) * 0.5 + 0.5) * rep;
        uv[i * 2 + 1] = (pos.getZ(i) * 0.5 + 0.5) * rep;
      }
      geo.setAttribute('uv', new BufferAttribute(uv, 2));
      material.normalMap = asperityNormalMap(128);
      material.normalScale = new Vector2(a, a);
    }
    o.material = material;
  });

  const holder = new Group();
  holder.add(scene);
  holder.rotation.x = Math.PI / 2;
  holder.updateMatrixWorld(true);

  const box = new Box3().setFromObject(holder);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());

  const wrapper = new Group();
  holder.position.sub(center);
  wrapper.add(holder);
  wrapper.scale.setScalar(1 / Math.max(size.x, size.y));
  return wrapper;
}
