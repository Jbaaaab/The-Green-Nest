import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshMatcapMaterial,
  Quaternion,
  Vector3,
  type Texture,
} from 'three';
import { config } from '../config';
import { FOOTER_SECTION, footerState } from '../footer/footerView';
import { nav } from '../nav';
import { heapTop } from './darumaMountain';
import { buildLacquerMatcap } from './environment';
import { steppedFrame, type Stage, type Updatable, type Viewport } from './stage';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const RINGS = 90; // anneaux d'une tige sur sa longueur
const RADIAL = 7; // côtés d'une tige
const MAX_LEAVES = 160;
const MAX_PETALS = 640;
const MAX_HEARTS = 80;
// Couronnes de pétales : [nombre, ouverture fermée → ouverte (degrés depuis l'axe), longueur (× diamètre), décalage].
const FLOWER_RINGS: [number, [number, number], number, number][] = [
  [6, [8, 80], 0.5, 0], // extérieure
  [4, [4, 42], 0.36, 0.5], // intérieure, plus fermée
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Hasard déterministe : les mêmes plantes à chaque visite.
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const linear = (hex: string): [number, number, number] => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
};

// ---------- Géométries ----------

// Tige : un tube le long de la courbe, de rayon r0 au pied à r1 au bout. Les anneaux sont dans l'ordre de la
// tige : afficher les n premiers (setDrawRange) la fait pousser.
function stemGeometry(curve: CatmullRomCurve3, r0: number, r1: number): BufferGeometry {
  const frames = curve.computeFrenetFrames(RINGS, false);
  const pos = new Float32Array((RINGS + 1) * RADIAL * 3);
  const nor = new Float32Array((RINGS + 1) * RADIAL * 3);
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i <= RINGS; i++) {
    const s = i / RINGS;
    curve.getPointAt(s, p);
    const r = lerp(r0, r1, Math.pow(s, 0.7));
    for (let j = 0; j < RADIAL; j++) {
      const a = (j / RADIAL) * TAU;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      const k = (i * RADIAL + j) * 3;
      pos.set([p.x + n.x * r, p.y + n.y * r, p.z + n.z * r], k);
      nor.set([n.x, n.y, n.z], k);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * RADIAL + j;
      const b = i * RADIAL + ((j + 1) % RADIAL);
      index.push(a, b, a + RADIAL, b, b + RADIAL, a + RADIAL);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setIndex(index);
  return g;
}

/**
 * Une lame (feuille ou pétale) de longueur 1, du pied (0, 0, 0) à la pointe (0, 1, 0), face vers +Z.
 * width(t) : demi-largeur ; fold : pliure en V le long de la nervure ; bend(t) : courbure vers l'arrière.
 */
function bladeGeometry(width: (t: number) => number, fold: number, bend: (t: number) => number): BufferGeometry {
  const L = 12;
  const C = 6;
  const pos: number[] = [];
  for (let i = 0; i <= L; i++) {
    const t = i / L;
    const w = width(t);
    for (let j = 0; j <= C; j++) {
      const v = (j / C) * 2 - 1;
      pos.push(v * w, t, Math.abs(v) * w * fold + bend(t));
    }
  }
  const index: number[] = [];
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < C; j++) {
      const a = i * (C + 1) + j;
      index.push(a, a + 1, a + C + 1, a + 1, a + C + 2, a + C + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

const leafGeometry = () =>
  bladeGeometry(
    (t) => 0.3 * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 - 0.25 * t),
    0.55,
    (t) => -0.22 * t * t,
  );

const petalGeometry = () =>
  bladeGeometry(
    (t) => 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.6),
    -0.45, // creusé : le pétale fait une coupe
    (t) => 0.18 * t * t, // la pointe se recourbe vers l'extérieur
  );

// ---------- Une plante ----------

type Leaf = { s: number; side: number; size: number; angle: number; roll: number; flower: number };
type Plant = {
  root: Vector3; // pied, dans la scène (sans le décalage de la page)
  curve: CatmullRomCurve3; // en coordonnées locales (pied à l'origine)
  stem: Mesh;
  r0: number;
  r1: number;
  leaves: Leaf[];
  flower: number; // diamètre de la fleur du bout (0 : la tige finit en vrille)
  delay: number;
  grow: number;
  phase: number;
  sway: number; // angle tenu (on twos)
};

/** Où planter un massif (px écran, depuis le centre, y vers le bas). */
export type BedOptions = {
  vp: Viewport;
  seed: number;
  ground: (x: number, rand: () => number) => number; // pied de la plante à l'abscisse x
  textBottom: number; // bas du texte à ne pas recouvrir (au centre, les plantes restent dessous)
  depth: (rand: () => number) => number; // profondeur (z) du pied
};

/**
 * Un massif de plantes (vert flash, fleurs rose poison) : des tiges qui poussent, leurs feuilles qui se
 * déplient au passage du bourgeon, une fleur qui éclot au bout (ou une vrille), quelques petites fleurs le
 * long des tiges, puis un léger balancement. Hautes sur les côtés, basses sous le texte. Rien à charger :
 * tout est calculé (laque en matcap). Une tige = un appel de dessin ; feuilles, pétales et bourgeons
 * instanciés. Utilisé par le footer (FooterPlants) et l'écran de chargement (loaderPlants.ts).
 */
export class PlantBed {
  readonly group = new Group();
  /** Âge (s) auquel tout a poussé et fleuri. */
  duration = 0;
  private plants: Plant[] = [];
  private stemMat: MeshMatcapMaterial;
  private leaves: InstancedMesh;
  private petals: InstancedMesh;
  private hearts: InstancedMesh; // bourgeons au bout des tiges, puis cœurs des fleurs
  private m = new Matrix4();
  private q = new Quaternion();
  private v = new Vector3();
  private w = new Vector3();
  private x = new Vector3();
  private y = new Vector3();
  private z = new Vector3();
  private s = new Vector3();

  constructor() {
    const p = config.footer.plants;
    const green: Texture = buildLacquerMatcap(linear(p.green), p.look);
    const pink: Texture = buildLacquerMatcap(linear(p.pink), p.look);
    this.stemMat = new MeshMatcapMaterial({ matcap: green });
    const leafMat = new MeshMatcapMaterial({ matcap: green, side: DoubleSide });
    const petalMat = new MeshMatcapMaterial({ matcap: pink, side: DoubleSide });
    this.leaves = new InstancedMesh(leafGeometry(), leafMat, MAX_LEAVES);
    this.petals = new InstancedMesh(petalGeometry(), petalMat, MAX_PETALS);
    this.hearts = new InstancedMesh(new IcosahedronGeometry(1, 2), this.stemMat, MAX_HEARTS);
    for (const mesh of [this.leaves, this.petals, this.hearts]) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
    }
  }

  // Tire les plantes : réparties sur la largeur ; hauteur selon la place (sous le texte : basses).
  layout(o: BedOptions): void {
    for (const plant of this.plants) {
      this.group.remove(plant.stem);
      plant.stem.geometry.dispose();
    }
    this.plants = [];
    this.duration = 0;
    const { width: W, height: H, unit: u, mobile } = o.vp;
    const p = config.footer.plants;
    const count = mobile ? p.mobileCount : p.count;
    const rand = random(o.seed);
    const k = mobile ? p.mobileScale : 1; // un peu plus petit sur mobile

    for (let i = 0; i < count; i++) {
      // Réparties sur la largeur, un peu en désordre.
      const x = -W / 2 + W * ((i + 0.15 + 0.7 * rand()) / count);
      const ground = o.ground(x, rand);
      // Place disponible : sous le texte au centre, jusqu'en haut de l'écran sur les côtés (sur mobile, le
      // texte prend toute la largeur : toutes restent dessous).
      const side = mobile ? 0 : smoothstep(p.clear * u, (p.clear + 220) * u, Math.abs(x));
      const roomCenter = ground - (o.textBottom + p.textGap * u);
      const roomSides = ground - (-H / 2 + p.top * u);
      const [c0, c1] = p.height.center;
      const [s0, s1] = p.height.sides;
      const h1 = rand();
      const h2 = rand();
      const wanted = mobile ? lerp(p.mobileHeight[0], p.mobileHeight[1], h1) * u : lerp(lerp(c0, c1, h1), lerp(s0, s1, h2), side) * u * k;
      const height = Math.max(30 * u * k, Math.min(wanted, lerp(roomCenter, roomSides, side)));
      const flower = rand() < p.flower ? lerp(p.flowerSize[0], p.flowerSize[1], rand()) * u * k : 0;

      // La tige : une courbe qui monte en ondulant, penchée vers l'extérieur ; au bout, une vrille ou une fleur.
      const lean = (x / W) * (0.5 + 0.6 * rand()) * height;
      const wave = (12 + 26 * rand()) * u * k;
      const freq = 1 + 1.6 * rand();
      const phase = rand() * TAU;
      const pts: Vector3[] = [];
      const N = 8;
      for (let j = 0; j <= N; j++) {
        const t = j / N;
        pts.push(
          new Vector3(
            lean * t * t + wave * Math.sin(phase + t * freq * Math.PI) * t,
            height * t,
            18 * u * k * Math.sin(phase * 1.7 + t * 2.3) * t,
          ),
        );
      }
      if (!flower) {
        // Vrille : une spirale qui se resserre, dans le prolongement de la tige.
        const top = pts[pts.length - 1];
        const dir = x < 0 ? -1 : 1;
        const R = Math.min(42 * u * k, height * 0.16);
        const cx = top.x + dir * R;
        for (let j = 1; j <= 12; j++) {
          const t = j / 12;
          const a = (dir > 0 ? Math.PI : 0) - dir * t * 2.4 * Math.PI;
          const r = R * (1 - 0.75 * t);
          pts.push(new Vector3(cx + r * Math.cos(a), top.y + r * Math.sin(a), top.z));
        }
      }
      const curve = new CatmullRomCurve3(pts, false, 'centripetal');
      const r0 = p.stem[0] * u * k * lerp(0.75, 1.15, rand());
      const r1 = p.stem[1] * u * k;
      const stem = new Mesh(stemGeometry(curve, r0, r1), this.stemMat);
      stem.frustumCulled = false;
      stem.geometry.setDrawRange(0, 0);
      this.group.add(stem);

      // Feuilles alternées le long de la tige, la dernière loin du bout.
      const leaves: Leaf[] = [];
      const nLeaves = Math.round(lerp(p.leaves[0], p.leaves[1], rand()) * Math.min(1, height / (220 * u * k)));
      for (let j = 0; j < Math.max(1, nLeaves); j++) {
        leaves.push({
          s: lerp(0.18, flower ? 0.8 : 0.66, (j + 0.3 + 0.4 * rand()) / Math.max(1, nLeaves)),
          side: j % 2 ? 1 : -1,
          size: lerp(p.leafSize[0], p.leafSize[1], rand()) * u * k,
          angle: lerp(45, 72, rand()) * DEG,
          roll: lerp(-0.5, 0.5, rand()),
          flower: rand() < p.sideFlower ? lerp(0.35, 0.5, rand()) * lerp(p.flowerSize[0], p.flowerSize[1], rand()) * u * k : 0,
        });
      }

      const plant: Plant = {
        root: new Vector3(x, -ground, o.depth(rand)),
        curve,
        stem,
        r0,
        r1,
        leaves,
        flower,
        delay: lerp(p.delay[0], p.delay[1], rand()),
        grow: lerp(p.grow[0], p.grow[1], Math.min(1, height / (s1 * u * k))),
        phase: rand() * TAU,
        sway: 0,
      };
      this.plants.push(plant);
      // Fin de la pousse de cette plante : fleur du bout, puis petites fleurs le long de la tige.
      this.duration = Math.max(
        this.duration,
        plant.delay + plant.grow * 0.92 + p.bloom,
        ...leaves.filter((l) => l.flower).map((l) => plant.delay + plant.grow * l.s + 1.2 + p.bloom),
      );
    }
  }

  /**
   * Pose les plantes à un âge donné (s depuis le début de la pousse) ; time : horloge du balancement ;
   * sway : recalculer le balancement (on twos). Renvoie vrai tant que quelque chose pousse ou éclot.
   */
  pose(age: number, time: number, sway: boolean): boolean {
    const { deg, period } = config.footer.plants.sway;
    let growing = false;
    let nl = 0;
    let np = 0;
    let nh = 0;

    for (const plant of this.plants) {
      // Pousse lente, qui ralentit à la fin ; le bourgeon avance au bout de la tige.
      const g = easeInOut(clamp01((age - plant.delay) / plant.grow));
      const bloom = easeOutCubic(clamp01((age - plant.delay - plant.grow * 0.92) / config.footer.plants.bloom));
      if (g < 1 || (plant.flower && bloom < 1)) growing = true;
      if (sway) plant.sway = deg * DEG * Math.sin((TAU * time) / period + plant.phase) * smoothstep(0.6, 1, g);
      plant.stem.geometry.setDrawRange(0, Math.floor(g * RINGS) * RADIAL * 6);
      plant.stem.position.copy(plant.root);
      plant.stem.rotation.z = plant.sway;
      plant.stem.updateMatrix();
      const base = plant.stem.matrix;
      if (g <= 0) continue;

      // Bourgeon au bout de la partie poussée ; il devient le cœur de la fleur, ou s'affine au bout de la vrille.
      const tip = plant.curve.getPointAt(g, this.v);
      const tangent = plant.curve.getTangentAt(g, this.w);
      const rTip = lerp(plant.r0, plant.r1, Math.pow(g, 0.7));
      const heart = plant.flower ? lerp(rTip * 1.5, plant.flower * 0.16, bloom) : rTip * lerp(1.5, 1, smoothstep(0.9, 1, g));
      this.s.setScalar(heart);
      this.m.compose(tip, this.q.identity(), this.s).premultiply(base);
      if (nh < MAX_HEARTS) this.hearts.setMatrixAt(nh++, this.m);

      // Fleur du bout : les pétales sortent du bourgeon et s'ouvrent, tournés un peu vers l'écran.
      if (plant.flower && g > 0.85) {
        const open = smoothstep(0.85, 1, g) * 0.25 + bloom * 0.75;
        np = this.flower(tip, tangent, plant.flower * smoothstep(0.85, 0.97, g), open, base, np, plant.phase);
      }

      // Feuilles : elles sortent quand le bourgeon les dépasse, puis se déplient.
      for (const leaf of plant.leaves) {
        const t = clamp01((g - leaf.s) / 0.1);
        if (t <= 0 || nl >= MAX_LEAVES) continue;
        const at = plant.curve.getPointAt(leaf.s, this.v);
        const dir = plant.curve.getTangentAt(leaf.s, this.w);
        const unfold = easeOutBack(clamp01(t));
        // Direction de la feuille : de la tige vers le côté, un peu vers l'écran pour qu'on voie sa face.
        this.x.set(dir.y, -dir.x, 0).normalize().multiplyScalar(leaf.side); // côté, dans le plan de l'écran
        const a = lerp(6 * DEG, leaf.angle, unfold);
        this.y.copy(dir).multiplyScalar(Math.cos(a)).addScaledVector(this.x, Math.sin(a)).add(this.z.set(0, 0, 0.35)).normalize();
        this.basis(this.y, leaf.roll);
        this.s.setScalar(leaf.size * lerp(0.25, 1, unfold));
        this.m.compose(at.addScaledVector(this.x, plant.r0 * 0.4), this.q, this.s).premultiply(base);
        this.leaves.setMatrixAt(nl++, this.m);
        // Petite fleur à l'aisselle de certaines feuilles, qui s'ouvre un peu après elle.
        if (leaf.flower) {
          const b = easeOutCubic(clamp01((age - plant.delay - plant.grow * leaf.s - 1.2) / config.footer.plants.bloom));
          if (b > 0 && nh < MAX_HEARTS) {
            // De l'autre côté de la tige que sa feuille, tournée vers l'extérieur.
            const center = plant.curve.getPointAt(leaf.s, this.f.center).addScaledVector(this.x, -leaf.size * 0.25);
            const side = this.f.side.copy(dir).addScaledVector(this.x, -0.8).normalize();
            np = this.flower(center, side, leaf.flower * b, b, base, np, leaf.roll * 5);
            this.s.setScalar(leaf.flower * 0.16 * b);
            this.m.compose(center, this.q.identity(), this.s).premultiply(base);
            this.hearts.setMatrixAt(nh++, this.m);
          }
        }
      }
    }
    this.leaves.count = nl;
    this.petals.count = np;
    this.hearts.count = nh;
    for (const mesh of [this.leaves, this.petals, this.hearts]) mesh.instanceMatrix.needsUpdate = true;
    return growing;
  }

  /** Libère la mémoire graphique (écran de chargement terminé). */
  dispose(): void {
    for (const plant of this.plants) plant.stem.geometry.dispose();
    for (const mesh of [this.leaves, this.petals, this.hearts]) {
      mesh.geometry.dispose();
      (mesh.material as MeshMatcapMaterial).dispose();
    }
  }

  // Orientation d'une lame : +Y vers dir, face (+Z) vers l'écran autant que possible, tournée de roll autour de dir.
  private basis(dir: Vector3, roll: number): void {
    const z = this.z.set(Math.sin(roll), 0, 1);
    z.addScaledVector(dir, -z.dot(dir)).normalize();
    const x = this.s.crossVectors(dir, z).normalize();
    this.m.makeBasis(x, dir, z);
    this.q.setFromRotationMatrix(this.m);
  }

  // Une fleur : deux couronnes de pétales autour de l'axe (la tige, tournée vers l'écran), de fermée (bourgeon)
  // à ouverte. Renvoie le nombre de pétales posés.
  private flower(center: Vector3, tangent: Vector3, size: number, open: number, base: Matrix4, n: number, phase: number): number {
    const { axis, u1, u2, spoke, dir, z, x, scale } = this.f;
    axis.copy(tangent).add(this.f.toScreen).normalize();
    u1.crossVectors(axis, Math.abs(axis.y) < 0.9 ? this.f.up : this.f.right).normalize();
    u2.crossVectors(axis, u1);
    for (const [count, deg, length, offset] of FLOWER_RINGS) {
      const b = lerp(deg[0], deg[1], open) * DEG;
      for (let i = 0; i < count; i++) {
        if (n >= MAX_PETALS) return n;
        const a = ((i + offset) / count) * TAU + phase;
        spoke.copy(u1).multiplyScalar(Math.cos(a)).addScaledVector(u2, Math.sin(a));
        dir.copy(axis).multiplyScalar(Math.cos(b)).addScaledVector(spoke, Math.sin(b));
        // Face intérieure du pétale tournée vers l'axe de la fleur.
        z.copy(axis).addScaledVector(dir, -axis.dot(dir));
        if (z.lengthSq() < 1e-8) z.copy(spoke).negate();
        z.normalize();
        x.crossVectors(dir, z).normalize();
        this.m.makeBasis(x, dir, z);
        this.q.setFromRotationMatrix(this.m);
        scale.setScalar(size * length * lerp(0.35, 1, open));
        this.m.compose(center, this.q, scale).premultiply(base);
        this.petals.setMatrixAt(n++, this.m);
      }
    }
    return n;
  }

  // Vecteurs de travail des fleurs (rien n'est alloué pendant l'animation).
  private f = {
    axis: new Vector3(),
    u1: new Vector3(),
    u2: new Vector3(),
    spoke: new Vector3(),
    dir: new Vector3(),
    z: new Vector3(),
    x: new Vector3(),
    scale: new Vector3(),
    center: new Vector3(),
    side: new Vector3(),
    toScreen: new Vector3(0, 0, 1.1), // les fleurs se tournent un peu vers l'écran
    up: new Vector3(0, 1, 0),
    right: new Vector3(1, 0, 0),
  };
}

