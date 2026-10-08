import plusIcon from '../assets/icons/plus.svg';
import endIcon from '../assets/icons/works-end.svg';
import { config } from '../config';
import { nav } from '../nav';
import { readUnit } from '../ui/unit';
import { Glow } from './glow';
import { drum, perspectiveFor } from './scrollFx';
import { MOSAIC, NAV_ROW, PROJECTS, SINGLE, boxRect, type Project } from './projects';

type Win = {
  el: HTMLElement;
  cy: number; // centre vertical à l'arrêt de sa page, en px écran
  h: number;
  speed: number; // parallaxe
  glow?: Glow; // halo lumineux autour de la fenêtre
};

type Slides = { img: HTMLImageElement; images: string[]; index: number; ready: boolean[] };

type Section = {
  index: number;
  project: Project | null; // null = accueil
  wins: Win[];
  main: HTMLVideoElement | null; // grande vidéo : en boucle, vitesse normale
  sideVideos: HTMLVideoElement[]; // vidéos des carrés (Take Care) : ralenties, vitesse normale au survol
  images: HTMLImageElement[]; // chargées seulement à l'approche de la section
  slides: Slides | null; // diaporama (en attendant une vidéo)
  videoGlows: { glow: Glow; video: HTMLVideoElement }[]; // halos à rafraîchir pendant la lecture
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

// Vidéo muette en boucle, chargée seulement à l'approche de sa page (data-src → src).
function lazyVideo(src: string, poster: string, rate: number): HTMLVideoElement {
  const v = document.createElement('video');
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'none';
  v.defaultPlaybackRate = rate;
  v.playbackRate = rate;
  v.dataset.src = src;
  v.dataset.poster = poster;
  return v;
}

/**
 * Accueil puis pages projets empilées verticalement (scroll fluide, voir nav.ts).
 * Chaque page est à ses proportions de maquette quand elle est à l'arrêt (texte au milieu de l'écran).
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
  private current = -1;
  private H = window.innerHeight;
  private persp = 0;

  constructor(landing: HTMLElement, private trail: () => HTMLElement | null) {
    this.root = document.createElement('section');
    this.root.className = 'works';
    this.root.setAttribute('aria-label', 'Works');
    this.root.style.setProperty('--hover-scale', String(config.works.hover.scale));
    this.stage = document.createElement('div');
    this.stage.className = 'works-stage';
    this.root.appendChild(this.stage);

    // Section 0 : l'accueil (la bio), qui défile comme un texte.
    this.sections.push({
      index: 0,
      project: null,
      wins: [{ el: landing, cy: 0, h: 0, speed: config.works.parallax.text }],
      main: null,
      sideVideos: [],
      images: [],
      slides: null,
      videoGlows: [],
      loaded: true,
      el: null,
    });
    for (const project of PROJECTS) this.sections.push(this.buildProject(project));

    // Rangée 1-8 + symbole (retour à l'accueil), derrière les vidéos des pages.
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
    // Fenêtre média : une boîte qui coupe l'image, et (option) un halo lumineux derrière.
    const mediaWin = (cls: string, withGlow = true) => {
      const w = win(cls);
      const box = document.createElement('div');
      box.className = 'project__media';
      w.appendChild(box);
      const glow = withGlow && config.works.glow.enabled ? new Glow(w) : undefined;
      wins[wins.length - 1].glow = glow;
      return { box, glow };
    };

    const images: HTMLImageElement[] = [];
    const sideVideos: HTMLVideoElement[] = [];
    const videoGlows: Section['videoGlows'] = [];
    const { sideRate } = config.works.hover;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const lazyImage = (src: string, glow?: Glow) => {
      const img = document.createElement('img');
      img.dataset.src = src;
      img.alt = '';
      img.decoding = 'async';
      if (glow) img.addEventListener('load', () => glow.paint(img));
      return img;
    };

    // Carrés (Take Care) : les vidéos tournent au ralenti, à vitesse normale sous la souris.
    for (const media of project.side) {
      const { box, glow } = mediaWin('project__side');
      if (media.video) {
        const v = lazyVideo(media.video, media.image, sideRate);
        v.setAttribute('aria-hidden', 'true');
        sideVideos.push(v);
        box.appendChild(v);
        if (glow) {
          v.addEventListener('loadeddata', () => glow.paint(v));
          videoGlows.push({ glow, video: v });
        }
        if (canHover) {
          box.parentElement!.addEventListener('pointerenter', () => (v.playbackRate = 1));
          box.parentElement!.addEventListener('pointerleave', () => (v.playbackRate = sideRate));
        }
      } else {
        const img = lazyImage(media.image, glow);
        images.push(img);
        box.appendChild(img);
      }
    }

    // Grande vidéo (ou diaporama, ou placeholder), au premier plan, devant les carrés.
    const { box: mainBox, glow: mainGlow } = mediaWin('project__main', project.main.kind !== 'placeholder');
    let main: HTMLVideoElement | null = null;
    let slides: Slides | null = null;
    if (project.main.kind === 'video') {
      main = lazyVideo(project.main.video, project.main.poster, 1);
      main.setAttribute('aria-label', project.title);
      mainBox.appendChild(main);
      if (mainGlow) {
        const v = main;
        v.addEventListener('loadeddata', () => mainGlow.paint(v));
        videoGlows.push({ glow: mainGlow, video: v });
      }
    } else if (project.main.kind === 'slides') {
      const img = lazyImage(project.main.images[0], mainGlow);
      img.alt = project.title;
      mainBox.appendChild(img);
      slides = { img, images: project.main.images, index: 0, ready: project.main.images.map(() => false) };
    } else {
      mainBox.parentElement!.classList.add('is-placeholder');
    }

    const text = win('project__text');
    text.innerHTML = `<p class="project__lines">${project.lines.map((l) => `<span>${l}</span>`).join('')}</p>`;

    el.style.display = 'none';
    return { index: project.number, project, wins, main, sideVideos, images, slides, videoGlows, loaded: false, el };
  }

  // Place les fenêtres de chaque page telles qu'elles sont à l'arrêt (proportions de la maquette).
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
      win.glow?.resize(w, win.h, u);
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
      const tw = mobile ? Math.min(project.textWidth * u, W - 40 * u) : project.textWidth * u;
      const textSpeed = config.works.parallax.text;
      text.el.classList.toggle('is-centered', mobile);
      const sideSpeed = (i: number) => vMin + (vMax - vMin) * hash(section.index * 31 + i);

      if (!mobile && project.layout === 'mosaic') {
        // Composition de la frame TAKE CARE, à l'identique, dans son cadre centré.
        const b = boxRect(MOSAIC.box, W, H, u);
        const { square, columns, rows, cells, center } = MOSAIC;
        sides.forEach((w, i) => {
          const [c, r] = cells[i];
          set(w, b.left + columns[c] * u, b.top + rows[r] * u, square.w * u, square.h * u, sideSpeed(i));
          w.el.hidden = false;
        });
        set(main, b.left + center.x * u, b.top + center.y * u, center.w * u, center.h * u, 1);
        set(text, W / 2 + MOSAIC.box.dx * u - tw / 2, b.top + MOSAIC.textTop * u, tw, null, textSpeed);
        text.cy = H / 2;
      } else if (!mobile) {
        // LONGTEMPS / FORMULA ONE : grand cadre centré, texte centré dessus.
        const b = boxRect(SINGLE.box, W, H, u);
        set(main, b.left, b.top, b.width, b.height, 1);
        set(text, W / 2 + SINGLE.textDx * u - tw / 2, b.top + SINGLE.textTop * u, tw, null, textSpeed);
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

    // Rangée 1-8 (desktop) : calée sur le cadre des pages ; répartition régulière sur mobile (CSS).
    const row = boxRect(SINGLE.box, W, H, u);
    this.navItems.forEach((item, i) => item.style.setProperty('--cx', `${row.left + NAV_ROW.numbers[i] * u}px`));
    this.navEl.style.setProperty('--end-cx', `${row.left + NAV_ROW.end * u}px`);
    this.navEl.style.setProperty('--row-y', `${row.top + NAV_ROW.y * u}px`);
    this.navEl.style.setProperty('--row-y-current', `${row.top + NAV_ROW.currentY * u}px`);
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
    // (masqués sur l'accueil et sur le footer, qui suit le dernier projet)
    const last = PROJECTS.length;
    const show = smooth(0.45, 0.85, scroll / D) * (1 - smooth(last + 0.35, last + 0.75, scroll / D));
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

  // Charge les médias des sections proches ; les vidéos de la section affichée tournent toutes
  // (grande vidéo à vitesse normale, carrés au ralenti), les autres sont en pause.
  private syncVideos(scroll: number): void {
    const D = nav.sectionHeight;
    const mobile = this.mobileQuery.matches;
    let activeSection: Section | null = null;
    for (const section of this.sections) {
      const d = Math.abs(scroll - nav.stopOf(section.index)) / D;
      // Sur mobile, les carrés sont masqués : leurs vidéos ne sont ni chargées ni jouées.
      const videos = section.main ? [section.main] : [];
      if (!mobile) videos.push(...section.sideVideos);

      if (d < 1.3) {
        if (!section.loaded) {
          section.loaded = true;
          for (const img of section.images) img.src = img.dataset.src!;
          // Diaporama : première image, et préchargement des suivantes (décodées avant d'être affichées).
          const slides = section.slides;
          if (slides) {
            slides.img.src = slides.images[0];
            slides.images.forEach((src, i) => {
              const pre = new Image();
              pre.src = src;
              pre.decode().then(() => (slides.ready[i] = true), () => undefined);
            });
          }
        }
        for (const v of videos) {
          if (v.src) continue;
          v.poster = v.dataset.poster!;
          v.src = v.dataset.src!;
          v.preload = 'auto';
        }
      }

      const active = d < 0.5 && !document.hidden;
      for (const v of videos) {
        if (active && v.paused && v.src) v.play().catch(() => undefined);
        if (!active && !v.paused) v.pause();
      }
      if (mobile) for (const v of section.sideVideos) if (!v.paused) v.pause();
      if (active) activeSection = section;
    }
    this.setActive(activeSection);
  }

  // Minuteries de la page affichée : diaporama (une image toutes les config.works.slideMs)
  // et rafraîchissement des halos de ses vidéos. Tout s'arrête quand on quitte la page.
  private active: Section | null = null;
  private timers: number[] = [];

  private setActive(section: Section | null): void {
    if (section === this.active) return;
    this.active = section;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    if (!section) return;

    const slides = section.slides;
    if (slides && slides.images.length > 1) {
      this.timers.push(
        window.setInterval(() => {
          // On n'avance que si l'image suivante est prête : jamais de fenêtre vide pendant un chargement.
          const next = (slides.index + 1) % slides.images.length;
          if (!slides.ready[next]) return;
          slides.index = next;
          slides.img.src = slides.images[next];
        }, config.works.slideMs),
      );
    }
    const glows = this.mobileQuery.matches ? section.videoGlows.filter((g) => g.video === section.main) : section.videoGlows;
    if (glows.length) {
      this.timers.push(
        window.setInterval(() => {
          for (const g of glows) if (!g.video.paused) g.glow.paint(g.video);
        }, 1000 / config.works.glow.videoFps),
      );
    }
  }
}
