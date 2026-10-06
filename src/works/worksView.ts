import plusIcon from '../assets/icons/plus.svg';
import endIcon from '../assets/icons/works-end.svg';
import { config } from '../config';
import { nav } from '../nav';
import { readUnit } from '../ui/unit';
import { drum, perspectiveFor } from './scrollFx';
import { MOSAIC, NAV_ROW, PROJECTS, SINGLE, resolve, type Project } from './projects';

type Win = {
  el: HTMLElement;
  cy: number; // centre vertical à l'arrêt de sa page, en px écran
  h: number;
  speed: number; // parallaxe
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
// Hasard déterministe (même vitesse de parallaxe pour une fenêtre donnée à chaque visite).
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Accueil puis pages projets empilées verticalement (scroll fluide, voir nav.ts).
 * Chaque page est à ses proportions Figma quand elle est à l'arrêt (texte au milieu de l'écran).
 * Pendant le scroll : parallaxe (fenêtres à des vitesses différentes, textes plus lents)
 * et twist façon perappelgren.de (la page se courbe comme un tambour, selon la vitesse).
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
  private hoverVideo: HTMLVideoElement | null = null;
  private current = -1;
  private H = window.innerHeight;
  private persp = 0;

  constructor(landing: HTMLElement, private trail: () => HTMLElement | null) {
    this.root = document.createElement('section');
    this.root.className = 'works';
    this.root.setAttribute('aria-label', 'Works');
    this.stage = document.createElement('div');
    this.stage.className = 'works-stage';
    this.root.appendChild(this.stage);

    // Section 0 : l'accueil (la bio), qui défile comme un texte.
    this.sections.push({
      index: 0,
      project: null,
      wins: [{ el: landing, cy: 0, h: 0, speed: config.works.parallax.text }],
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
    document.addEventListener('visibilitychange', () => this.syncVideos(nav.scroll));
    this.layout();
    nav.onScroll((scroll, velocity) => this.update(scroll, velocity));
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
      wins.push({ el: w, cy: 0, h: 0, speed: 1 });
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
    text.innerHTML = `<p class="project__lines">${project.lines.map((l) => `<span>${l}</span>`).join('')}</p>`;

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
      this.syncVideos(nav.scroll);
    });
  }

  // Place les fenêtres de chaque page telles qu'elles sont à l'arrêt (proportions Figma).
  private layout(): void {
    const W = window.innerWidth;
    const H = (this.H = window.innerHeight);
    const mobile = this.mobileQuery.matches;
    const u = readUnit();
    this.persp = perspectiveFor(H);
    this.stage.style.setProperty('--persp', `${this.persp}px`);

    const [vMin, vMax] = config.works.parallax.windows;
    const set = (win: Win, x: number, y: number, w: number, h: number | null, speed: number) => {
      Object.assign(win.el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: h === null ? 'auto' : `${h}px` });
      win.h = h ?? 60;
      win.cy = y + win.h / 2;
      win.speed = speed;
    };

    // Accueil : la bio est centrée à l'écran.
    const landing = this.sections[0].wins[0];
    landing.cy = H / 2;
    landing.h = H;

    for (const section of this.sections) {
      const project = section.project;
      if (!project) continue;
      const wins = section.wins;
      const text = wins[wins.length - 1];
      const main = wins.find((w) => w.el.classList.contains('project__main'))!;
      const sides = wins.filter((w) => w.el.classList.contains('project__side'));
      const tw = mobile ? Math.min(project.textWidth * u, W - 40 * u) : project.textWidth;
      const textSpeed = config.works.parallax.text;
      text.el.classList.toggle('is-centered', mobile);
      const sideSpeed = (i: number) => vMin + (vMax - vMin) * hash(section.index * 31 + i);

      if (!mobile && project.layout === 'mosaic') {
        // Contraintes Figma de la frame TAKE CARE, telles quelles.
        sides.forEach((w, i) => {
          const [c, r] = MOSAIC.cells[i];
          set(w, resolve(MOSAIC.columns[c], W), resolve(MOSAIC.rows[r], H), MOSAIC.square.w, MOSAIC.square.h, sideSpeed(i));
          w.el.hidden = false;
        });
        const m = MOSAIC.center;
        set(main, resolve(m.left, W), resolve(m.top, H), m.w, m.h, 1);
        set(text, W / 2 + 0.5 - tw / 2, resolve(MOSAIC.text.top, H), tw, null, textSpeed);
        text.cy = H / 2;
      } else if (!mobile) {
        // Contraintes Figma des frames LONGTEMPS / FORMULA ONE.
        const f = SINGLE.frame;
        set(main, W / 2 - f.w / 2, resolve(f.centerY, H) - f.h / 2, f.w, f.h, 1);
        set(text, W / 2 + 0.5 - tw / 2, resolve(SINGLE.text.top, H), tw, null, textSpeed);
        text.cy = H / 2;
      } else {
        // Mobile (hors maquette) : la vidéo seule, à la hauteur du cadre ; texte centré dessus.
        const box = config.works.box.mobile;
        const by = box.top * u;
        const bh = H - by - box.bottom * u;
        const bw = W - 2 * box.side * u;
        sides.forEach((w) => (w.el.hidden = true));
        const w = project.layout === 'mosaic' ? Math.min(bw, (bh * MOSAIC.center.w) / MOSAIC.center.h) : bw;
        set(main, (W - w) / 2, by, w, bh, 1);
        set(text, (W - tw) / 2, by + bh / 2, tw, null, textSpeed);
        text.cy = by + bh / 2;
      }
    }

    // Rangée 1-8 : positions de la maquette (desktop) ; répartition régulière sur mobile (CSS).
    this.navItems.forEach((item, i) => {
      const left = NAV_ROW.numbers[i];
      item.style.setProperty('--left', `calc(${left.pct * 100}% + ${left.px + NAV_ROW.circleOffset}px)`);
    });
    this.navEl.style.setProperty('--end-left', `${NAV_ROW.end.pct * 100}%`);
    this.update(nav.scroll, nav.velocity);
  }

  private update(scroll: number, velocity: number): void {
    const H = this.H;
    const reduced = this.reduced.matches;
    const D = nav.sectionHeight;

    for (const section of this.sections) {
      const off = scroll - nav.stopOf(section.index); // > 0 : la page est passée vers le haut
      const far = Math.abs(off) > D * 1.6;
      if (section.el) {
        section.el.style.display = far ? 'none' : '';
        if (far) continue;
      }
      const isLanding = section.index === 0;
      for (const win of section.wins) {
        const y = -off * win.speed;
        const top = win.cy - win.h / 2 + y;
        const visible = top < H + 80 && top + win.h > -80;
        win.el.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) continue;
        const fx = reduced ? { rotX: 0, z: 0 } : drum(win.cy + y - H / 2, H, velocity);
        if (y === 0 && fx.rotX === 0) {
          win.el.style.transform = '';
          continue;
        }
        const persp = isLanding ? `perspective(${this.persp}px) ` : '';
        win.el.style.transform = `${persp}translate3d(0, ${y}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
      }
    }

    // Les apparitions de l'accueil s'effacent dès qu'on quitte l'accueil.
    const trail = this.trail();
    if (trail) trail.style.opacity = String(1 - smooth(0, 0.35, scroll / D));

    // Rangée et bouton : visibles sur les pages projets.
    const show = smooth(0.45, 0.85, scroll / D);
    this.navEl.style.opacity = this.button.style.opacity = String(show);
    this.navEl.style.visibility = this.button.style.visibility = show < 0.01 ? 'hidden' : 'visible';

    const current = nav.section;
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

    this.syncVideos(scroll);
  }

  // Charge les médias des sections proches ; ne joue que la vidéo de la section affichée.
  private syncVideos(scroll: number): void {
    const D = nav.sectionHeight;
    for (const section of this.sections) {
      const d = Math.abs(scroll - nav.stopOf(section.index)) / D;
      const v = section.video;
      if (d < 1.3 && !section.loaded) {
        section.loaded = true;
        for (const img of section.images) img.src = img.dataset.src!;
        if (v) {
          v.poster = v.dataset.poster!;
          v.src = v.dataset.src!;
          v.preload = 'auto';
        }
      }
      if (!v) continue;
      const active = d < 0.5 && !document.hidden && !this.hoverVideo;
      if (active && v.paused) v.play().catch(() => undefined);
      if (!active && !v.paused) v.pause();
    }
  }
}
