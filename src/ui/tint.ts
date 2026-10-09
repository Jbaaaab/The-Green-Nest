import { config } from '../config';

/**
 * Négatif en dégradé blanc → vert → noir (demande du DA : le négatif pur, gris sur du gris, est parfois dur à
 * lire). Un élément en négatif (blanc, mix-blend-mode: difference) reçoit trois jumeaux juste après lui, qui se
 * mélangent pixel par pixel avec ce qu'il y a dessous :
 * 1. color-burn puis 2. color-dodge, en gris : ils raidissent le négatif (pente config.negative.contrast) ;
 * 3. color, en vert flash : il garde la clarté obtenue et lui donne la teinte verte.
 * Résultat : blanc sur le sombre, vert sur le gris foncé, noir sur le clair. Pour un canvas (le pong) :
 * NEGATIVE_LAYERS (les mêmes modes de fusion) ou negativeColor() (le même calcul en JS). Les jumeaux suivent
 * l'original (styles, classes, contenu). L'élément doit déjà avoir un parent.
 */
type RGB = [number, number, number];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const lum = ([r, g, b]: RGB) => 0.3 * r + 0.59 * g + 0.11 * b; // clarté des modes de fusion CSS

// Le négatif x (0-1) devient z = k·x − c, borné à 0-1 ; le vert pile quand le fond vaut config.negative.green.
// En CSS : color-burn de gris s (1 − (1 − x)/s, gain n = 1/s), puis color-dodge de gris s' (x/(1 − s'), gain
// m = 1/(1 − s')), avec m·n = k et m·(n − 1) = c.
const CURVE = (() => {
  const { contrast, green, color } = config.negative;
  const tint = hex(color);
  const k = Math.max(1, contrast);
  const c = clamp(k * (1 - green) - lum(tint), 0, k - 1);
  const m = k - c;
  return { k, c, tint, burn: m / k, dodge: 1 - 1 / m };
})();

// Mode color : la teinte de c, la clarté l (spécification Compositing and Blending, SetLum / ClipColor).
function setLum(c: RGB, l: number): RGB {
  const d = l - lum(c);
  const out = c.map((v) => v + d) as RGB;
  const L = lum(out);
  const n = Math.min(...out);
  const x = Math.max(...out);
  if (n < 0) return out.map((v) => L + ((v - L) * L) / (L - n)) as RGB;
  if (x > 1) return out.map((v) => L + ((v - L) * (1 - L)) / (x - L)) as RGB;
  return out;
}

/** Couleur (0-255) d'un élément « en négatif » posé sur un fond r, g, b (0-255). */
export function negativeColor(r: number, g: number, b: number): RGB {
  const { k, c, tint } = CURVE;
  const z = [r, g, b].map((v) => clamp(k * (1 - v / 255) - c, 0, 1)) as RGB;
  return setLum(tint, lum(z)).map((v) => Math.round(v * 255)) as RGB;
}

const gray = (v: number) => {
  const g = Math.round(v * 255);
  return `rgb(${g}, ${g}, ${g})`;
};
let ready = false;

/** Les mêmes calques, pour un canvas : remplir avec chacun, dans l'ordre, passe une image en négatif. */
export const NEGATIVE_LAYERS: [GlobalCompositeOperation, string][] = [
  ['difference', '#fff'],
  ...(CURVE.k > 1
    ? ([
        ['color-burn', gray(CURVE.burn)],
        ['color-dodge', gray(CURVE.dodge)],
      ] as [GlobalCompositeOperation, string][])
    : []),
  ['color', config.negative.color],
];

/** Ajoute les jumeaux de el (voir plus haut) ; les renvoie (pour relancer une animation CSS avec l'original). */
export function tint(el: HTMLElement): HTMLElement[] {
  if (!ready) {
    ready = true;
    const root = document.documentElement.style;
    root.setProperty('--neg-burn', gray(CURVE.burn));
    root.setProperty('--neg-dodge', gray(CURVE.dodge));
    root.setProperty('--neg-tint', config.negative.color);
  }
  const layers = CURVE.k > 1 ? ['burn', 'dodge', 'hue'] : ['hue'];
  const twins = layers.map((layer) => {
    const twin = el.cloneNode(true) as HTMLElement;
    twin.removeAttribute('id');
    twin.removeAttribute('role');
    twin.setAttribute('aria-hidden', 'true');
    twin.dataset.tint = layer;
    return twin;
  });
  el.after(...twins);
  const sync = () => {
    for (const twin of twins) {
      twin.style.cssText = el.style.cssText;
      twin.className = `${el.className} is-tint`;
      twin.hidden = el.hidden;
    }
  };
  sync();
  new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  new MutationObserver(() => {
    for (const twin of twins) twin.innerHTML = el.innerHTML;
  }).observe(el, { childList: true, subtree: true, characterData: true });
  return twins;
}
