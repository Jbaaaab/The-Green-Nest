import logoUrl from '../assets/footer/logo-full.svg';
import symbolUrl from '../assets/footer/symbol.svg';
import { config } from '../config';
import { nav } from '../nav';
import { readUnit } from '../ui/unit';
import media from '../works/media.generated.json';
import { drum, perspectiveFor } from '../works/scrollFx';

const gap = (n: number) => ' '.repeat(n);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Index de section du footer (la dernière). */
export const FOOTER_SECTION = nav.count - 1;

/**
 * Position du footer : décalage vertical de la page (px, > 0 = encore en dessous, elle arrive)
 * et progression de l'envol des cartes (0 → 1). Partagé avec la montagne de daruma (3D).
 */
export function footerState(scroll: number): { pageY: number; reveal: number; visible: boolean } {
  const off = scroll - nav.stopOf(FOOTER_SECTION);
  return {
    pageY: off < 0 ? -off : 0, // une fois arrivée, la page reste fixe
    reveal: clamp01(off / nav.footerReveal),
    visible: off > -nav.sectionHeight * 1.6,
  };
}

/**
 * Footer (maquette « Scroll » 9:22) : à la fin du scroll, des cartes (les photos) empilées au centre
 * s'envolent l'une après l'autre vers le haut et révèlent le texte. Grand logo en bas, plein cadre.
 * La montagne de daruma (le trait rouge de la maquette) est en 3D : src/scene/darumaMountain.ts.
 */
export class FooterView {
  private root: HTMLElement;
  private text: HTMLElement;
  private cards: HTMLImageElement[] = [];
  private logo: HTMLImageElement;
  private symbol: HTMLButtonElement;
  private H = window.innerHeight;
  private loaded = false;
  private mobileQuery = window.matchMedia('(max-width: 767px)');
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(after: Element) {
    this.root = document.createElement('section');
    this.root.className = 'footer';
    this.root.id = 'hello';
    this.root.setAttribute('aria-label', 'Hello');

    // Texte (vrai texte, en majuscules par le CSS) : les trous de la bio sont voulus, comme sur l'accueil.
    this.text = document.createElement('p');
    this.text.className = 'footer__text';
    this.text.innerHTML =
      '<span class="footer__hi">Hi /안녕하세요/ I am Designer with a Monstera /돰/ !</span>' +
      '<span class="footer__blank" aria-hidden="true"> </span>' +
      `<span class="footer__bio">DESIGNER WITH A MONSTERA IS AN ART DIRECTOR${gap(20)}AND DESIGNER BASED IN PARIS, WORKING 360${gap(22)}IN MUSIC, FASHION, AND ADVERTISING.${gap(23)}HIS WORK FOCUSES ON MAKING THINGS LOOK <strong class="footer__cool">COOL</strong><span class="footer__wide"> </span>FOR PEOPLE AND BRANDS.</span>`;

    // Cartes : la photo 1 est devant. Dans le DOM, la carte du fond vient en premier (dessinée dessous).
    const photos = media.footer.slides;
    const stack = document.createElement('div');
    stack.className = 'footer__cards';
    for (let i = photos.length - 1; i >= 0; i--) {
      const img = document.createElement('img');
      img.className = 'footer__card';
      img.alt = '';
      img.decoding = 'async';
      img.dataset.src = photos[i];
      this.cards[i] = img;
      stack.appendChild(img);
    }

    this.logo = document.createElement('img');
    this.logo.className = 'footer__logo';
    this.logo.src = logoUrl;
    this.logo.alt = 'Designer With A Monstera';

    this.symbol = document.createElement('button');
    this.symbol.type = 'button';
    this.symbol.className = 'footer__symbol';
    this.symbol.setAttribute('aria-label', 'Retour en haut');
    this.symbol.innerHTML = `<img src="${symbolUrl}" alt="" width="20" height="20" />`;
    this.symbol.addEventListener('click', () => nav.goTo(0));

    this.root.append(this.text, stack, this.logo, this.symbol);
    after.after(this.root);

    window.addEventListener('resize', () => this.layout());
    this.layout();
    nav.onScroll((scroll, velocity) => this.update(scroll, velocity));
  }

