import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  FrontSide,
  Group,
  Mesh,
  MeshMatcapMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Side,
} from 'three';
import { config } from '../config';
import { nav } from '../nav';
import { MAGAZINE_PROJECT, MAGAZINES, magazineState } from '../works/magazineTimeline';
import type { Stage, Updatable, Viewport } from './stage';

const SEG = 24; // segments d'une page sur sa largeur (sa courbure)
const PAGE = Math.SQRT1_2; // largeur / hauteur d'une page (format A, comme toutes les images fournies)
const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;

// ---------- Vernis : matcaps calculées en JS (pas d'environnement à précalculer) ----------

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Papier : blanc de face, un peu plus sombre quand il se courbe (le volume des pages).
let paperMatcap: Texture | null = null;
const paper = () =>
  (paperMatcap ??= canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.48, s * 0.45, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#f6f6f6');
    g.addColorStop(0.62, '#dadada');
    g.addColorStop(1, '#8f8f8f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }));

// Reflets du vernis (ajoutés à l'image) : deux bandes de lumière verticales de part et d'autre, une boîte
// à lumière en haut, un léger voile au centre. Ils glissent sur le papier quand la page se courbe ou tourne.
let glossMatcap: Texture | null = null;
const gloss = () =>
  (glossMatcap ??= canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const blob = (x: number, y: number, rx: number, ry: number, angle: number, alpha: number) => {
      ctx.save();
      ctx.translate(x * s, y * s);
      ctx.rotate(angle);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.55})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    blob(0.5, 0.5, 0.34, 0.34, 0, 0.08); // voile
    blob(0.3, 0.48, 0.07, 0.34, 0, 1); // bande de lumière à gauche
    blob(0.72, 0.45, 0.06, 0.3, 0, 0.9); // bande de lumière à droite
    blob(0.5, 0.2, 0.22, 0.05, 0, 0.7); // boîte à lumière en haut
    blob(0.5, 0.86, 0.3, 0.05, 0, 0.3); // reflet du sol
  }));

function varnished(map: Texture, side: Side): MeshMatcapMaterial {
  const material = new MeshMatcapMaterial({ map, matcap: paper(), side });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.glossMap = { value: gloss() };
    shader.uniforms.glossStrength = { value: config.magazines.varnish };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform sampler2D glossMap;\nuniform float glossStrength;\nvoid main() {')
      .replace(
        'vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;',
        'vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb + texture2D( glossMap, uv ).rgb * glossStrength;',
      );
  };
  material.customProgramCacheKey = () => 'magazine-varnish';
  return material;
}

