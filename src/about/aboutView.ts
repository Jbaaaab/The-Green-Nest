import '@fontsource/epilogue/latin-500.css';
import '../styles/about.css';
import { config } from '../config';
import { onLang, tr, type Localized } from '../i18n';
import { onPage, page } from '../router';
import { readUnit } from '../ui/unit';
import media from '../works/media.generated.json';
import { drum, perspectiveFor } from '../works/scrollFx';
import { aboutScroll } from './aboutScroll';
import { AboutTwo } from './aboutTwo';
import { STEPS, type CaseKey, type Step } from './steps';

const LABEL: Localized = { en: 'About', fr: 'À propos' };
const EARLY: Localized = { en: 'YOU’RE HERE EARLY', fr: 'T’ES EN AVANCE' };

// Milieu de la frame de la maquette (1440 px de large) : les abscisses de la maquette se comptent depuis lui.
const FX = 720;
// Bords de la frise sur la maquette : le bord gauche de STUDIES AT ISCOM et le bord droit de IDK GLORY I GUESS.
const EDGES = [40, 1397];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type StepView = {
  step: Step;
  el: HTMLElement;
  title: HTMLElement;
  desc?: HTMLElement;
  note?: HTMLElement;
  at: number; // avancée du trait (0 → 1) à laquelle l'étape apparaît
  shown: boolean;
};

/**
 * Page About (à /about : src/router.ts). About 1 (maquette ABOUT 148:58) : à l'ouverture, les 4 photos du footer
 * montent et s'empilent au centre (sans réagir au scroll), puis le trait noir de la frise se dessine de gauche à
 * droite : chaque point, trait vert et texte apparaît à son passage. Au survol d'une étape (au doigt : un tap), son
 * minicase remplace la photo de devant ; les étapes du haut ouvrent aussi un carré vert qui les explique.
 * Au scroll (./aboutScroll.ts), la frise des logos passe, puis About 2 (./aboutTwo.ts et src/scene/aboutScene.ts).
 * Réglages : config.about ; étapes et textes : ./steps.ts.
 */
export class AboutView {
  private root = document.createElement('section');
  private heading = document.createElement('h2');
  private stack = document.createElement('div');
  private cards: HTMLImageElement[] = [];
  private caseBox = document.createElement('div');
  private cases = new Map<CaseKey, HTMLVideoElement | HTMLImageElement>();
  private current: CaseKey | null = null;
  private early = document.createElement('p');
  private rail = document.createElement('div'); // la frise (sur mobile : une bande qui défile au doigt)
  private track = document.createElement('div');
  private line = document.createElement('div');
  private steps: StepView[] = [];
  private active: StepView | null = null;
  private two: AboutTwo;
  private centers = { rail: 0, stack: 0, early: 0 }; // milieux (px depuis le haut), pour le twist au scroll

  private mobileQuery = window.matchMedia('(max-width: 767px)');
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  private H = window.innerHeight;
  private start = 0; // début de l'intro (performance.now())
  private frame = 0;
  private preloading = false;

  constructor(parent: HTMLElement) {
    const r = this.root;
    r.className = 'about';
    this.heading.className = 'sr-only';

    // Pile : comme au footer, la photo 1 au fond et la 4 devant (dans le DOM, celle du fond d'abord).
    this.stack.className = 'about__stack';
    for (const src of media.footer.slides) {
      const img = document.createElement('img');
      img.className = 'about__card';
      img.alt = '';
      img.decoding = 'async';
      img.src = src;
      this.cards.push(img);
      this.stack.append(img);
    }
    // Minicases : posés sur la photo de devant, créés à la demande (au survol, ou en fond après l'intro).
    this.caseBox.className = 'about__case';
    this.caseBox.setAttribute('aria-hidden', 'true');
    this.stack.append(this.caseBox);
    this.early.className = 'about__early';

    // Frise : le trait, puis les étapes de gauche à droite.
    this.rail.className = 'about__rail';
    this.track.className = 'about__track';
    this.line.className = 'about__line';
    const list = document.createElement('ol');
    list.className = 'about__steps';
    for (const step of STEPS) list.append(this.buildStep(step));
    this.track.append(this.line, list);
    this.rail.append(this.track);

    // La frise passe derrière la pile (desktop : le trait traverse l'écran sous les photos).
    r.append(this.heading, this.rail, this.stack, this.early);
    this.two = new AboutTwo(r); // frise des logos et About 2
    parent.append(r);

    // Au doigt : un tap ouvre l'étape, un tap ailleurs la referme.
    document.addEventListener('click', () => {
      if (!this.fine.matches && this.active) this.deactivate(this.active);
    });
    window.addEventListener('resize', () => this.layout());
    onLang(() => {
      this.render();
      this.layout();
    });
    onPage((p) => (p === 'about' ? this.open() : this.close()));
    // « About » cliqué sur la page About : retour en haut (About 1).
    window.addEventListener('about:top', () => aboutScroll.goTo(0));
    this.render();
    this.layout();
    aboutScroll.onScroll((s, v) => {
      this.scrolled(s, v);
      this.two.scrolled(s, v);
    });
    if (import.meta.env.DEV) Object.assign(window, { __about: aboutScroll }); // pour les tests
    if (page === 'about') this.open();
  }

