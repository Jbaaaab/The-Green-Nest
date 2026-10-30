import { config } from '../config';
import { onLang, tr, type Localized } from '../i18n';
import { page } from '../router';
import brands from '../ui/brands.generated.json';
import { drum } from '../works/scrollFx';
import { aboutScroll } from './aboutScroll';

const BAND_LABEL: Localized = { en: 'Brands I’ve worked with', fr: 'Les marques avec qui j’ai travaillé' };

// Texte de About 2 (maquette ABOUT 2 149:91), ligne par ligne comme sur la maquette. Fautes corrigées avec
// l'accord du DA : KIDS, LEAPS. Version française : même découpe en paragraphes.
type Text = { title: string; paragraphs: string[][] };
const TEXT: Localized<Text> = {
  en: {
    title: 'THE LEAP OF FAITH JUMPER',
    paragraphs: [
      ['ONE DAY, IPAD KIDS DO GROW UP. AFTERWARD, THEY’RE', 'JUST HYPER CURIOUS KIDS WITH AN OBSESSION FOR', 'WHAT’S PUSHING THE VISUAL FURTHER.'],
      [
        'AFTER THREE YEARS IN AGENCIES, I’VE DECIDED TO PACK',
        'IT UP AND TO TRY IT SOLO. BECAUSE WHAT I LIKE ABOUT',
        'MY JOB, IS WHEN I’M FACING A BRIEF THAT’S HARD, OR',
        'UNINSPIRING, AND STILL NAILING IT. THAT’S WHY I’M',
        'HERE. I LIKE CHALLENGES, I LIKE STRUGGLING TO FIND',
        'THE RIGHT WORD, THE RIGHT VISUAL, THE RIGHT',
        'ANIMATION',
      ],
      ['I’M ADDICTED TO (SUCCESSFUL) LEAPS OF FAITH.'],
    ],
  },
  fr: {
    title: 'LE SAUTEUR DANS LE VIDE',
    paragraphs: [
      ['UN JOUR, LES ENFANTS DE L’IPAD GRANDISSENT. ENSUITE,', 'CE NE SONT PLUS QUE DES GAMINS HYPER CURIEUX,', 'OBSÉDÉS PAR CE QUI POUSSE LE VISUEL PLUS LOIN.'],
      [
        'APRÈS TROIS ANS EN AGENCE, J’AI DÉCIDÉ DE TOUT',
        'PLAQUER POUR ME LANCER EN SOLO. PARCE QUE CE QUE',
        'J’AIME DANS MON MÉTIER, C’EST QUAND JE TOMBE SUR',
        'UN BRIEF DIFFICILE, OU PAS INSPIRANT, ET QUE JE LE',
        'PLIE QUAND MÊME. C’EST POUR ÇA QUE JE SUIS LÀ.',
        'J’AIME LES DÉFIS, J’AIME GALÉRER À TROUVER LE BON',
        'MOT, LE BON VISUEL, LA BONNE ANIMATION',
      ],
      ['JE SUIS ACCRO AUX SAUTS DANS LE VIDE (RÉUSSIS).'],
    ],
  },
};

/**
 * Bas de la page About : la frise des logos (entre About 1 et About 2) et le texte de About 2. La montagne et
 * les fleurs de About 2 sont en 3D (src/scene/aboutScene.ts). Tout suit le scroll de la page (aboutScroll),
 * avec le twist de l'accueil.
 */
export class AboutTwo {
  private band = document.createElement('div');
  private track = document.createElement('div');
  private logos: HTMLElement[] = [];
  private names = document.createElement('ul');
  private page2 = document.createElement('div');
  private title = document.createElement('h2');
  private body = document.createElement('div');

  private H = window.innerHeight;
  private bandH = 0;
  private rowW = 1; // largeur d'une rangée de logos (avec ses écarts)
  private textCy = 0; // milieu du texte, depuis le haut de About 2
  private x = 0; // défilement de la frise
  private frame = 0;
  private last = 0;
  private speed = 0;
  private boost = 0;
  private bandOnScreen = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(root: HTMLElement) {
    // Frise : la rangée des logos en deux exemplaires (la seconde prend le relais : défilement sans fin).
    this.band.className = 'about__band';
    this.track.className = 'about__band-track';
    this.track.setAttribute('aria-hidden', 'true');
    for (let copy = 0; copy < 2; copy++) {
      for (const logo of brands) {
        const el = document.createElement('span');
        el.className = 'about__logo';
        el.style.setProperty('--logo', `url("${logo.src}")`);
        this.logos.push(el);
        this.track.append(el);
      }
    }
    this.names.className = 'sr-only';
    for (const logo of brands) {
      const li = document.createElement('li');
      li.textContent = logo.name;
      this.names.append(li);
    }
    this.band.append(this.track, this.names);

    this.page2.className = 'about__page2';
    this.title.className = 'about__title2';
    this.body.className = 'about__body2';
    this.page2.append(this.title, this.body);
    root.append(this.band, this.page2);
    onLang(() => this.render());
    this.render();
  }

