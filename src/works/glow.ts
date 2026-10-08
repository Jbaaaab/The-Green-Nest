import { config } from '../config';

/**
 * Halo lumineux autour d'une fenêtre (façon symbolsofwealth.studio, en plus serré) :
 * l'image ou la vidéo de la fenêtre, réduite à quelques pixels, floutée et agrandie juste derrière.
 * La lumière colorée déborde un peu autour de la fenêtre, sans grand halo.
 *
 * Peu coûteux : on floute un élément minuscule (16 px) puis on l'agrandit (transform) ;
 * pour une vidéo, la miniature est redessinée quelques fois par seconde seulement.
 */
const SIZE = 16; // résolution de la miniature (px)
const BOX = 24; // taille CSS de l'élément avant agrandissement (px)

export class Glow {
  readonly el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('canvas');
    this.el.className = 'project__glow';
    this.el.width = this.el.height = SIZE;
    this.el.setAttribute('aria-hidden', 'true');
    this.ctx = this.el.getContext('2d', { willReadFrequently: false })!;
    Object.assign(this.el.style, { width: `${BOX}px`, height: `${BOX}px`, opacity: String(config.works.glow.opacity) });
    parent.prepend(this.el);
  }

  /**
   * Taille de la fenêtre à l'écran (px) et unité --u : le halo déborde d'une marge fixe
   * (config.works.glow.margin) avec un flou fixe à l'écran, que la fenêtre soit petite ou grande.
   */
  resize(width: number, height: number, unit: number): void {
    const { margin, blur, saturate } = config.works.glow;
    const sx = (width + 2 * margin * unit) / BOX;
    const sy = (height + 2 * margin * unit) / BOX;
    // Le flou s'applique avant l'agrandissement : on le divise par l'échelle pour qu'il fasse `blur` px à l'écran.
    const localBlur = (blur * unit) / Math.sqrt(sx * sy);
    this.el.style.transform = `translate(-50%, -50%) scale(${sx}, ${sy})`;
    this.el.style.filter = `blur(${localBlur.toFixed(3)}px) saturate(${saturate})`;
  }

  /** Redessine la miniature depuis une image (chargée) ou une vidéo (avec une image affichable). */
  paint(source: HTMLImageElement | HTMLVideoElement): void {
    const ready = source instanceof HTMLVideoElement ? source.readyState >= 2 : source.complete && source.naturalWidth > 0;
    if (!ready) return;
    try {
      this.ctx.drawImage(source, 0, 0, SIZE, SIZE);
    } catch {
      // Source pas encore décodable : on réessaiera au prochain rafraîchissement.
    }
  }
}
