import plusIcon from '../assets/icons/plus.svg';
import endIcon from '../assets/icons/works-end.svg';
import { config } from '../config';
import { nav } from '../nav';
import { readUnit } from '../ui/unit';
import { perspectiveFor, place, windowPhase } from './cylinder';
import { MOSAIC, PROJECTS, type Project } from './projects';

type Win = {
  el: HTMLElement;
  ox: number; // centre horizontal, en px depuis le centre de l'écran
  rankIn: number;
  rankOut: number;
};

type Section = {
  index: number;
  project: Project | null; // null = accueil
  wins: Win[];
  video: HTMLVideoElement | null;
  images: HTMLImageElement[]; // chargées seulement à l'approche de la section
  loaded: boolean;
  el: HTMLElement | null; // l'article de la page (retiré du rendu quand elle est loin)
};

const NAV_SLOTS = 8;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Pages projets : fenêtres qui arrivent par le côté en volant sur un cylindre invisible,
 * une section visible à la fois. L'accueil (bio) repart de la même façon vers la gauche.
 */
export class WorksView {
  private root: HTMLElement;
  private stage: HTMLElement;
  private navEl: HTMLElement;
  private navItems: HTMLButtonElement[] = [];
  private button: HTMLButtonElement;
  private buttonLabel: HTMLElement;
  private sections: Section[] = [];
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private mobileQuery = window.matchMedia('(max-width: 767px)');
  private width = 0;
  private hoverVideo: HTMLVideoElement | null = null;
  private current = -1;

  constructor(landing: HTMLElement, private trail: () => HTMLElement | null) {
    this.root = document.createElement('section');
    this.root.className = 'works';
    this.root.setAttribute('aria-label', 'Works');
    this.stage = document.createElement('div');
    this.stage.className = 'works-stage';
    this.root.appendChild(this.stage);

    // Section 0 : l'accueil, traité comme une seule grande fenêtre.
    this.sections.push({
      index: 0,
      project: null,
      wins: [{ el: landing, ox: 0, rankIn: 0.5, rankOut: 0.5 }],
      video: null,
      images: [],
      loaded: true,
      el: null,
    });
    for (const project of PROJECTS) this.sections.push(this.buildProject(project));

    // Rangée 1-8 + symbole (retour à l'accueil).
    this.navEl = document.createElement('nav');
    this.navEl.className = 'works-nav';
    this.navEl.setAttribute('aria-label', 'Projets');
    for (let n = 1; n <= NAV_SLOTS; n++) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'works-nav__item';
      item.style.setProperty('--k', String(n - 1));
      item.innerHTML = `<span class="works-nav__num">${n}</span>`;
      const project = PROJECTS.find((p) => p.number === n);
      if (project) {
        item.setAttribute('aria-label', `${n} — ${project.title}`);
        item.addEventListener('click', () => nav.goTo(n));
      } else {
        item.classList.add('is-empty');
        item.setAttribute('aria-disabled', 'true');
        item.tabIndex = -1;
      }
      this.navItems.push(item);
      this.navEl.appendChild(item);
    }
    const end = document.createElement('button');
    end.type = 'button';
    end.className = 'works-nav__end';
    end.setAttribute('aria-label', "Retour à l'accueil");
    end.innerHTML = `<img src="${endIcon}" alt="" width="12" height="12" />`;
    end.addEventListener('click', () => nav.goTo(0));
    this.navEl.appendChild(end);

    // Bouton vert « PROJET + » (UI seulement pour l'instant).
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'project-btn';
    this.buttonLabel = document.createElement('span');
    this.buttonLabel.className = 'project-btn__label';
    this.button.append(this.buttonLabel);
    this.button.insertAdjacentHTML('beforeend', `<img class="project-btn__plus" src="${plusIcon}" alt="" width="12" height="12" />`);

    landing.after(this.root, this.navEl, this.button);

