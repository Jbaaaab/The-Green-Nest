import { config } from '../config';
import { nav } from '../nav';
import { Glow } from './glow';
import { lazyVideo, loadVideo } from './lazyVideo';
import { SOCIAL, boxRect, type Project, type SideMedia } from './projects';
import { drum } from './scrollFx';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Column = { el: HTMLElement; x: number }; // x : bord gauche à l'arrêt (px écran)

/**
 * Page SOCIAL MEDIA : on descend sur une page blanche, les posts arrivent du côté droit, colonne par
 * colonne, et forment une mosaïque de petits carrés triés par couleur (6 rangées) autour d'un grand
 * rectangle vidéo qui reste au centre. La mosaïque dépasse à droite : le scroll la fait défiler vers la
 * droite (la page reste fixe pendant sa zone, nav.holdOf), puis le scroll vertical reprend vers le footer.
 */
export class SocialView {
  readonly index: number;
  private el: HTMLElement;
  private grid: HTMLElement;
  private media: SideMedia[];
  private columns: Column[] = [];
  private geo = { left: 0, top: 0, height: 0, tileW: 0, tileH: 0, gapY: 0 }; // mosaïque à l'arrêt (px écran)
  private images: HTMLImageElement[] = [];
  private videos: HTMLVideoElement[] = [];
  private main: HTMLElement;
  private mainVideo: HTMLVideoElement;
  private glow?: Glow;
  private glowTimer = 0;
  private loaded = false;
  private building = false;
  private W = window.innerWidth;
  private H = window.innerHeight;
  private tileW = 0;
  private pitch = 0; // distance entre deux colonnes (px écran)
  private travel = 0; // longueur du défilement horizontal (px écran)
  private gridCy = 0;
  private mainCy = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(stage: HTMLElement, project: Project) {
    this.index = project.number;
    this.media = project.side;
    this.el = document.createElement('article');
    this.el.className = 'project project--social';
    this.el.dataset.id = project.id;
    this.el.setAttribute('aria-label', project.title);
    this.el.style.display = 'none';

    // Mosaïque : une centaine de carrés, construits seulement quand on quitte l'accueil (voir sync).
    this.grid = document.createElement('div');
    this.grid.className = 'social__grid';

    // Grand rectangle vidéo, au centre, devant la mosaïque, avec son halo.
    this.main = document.createElement('div');
    this.main.className = 'project__win project__main';
    const box = document.createElement('div');
    box.className = 'project__media';
    this.main.appendChild(box);
    if (project.main.kind !== 'video') throw new Error('Social Media : vidéo centrale attendue');
    this.mainVideo = lazyVideo(project.main.video, project.main.poster, 1);
    this.mainVideo.setAttribute('aria-label', project.title);
    box.appendChild(this.mainVideo);
    if (config.works.glow.enabled) {
      const glow = (this.glow = new Glow(this.main));
      this.mainVideo.addEventListener('loadeddata', () => glow.paint(this.mainVideo));
    }

    this.el.append(this.grid, this.main);
    stage.appendChild(this.el);
  }

  // Une colonne de 6 carrés par élément (c'est la colonne qui bouge).
  private build(): void {
    if (this.columns.length) return;
    const { sideRate } = config.works.hover;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let column: HTMLElement | null = null;
    this.media.forEach((media, i) => {
      if (i % SOCIAL.rows === 0) {
        column = document.createElement('div');
        column.className = 'social__col';
        this.grid.appendChild(column);
        this.columns.push({ el: column, x: 0 });
      }
      const tile = document.createElement('div');
      tile.className = 'social__tile';
      // Première rangée : elle passe devant le chiffre 3D de la rangée 1-8 (masque, voir digits.ts).
      if (i % SOCIAL.rows === 0) tile.classList.add('is-top');
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
      column!.appendChild(tile);
    });
    this.placeColumns();
  }

  private placeColumns(): void {
    const { left, top, height, tileW, tileH, gapY } = this.geo;
    this.columns.forEach((col, c) => {
      col.x = left + c * this.pitch;
      Object.assign(col.el.style, { left: `${col.x}px`, top: `${top}px`, width: `${tileW}px`, height: `${height}px` });
      Array.from(col.el.children as HTMLCollectionOf<HTMLElement>).forEach((tile, r) => {
        Object.assign(tile.style, { top: `${r * (tileH + gapY)}px`, width: `${tileW}px`, height: `${tileH}px` });
      });
    });
  }

