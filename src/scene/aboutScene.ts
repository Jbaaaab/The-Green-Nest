import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshMatcapMaterial, type Texture } from 'three';
import { aboutScroll } from '../about/aboutScroll';
import { config } from '../config';
import { onPage, page } from '../router';
import { buildLacquerMatcap } from './environment';
import { PlantBed } from './footerPlants';
import { steppedFrame, type Stage, type Updatable, type Viewport } from './stage';

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const linear = (hex: string): [number, number, number] => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
};

/**
 * Silhouette de la montagne (px) : demi-largeur du plateau, de la base, hauteur, creux des pentes et du cratère ;
 * bottom : jusqu'où elle descend sous sa base (en hauteurs de montagne, < 0), pour atteindre le bas de l'écran.
 */
type Shape = { rTop: number; rBase: number; height: number; curve: number; crater: number; bottom: number };

// Profil relevé sur le croquis de la maquette (moyenne des deux pentes) : la hauteur (0 au bas de l'écran, 1 au
// plateau) baisse en exponentielle avec la distance au plateau t (0 au bord du plateau, 1 au coin de l'écran) :
// pentes raides en haut, presque droites en bas, comme le Fuji.
const heightAt = (s: Shape, t: number) => (Math.exp(-s.curve * t) - Math.exp(-s.curve)) / (1 - Math.exp(-s.curve));

// Demi-largeur à la hauteur h (l'inverse) ; sous le bas de l'écran (h < 0), la pente continue tout droit.
function radius(s: Shape, h: number): number {
  const e = Math.exp(-s.curve);
  const w = s.rBase - s.rTop;
  if (h < 0) return s.rBase - (h * w * (1 - e)) / (s.curve * e);
  return s.rTop + w * (-Math.log(h * (1 - e) + e) / s.curve);
}

// Ravines : creux étroits et un peu irréguliers autour du cône (0 : sur une arête, 1 : au fond d'une ravine).
function valley(a: number, n: number): number {
  const v = 0.5 + 0.5 * Math.sin(a * n + 1.3 * Math.sin(a * 5) + 0.7 * Math.sin(a * 11 + 1));
  return Math.pow(v, 5);
}

/**
 * Le Fuji : un cône aux pentes creusées (profil du croquis), des ravines tout autour, un cratère au sommet.
 * Attribut « snow » : > 0 dans la neige (elle descend plus bas dans les ravines), < 0 sur les flancs ; le
 * matériau passe du vert au rose à 0, d'un trait net (voir fujiMaterial).
 * La base (h = 0) est à y = 0 ; vue de face, la silhouette est celle du croquis (plan z = 0).
 */
