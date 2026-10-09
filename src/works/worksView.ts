import plusIcon from '../assets/icons/plus.svg';
import endIcon from '../assets/icons/works-end.svg';
import { config } from '../config';
import { nav } from '../nav';
import { tint } from '../ui/tint';
import { readUnit } from '../ui/unit';
import { Glow } from './glow';
import { lazyVideo, loadVideo } from './lazyVideo';
import { drum, perspectiveFor } from './scrollFx';
import { MAGAZINE_PROJECT, magazineHold, magazinePauses } from './magazineTimeline';
import { MagazineTexts } from './magazineTexts';
import { StripView, postersStrip, socialStrip } from './stripView';
import { MOSAIC, NAV_ROW, PROJECTS, SINGLE, boxRect, type Project } from './projects';

type Win = {
  el: HTMLElement;
  cy: number; // centre vertical à l'arrêt de sa page, en px écran
  h: number;
  speed: number; // parallaxe
  glow?: Glow; // halo lumineux autour de la fenêtre
  // Texte : hors de sa page (calque .works-texts), il porte sa propre perspective, centrée sur l'écran.
  // Décalage du centre de l'écran par rapport au milieu du bord haut du texte (son transform-origin), en px.
  origin?: { x: number; y: number };
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

const NAV_SLOTS = Math.max(...PROJECTS.map((p) => p.number)); // un numéro par projet (1 à 7)
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
 * Chaque page est à ses proportions de maquette quand elle est à l'arrêt (texte au milieu de l'écran).
 * Pendant le scroll : parallaxe (fenêtres à des vitesses différentes, textes plus lents)
 * et twist façon perappelgren.de (la page se courbe comme un tambour, selon la vitesse).
 */
export class WorksView {
  private root: HTMLElement;
  private stage: HTMLElement;
  private texts: HTMLElement;
  private strips: StripView[] = []; // pages en bande horizontale (Social Media, Music & Culture)
  private magazineTexts: MagazineTexts | null = null;
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
    // Textes des projets en « noir négatif » (mode différence) : dans un calque à part, au-dessus des
    // pages, car .works isole les mélanges et le texte doit inverser aussi le blanc de la page.
    this.texts = document.createElement('div');
    this.texts.className = 'works-texts';

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
    for (const project of PROJECTS) {
      if (project.layout === 'social' || project.layout === 'posters') {
        // Bande et vidéo : stripView.ts ; le texte, comme sur les autres pages (parallaxe, twist).
        this.strips.push(project.layout === 'social' ? socialStrip(this.stage, project) : postersStrip(this.stage, project));
        this.sections.push(this.buildText(project));
      } else if (project.layout === 'magazine') {
        this.magazineTexts = new MagazineTexts(this.texts, project.section); // magazines : en 3D
      } else this.sections.push(this.buildProject(project));
    }

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
        item.addEventListener('click', () => nav.goTo(project.section));
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

    // Bouton vert « PROJET + » : le « + » déplie ce que le DA a fait sur le projet (Project.roles), précédé de
    // petites étoiles. Desktop : au survol, et un clic le garde ouvert ; tactile : au tap. Le « + » tourne en « × ».
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'project-btn';
    this.buttonLabel = document.createElement('span');
    this.buttonLabel.className = 'project-btn__label';
    this.buttonRoles = document.createElement('span');
    this.buttonRoles.className = 'project-btn__roles';
    this.buttonRoles.id = 'project-roles';
    this.button.append(this.buttonLabel, this.buttonRoles);
    this.button.insertAdjacentHTML('beforeend', `<img class="project-btn__plus" src="${plusIcon}" alt="" width="12" height="12" />`);
    this.button.setAttribute('aria-controls', 'project-roles');
    this.button.setAttribute('aria-expanded', 'false');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    this.button.addEventListener('pointerenter', () => canHover.matches && this.openRoles(true, this.rolesPinned));
    this.button.addEventListener('pointerleave', () => canHover.matches && this.openRoles(this.rolesPinned, this.rolesPinned));
    this.button.addEventListener('click', () => this.openRoles(!this.rolesPinned || !this.rolesOpen, !this.rolesPinned));