  /** Place la mosaïque et le grand rectangle à l'arrêt ; donne à la navigation la longueur du défilement. */
  layout(W: number, H: number, u: number, mobile: boolean): void {
    this.W = W;
    this.H = H;
    const rows = SOCIAL.rows;
    let left: number, top: number, width: number, height: number, tileW: number, tileH: number, gapX: number, gapY: number;
    let main: { x: number; y: number; w: number; h: number };

    if (!mobile) {
      // Cadre de Take Care ; 10 colonnes et 6 rangées le remplissent exactement.
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

    this.tileW = tileW;
    this.pitch = tileW + gapX;
    this.geo = { left, top, height, tileW, tileH, gapY };
    this.placeColumns();
    this.gridCy = top + height / 2;
    this.grid.style.transformOrigin = `50% ${this.gridCy}px`;

    Object.assign(this.main.style, { left: `${main.x}px`, top: `${main.y}px`, width: `${main.w}px`, height: `${main.h}px` });
    this.mainCy = main.y + main.h / 2;
    this.glow?.resize(main.w, main.h, u);

    // La mosaïque défile jusqu'à ce que sa dernière colonne touche le bord droit du cadre.
    const count = Math.ceil(this.media.length / rows);
    this.travel = Math.max(0, count * this.pitch - gapX - width);
    nav.setHold(this.index, this.travel * config.social.scrollPerPx, true);
  }

  update(scroll: number, velocity: number): void {
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
    const vx = pinned && !reduced && config.social.twist ? velocity : 0;

    // La page monte ou descend avec le scroll, et se courbe comme les autres (twist vertical).
    const page = (el: HTMLElement, cy: number) => {
      const fx = drum(cy - off - H / 2, H, vy);
      el.style.transform = off === 0 && fx.rotX === 0 ? '' : `translate3d(0, ${-off}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
    };
    page(this.grid, this.gridCy);
    page(this.main, this.mainCy);
    this.main.style.visibility = 'visible';

    // Arrivée : pendant la fin de l'approche, les colonnes arrivent de la droite, la plus à gauche d'abord.
    const arrive = off < 0 && !reduced ? clamp01(1 + off / (D * config.social.arrive)) : 1;
    const { stagger } = config.social;
    const lastDelay = (SOCIAL.columns + 2) * stagger;
    const shift = -nav.holdProgress(this.index, scroll) * this.travel; // défilement horizontal

    this.columns.forEach((col, c) => {
      const e = easeOutCubic(clamp01((arrive - Math.min(c, SOCIAL.columns + 2) * stagger) / (1 - lastDelay)));
      const x = shift + (1 - e) * (W - col.x + this.pitch);
      const cx = col.x + x + this.tileW / 2;
      const visible = cx > -this.pitch && cx < W + this.pitch;
      col.el.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) return;
      // Twist horizontal : à gauche la colonne recule par la gauche, à droite par la droite.
      const fx = drum(cx - W / 2, W, vx);
      col.el.style.transform = `translate3d(${x}px, 0, ${fx.z}px) rotateY(${-fx.rotX}rad)`;
    });
  }

  // Charge les médias à l'approche ; les vidéos tournent quand la page est affichée.
  sync(scroll: number): void {
    const d = Math.abs(nav.offsetOf(this.index, scroll)) / nav.sectionHeight;
    // Carrés construits dès qu'on quitte l'accueil, quand le navigateur est libre (tout de suite s'ils sont proches).
    if (d < 1.6) this.build();
    else if (d < this.index - 0.5 && !this.building) {
      this.building = true;
      const later = () => this.build();
      if ('requestIdleCallback' in window) requestIdleCallback(later, { timeout: 1000 });
      else setTimeout(later, 300);
    }
    if (d < 1.3 && !this.loaded) {
      this.loaded = true;
      for (const img of this.images) img.src = img.dataset.src!;
      for (const v of [this.mainVideo, ...this.videos]) loadVideo(v);
    }
    const active = d < 0.5 && !document.hidden;
    for (const v of [this.mainVideo, ...this.videos]) {
      if (active && v.paused && v.src) v.play().catch(() => undefined);
      if (!active && !v.paused) v.pause();
    }
    // Halo de la vidéo centrale rafraîchi pendant la lecture.
    if (active && !this.glowTimer && this.glow) {
      const glow = this.glow;
      this.glowTimer = window.setInterval(() => {
        if (!this.mainVideo.paused) glow.paint(this.mainVideo);
      }, 1000 / config.works.glow.videoFps);
    } else if (!active && this.glowTimer) {
      clearInterval(this.glowTimer);
      this.glowTimer = 0;
    }
  }
}