  private buildStep(step: Step): HTMLElement {
    const el = document.createElement('li');
    el.className = `about-step about-step--${step.side}${step.align === 'right' ? ' about-step--right' : ''}`;
    el.tabIndex = 0;
    const mark = document.createElement('span');
    mark.className = step.side === 'below' ? 'about-step__dot' : 'about-step__tick';
    mark.setAttribute('aria-hidden', 'true');
    const title = document.createElement('h3');
    title.className = 'about-step__title';
    el.append(mark, title);
    const view: StepView = { step, el, title, at: 0, shown: false };
    if (step.desc) {
      view.desc = document.createElement('p');
      view.desc.className = 'about-step__desc';
      el.append(view.desc);
    }
    if (step.note) {
      view.note = document.createElement('p');
      view.note.className = 'about-step__note';
      el.append(view.note);
    }
    this.steps.push(view);

    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.activate(view));
    el.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.deactivate(view));
    // Au clavier (le focus d'un tap ou d'un clic ne compte pas : :focus-visible).
    el.addEventListener('focus', () => el.matches(':focus-visible') && this.activate(view));
    el.addEventListener('blur', () => this.deactivate(view));
    el.addEventListener('click', (e) => {
      if (this.fine.matches) return;
      e.stopPropagation();
      if (this.active === view) this.deactivate(view);
      else this.activate(view);
    });
    return el;
  }

  // Textes dans la langue courante.
  private render(): void {
    this.root.setAttribute('aria-label', tr(LABEL));
    this.heading.textContent = tr(LABEL);
    this.early.textContent = tr(EARLY);
    for (const v of this.steps) {
      v.title.textContent = tr(v.step.title).join('\n');
      if (v.desc && v.step.desc) v.desc.textContent = tr(v.step.desc).join('\n');
      if (v.note && v.step.note) v.note.textContent = tr(v.step.note);
    }
  }

  // Positions de la maquette (px de maquette depuis le centre de l'écran, à l'échelle --u), sauf la frise : sur
  // toute la largeur (demande du DA), de STUDIES AT ISCOM calé sur le bord gauche du logo à IDK GLORY I GUESS calé
  // sur le bord droit d'Instagram / Mail ; les étapes se répartissent entre les deux, de part et d'autre de la pile
  // (points, traits verts et textes gardent leurs écarts de la maquette). Mobile (hors maquette) : la pile en haut,
  // réduite pour tenir au-dessus de la frise ; la frise en bande qui défile au doigt.
  private layout(): void {
    const W = window.innerWidth;
    const H = (this.H = window.innerHeight);
    const u = readUnit();
    const mobile = this.mobileQuery.matches;
    const c = config.about;
    const { w, h, tops, dx } = c.cards;
    const cx = W / 2;
    const place = (el: HTMLElement, left: number, top: number, width?: number, height?: number) => {
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = width === undefined ? '' : `${width}px`;
      el.style.height = height === undefined ? '' : `${height}px`;
    };
    const n = c.note;
    this.root.style.setProperty('--note-w', String(n.w));
    this.root.style.setProperty('--note-h', String(n.h));
    this.root.style.setProperty('--note-pad', String(n.padX));
    this.root.style.setProperty('--note-size', String(n.size));
    this.root.style.setProperty('--note-leading', String(n.leading));
    this.root.style.setProperty('--case-fade', `${c.caseFade}s`);
    this.root.style.setProperty('--persp', `${perspectiveFor(H)}px`);

    // Frise : position du trait, et abscisse (dans la bande) d'un x de la maquette.
    let lineY: number;
    let X: (x: number) => number;
    let trackW: number;
    // Pile : échelle et ordonnée du centre de la frame.
    let s = 1;
    let oy = H / 2;
    if (mobile) {
      const m = c.mobile;
      const above = 175 * u; // place au-dessus du trait (titres, traits verts et carrés verts, plus hauts en français)
      const below = 95 * u; // et dessous (titres et descriptions)
      const y = H - m.lineFromBottom * u;
      X = (x) => (x - (x > FX ? m.stackGap : 0)) * u;
      trackW = X(1438) + 3 * u;
      lineY = above;
      place(this.rail, 0, y - above, undefined, above + below);
      this.rail.style.right = '0';
      // Pile et « YOU’RE HERE EARLY » entre le header et les titres du haut de la frise.
      const top = m.top * u;
      const room = y - 60 * u - top;
      const full = (-tops[tops.length - 1] + c.early + 19) * u; // du haut de la carte du fond au bas du texte
      s = Math.min(1, room / full);
      oy = top + (room - full * s) / 2 - tops[tops.length - 1] * s * u;
    } else {
      const left = document.querySelector('.brand')?.getBoundingClientRect().left ?? 61 * u;
      const right = document.querySelector('.contact')?.getBoundingClientRect().right ?? W * 0.875 + 120 * u;
      const [x0, x1] = EDGES;
      X = (x) => (x < FX ? cx - ((FX - x) / (FX - x0)) * (cx - left) : cx + ((x - FX) / (x1 - FX)) * (right - cx));
      trackW = W;
      lineY = H / 2;
      place(this.rail, 0, 0, undefined, H);
      this.rail.style.right = '0';
    }
    this.track.style.width = `${trackW}px`;

    // Cartes (positions de la maquette par profondeur : celle de devant est la plus basse).
    this.cards.forEach((card, i) => {
      const depth = this.cards.length - 1 - i;
      place(card, cx + (dx - (w * s) / 2) * u, oy + tops[depth] * s * u, w * s * u, h * s * u);
    });
    place(this.caseBox, cx + (dx - (w * s) / 2) * u, oy + tops[0] * s * u, w * s * u, h * s * u);
    // Texte sous la pile : 8 px sous la carte de devant (maquette : 756 = 748 + 8).
    const cardBottom = (tops[0] + h) * s;
    place(this.early, cx + (dx - w / 2) * u, oy + (cardBottom + (c.early - tops[0] - h)) * u, w * u);

    // Trait : de 3 px du bord gauche à 2 px du bord droit (maquette : 3 → 1438 sur 1440), 1,5 px d'épaisseur.
    const lineLeft = 3 * u;
    const lineRight = trackW - 2 * u;
    place(this.line, lineLeft, lineY - 0.75 * u, lineRight - lineLeft, 1.5 * u);

    for (const v of this.steps) {
      const { step, el } = v;
      const tx = X(step.textX);
      el.style.top = `${step.side === 'below' ? lineY - 4 * u : lineY}px`; // points : 8 px centrés sur le trait
      if (step.align === 'right') {
        el.style.left = '';
        el.style.right = `${trackW - tx}px`;
      } else {
        el.style.right = '';
        el.style.left = `${tx}px`;
      }
      const mark = el.firstElementChild as HTMLElement;
      if (step.side === 'below') {
        const off = step.align === 'right' ? step.textX - step.x - 4 : step.x - step.textX - 4;
        mark.style.left = step.align === 'right' ? '' : `${off * u}px`;
        mark.style.right = step.align === 'right' ? `${off * u}px` : '';
      }
      const markX = tx + (step.x - step.textX) * u; // le point ou le trait vert, à son écart du texte
      v.at = clamp01((markX - lineLeft) / (lineRight - lineLeft));
    }

    // Milieux des blocs (twist au scroll), puis le bas de la page.
    this.centers = {
      rail: mobile ? this.rail.offsetTop + this.rail.offsetHeight / 2 : lineY,
      stack: oy + ((tops[tops.length - 1] + tops[0] + h) / 2) * s * u,
      early: this.early.offsetTop + this.early.offsetHeight / 2,
    };
    this.two.layout(W, H, u, mobile);
    this.scrolled(aboutScroll.scroll, aboutScroll.velocity);
  }

  // About 1 suit le scroll de la page (vers le haut), avec le twist de l'accueil pendant le mouvement.
  private scrolled(s: number, v: number): void {
    const H = this.H;
    const moving = v !== 0 && !this.reduced.matches;
    const on = s < H; // encore à l'écran
    for (const [el, cy] of [
      [this.rail, this.centers.rail],
      [this.stack, this.centers.stack],
      [this.early, this.centers.early],
    ] as const) {
      el.style.visibility = on ? '' : 'hidden';
      const fx = moving ? drum(cy - s - H / 2, H, v) : { rotX: 0, z: 0 };
      el.style.transform = s === 0 && fx.rotX === 0 ? '' : `translate3d(0, ${-s}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
    }
  }

  private open(): void {
    this.reset();
    const go = () => {
      if (page !== 'about') return;
      cancelAnimationFrame(this.frame);
      this.start = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    };
    // Arrivée directe sur /about : l'intro attend la fin de l'écran de chargement.
    if (document.documentElement.classList.contains('is-loaded')) go();
    else window.addEventListener('loader:done', go, { once: true });
  }

  private close(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (this.active) this.deactivate(this.active);
  }

  // Remet l'intro au début : rien d'affiché.
  private reset(): void {
    cancelAnimationFrame(this.frame);
    for (const card of this.cards) card.style.visibility = 'hidden';
    this.line.style.transform = 'scaleX(0)';
    this.early.classList.remove('is-in');
    for (const v of this.steps) {
      v.shown = false;
      v.el.classList.remove('is-in');
    }
    if (this.active) this.deactivate(this.active);
  }

  // Intro : les cartes montent une à une (1, 2, 3, 4), puis le trait se dessine et les étapes apparaissent.
  private tick = (now: number) => {
    const c = config.about;
    const { start, stagger, duration, enter, rotateDeg } = c.cards;
    const t = (now - this.start) / 1000;
    const reduced = this.reduced.matches;
    this.cards.forEach((card, i) => {
      const a = reduced ? 1 : easeOutCubic(clamp01((t - start - i * stagger) / duration));
      const rot = (i % 2 === 0 ? -1 : 1) * rotateDeg * (1 - a);
      card.style.transform = a >= 1 ? '' : `translateY(${(1 - a) * enter * this.H}px) rotate(${rot}deg)`;
      card.style.visibility = a <= 0 ? 'hidden' : '';
    });
    const cardsEnd = start + (this.cards.length - 1) * stagger + duration;
    if (reduced || t > cardsEnd - 0.3) this.early.classList.add('is-in');

    const p = reduced ? 1 : easeInOutSine(clamp01((t - cardsEnd - c.line.delay) / c.line.duration));
    this.line.style.transform = p >= 1 ? 'none' : `scaleX(${p})`;
    for (const v of this.steps) {
      if (v.shown || p < v.at) continue;
      v.shown = true;
      v.el.classList.add('is-in');
    }
    if (p < 1) this.frame = requestAnimationFrame(this.tick);
    else {
      this.frame = 0;
      this.preload();
    }
  };

  private activate(v: StepView): void {
    if (!v.shown) return; // pas avant que le trait l'ait atteinte
    if (this.active && this.active !== v) this.active.el.classList.remove('is-active');
    this.active = v;
    v.el.classList.add('is-active');
    this.showCase(v.step.media ?? null);
  }

  private deactivate(v: StepView): void {
    if (this.active !== v) return;
    v.el.classList.remove('is-active');
    this.active = null;
    this.showCase(null);
  }

  // Minicase de l'étape sur la photo de devant (null : la photo revient). Les vidéos repartent du début.
  private showCase(key: CaseKey | null): void {
    if (key === this.current) return;
    const prev = this.current ? this.cases.get(this.current) : null;
    this.current = key;
    if (prev) {
      prev.classList.remove('is-current');
      if (prev instanceof HTMLVideoElement) prev.pause();
    }
    if (!key) {
      this.caseBox.classList.remove('is-on');
      return;
    }
    const el = this.caseEl(key);
    el.classList.add('is-current');
    if (el instanceof HTMLVideoElement) {
      el.currentTime = 0;
      el.play().catch(() => undefined);
    }
    this.caseBox.classList.add('is-on');
  }

  private caseEl(key: CaseKey): HTMLVideoElement | HTMLImageElement {
    const existing = this.cases.get(key);
    if (existing) return existing;
    const m = media.about[key];
    let el: HTMLVideoElement | HTMLImageElement;
    if ('video' in m) {
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.poster = m.poster;
      v.src = m.video;
      el = v;
    } else {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = m.image;
      el = img;
    }
    this.caseBox.append(el);
    this.cases.set(key, el);
    return el;
  }

  // Desktop : une fois l'intro finie, les minicases se chargent en fond, un par un (le survol est alors immédiat).
  // Au doigt, chacun se charge à son premier tap.
  private async preload(): Promise<void> {
    if (this.preloading || !this.fine.matches) return;
    this.preloading = true;
    for (const step of STEPS) {
      if (!step.media) continue;
      const el = this.caseEl(step.media);
      if (!(el instanceof HTMLVideoElement) || el.readyState >= 4) continue;
      await new Promise<void>((done) => {
        const end = () => {
          clearTimeout(timer);
          el.removeEventListener('canplaythrough', end);
          done();
        };
        const timer = setTimeout(end, 8000);
        el.addEventListener('canplaythrough', end);
      });
    }
  }
}
