import { Box3, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshMatcapMaterial, MeshStandardMaterial, Quaternion, Source, Vector3, type BufferGeometry, type Material, type Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import ridgeSvg from '../assets/footer/ridge.svg?raw';
import { config } from '../config';
import { FOOTER_SECTION, footerState } from '../footer/footerView';
import { nav } from '../nav';
import { buildLacquerMatcap } from './environment';
import { lacquer } from './materials';
import { steppedFrame, type Stage, type Updatable, type Viewport } from './stage';

const MAX = 1500; // daruma au maximum
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 7.13) * 43758.5453;
  return x - Math.floor(x);
};

type Slot = { x: number; y: number; z: number; scale: number; yaw: number; tilt: number; phase: number; amp: number };

// Le rouge du corps n'est pas dans le GLB : la texture ne contient que les coulures dorées, sur fond
// transparent. On la pose sur le rouge de config (une fois, dans un canvas de 512 px au plus).
function onRed(map: Texture, red: string): Texture {
  const img = map.image as CanvasImageSource & { width: number; height: number };
  const size = Math.min(512, img.width);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const tex = map.clone(); // garde l'orientation, l'espace colorimétrique et le canal d'UV du GLB
  tex.source = new Source(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Montagne de daruma du footer : elle remplace le trait rouge de la maquette (Vector 1), qui en devient
 * la crête. Un amoncellement de petits daruma, face à l'écran, posé sur le grand logo et qui monte
 * jusqu'au tracé ; ils se balancent comme des culbutos. Modèle allégé (daruma-lite.glb, ~1 300 triangles)
 * et rendu instancié : un appel de dessin par matériau, quel que soit leur nombre.
 * Chargés seulement à l'approche du footer.
 */
export class DarumaMountain implements Updatable {
  private group = new Group();
  private meshes: { mesh: InstancedMesh; part: Matrix4 }[] = [];
  private slots: Slot[] = [];
  private viewport: Viewport;
  private aspect = 1; // largeur / hauteur d'un daruma
  private dirty = true; // à replacer (redimensionnement) : fait au prochain affichage, quand le texte du footer est mesurable
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private rocks = new Float32Array(0); // angle de balancement tenu de chaque daruma (on twos)
  private moved = true; // placement à réappliquer
  private lastPageY = NaN;
  private m = new Matrix4();
  private t = new Matrix4();
  private q = new Quaternion();
  private e = new Euler(0, 0, 0, 'YZX');
  private p = new Vector3();
  private s = new Vector3();

  /** Charge la montagne quand on approche du footer (une seule fois). */
  static watch(stage: Stage): void {
    let started = false;
    nav.onScroll((scroll) => {
      if (started || scroll < nav.stopOf(FOOTER_SECTION) - nav.sectionHeight * 1.4) return;
      started = true;
      DarumaMountain.load(stage)
        .then((m) => {
          stage.add(m);
          if (import.meta.env.DEV) Object.assign(window, { __daruma: m }); // pour les tests
        })
        .catch((err) => console.error('Daruma indisponibles :', err));
    });
  }

  static async load(stage: Stage): Promise<DarumaMountain> {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(config.footer.daruma.url);
    return new DarumaMountain(stage, gltf.scene);
  }

  private constructor(stage: Stage, scene: Group) {
    this.viewport = stage.viewport;

    // Normalisation : debout (y vers le haut), centré en x/z, posé à y = 0, hauteur 1.
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    this.aspect = Math.max(size.x, size.z) / size.y;
    const normalize = new Matrix4()
      .makeScale(1 / size.y, 1 / size.y, 1 / size.y)
      .multiply(new Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

    const look = config.footer.daruma.look;
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const src = o.material as Material;
      // Laque : le corps rouge garde ses coulures dorées (texture), le reste prend la couleur du GLB.
      const material =
        src instanceof MeshStandardMaterial && src.map
          ? new MeshMatcapMaterial({ map: onRed(src.map, config.footer.daruma.red), matcap: buildLacquerMatcap([1, 1, 1], look) })
          : lacquer(src, look);
      const mesh = new InstancedMesh(o.geometry as BufferGeometry, material, MAX);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.meshes.push({ mesh, part: normalize.clone().multiply(o.matrixWorld) });
      this.group.add(mesh);
    });

    stage.scene.add(this.group);
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    this.dirty = true;
  }

  // Place les daruma le long du trait rouge, en px écran (origine au centre, y vers le bas).
  private layout(): void {
    const { width: W, height: H, unit: u, mobile } = this.viewport;
    const f = config.footer;
    const d = f.daruma;
    const k = W / f.ridge.frame; // le trait s'étire en largeur avec l'écran
    const viewBoxW = 1449; // largeur du viewBox du SVG Vector 1
    // Desktop : hauteur à l'échelle --u, haut du trait sous le centre (maquette).
    // Mobile (hors maquette) : miniature du trait (même échelle que le grand logo), à la même distance du bas.
    const ky = mobile ? k : u;
    const top = mobile ? H / 2 - (f.ridge.frameH / 2 - f.ridge.top) * k : f.ridge.top * u;

    // Échantillonne le tracé (en px écran) avec le moteur SVG du navigateur.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', /\sd="([^"]+)"/.exec(ridgeSvg)![1]);
    svg.appendChild(path);
    document.body.appendChild(svg);
    const total = path.getTotalLength();
    const pts: { x: number; y: number; len: number }[] = [];
    let len = 0;
    for (let i = 0; i <= 600; i++) {
      const pt = path.getPointAtLength((total * i) / 600);
      const x = (f.ridge.left + (pt.x * f.ridge.w) / viewBoxW) * k - W / 2;
      const y = top + pt.y * ky;
      if (pts.length) len += Math.hypot(x - pts[pts.length - 1].x, y - pts[pts.length - 1].y);
      pts.push({ x, y, len });
    }
    svg.remove();

    const h = (mobile ? d.mobileHeight : d.height) * u;
    const w = h * this.aspect;

    // Crête : pour chaque tranche de 2 px en x, le point le plus haut du tracé.
    const BIN = 2;
    const bins = Math.ceil(W / BIN) + 1;
    const crest = new Float32Array(bins).fill(Infinity);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const steps = Math.max(1, Math.ceil(Math.abs(b.x - a.x) / BIN));
      for (let s = 0; s <= steps; s++) {
        const x = a.x + ((b.x - a.x) * s) / steps;
        const j = Math.round((x + W / 2) / BIN);
        if (j >= 0 && j < bins) crest[j] = Math.min(crest[j], a.y + ((b.y - a.y) * s) / steps);
      }
    }
    // Le pic du trait croise la dernière ligne du texte : sous le bloc de texte, la crête est repoussée
    // juste en dessous (fondu sur une largeur de daruma de chaque côté), ailleurs elle suit le trait.
    const text = document.querySelector<HTMLElement>('.footer__text');
    const floor = text ? f.text.top * u + text.offsetHeight + d.textGap * u : -Infinity; // depuis le centre, comme le trait
    const half = text ? text.offsetWidth / 2 : 0;
    const crestAt = (x: number) => {
      const y = crest[Math.min(bins - 1, Math.max(0, Math.round((x + W / 2) / BIN)))];
      const weight = Math.min(1, Math.max(0, (half + w - Math.abs(x)) / w));
      return y < floor ? y + (floor - y) * weight : y;
    };
    // Sol : le haut du grand logo (la montagne est posée dessus).
    const kLogo = W / f.logo.frame;
    const ground = H / 2 - (f.logo.h + f.logo.bottom) * kLogo;

    // Amoncellement : des colonnes serrées ; dans chacune, le premier daruma touche la crête, les
    // suivants s'empilent en dessous (chevauchés, un peu devant) jusqu'au sol. Une colonne sur deux est
    // décalée d'une demi-hauteur, et tout est un peu en désordre.
    this.slots = [];
    const step = d.spacing * w;
    const rowStep = d.rowStep * h;
    for (let c = 0, x = -W / 2 + step / 2; x < W / 2 && this.slots.length < MAX; c++, x += step) {
      const top = crestAt(x);
      if (!Number.isFinite(top)) continue;
      const floorY = ground + d.sink * h; // la base peut s'enfoncer un peu dans le haut des lettres
      let lastBase = top;
      for (let r = 0; this.slots.length < MAX; r++) {
        const n = this.slots.length;
        const scale = h * (d.scale[0] + (d.scale[1] - d.scale[0]) * hash(n));
        let y = r === 0 ? top : top + (r + (c % 2) * 0.5) * rowStep + (hash(n + 300) - 0.5) * 2 * d.jitter * h;
        if (y + scale > floorY) {
          // Plus de place : s'il reste un trou au-dessus du sol, un dernier daruma posé dessus.
          if (r === 0 || floorY - lastBase < 0.3 * h) break;
          y = floorY - scale;
        }
        this.slots.push({
          x: x + (hash(n + 700) - 0.5) * 2 * d.jitter * w,
          y: y + scale, // y = base du daruma (son origine)
          z: r * d.depth * h + hash(n + 100) * 0.2 * h, // ceux du dessous passent devant
          scale,
          yaw: (d.faceDeg + (hash(n + 500) * 2 - 1) * d.yawDeg) * DEG,
          tilt: r === 0 ? 0 : (hash(n + 1100) * 2 - 1) * d.tiltDeg * DEG, // dans la pile, ils penchent un peu
          phase: hash(n + 900) * TAU,
          amp: r === 0 ? 1 : d.rock.below, // ceux du dessous, coincés, se balancent moins
        });
        lastBase = y + scale;
        if (lastBase >= floorY - 0.5) break;
      }
    }
    for (const { mesh } of this.meshes) mesh.count = this.slots.length;
    this.moved = true;
  }

  update(time: number): void {
    const { pageY, visible } = footerState(nav.scroll);
    this.group.visible = visible && pageY < this.viewport.height * 1.2;
    if (!this.group.visible) return;
    if (this.dirty) {
      this.dirty = false;
      this.layout();
    }
    // Le balancement est animé « on twos » (comme les autres rotations) ; le défilement reste fluide.
    // Rien à recalculer entre deux poses si la page ne bouge pas.
    const rockNow = steppedFrame() && !this.reduced.matches;
    if (!rockNow && !this.moved && pageY === this.lastPageY) return;
    this.moved = false;
    this.lastPageY = pageY;
    const { deg, period } = config.footer.daruma.rock;
    if (this.rocks.length !== this.slots.length) this.rocks = new Float32Array(this.slots.length);

    this.slots.forEach((slot, i) => {
      if (rockNow) this.rocks[i] = slot.amp * deg * DEG * Math.sin((TAU * time) / period + slot.phase);
      // Balancement autour de l'axe du visage (X du GLB), puis orientation : de face, il penche à gauche et à droite.
      this.e.set(slot.tilt + this.rocks[i], slot.yaw, 0);
      this.q.setFromEuler(this.e);
      this.p.set(slot.x, -(slot.y + pageY), slot.z); // 3D : y vers le haut
      this.s.setScalar(slot.scale);
      this.m.compose(this.p, this.q, this.s);
      // Matrice de chaque pièce : placement × normalisation × transformation du mesh dans le GLB.
      for (const { mesh, part } of this.meshes) mesh.setMatrixAt(i, this.t.multiplyMatrices(this.m, part));
    });
    for (const { mesh } of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}
