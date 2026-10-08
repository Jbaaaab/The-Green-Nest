import { config } from '../config';
import media from './media.generated.json';
import { PROJECTS } from './projects';

/**
 * Chronologie de la page Magazines, partagée par la navigation (longueur de la zone fixe) et la 3D
 * (src/scene/magazines.ts). Pour chaque magazine : il s'ouvre, ses doubles pages se tournent une à une,
 * il se referme sur sa 4e de couverture ; puis le cercle tourne jusqu'au magazine suivant.
 */
export const MAGAZINE_PROJECT = PROJECTS.find((p) => p.layout === 'magazine') ?? null;
export const MAGAZINES = media.magazines;

type Step = { kind: 'turn' | 'flip'; mag: number; leaf: number; len: number }; // len : hauteurs d'écran

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function steps(): Step[] {
  const { flip, turn } = config.magazines;
  const list: Step[] = [];
  MAGAZINES.forEach((m, i) => {
    if (i > 0) list.push({ kind: 'turn', mag: i, leaf: -1, len: turn });
    // Feuilles : la couverture (dos : 1re double page), les pages intérieures, la dernière (dos : 4e de couv).
    for (let leaf = 0; leaf <= m.spreads.length; leaf++) list.push({ kind: 'flip', mag: i, leaf, len: flip });
  });
  return list;
}

const STEPS = steps();
const TOTAL = STEPS.reduce((s, x) => s + x.len, 0);

/** Longueur de la zone fixe de la page Magazines, en px (H : hauteur de l'écran). */
export function magazineHold(H: number): number {
  return TOTAL * H;
}

/** Arrêts du scroll dans la zone fixe (0 → 1) : chaque fois qu'un nouveau magazine arrive devant, fermé. */
export function magazinePauses(): number[] {
  const pauses: number[] = [];
  let pos = 0;
  for (const s of STEPS) {
    pos += s.len;
    if (s.kind === 'turn') pauses.push(pos / TOTAL);
  }
  return pauses;
}

/**
 * État à une avancée dans la zone fixe (0 → 1) : position du cercle (en magazines : 1 = le 2e est devant)
 * et, pour chaque magazine, l'avancée de chacune de ses feuilles (0 = à droite, 1 = tournée à gauche).
 */
export function magazineState(progress: number): { ring: number; leaves: number[][] } {
  let pos = progress * TOTAL;
  let ring = 0;
  const leaves = MAGAZINES.map((m) => new Array<number>(m.spreads.length + 1).fill(0));
  for (const s of STEPS) {
    const t = clamp01(pos / s.len);
    pos -= s.len;
    if (s.kind === 'turn') ring += t;
    else leaves[s.mag][s.leaf] = t;
  }
  return { ring, leaves };
}