/**
 * Plantes du footer (demande du DA : « pousser tout doucement en mode blossom ») : le massif sort du tas de
 * daruma (pieds cachés dedans) et commence à pousser pendant l'arrivée sur le footer.
 */
export class FooterPlants implements Updatable {
  private bed = new PlantBed();
  private viewport: Viewport;
  private dirty = true;
  private start = -1; // instant de l'arrivée sur le footer (les plantes poussent à partir de là)
  private done = false; // tout a poussé : on ne recalcule plus que le balancement
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  static watch(stage: Stage): void {
    let started = false;
    nav.onScroll((scroll) => {
      if (started || scroll < nav.stopOf(FOOTER_SECTION) - nav.sectionHeight * 1.4) return;
      started = true;
      const plants = new FooterPlants(stage);
      stage.add(plants);
      if (import.meta.env.DEV) Object.assign(window, { __plants: plants }); // pour les tests
    });
  }

  private constructor(stage: Stage) {
    this.viewport = stage.viewport;
    this.bed.group.visible = false;
    stage.scene.add(this.bed.group);
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    this.dirty = true;
  }

  // Pieds dans le tas de daruma ; au centre, sous le texte du footer (sa place dans la page, à l'arrêt).
  private layout(): void {
    const vp = this.viewport;
    const { height: H, unit: u, mobile } = vp;
    const text = document.querySelector<HTMLElement>('.footer__text');
    const daruma = (mobile ? config.footer.daruma.mobileHeight : config.footer.daruma.height) * u;
    this.bed.layout({
      vp,
      seed: 31,
      ground: (x, rand) => heapTop(x, vp) + daruma * (0.3 + 0.4 * rand()), // le pied est caché dans le tas
      textBottom: text?.offsetHeight ? text.offsetTop + text.offsetHeight - H / 2 : 70 * u,
      depth: (rand) => -0.4 * daruma - 6 * rand() * u,
    });
    this.done = false;
  }

  update(time: number): void {
    const { pageY, visible } = footerState(nav.scroll);
    const group = this.bed.group;
    group.visible = visible && pageY < this.viewport.height * 1.2;
    if (!group.visible) return;
    if (this.dirty) {
      this.dirty = false;
      this.layout();
    }
    // Les plantes commencent à pousser pendant l'arrivée sur le footer, avant les photos (config : start) ;
    // tout de suite si le mouvement est réduit.
    if (this.start < 0 && pageY <= this.viewport.height * config.footer.plants.start) this.start = time;
    const reduced = this.reduced.matches;
    const age = reduced ? 1e6 : this.start < 0 ? 0 : time - this.start;
    group.position.y = -pageY;

    const swayNow = steppedFrame() && !reduced;
    if (this.done && !swayNow) return;
    const growing = this.bed.pose(age, time, swayNow);
    if (!growing && this.start >= 0) this.done = true;
  }
}
