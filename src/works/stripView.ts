import { config } from '../config';
import { nav } from '../nav';
import { Glow, paletteColor } from './glow';
import { lazyVideo, loadVideo } from './lazyVideo';
import { POSTERS, SOCIAL, boxRect, type Project, type SideMedia } from './projects';
import { drum } from './scrollFx';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const HALO_CELL = 4; // taille CSS d'un pixel du halo avant agrandissement (px)
const HALO_ROWS = 6; // résolution verticale du halo (pixels sur la hauteur de la bande)

type Rect = { x: number; y: number; w: number; h: number };

/** La bande à l'arrêt, en px écran. */
type Plan = {
  columns: { x: number; w: number; tiles: { y: number; h: number }[] }[]; // x : bord gauche ; y : depuis le haut de la bande
  top: number;
  height: number;
  frameRight: number; // le défilement s'arrête quand la dernière colonne touche ce bord
  gapX: number;
  gapY: number;
  main: Rect | null; // grande vidéo fixe au centre (Social Media)
  visible: number; // colonnes dans le cadre à l'arrêt (rythme de leur arrivée)
};

type StripConfig = { scrollPerPx: number; arrive: number; stagger: number; twist: boolean; glowPalette: string[] | null };

type Column = { el: HTMLElement; x: number; w: number };

/**
 * Page en bande horizontale (Social Media, Music & Culture) : on descend sur une page blanche, les colonnes
 * arrivent du côté droit une à une, puis à l'arrêt la bande défile vers la droite (la page reste fixe pendant
 * sa zone, nav.holdOf ; 1 px de scroll = 1 px de défilement), avant que le scroll vertical reprenne.
 * Pendant le défilement, les colonnes se courbent comme un tambour vertical (twist, selon la vitesse).
 * Un halo global (un aplat de la couleur moyenne de chaque case, flouté) éclaire autour et entre les cases.
 * Le texte de la page est géré par worksView.ts, comme ceux des autres pages.
 */