    window.addEventListener('resize', () => this.layout());
    document.addEventListener('visibilitychange', () => this.syncVideos(nav.p));
    this.layout();
    nav.onProgress((p) => this.update(p));
  }

  private buildProject(project: Project): Section {
    const el = document.createElement('article');
    el.className = `project project--${project.layout}`;
    el.dataset.id = project.id;
    el.setAttribute('aria-label', project.title);
    this.stage.appendChild(el);

    const wins: Win[] = [];
    const win = (cls: string) => {
      const w = document.createElement('div');
      w.className = `project__win ${cls}`;
      el.appendChild(w);
      const entry = { el: w, ox: 0, rankIn: 0, rankOut: 0 };
      wins.push(entry);
      return w;
    };

    let video: HTMLVideoElement | null = null;
    const images: HTMLImageElement[] = [];
    const addMain = () => {
      const w = win('project__main');
      if (project.main.kind === 'video') {
        video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'none';
        video.dataset.poster = project.main.poster;
        video.dataset.src = project.main.video;
        video.setAttribute('aria-label', project.title);
        w.appendChild(video);
      } else {
        w.classList.add('is-placeholder');
      }
    };

    if (project.layout === 'mosaic') {
      // Même ordre d'empilement que la maquette : le grand rectangle vient après les 7 premiers carrés.
      project.side.forEach((media, i) => {
        if (i === 7) addMain();
        const w = win('project__side');
        const img = document.createElement('img');
        img.dataset.src = media.image;
        img.alt = '';
        img.decoding = 'async';
        images.push(img);
        w.appendChild(img);
        if (media.video) this.hoverToPlay(w, media.video, () => video);
      });
      if (project.side.length <= 7) addMain();
    } else {
      addMain();
    }

    const text = win('project__text');
    text.innerHTML = project.lines.map((l) => `<span>${l}</span>`).join('');
    text.style.setProperty('--text-width', String(project.textWidth));

    el.style.display = 'none';
    return { index: project.number, project, wins, video, images, loaded: false, el };
  }

  // Une vidéo à la fois : survoler un carré vidéo met la vidéo centrale en pause.
  private hoverToPlay(win: HTMLElement, src: string, main: () => HTMLVideoElement | null): void {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let v: HTMLVideoElement | null = null;
    win.addEventListener('pointerenter', () => {
      if (!v) {
        v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.src = src;
        win.appendChild(v);
      }
      main()?.pause();
      this.hoverVideo = v;
      win.classList.add('is-playing');
      v.currentTime = 0;
      v.play().catch(() => undefined);
    });
    win.addEventListener('pointerleave', () => {
      win.classList.remove('is-playing');
      v?.pause();
      this.hoverVideo = null;
      this.syncVideos(nav.p);
    });
  }

  // Place les fenêtres d'après la maquette dans le cadre de contenu.
  private layout(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mobile = this.mobileQuery.matches;
    const u = readUnit();
    const box = mobile ? config.works.box.mobile : config.works.box.desktop;
    const bx = box.side * u;
    const by = box.top * u;
    const bw = W - 2 * bx;
    const bh = H - by - box.bottom * u;
    this.width = W;
    this.stage.style.setProperty('--persp', `${perspectiveFor(H)}px`);

    const set = (win: Win, x: number, y: number, w: number, h: number) => {
      Object.assign(win.el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      win.ox = x + w / 2 - W / 2;
      const xn = Math.min(1, Math.max(0, (x + w / 2) / W));
      const j = () => (Math.random() - 0.5) * config.works.jitter;
      // Arrivée par la droite : la fenêtre la plus à gauche arrive en premier ; départ : idem.
      win.rankIn = Math.min(1, Math.max(0, xn + j()));
      win.rankOut = Math.min(1, Math.max(0, xn + j()));
    };

    for (const section of this.sections) {
      const project = section.project;
      if (!project) continue;
      const wins = section.wins;
      const text = wins[wins.length - 1];
      const main = wins.find((w) => w.el.classList.contains('project__main'))!;
      const sides = wins.filter((w) => w.el.classList.contains('project__side'));

      if (project.layout === 'mosaic' && !mobile) {
        const s = Math.min(bw / MOSAIC.width, bh / MOSAIC.height);
        const ox = bx + (bw - MOSAIC.width * s) / 2;
        const oy = by + (bh - MOSAIC.height * s) / 2;
        sides.forEach((w, i) => {
          const [c, r] = MOSAIC.cells[i];
          set(w, ox + MOSAIC.columns[c] * s, oy + MOSAIC.rows[r] * s, MOSAIC.square.w * s, MOSAIC.square.h * s);
          w.el.hidden = false;
        });
        const m = MOSAIC.center;
        set(main, ox + m.x * s, oy + m.y * s, m.w * s, m.h * s);
      } else if (project.layout === 'mosaic') {
        // Mobile (hors maquette) : seulement la vidéo centrale, à la hauteur du cadre.
        sides.forEach((w) => (w.el.hidden = true));
        const h = bh;
        const w = Math.min(bw, (h * MOSAIC.center.w) / MOSAIC.center.h);
        set(main, (W - w) / 2, by, w, h);
      } else {
        set(main, bx, by, bw, bh);
      }

      // Texte centré sur la fenêtre principale.
      const mw = parseFloat(main.el.style.width);
      const mh = parseFloat(main.el.style.height);
      const ml = parseFloat(main.el.style.left);
      const mt = parseFloat(main.el.style.top);
      const tw = Math.min(project.textWidth * u, bw - 20 * u);
      set(text, ml + (mw - tw) / 2, mt + mh / 2, tw, 0);
      text.el.style.height = 'auto';
      text.el.style.transformOrigin = '50% 0';
      text.rankIn = main.rankIn;
      text.rankOut = main.rankOut;
    }
    this.update(nav.p);
  }

  private update(p: number): void {
    const reduced = this.reduced.matches;

    for (const section of this.sections) {
      const d = section.index - p;
      const far = Math.abs(d) >= 1.001;
      // Page lointaine : retirée du rendu (ni mise en page, ni calques graphiques).
      if (section.el) {
        section.el.style.display = far ? 'none' : '';
        if (far) continue;
      }
      for (const win of section.wins) {
        const phi = reduced ? Math.max(-1, Math.min(1, d)) : windowPhase(d, win.rankIn, win.rankOut);
        const { dx, dz, rotY, opacity } = place(phi, win.ox, this.width, reduced);
        const isLanding = section.index === 0;
        const isText = win.el.classList.contains('project__text');
        const persp = isLanding ? `perspective(${perspectiveFor(window.innerHeight)}px) ` : '';
        const center = isText ? 'translateY(-50%)' : '';
        // En place : pas de transformation 3D (évite un calque graphique inutile).
        win.el.style.transform =
          phi === 0 ? center : `${persp}translate3d(${dx}px, 0, ${dz}px) rotateY(${rotY}rad) ${center}`;
        win.el.style.opacity = String(opacity);
        win.el.style.visibility = far || opacity < 0.01 ? 'hidden' : 'visible';
      }
    }

    // Les apparitions de l'accueil s'effacent dès qu'on quitte l'accueil.
    const trail = this.trail();
    if (trail) trail.style.opacity = String(1 - smooth(0, 0.4, p));

    // Rangée et bouton : visibles sur les pages projets.
    const show = smooth(0.35, 0.85, p);
    this.navEl.style.opacity = this.button.style.opacity = String(show);
    this.navEl.style.visibility = this.button.style.visibility = show < 0.01 ? 'hidden' : 'visible';

    const current = Math.round(p);
    if (current !== this.current) {
      this.current = current;
      this.navItems.forEach((item, i) => {
        const on = i + 1 === current;
        item.classList.toggle('is-current', on);
        if (on) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      const project = PROJECTS.find((pr) => pr.number === current);
      if (project) this.buttonLabel.textContent = project.title;
    }

    this.syncVideos(p);
  }

  // Charge les médias des sections proches ; ne joue que la vidéo de la section affichée.
  private syncVideos(p: number): void {
    for (const section of this.sections) {
      const d = Math.abs(section.index - p);
      const v = section.video;
      if (d < 1.2 && !section.loaded) {
        section.loaded = true;
        for (const img of section.images) img.src = img.dataset.src!;
        if (v) {
          v.poster = v.dataset.poster!;
          v.src = v.dataset.src!;
          v.preload = 'auto';
        }
      }
      if (!v) continue;
      const active = d < 0.35 && !document.hidden && !this.hoverVideo;
      if (active && v.paused) v.play().catch(() => undefined);
      if (!active && !v.paused) v.pause();
    }
  }
}