    landing.after(this.root, this.texts, this.navEl, this.button);

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
    const win = (cls: string, parent: HTMLElement = el) => {
      const w = document.createElement('div');
      w.className = `project__win ${cls}`;
      parent.appendChild(w);
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
    // Lien externe : toute la grande vidéo est cliquable (nouvel onglet).
    if (project.link) {
      const a = document.createElement('a');
      a.className = 'project__link';
      a.href = project.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', `${project.title} (nouvel onglet)`);
      mainBox.parentElement!.appendChild(a);
    }

    wins.push(this.textWin(project));

    el.style.display = 'none';
    return { index: project.section, project, wins, main, sideVideos, images, slides, videoGlows, loaded: false, el };
  }

  // Texte d'une page, dans le calque des textes ; il porte sa propre perspective (origin, voir layout).
  private textWin(project: Project): Win {
    const text = document.createElement('div');
    text.className = 'project__win project__text';
    text.innerHTML = `<p class="project__lines">${project.lines.map((l) => `<span>${l}</span>`).join('')}</p>`;
    this.texts.appendChild(text);
    tint(text);
    return { el: text, cy: 0, h: 0, speed: 1, origin: { x: 0, y: 0 } };
  }

  // Section réduite à son texte (pages en bande : le reste de la page est géré par stripView.ts).
  private buildText(project: Project): Section {
    const wins = [this.textWin(project)];
    return { index: project.section, project, wins, main: null, sideVideos: [], images: [], slides: null, videoGlows: [], loaded: true, el: null };
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
      if (win.origin) win.origin = { x: W / 2 - (x + w / 2), y: H / 2 - y };
    };

    // Accueil : la bio est centrée à l'écran.
    const landing = this.sections[0].wins[0];
    landing.cy = H / 2;
    landing.h = H;

    for (const strip of this.strips) strip.layout(W, H, u, mobile);
    this.magazineTexts?.layout(W, H, u, mobile);
    // Magazines : la page reste fixe pendant que les magazines tournent et s'ouvrent.
    if (MAGAZINE_PROJECT) {
      nav.setSpace(MAGAZINE_PROJECT.section, config.magazines.space * H); // ils arrivent plus tard
      nav.setHold(MAGAZINE_PROJECT.section, magazineHold(H));
      nav.setPauses(MAGAZINE_PROJECT.section, magazinePauses()); // arrêt à chaque nouveau magazine
    }

    // Cadre du contenu mobile (hors maquette).
    const mBox = config.works.box.mobile;
    const by = mBox.top * u;
    const bh = H - by - mBox.bottom * u;
    const bw = W - 2 * mBox.side * u;

    for (const section of this.sections) {
      const project = section.project;
      if (!project) continue;
      const wins = section.wins;
      const text = wins[wins.length - 1];
      const main = wins.find((w) => w.el.classList.contains('project__main'))!;
      const sides = wins.filter((w) => w.el.classList.contains('project__side'));
      const tw = mobile ? Math.min(project.textWidth * u, W - 40 * u) : project.textWidth * u;
      const textSpeed = config.works.parallax.text;
      const strip = project.layout === 'social' || project.layout === 'posters';
      // Texte centré sur son point d'ancrage, sauf sur mobile pour les grands cadres (texte au-dessus de la vidéo).
      text.el.classList.toggle('is-centered', strip || (project.layout === 'single' ? !mobile : mobile));
      const sideSpeed = (i: number) => vMin + (vMax - vMin) * hash(section.index * 31 + i);

      if (strip) {
        // Texte seul, centré à l'écran (maquettes) ; sur mobile, au milieu du cadre comme les autres.
        const cy = mobile ? by + bh / 2 : H / 2;
        set(text, (W - tw) / 2, cy, tw, null, textSpeed);
        text.cy = cy;
      } else if (!mobile && project.layout === 'mosaic') {
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
        // LONGTEMPS / FORMULA ONE / VIDEOTAPE : grand cadre centré, texte centré dessus.
        const b = boxRect(SINGLE.box, W, H, u);
        set(main, b.left, b.top, b.width, b.height, 1);
        set(text, W / 2 + SINGLE.textDx * u - tw / 2, b.top + SINGLE.textCenter * u, tw, null, textSpeed);
        text.cy = H / 2;
      } else if (project.layout === 'single') {
        // Mobile, grands cadres (vidéos 16:9) : la vidéo entière, en 16:9 sur toute la largeur, et le texte
        // au-dessus d'elle (demande du DA) ; le groupe est centré dans le cadre mobile.
        const vh = (bw * 9) / 16;
        set(text, (W - tw) / 2, by, tw, null, textSpeed);
        const th = text.el.offsetHeight;
        const gap = config.works.box.mobileTextGap * u;
        const top = by + (bh - th - gap - vh) / 2;
        set(text, (W - tw) / 2, top, tw, null, textSpeed);
        text.cy = top + th / 2;
        set(main, (W - bw) / 2, top + th + gap, bw, vh, 1);
      } else {
        // Mobile (hors maquette) : la vidéo seule, à la hauteur du cadre ; texte centré dessus.
        sides.forEach((w) => (w.el.hidden = true));
        const w = project.layout === 'mosaic' ? Math.min(bw, (bh * MOSAIC.center.w) / MOSAIC.center.h) : bw;
        set(main, (W - w) / 2, by, w, bh, 1);
        set(text, (W - tw) / 2, by + bh / 2, tw, null, textSpeed);
        text.cy = by + bh / 2;
      }
    }