export class StripView {
  readonly index: number;
  private el: HTMLElement;
  private grid: HTMLElement;
  private columns: Column[] = [];
  private halo: HTMLCanvasElement | null = null;
  private haloScale = { x: 1, y: 1 };
  private plan: Plan | null = null;
  private images: HTMLImageElement[] = [];
  private videos: HTMLVideoElement[] = [];
  private main: HTMLElement | null = null;
  private mainVideo: HTMLVideoElement | null = null;
  private glow?: Glow;
  private glowTimer = 0;
  private loaded = false;
  private building = false;
  private W = window.innerWidth;
  private H = window.innerHeight;
  private travel = 0; // longueur du défilement horizontal (px écran)
  private gridCy = 0;
  private mainCy = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * groups : nombre de cases de chaque colonne (les médias, dans l'ordre, les remplissent colonne par colonne) ;
   * planner : géométrie de la bande à l'arrêt pour une taille d'écran.
   */
  constructor(
    stage: HTMLElement,
    project: Project,
    private media: SideMedia[],
    private groups: number[],
    private planner: (W: number, H: number, u: number, mobile: boolean) => Plan,
    private cfg: StripConfig,
  ) {
    this.index = project.section;
    this.el = document.createElement('article');
    this.el.className = `project project--strip project--${project.layout}`;
    this.el.dataset.id = project.id;
    this.el.setAttribute('aria-label', project.title);
    this.el.style.display = 'none';

    // Colonnes : construites seulement quand on quitte l'accueil (voir sync).
    this.grid = document.createElement('div');
    this.grid.className = 'strip__grid';

    // Halo de la bande : une image minuscule, floutée et agrandie derrière les cases (dessinée dans layout).
    if (config.works.glow.enabled) {
      this.halo = document.createElement('canvas');
      this.halo.className = 'strip__glow';
      this.halo.setAttribute('aria-hidden', 'true');
      this.el.append(this.halo);
    }
    this.el.append(this.grid);

    // Grand rectangle vidéo, au centre, devant la bande, avec son halo (Social Media : le case).
    if (project.main.kind === 'video') {
      const main = (this.main = document.createElement('div'));
      main.className = 'project__win project__main';
      const box = document.createElement('div');
      box.className = 'project__media';
      main.appendChild(box);
      const video = (this.mainVideo = lazyVideo(project.main.video, project.main.poster, 1));
      video.setAttribute('aria-label', project.title);
      box.appendChild(video);
      if (config.works.glow.enabled) {
        const glow = (this.glow = new Glow(main, cfg.glowPalette));
        video.addEventListener('loadeddata', () => glow.paint(video));
      }
      this.el.append(main);
    }
    stage.appendChild(this.el);
  }

  // Une colonne par élément (c'est la colonne qui bouge).
  private build(): void {
    if (this.columns.length) return;
    const { sideRate } = config.works.hover;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let i = 0;
    for (const count of this.groups) {
      const column = document.createElement('div');
      column.className = 'strip__col';
      this.grid.appendChild(column);
      this.columns.push({ el: column, x: 0, w: 0 });
      for (let r = 0; r < count; r++) {
        const media = this.media[i++];
        const tile = document.createElement('div');
        tile.className = 'strip__tile';
        // Première rangée : elle passe devant le chiffre 3D de la rangée 1-8 (masque, voir digits.ts).
        if (r === 0) tile.classList.add('is-top');
        if (media.color) tile.style.backgroundColor = media.color; // couleur moyenne en attendant l'image
        if (media.video) {
          const v = lazyVideo(media.video, media.image, sideRate);
          v.setAttribute('aria-hidden', 'true');
          this.videos.push(v);
          tile.appendChild(v);
          if (canHover) {
            tile.addEventListener('pointerenter', () => (v.playbackRate = 1));
            tile.addEventListener('pointerleave', () => (v.playbackRate = sideRate));
          }
        } else {
          const img = document.createElement('img');
          img.dataset.src = media.image;
          img.alt = '';
          img.decoding = 'async';
          this.images.push(img);
          tile.appendChild(img);
        }
        column.appendChild(tile);
      }
    }
    this.placeColumns();
  }

  private placeColumns(): void {
    const plan = this.plan;
    if (!plan) return;
    this.columns.forEach((col, c) => {
      const p = plan.columns[c];
      col.x = p.x;
      col.w = p.w;
      Object.assign(col.el.style, { left: `${p.x}px`, top: `${plan.top}px`, width: `${p.w}px`, height: `${plan.height}px` });
      Array.from(col.el.children as HTMLCollectionOf<HTMLElement>).forEach((tile, r) => {
        const t = p.tiles[r];
        Object.assign(tile.style, { top: `${t.y}px`, width: `${p.w}px`, height: `${t.h}px` });
      });
    });
  }

  /** Place la bande et le grand rectangle à l'arrêt ; donne à la navigation la longueur du défilement. */
  layout(W: number, H: number, u: number, mobile: boolean): void {
    this.W = W;
    this.H = H;
    const plan = (this.plan = this.planner(W, H, u, mobile));
    this.placeColumns();
    this.gridCy = plan.top + plan.height / 2;
    this.grid.style.transformOrigin = `50% ${this.gridCy}px`;

    const main = plan.main;
    if (this.main && main) {
      Object.assign(this.main.style, { left: `${main.x}px`, top: `${main.y}px`, width: `${main.w}px`, height: `${main.h}px` });
      this.mainCy = main.y + main.h / 2;
      this.glow?.resize(main.w, main.h, u);
    }

    // La bande défile jusqu'à ce que sa dernière colonne touche le bord droit du cadre.
    const first = plan.columns[0];
    const last = plan.columns[plan.columns.length - 1];
    this.travel = Math.max(0, last.x + last.w - plan.frameRight);
    if (this.halo) this.paintHalo(plan, first.x, last.x + last.w - first.x, u);
    nav.setHold(this.index, this.travel * this.cfg.scrollPerPx, true);
  }

  // Halo : chaque case est un aplat de sa couleur moyenne (agrandi d'un demi-écart, pour éclairer aussi les
  // interstices), sur une image de 6 pixels de haut, floutée et agrandie pour couvrir la bande plus la marge
  // des halos (mêmes proportions que ceux des autres fenêtres).
  private paintHalo(plan: Plan, left: number, width: number, u: number): void {
    const canvas = this.halo!;
    const q = plan.height / HALO_ROWS; // px écran par pixel du halo
    const cols = Math.max(1, Math.round(width / q));
    canvas.width = cols;
    canvas.height = HALO_ROWS;
    const ctx = canvas.getContext('2d')!;
    const sx = cols / width;
    const sy = HALO_ROWS / plan.height;
    let i = 0;
    plan.columns.forEach((col, c) => {
      for (let r = 0; r < this.groups[c]; r++) {
        const color = this.media[i++].color ?? '#f2f2f2';
        const [R, G, B] = [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16));
        ctx.fillStyle = this.cfg.glowPalette ? `rgb(${paletteColor(R, G, B, this.cfg.glowPalette).join(',')})` : color;
        const t = col.tiles[r];
        ctx.fillRect((col.x - left - plan.gapX / 2) * sx, (t.y - plan.gapY / 2) * sy, (col.w + plan.gapX) * sx, (t.h + plan.gapY) * sy);
      }
    });

    const { margin, blur, saturate } = config.works.glow;
    const m = margin * u;
    const w = width + 2 * m;
    const h = plan.height + 2 * m;
    const cw = cols * HALO_CELL;
    const ch = HALO_ROWS * HALO_CELL;
    this.haloScale = { x: w / cw, y: h / ch };
    // Centré sur la bande, agrandi depuis son centre ; le flou s'applique avant l'agrandissement.
    Object.assign(canvas.style, {
      width: `${cw}px`,
      height: `${ch}px`,
      left: `${left - m + w / 2 - cw / 2}px`,
      top: `${plan.top - m + h / 2 - ch / 2}px`,
      filter: `blur(${((blur * u) / Math.sqrt(this.haloScale.x * this.haloScale.y)).toFixed(3)}px) saturate(${saturate})`,
    });
  }

