import { config } from '../config';

/**
 * Les fenêtres volent sur un grand cylindre invisible (comme l'anneau de symbolsofwealth.studio,
 * mais on ne voit qu'une section à la fois) : axe vertical au centre de l'écran, derrière l'écran.
 * phi : 0 = en place, +1 = partie à droite (à venir), -1 = partie à gauche (passée).
 */
export type Placement = { dx: number; dz: number; rotY: number; opacity: number };

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Phase d'une fenêtre. d = section - p (positif : à venir). rankIn / rankOut ∈ [0, 1] décalent
// les fenêtres entre elles (rang 0 = bouge en premier) pour qu'elles arrivent l'une après l'autre.
export function windowPhase(d: number, rankIn: number, rankOut: number): number {
  const S = config.works.stagger;
  if (d >= 0) return Math.min(1, Math.max(0, (d - (1 - rankIn) * S) / (1 - S)));
  return -Math.min(1, Math.max(0, (-d - rankOut * S) / (1 - S)));
}

// Déplacement d'une fenêtre dont le centre est à ox px (horizontalement) du centre de l'écran.
export function place(phi: number, ox: number, viewportWidth: number, reduced: boolean): Placement {
  const { radiusFactor, maxAngleDeg, fadeStart, fadeEnd } = config.works;
  const opacity = 1 - smooth(fadeStart, fadeEnd, Math.abs(phi));
  if (reduced) return { dx: 0, dz: 0, rotY: 0, opacity };

  const R = viewportWidth * radiusFactor;
  const theta = (phi * maxAngleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    dx: ox * cos + R * sin - ox,
    dz: R * cos - R - ox * sin,
    rotY: theta,
    opacity,
  };
}

// Distance caméra équivalente à la caméra Three.js (même fov) : DOM et 3D bougent pareil.
export function perspectiveFor(viewportHeight: number): number {
  return viewportHeight / 2 / Math.tan((config.stage.fov * Math.PI) / 360);
}