  render(): void {
    const t = tr(TEXT);
    this.title.textContent = t.title;
    this.body.replaceChildren(
      ...t.paragraphs.map((lines) => {
        const p = document.createElement('p');
        p.textContent = lines.join('\n'); // desktop : lignes de la maquette ; mobile : le texte se recoupe
        return p;
      }),
    );
    this.band.setAttribute('aria-label', tr(BAND_LABEL));
    this.band.setAttribute('role', 'region');
  }

  layout(W: number, H: number, u: number, mobile: boolean): void {
    this.H = H;
    const b = config.about.band;
    const k = mobile ? b.mobileScale : 1;
    // Logos : même surface d'encre pour tous, dans les limites (comme la balle du pong).
    let rowW = 0;
    let bandH = 0;
    this.logos.forEach((el, i) => {
      const { ratio, coverage } = brands[i % brands.length];
      const area = b.ink / Math.pow(Math.max(0.05, coverage), b.inkPow);
      let w = Math.sqrt(area * ratio);
      let h = w / ratio;
      if (w > b.max[0]) [w, h] = [b.max[0], b.max[0] / ratio];
      if (h > b.max[1]) [w, h] = [b.max[1] * ratio, b.max[1]];
      el.style.width = `${w * u * k}px`;
      el.style.height = `${h * u * k}px`;
      el.style.marginRight = `${b.gap * u * k}px`;
      if (i < brands.length) rowW += (w + b.gap) * u * k;
      bandH = Math.max(bandH, h * u * k);
    });
    this.rowW = rowW;
    this.bandH = bandH;
    this.speed = b.speed * u * k;
    this.boost = b.boost * k;
    this.band.style.height = `${bandH}px`;

    // Texte de About 2 : titre et texte aux hauteurs de la maquette, centrés (milieu de la frame : x 719,5).
    const t2 = config.about.text2;
    const cx = W / 2 - 0.5 * u;
    const top = mobile ? 96 * u : H / 2 + t2.title * u;
    this.title.style.top = `${top}px`;
    this.title.style.left = `${cx}px`;
    this.body.style.top = `${top + (t2.body - t2.title) * u}px`;
    this.body.style.left = `${cx}px`;
    this.body.style.width = mobile ? `${W - 40 * u}px` : '';
    this.textCy = top + (this.body.offsetTop + this.body.offsetHeight - top) / 2;
    // La montagne et les fleurs (3D) se calent sous le texte.
    window.dispatchEvent(new Event('about:layout'));
    this.scrolled(aboutScroll.scroll, aboutScroll.velocity);
  }

  // Frise et About 2 suivent le scroll (twist de l'accueil pendant le mouvement).
  scrolled(s: number, v: number): void {
    const H = this.H;
    const max = aboutScroll.max;
    const moving = v !== 0 && !this.reduced.matches;
    const place = (el: HTMLElement, y: number, cy: number) => {
      const fx = moving ? drum(cy + y - H / 2, H, v) : { rotX: 0, z: 0 };
      el.style.transform = `translate3d(0, ${y}px, ${fx.z}px) rotateX(${fx.rotX}rad)`;
    };
    // Frise : à mi-chemin, au milieu de l'écran.
    const bandY = (max + H) / 2 - s - this.bandH / 2;
    this.bandOnScreen = bandY < H && bandY > -this.bandH;
    this.band.style.visibility = this.bandOnScreen ? '' : 'hidden';
    if (this.bandOnScreen) place(this.band, bandY, this.bandH / 2);
    // About 2 : sous About 1, à « max » plus bas.
    const y2 = max - s;
    this.page2.style.visibility = y2 < H ? '' : 'hidden';
    // Le dock s'efface sur About 2 (la montagne passerait dessus), comme au footer : la musique continue.
    document.documentElement.classList.toggle('is-about2', page === 'about' && y2 < H * 0.5);
    place(this.page2, y2, this.textCy);
    if (this.bandOnScreen && !this.frame && page === 'about' && !this.reduced.matches) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.loop);
    }
  }

  // Défilement de la frise : tout seul vers la gauche, plus vite pendant le scroll.
  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.x = (this.x + (this.speed + this.boost * Math.abs(aboutScroll.velocity)) * dt) % this.rowW;
    this.track.style.transform = `translate3d(${-this.x}px, 0, 0)`;
    this.frame = this.bandOnScreen && page === 'about' ? requestAnimationFrame(this.loop) : 0;
  };
}