  update(scroll: number, velocity: number): void {
    const plan = this.plan;
    if (!plan) return;
    const H = this.H;
    const W = this.W;
    const D = nav.sectionHeight;
    const off = nav.offsetOf(this.index, scroll); // < 0 : la page arrive ; 0 : à l'arrêt ou en défilement horizontal
    const far = Math.abs(off) > D * 1.6;
    this.el.style.display = far ? 'none' : '';
    if (far) return;

    const reduced = this.reduced.matches;
    const pinned = off === 0;
    // Pendant la zone fixe, la vitesse du scroll est celle du défilement horizontal.
    const vy = pinned || reduced ? 0 : velocity;
    const vx = pinned && !reduced && this.cfg.twist ? velocity : 0;

    // La page monte ou descend avec le scroll, et se courbe comme les autres (twist vertical).
    const page = (el: HTMLElement, cy: number) => {
      const fx = drum(cy - off - H / 2, H, vy);
      el.style.transform = off === 0 && fx.rotX === 0 ? '' : `translate3d(0, ${-off}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
    };
    page(this.grid, this.gridCy);
    if (this.main) {
      page(this.main, this.mainCy);
      this.main.style.visibility = 'visible';
    }

    // Arrivée : pendant la fin de l'approche, les colonnes arrivent de la droite, la plus à gauche d'abord.
    const arrive = off < 0 && !reduced ? clamp01(1 + off / (D * this.cfg.arrive)) : 1;
    const { stagger } = this.cfg;
    const lastDelay = (plan.visible + 2) * stagger;
    const shift = -nav.holdProgress(this.index, scroll) * this.travel; // défilement horizontal

    // Le halo suit la bande (page et défilement) et apparaît avec elle.
    if (this.halo) {
      const fx = drum(this.gridCy - off - H / 2, H, vy);
      const { x: sx, y: sy } = this.haloScale;
      this.halo.style.transform = `translate3d(${shift}px, ${-off}px, ${fx.z}px) rotateX(${fx.rotX}rad) scale(${sx}, ${sy})`;
      this.halo.style.opacity = String(config.works.glow.opacity * arrive * arrive);
    }

    this.columns.forEach((col, c) => {
      const e = easeOutCubic(clamp01((arrive - Math.min(c, plan.visible + 2) * stagger) / (1 - lastDelay)));
      const x = shift + (1 - e) * (W - col.x + col.w + plan.gapX);
      const left = col.x + x;
      const visible = left + col.w > -plan.gapX && left < W + plan.gapX;
      col.el.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) return;
      // Twist horizontal : à gauche la colonne recule par la gauche, à droite par la droite.
      const fx = drum(left + col.w / 2 - W / 2, W, vx);
      col.el.style.transform = `translate3d(${x}px, 0, ${fx.z}px) rotateY(${-fx.rotX}rad)`;
    });
  }

  // Charge les médias à l'approche ; les vidéos tournent quand la page est affichée.
  sync(scroll: number): void {
    const d = Math.abs(nav.offsetOf(this.index, scroll)) / nav.sectionHeight;
    // Colonnes construites dès qu'on quitte l'accueil, quand le navigateur est libre (tout de suite si proches).
    if (d < 1.6) this.build();
    else if (d < this.index - 0.5 && !this.building) {
      this.building = true;
      const later = () => this.build();
      if ('requestIdleCallback' in window) requestIdleCallback(later, { timeout: 1000 });
      else setTimeout(later, 300);
    }
    const videos = this.mainVideo ? [this.mainVideo, ...this.videos] : this.videos;
    if (d < 1.3 && !this.loaded) {
      this.loaded = true;
      for (const img of this.images) img.src = img.dataset.src!;
      for (const v of videos) loadVideo(v);
    }
    const active = d < 0.5 && !document.hidden;
    for (const v of videos) {
      if (active && v.paused && v.src) v.play().catch(() => undefined);
      if (!active && !v.paused) v.pause();
    }
    // Halo de la vidéo centrale rafraîchi pendant la lecture.
    const glow = this.glow;
    const main = this.mainVideo;
    if (active && !this.glowTimer && glow && main) {
      this.glowTimer = window.setInterval(() => {
        if (!main.paused) glow.paint(main);
      }, 1000 / config.works.glow.videoFps);
    } else if (!active && this.glowTimer) {
      clearInterval(this.glowTimer);
      this.glowTimer = 0;
    }
  }
}

/**
 * SOCIAL MEDIA : petits carrés (1/4 de ceux de Take Care), 6 rangées, dans le cadre de Take Care (écarts
 * recalculés pour que 10 colonnes le remplissent exactement), autour du grand rectangle vidéo (le case).
 * Colonnes toujours pleines : les posts en trop ne sont pas affichés.
 */
export function socialStrip(stage: HTMLElement, project: Project): StripView {
  const rows = SOCIAL.rows;
  const media = project.side.slice(0, project.side.length - (project.side.length % rows));
  const groups = new Array<number>(media.length / rows).fill(rows);
  const planner = (W: number, H: number, u: number, mobile: boolean): Plan => {
    let left: number, top: number, width: number, height: number, tileW: number, tileH: number, gapX: number, gapY: number;
    let main: Rect;
    if (!mobile) {
      const b = boxRect(SOCIAL.box, W, H, u);
      ({ left, top, width, height } = b);
      tileW = SOCIAL.tile.w * u;
      tileH = SOCIAL.tile.h * u;
      gapX = (width - SOCIAL.columns * tileW) / (SOCIAL.columns - 1);
      gapY = (height - rows * tileH) / (rows - 1);
      const c = SOCIAL.center;
      main = { x: left + c.x * u, y: top + c.y * u, w: c.w * u, h: c.h * u };
    } else {
      // Mobile (hors maquette) : 6 rangées sur la hauteur du cadre mobile, grand rectangle au milieu.
      const m = config.works.box.mobile;
      top = m.top * u;
      height = H - top - m.bottom * u;
      left = m.side * u;
      width = W - 2 * left;
      gapX = gapY = config.social.mobileGap * u;
      tileH = (height - (rows - 1) * gapY) / rows;
      tileW = (tileH * SOCIAL.tile.w) / SOCIAL.tile.h;
      const w = width * 0.62;
      const h = Math.min(height * 0.8, (w * SOCIAL.center.h) / SOCIAL.center.w);
      main = { x: (W - w) / 2, y: top + (height - h) / 2, w, h };
    }
    const tiles = Array.from({ length: rows }, (_, r) => ({ y: r * (tileH + gapY), h: tileH }));
    const columns = groups.map((_, c) => ({ x: left + c * (tileW + gapX), w: tileW, tiles }));
    return { columns, top, height, frameRight: left + width, gapX, gapY, main, visible: SOCIAL.columns };
  };
  return new StripView(stage, project, media, groups, planner, config.social);
}

/**
 * MUSIC & CULTURE : la pochette en grand, puis des colonnes de carrés et d'affiches (composées par
 * npm run assets, Project.columns), dans le cadre de Take Care, avec ses écarts. Pas de vidéo.
 */
export function postersStrip(stage: HTMLElement, project: Project): StripView {
  const shape = project.columns ?? [];
  const planner = (W: number, H: number, u: number, mobile: boolean): Plan => {
    const box = POSTERS.box;
    let left: number, top: number, frameRight: number, k: number;
    if (!mobile) {
      const b = boxRect(box, W, H, u);
      ({ left, top } = b);
      frameRight = b.left + b.width;
      k = u;
    } else {
      // Mobile (hors maquette) : la pochette tient dans la largeur du cadre, la bande est centrée dans sa hauteur.
      const m = config.works.box.mobile;
      left = m.side * u;
      frameRight = W - left;
      k = (frameRight - left) / box.h;
      const by = m.top * u;
      top = by + (H - by - m.bottom * u - box.h * k) / 2;
    }
    const height = box.h * k;
    const gapX = POSTERS.gapX * k;
    const gapY = POSTERS.gapY * k;
    let x = left;
    let visible = 0;
    const columns = shape.map(({ ratio, rows }) => {
      const h = (height - (rows - 1) * gapY) / rows;
      const w = h * ratio;
      const col = { x, w, tiles: Array.from({ length: rows }, (_, r) => ({ y: r * (h + gapY), h })) };
      if (x < frameRight) visible++;
      x += w + gapX;
      return col;
    });
    return { columns, top, height, frameRight, gapX, gapY, main: null, visible };
  };
  return new StripView(stage, project, project.side, shape.map((c) => c.rows), planner, config.musicCulture);
}