    // Rangée 1-8 (desktop) : calée sur le cadre des pages ; répartition régulière sur mobile (CSS).
    const row = boxRect(SINGLE.box, W, H, u);
    // Numéros et symbole répartis régulièrement, du « 1 » au symbole.
    const step = (NAV_ROW.end - NAV_ROW.first) / NAV_SLOTS;
    this.navItems.forEach((item, i) => item.style.setProperty('--cx', `${row.left + (NAV_ROW.first + i * step) * u}px`));
    this.navEl.style.setProperty('--wnav-n', String(NAV_SLOTS)); // mobile : même répartition (CSS)
    this.navEl.style.setProperty('--end-cx', `${row.left + NAV_ROW.end * u}px`);
    this.navEl.style.setProperty('--row-y', `${row.top + NAV_ROW.y * u}px`);
    this.navEl.style.setProperty('--row-y-current', `${row.top + NAV_ROW.currentY * u}px`);
    this.fitButton();
    this.update(nav.scroll, nav.velocity);
  }

  // Bouton vert : sa largeur de maquette, élargie si le titre ne tient pas (MUSIC & CULTURE), avec les mêmes
  // marges que la maquette (10 px de part et d'autre, 12 px avant le « + » de 12 px, pour un bouton de 148 px).
  // Ouvert (desktop), il s'élargit pour montrer les rôles après le titre ; sur mobile, ils s'affichent au-dessus.
  private fitButton(): void {
    const width = this.button.style.width;
    this.button.style.transition = 'none';
    this.button.style.width = '';
    const base = this.button.offsetWidth;
    const k = base / 148; // px du bouton par px de maquette
    const label = this.buttonLabel.offsetWidth;
    this.button.style.setProperty('--roles-x', `${10 * k + label + 12 * k}px`);
    let need = label + 44 * k;
    if (this.rolesOpen && !this.mobileQuery.matches) need = 10 * k + label + 12 * k + this.buttonRoles.offsetWidth + 34 * k;
    const target = need > base ? `${need}px` : '';
    // On part de la largeur actuelle pour que le changement soit animé (CSS).
    this.button.style.width = width;
    void this.button.offsetWidth;
    this.button.style.transition = '';
    this.button.style.width = target;
  }

  private buttonRoles: HTMLElement;
  private rolesOpen = false;
  private rolesPinned = false; // ouvert par un clic : reste ouvert quand la souris s'en va

  private openRoles(open: boolean, pinned: boolean): void {
    if (!this.buttonRoles.childElementCount) open = pinned = false; // projet sans rôles : le « + » ne fait rien
    this.rolesPinned = pinned && open;
    if (open === this.rolesOpen) return;
    this.rolesOpen = open;
    this.button.classList.toggle('is-open', open);
    this.button.setAttribute('aria-expanded', String(open));
    this.fitButton();
  }

  // Rôles du projet affiché, chacun précédé d'une petite étoile.
  private setRoles(roles: string[]): void {
    const star = '<svg class="project-btn__star" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0C5.4 3.3 6.7 4.6 10 5 6.7 5.4 5.4 6.7 5 10 4.6 6.7 3.3 5.4 0 5 3.3 4.6 4.6 3.3 5 0Z"/></svg>';
    this.buttonRoles.replaceChildren(
      ...roles.map((r) => {
        const span = document.createElement('span');
        span.className = 'project-btn__role';
        span.innerHTML = star;
        span.append(r); // en texte : « Clip & MV » s'affiche tel quel
        return span;
      }),
    );
    this.button.classList.toggle('has-roles', roles.length > 0);
  }

  private update(scroll: number, velocity: number): void {
    const H = this.H;
    const reduced = this.reduced.matches;
    const D = nav.sectionHeight;

    for (const section of this.sections) {
      const off = nav.offsetOf(section.index, scroll); // > 0 : la page est passée vers le haut
      const far = Math.abs(off) > D * 1.6;
      if (section.el) {
        section.el.style.display = far ? 'none' : '';
        if (far) {
          for (const win of section.wins) if (win.origin) win.el.style.visibility = 'hidden';
          continue;
        }
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
        // Perspective : celle de la page (CSS), sauf l'accueil et les textes, qui portent la leur.
        const o = win.origin;
        const persp = isLanding
          ? `perspective(${this.persp}px) `
          : o
            ? `translate(${o.x}px, ${o.y}px) perspective(${this.persp}px) translate(${-o.x}px, ${-o.y}px) `
            : '';
        win.el.style.transform = `${persp}translate3d(0, ${y}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
      }
    }
    for (const strip of this.strips) strip.update(scroll, velocity);
    this.magazineTexts?.update(scroll);

    // Les apparitions de l'accueil s'effacent dès qu'on quitte l'accueil.
    const trail = this.trail();
    if (trail) trail.style.opacity = String(1 - smooth(0, 0.35, scroll / D));

    // Rangée et bouton : visibles sur les pages projets.
    // (masqués sur l'accueil et sur le footer, qui suit le dernier projet)
    const last = PROJECTS.length;
    const pos = nav.position(scroll);
    const show = smooth(0.45, 0.85, pos) * (1 - smooth(last + 0.35, last + 0.75, pos));
    // La rangée s'efface sur les pages en bande (elle passerait entre les colonnes et clignoterait pendant le
    // défilement), comme sur Take Care, où les carrés la cachent entièrement. Le bouton reste.
    // Sur Magazines, elle reste (maquettes) : le magazine ouvert la recouvre, chiffre 3D compris.
    let row = show;
    for (const strip of this.strips) row *= smooth(0.35, 0.65, Math.abs(pos - strip.index));
    this.navEl.style.opacity = String(row);
    this.button.style.opacity = String(show);
    this.navEl.style.visibility = row < 0.01 ? 'hidden' : 'visible';
    this.button.style.visibility = show < 0.01 ? 'hidden' : 'visible';

    const current = nav.section;
    if (current !== this.current) {
      this.current = current;
      const project = PROJECTS.find((pr) => pr.section === current);
      this.navItems.forEach((item, i) => {
        const on = i + 1 === project?.number;
        item.classList.toggle('is-current', on);
        if (on) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      if (project) {
        this.buttonLabel.textContent = project.title;
        this.setRoles(project.roles ?? []);
        this.rolesOpen = this.rolesPinned = false; // on change de page : replié
        this.button.classList.remove('is-open');
        this.button.setAttribute('aria-expanded', 'false');
        this.fitButton();
      }
    }

    this.syncVideos(scroll);
  }

  // Charge les médias des sections proches ; les vidéos de la section affichée tournent toutes
  // (grande vidéo à vitesse normale, carrés au ralenti), les autres sont en pause.
  private syncVideos(scroll: number): void {
    const D = nav.sectionHeight;
    const mobile = this.mobileQuery.matches;
    let activeSection: Section | null = null;
    for (const strip of this.strips) strip.sync(scroll);
    for (const section of this.sections) {
      const d = Math.abs(nav.offsetOf(section.index, scroll)) / D;
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
        for (const v of videos) loadVideo(v);
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