// Image → texture ; sur mobile, réduite au décodage (moins de mémoire graphique).
async function loadTexture(url: string, maxWidth: number | null): Promise<Texture> {
  let tex: Texture;
  try {
    const blob = await (await fetch(url)).blob();
    const options: ImageBitmapOptions = { imageOrientation: 'flipY' };
    if (maxWidth) Object.assign(options, { resizeWidth: maxWidth, resizeQuality: 'high' });
    tex = new Texture(await createImageBitmap(blob, options));
    tex.flipY = false;
  } catch {
    tex = await new TextureLoader().loadAsync(url);
  }
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Une feuille : une page souple, recto et verso ----------

/**
 * Feuille de hauteur 1 et de largeur PAGE, attachée à la reliure (x = 0). Sa forme est recalculée à chaque
 * pose : angle autour de la reliure (0 = à droite, π = tournée à gauche), plus des courbures douces.
 * Recto et verso partagent les mêmes sommets ; seules les coordonnées de texture diffèrent.
 */
class Leaf {
  readonly meshes: Mesh[];
  private position: BufferAttribute;
  private front: BufferGeometry;

  constructor(frontMat: MeshMatcapMaterial, backMat: MeshMatcapMaterial, frontU: (s: number) => number, backU: (s: number) => number) {
    const n = (SEG + 1) * 2;
    this.position = new BufferAttribute(new Float32Array(n * 3), 3);
    const normal = new BufferAttribute(new Float32Array(n * 3), 3);
    const index: number[] = [];
    for (let j = 0; j < SEG; j++) index.push(2 * j, 2 * j + 2, 2 * j + 1, 2 * j + 1, 2 * j + 2, 2 * j + 3);
    const uvs = (u: (s: number) => number) => {
      const a = new Float32Array(n * 2);
      for (let j = 0; j <= SEG; j++) {
        const s = j / SEG;
        a.set([u(s), 0, u(s), 1], j * 4);
      }
      return new BufferAttribute(a, 2);
    };
    const geometry = (u: (s: number) => number) => {
      const g = new BufferGeometry();
      g.setAttribute('position', this.position);
      g.setAttribute('normal', normal);
      g.setAttribute('uv', uvs(u));
      g.setIndex(index);
      return g;
    };
    this.front = geometry(frontU);
    this.meshes = [new Mesh(this.front, frontMat), new Mesh(geometry(backU), backMat)];
    for (const m of this.meshes) m.frustumCulled = false;
  }

  /**
   * angle : rotation autour de la reliure ; curl : la page se plie en tournant (le bord libre traîne) ;
   * rise : magazine ouvert, la page sort de la reliure en s'élevant ; bend : page légèrement bombée ;
   * z0 : hauteur dans la pile.
   */
  pose(angle: number, curl: number, rise: number, bend: number, z0: number): void {
    const p = this.position.array as Float32Array;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const ds = PAGE / SEG;
    let x = 0;
    let z = z0;
    for (let j = 0; j <= SEG; j++) {
      p.set([x, -0.5, z, x, 0.5, z], j * 6);
      const s = (j + 0.5) / SEG;
      const theta = angle + (rise * (1 - s) * (1 - s) - bend * s) * c - curl * s * sn;
      x += Math.cos(theta) * ds;
      z += Math.sin(theta) * ds;
    }
    this.position.needsUpdate = true;
    this.front.computeVertexNormals(); // normales partagées avec le verso
  }
}

// ---------- Un magazine ----------

class Magazine {
  readonly group = new Group(); // sa place sur le cercle (échelle : hauteur d'une page en px)
  private body = new Group(); // décalé pour que le magazine, fermé ou ouvert, reste centré
  private leaves: Leaf[] = [];
  private spreads: { front: MeshMatcapMaterial; back: MeshMatcapMaterial }[] = [];

  constructor(cover: Texture, back: Texture, spreadCount: number, blank: Texture) {
    this.group.add(this.body);
    // Matériaux des doubles pages : moitié droite (recto d'une feuille), moitié gauche (verso de la précédente).
    for (let i = 0; i < spreadCount; i++) this.spreads.push({ front: varnished(blank, FrontSide), back: varnished(blank, BackSide) });
    const coverMat = varnished(cover, FrontSide);
    const backMat = varnished(back, BackSide);
    const L = spreadCount + 1;
    for (let k = 0; k < L; k++) {
      const leaf = new Leaf(
        k === 0 ? coverMat : this.spreads[k - 1].front,
        k === L - 1 ? backMat : this.spreads[k].back,
        k === 0 ? (s) => s : (s) => 0.5 + 0.5 * s, // couverture : l'image entière ; sinon la moitié droite
        k === L - 1 ? (s) => 1 - s : (s) => 0.5 - 0.5 * s, // 4e de couv (reliure à droite) ; sinon la moitié gauche
      );
      this.leaves.push(leaf);
      this.body.add(...leaf.meshes);
    }
  }

  setSpread(i: number, tex: Texture): void {
    this.spreads[i].front.map = tex;
    this.spreads[i].back.map = tex;
  }

  /** progress[k] : avancée de la feuille k (0 = à droite, 1 = tournée). thickness : épaisseur d'une feuille (hauteur = 1). */
  pose(progress: number[], thickness: number): void {
    const { bend, rise, curl } = config.magazines.paper;
    const L = this.leaves.length;
    const turned = progress.reduce((s, p) => s + p, 0);
    const open = clamp01(turned) * clamp01(L - turned); // 1 : ouvert ; 0 : fermé (d'un côté ou de l'autre)
    this.leaves.forEach((leaf, k) => {
      const a = smooth(progress[k]);
      const z0 = ((L - 1 - k) * (1 - a) + k * a) * thickness; // de la pile de droite à celle de gauche
      leaf.pose(a * Math.PI, curl * Math.sin(a * Math.PI), rise * open, bend, z0);
    });
    // Fermé sur la couverture : décalé à gauche d'une demi-page ; fermé sur la 4e de couv : à droite.
    this.body.position.x = (-0.5 * (1 - smooth(progress[0])) + 0.5 * smooth(progress[L - 1])) * PAGE;
  }
}

// ---------- La page Magazines ----------

/**
 * Page MAGAZINES : les magazines (couverture, doubles pages, 4e de couv) en 3D, papier verni et souple,
 * posés en cercle à plat. Ils arrivent de la droite et repartent par la gauche. Celui de devant a la taille
 * d'une case ; au scroll il s'ouvre (et grandit jusqu'à la taille des grands cadres), ses pages se tournent,
 * il se referme, puis le cercle tourne jusqu'au suivant (works/magazineTimeline.ts).
 * Chargés à l'approche de la page ; textures des pages intérieures chargées ensuite, magazine par magazine.
 */
export class Magazines implements Updatable {
  private root = new Group();
  private mags: Magazine[] = [];
  private viewport: Viewport;
  private index: number;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  static watch(stage: Stage): void {
    const project = MAGAZINE_PROJECT;
    if (!project) return;
    let started = false;
    nav.onScroll((scroll) => {
      if (started || Math.abs(nav.offsetOf(project.number, scroll)) > nav.sectionHeight * 1.8) return;
      started = true;
      Magazines.load(stage, project.number)
        .then((m) => {
          stage.add(m);
          if (import.meta.env.DEV) Object.assign(window, { __magazines: m }); // pour les tests
        })
        .catch((err) => console.error('Magazines 3D indisponibles :', err));
    });
  }

  static async load(stage: Stage, index: number): Promise<Magazines> {
    const mobile = stage.viewport.mobile;
    const covers = await Promise.all(MAGAZINES.map((m) => Promise.all([loadTexture(m.cover, mobile ? 400 : null), loadTexture(m.back, mobile ? 400 : null)])));
    const view = new Magazines(stage, index, covers);
    // Pages intérieures : magazine par magazine, dans l'ordre de lecture.
    void (async () => {
      for (const [i, m] of MAGAZINES.entries()) {
        for (const [j, url] of m.spreads.entries()) view.mags[i].setSpread(j, await loadTexture(url, mobile ? 700 : null));
      }
    })();
    return view;
  }

  private constructor(stage: Stage, index: number, covers: [Texture, Texture][]) {
    this.viewport = stage.viewport;
    this.index = index;
    const blank = canvasTexture(4, (ctx, s) => {
      ctx.fillStyle = '#f4f2ee';
      ctx.fillRect(0, 0, s, s);
    });
    MAGAZINES.forEach((m, i) => {
      const mag = new Magazine(covers[i][0], covers[i][1], m.spreads.length, blank);
      this.mags.push(mag);
      this.root.add(mag.group);
    });
    this.root.visible = false;
    stage.scene.add(this.root);
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
  }

  update(time: number): void {
    const { width: W, unit: u, mobile } = this.viewport;
    const D = nav.sectionHeight;
    const off = nav.offsetOf(this.index, nav.scroll);
    const cfg = config.magazines;
    const reduced = this.reduced.matches;

    // Ils arrivent de la droite à la fin de l'approche et repartent par la gauche (comme Social Media) :
    // pas de mouvement vertical, la page « glisse » de côté.
    const span = D * cfg.slide;
    const inT = off < 0 ? clamp01(1 + off / span) : 1; // arrivée : 0 → 1
    const outT = off > 0 ? clamp01(off / span) : 0; // départ : 0 → 1
    this.root.visible = inT > 0 && outT < 1;
    if (!this.root.visible) return;
    const slideIn = reduced ? 0 : 1 - easeOutCubic(inT);
    const slideOut = reduced ? 0 : easeInCubic(outT);
    this.root.position.set((slideIn - slideOut) * W * 1.1, 0, 0);

    // Tailles : fermé, une page a la hauteur d'une case ; ouvert, la hauteur des grands cadres (Longtemps, F1).
    // Sur mobile, ouvert, il tient dans la largeur.
    const hOpen = mobile ? (W - 20 * u) / 2 / PAGE : cfg.openHeight * u;
    const hClosed = mobile ? hOpen : cfg.pageHeight * u;
    const k = hClosed / (cfg.pageHeight * u); // le cercle suit la taille (mobile)

    const state = magazineState(nav.holdProgress(this.index, nav.scroll));
    // En arrivant, le cercle tourne pour amener le premier magazine.
    const ring = state.ring - (reduced ? 0 : 1 - easeOutCubic(inT)) * cfg.arrive;
    const M = this.mags.length;
    const { rx, rz, lift, face } = cfg.ring;
    this.mags.forEach((mag, m) => {
      let phi = ((m - ring) * TAU) / M;
      phi = Math.atan2(Math.sin(phi), Math.cos(phi)); // entre -π et π
      const c = Math.cos(phi);
      mag.group.position.set(rx * k * u * Math.sin(phi), lift * k * u * (1 - c) * 0.5, rz * k * u * (c - 1));
      // Un peu couchés vers l'arrière, et un léger balancement : les reflets du vernis glissent même au repos.
      const sway = reduced ? 0 : cfg.sway * Math.sin((TAU * time) / 7 + m * 2.1);
      mag.group.rotation.set(-cfg.tilt, face * phi + sway, 0, 'YXZ');
      // Il grandit en s'ouvrant, et revient à sa taille en se refermant.
      const leaves = state.leaves[m];
      const turned = leaves.reduce((sum, p) => sum + p, 0);
      const open = smooth(clamp01(turned) * clamp01(leaves.length - turned));
      const h = hClosed + (hOpen - hClosed) * open;
      mag.group.scale.setScalar(h);
      mag.pose(leaves, cfg.paper.thickness / h);
    });
  }

}
