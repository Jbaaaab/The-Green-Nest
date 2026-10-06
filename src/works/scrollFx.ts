import { config } from '../config';

/**
 * Twist façon perappelgren.de : pendant le scroll, la page se courbe comme si elle était collée
 * sur un tambour (axe horizontal). En haut de l'écran les éléments basculent vers l'arrière par
 * le haut, en bas par le bas ; au centre ils restent à plat. La courbure dépend de la vitesse.
 *
 * oy : position verticale du centre de l'élément par rapport au centre de l'écran (px).
 * Retourne la rotation autour de l'axe horizontal (rad, convention CSS rotateX) et le recul (px).
 */
export function drum(oy: number, viewportHeight: number, velocity: number): { rotX: number; z: number } {
  const { perSpeed, max, depth } = config.works.twist;
  const bend = Math.min(max, Math.abs(velocity) * perSpeed);
  if (bend < 1e-4) return { rotX: 0, z: 0 };
  const t = Math.max(-1.5, Math.min(1.5, oy / (viewportHeight / 2))); // -1 en haut, +1 en bas
  return {
    rotX: -t * bend, // CSS : rotateX > 0 fait reculer le bord haut
    z: -depth * viewportHeight * (bend / max) * t * t,
  };
}

// Distance caméra équivalente à la caméra Three.js (même fov) : DOM et 3D se déforment pareil.
export function perspectiveFor(viewportHeight: number): number {
  return viewportHeight / 2 / Math.tan((config.stage.fov * Math.PI) / 360);
}
