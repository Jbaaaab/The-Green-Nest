import { nav } from '../nav';
import { tint } from '../ui/tint';
import { magazineSlide, magazineTextIndex } from './magazineTimeline';
import { MAGAZINE_TEXTS, localText } from './projects';

/**
 * Textes de la page MAGAZINES (maquettes 25:631, 25:838, 25:888, 51:475, 51:525), en « noir négatif » comme
 * ceux des autres pages, mais au-dessus du canvas : ils passent devant les magazines 3D et les inversent.
 * Centrés à l'écran, ils glissent de côté avec les magazines. Seul celui du magazine de devant (ou de la
 * section de ses doubles pages) est affiché ; on passe de l'un à l'autre en fondu (CSS).
 */
export class MagazineTexts {
  private els: HTMLElement[];
  private W = window.innerWidth;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(
    layer: HTMLElement,
    private index: number, // section de la page Magazines
  ) {
    this.els = MAGAZINE_TEXTS.map(() => {
      const el = document.createElement('div');
      el.className = 'project__win project__text project__text--magazine is-centered';
      layer.appendChild(el);
      tint(el);
      return el;
    });
    this.render();
  }

  /** Les textes dans la langue courante (src/i18n.ts) ; la mise en page suit (layout). */
  render(): void {
    MAGAZINE_TEXTS.forEach((t, i) => {
      this.els[i].innerHTML = `<p class="project__lines">${localText(t).lines.map((l) => `<span>${l}</span>`).join('')}</p>`;
    });
  }

  layout(W: number, H: number, u: number, mobile: boolean): void {
    this.W = W;
    MAGAZINE_TEXTS.forEach((t, i) => {
      const { textWidth } = localText(t);
      const tw = mobile ? Math.min(textWidth * u, W - 40 * u) : textWidth * u;
      Object.assign(this.els[i].style, { left: `${(W - tw) / 2}px`, top: `${H / 2}px`, width: `${tw}px` });
    });
  }

  update(scroll: number): void {
    const { inT, outT, x } = magazineSlide(nav.offsetOf(this.index, scroll), nav.sectionHeight);
    const visible = inT > 0 && outT < 1;
    const active = visible ? magazineTextIndex(nav.holdProgress(this.index, scroll)) : -1;
    const transform = this.reduced.matches || x === 0 ? '' : `translate3d(${x * this.W}px, 0, 0)`;
    this.els.forEach((el, i) => {
      el.classList.toggle('is-on', i === active);
      el.setAttribute('aria-hidden', String(i !== active));
      el.style.visibility = visible ? 'visible' : 'hidden';
      el.style.transform = transform;
    });
  }
}