  // Place les éléments à leur position de maquette (footer à l'arrêt), à l'échelle --u.
  private layout(): void {
    const W = window.innerWidth;
    const H = (this.H = window.innerHeight);
    const u = readUnit();
    const mobile = this.mobileQuery.matches;
    const f = config.footer;
    const cx = W / 2;
    const cy = H / 2;

    const place = (el: HTMLElement, left: number, top: number, width: number, height?: number) => {
      Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: height === undefined ? '' : `${height}px` });
      el.dataset.cy = String(top + (height ?? 0) / 2);
    };
    this.root.style.setProperty('--persp', `${perspectiveFor(H)}px`);

    const tw = mobile ? W - 40 * u : f.text.width * u;
    place(this.text, cx - tw / 2, cy + f.text.top * u, tw);

    this.cards.forEach((card, i) => {
      place(card, cx + (f.cards.dx - f.cards.w / 2) * u, cy + f.cards.tops[i] * u, f.cards.w * u, f.cards.h * u);
    });

    // Logo et trait rouge : pleine largeur (ils s'étirent avec l'écran, comme dans la frame de 1440).
    const k = W / f.logo.frame;
    const lw = f.logo.w * k;
    place(this.logo, cx - 0.5 * k - lw / 2, H - (f.logo.h + f.logo.bottom) * k, lw, f.logo.h * k);

    // Symbole calé sur le bord droit du header (comme Instagram / Mail), en haut.
    const s = f.symbol.size * u;
    const right = mobile ? W - 10 * u : W * 0.875 + 120 * u;
    place(this.symbol, right - (mobile ? s : f.symbol.right * u), mobile ? 48 * u : f.symbol.top * u, s, s);

    this.update(nav.scroll, nav.velocity);
  }

  private update(scroll: number, velocity: number): void {
    const { pageY, reveal, visible } = footerState(scroll);
    this.root.style.display = visible ? '' : 'none';
    document.documentElement.classList.toggle('is-footer', visible && pageY < this.H * 0.5);
    if (!visible) return;

    // Les photos se chargent à l'approche.
    if (!this.loaded && scroll > nav.stopOf(FOOTER_SECTION) - nav.sectionHeight * 1.3) {
      this.loaded = true;
      for (const c of this.cards) c.src = c.dataset.src!;
    }

    const H = this.H;
    const reduced = this.reduced.matches;
    const moving = pageY > 0 && !reduced;
    const move = (el: HTMLElement, speed: number, extra = '') => {
      const y = pageY * speed;
      const fx = moving ? drum(Number(el.dataset.cy) + y - H / 2, H, velocity) : { rotX: 0, z: 0 };
      el.style.transform =
        y === 0 && fx.rotX === 0 && !extra ? '' : `translate3d(0, ${y}px, ${fx.z}px) rotateX(${fx.rotX}rad) ${extra}`;
    };

    move(this.text, config.works.parallax.text);
    move(this.logo, 1);
    move(this.symbol, 1);

    // Envol des cartes, de celle de devant (photo 1) à celle du fond, chacune à son tour.
    const { stagger, duration, lift, rotateDeg } = config.footer.cards;
    this.cards.forEach((card, i) => {
      const q = reduced ? (reveal > 0.5 ? 1 : 0) : easeInOutCubic(clamp01((reveal - i * stagger) / duration));
      const rot = (i % 2 === 0 ? -1 : 1) * rotateDeg * q;
      move(card, 1, q > 0 ? `translateY(${-q * lift * H}px) rotate(${rot}deg)` : '');
      card.style.visibility = q >= 1 ? 'hidden' : '';
    });
  }
}