function fujiGeometry(s: Shape): BufferGeometry {
  const f = config.about.fuji;
  const A = 192; // tout autour
  // En hauteur : 52 anneaux de la base au sommet (la neige y est nette), 8 sous la base, jusqu'au bas de l'écran.
  const rows: number[] = [];
  for (let i = 0; i < 8; i++) rows.push(s.bottom * (1 - i / 8));
  for (let i = 0; i <= 52; i++) rows.push(i / 52);
  const V = rows.length - 1;
  const pos: number[] = [];
  const snow: number[] = [];
  const snowLine = (a: number) => f.snow - f.snowStreak * valley(a, f.ridges) - 0.025 * Math.sin(a * 23 + 2);
  for (let i = 0; i <= V; i++) {
    const h = rows[i];
    for (let j = 0; j < A; j++) {
      const a = (j / A) * TAU;
      const r = radius(s, h) * (1 - f.ridgeDepth * valley(a, f.ridges) * (1 - 0.3 * clamp01(h)));
      pos.push(r * Math.cos(a), h * s.height, r * Math.sin(a));
      snow.push(h - snowLine(a));
    }
  }
  // Cratère : un anneau en retrait et plus bas, puis son centre.
  const inner = pos.length / 3;
  for (let j = 0; j < A; j++) {
    const a = (j / A) * TAU;
    pos.push(0.7 * s.rTop * Math.cos(a), s.height - s.crater, 0.7 * s.rTop * Math.sin(a));
    snow.push(1);
  }
  const center = pos.length / 3;
  pos.push(0, s.height - s.crater, 0);
  snow.push(1);

  const index: number[] = [];
  const at = (i: number, j: number) => i * A + (j % A);
  for (let i = 0; i < V; i++) {
    for (let j = 0; j < A; j++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i, j + 1);
      const d = at(i + 1, j + 1);
      index.push(a, b, c, b, d, c);
    }
  }
  for (let j = 0; j < A; j++) {
    const o = at(V, j);
    const o1 = at(V, j + 1);
    const n = inner + j;
    const n1 = inner + ((j + 1) % A);
    index.push(o, n, o1, n, n1, o1, n, center, n1);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('snow', new BufferAttribute(new Float32Array(snow), 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// Laque vert flash des flancs et rose poison de la neige (les matcaps des tiges et des pétales) : le fragment
// shader du matcap mélange les deux selon l'attribut snow, avec un bord net et lissé (fwidth).
function fujiMaterial(green: Texture, pink: Texture): MeshMatcapMaterial {
  const m = new MeshMatcapMaterial({ matcap: green });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.matcapSnow = { value: pink };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float snow;\nvarying float vSnow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvSnow = snow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D matcapSnow;\nvarying float vSnow;')
      .replace(
        'vec4 matcapColor = texture2D( matcap, uv );',
        'float edge = max( fwidth( vSnow ), 1e-4 );\n\t\tvec4 matcapColor = mix( texture2D( matcap, uv ), texture2D( matcapSnow, uv ), smoothstep( -edge, edge, vSnow ) );',
      );
  };
  return m;
}

/**
 * About 2 (demande du DA : « le mont Fuji… dans le même style que les fleurs », à la place du croquis rouge de la
 * maquette) : une montagne en laque vert flash, au sommet enneigé rose poison, qui tourne doucement (on twos), et
 * les fleurs du footer qui poussent sur ses pentes (déjà aux trois quarts, elles finissent de pousser à l'arrivée
 * sur About 2). Rien à charger : tout est calculé. Réglages : config.about.fuji.
 */
export class AboutScene implements Updatable {
  private group = new Group(); // suit le scroll de la page
  private holder = new Group(); // aplatit la montagne en profondeur (la silhouette reste celle du croquis)
  private mountain: Mesh;
  private bed = new PlantBed();
  private viewport: Viewport;
  private dirty = true;
  private start = -1; // arrivée sur About 2
  private done = false; // les fleurs ont fini de pousser : seul le balancement bouge encore
  private angle = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Construite à la première ouverture de la page About. */
  static watch(stage: Stage): void {
    let built = false;
    const build = () => {
      if (built) return;
      built = true;
      stage.add(new AboutScene(stage));
    };
    if (page === 'about') build();
    onPage((p) => p === 'about' && build());
  }

  private constructor(stage: Stage) {
    this.viewport = stage.viewport;
    const f = config.about.fuji;
    const material = fujiMaterial(buildLacquerMatcap(linear(f.green), f.look), buildLacquerMatcap(linear(f.pink), f.look));
    this.mountain = new Mesh(new BufferGeometry(), material);
    this.mountain.frustumCulled = false;
    this.holder.add(this.mountain);
    this.holder.scale.z = f.depth;
    this.group.add(this.holder, this.bed.group);
    this.group.visible = false;
    stage.about.add(this.group);
    // Le texte de About 2 a bougé (taille d'écran, langue) : la montagne se recale dessous.
    window.addEventListener('about:layout', () => (this.dirty = true));
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    this.dirty = true;
  }

  // Sommet 68 px sous le texte, base aux coins du bas de l'écran ; fleurs plantées sous la crête.
  private layout(): void {
    const vp = this.viewport;
    const { width: W, height: H, unit: u, mobile } = vp;
    const f = config.about.fuji;
    const body = document.querySelector<HTMLElement>('.about__body2');
    // Bas du texte de About 2 (px depuis le centre de l'écran, vers le bas), lu dans la page.
    const textBottom = body?.offsetHeight ? body.offsetTop + body.offsetHeight - H / 2 : (config.about.text2.body + 182) * u;
    const yTop = textBottom + f.gap * u;
    // Desktop : la base aux coins du bas de l'écran (le croquis). Mobile : les proportions du croquis, plus large
    // que l'écran ; la pente continue jusqu'en bas.
    const rBase = mobile ? W * f.mobile.base : (W / 2) * f.base;
    const height = mobile ? Math.min(H / 2 - yTop, rBase * f.mobile.aspect) : Math.max(40 * u, H / 2 - yTop);
    const yBase = yTop + height;
    const s: Shape = {
      rTop: (mobile ? f.mobile.top : f.top) * u,
      rBase,
      height,
      curve: f.curve,
      crater: f.crater * u,
      bottom: -0.35 - Math.max(0, H / 2 - yBase) / height,
    };
    this.mountain.geometry.dispose();
    this.mountain.geometry = fujiGeometry(s);
    this.holder.position.set(0, -yBase, 0);

    // Silhouette vue de face (y écran depuis le centre, vers le bas) : les pieds des fleurs sont cachés juste
    // dessous, derrière le plan de la crête ; pas de fleurs sur le plateau du sommet.
    const ridge = (x: number) => {
      const ax = Math.abs(x);
      return ax <= s.rTop ? yTop : yBase - heightAt(s, (ax - s.rTop) / (s.rBase - s.rTop)) * s.height;
    };
    const p = f.plants;
    this.bed.layout({
      vp,
      seed: p.seed,
      ground: (x) => ridge(x) + p.sink * u,
      textBottom,
      depth: (rand) => -(8 + 14 * rand()) * u,
      skip: (x) => Math.abs(x) < s.rTop + p.clear * u,
    });
    this.done = false;
  }

  update(time: number, delta: number): void {
    const H = this.viewport.height;
    const y2 = aboutScroll.max - aboutScroll.scroll; // About 2 : décalage vers le bas (px)
    this.group.visible = page === 'about' && y2 < H;
    if (!this.group.visible) return;
    if (this.dirty) {
      this.dirty = false;
      this.layout();
    }
    this.group.position.y = -y2;

    const f = config.about.fuji;
    const reduced = this.reduced.matches;
    // Les fleurs sont déjà poussées aux trois quarts (demande du DA) ; à l'arrivée sur About 2 (à moitié à
    // l'écran, elles encore dessous), elles finissent de pousser. Une seule fois : ensuite, elles restent poussées.
    if (this.start < 0 && y2 < H * 0.5) this.start = time;
    const head = config.footer.plants.headStart * this.bed.duration;
    const age = reduced ? 1e6 : head + (this.start < 0 ? 0 : time - this.start);
    if (!reduced) this.angle += (TAU * delta) / f.spinPeriod;
    const stepped = steppedFrame();
    if (stepped) this.mountain.rotation.y = this.angle; // on twos

    const sway = stepped && !reduced;
    if (this.done && !sway) return;
    const growing = this.bed.pose(age, time, sway);
    if (!growing && this.start >= 0) this.done = true;
  }
}
