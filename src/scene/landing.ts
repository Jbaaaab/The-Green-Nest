import { config } from '../config';
import { WorkTrail } from '../ui/workTrail';
import { InstaRain } from './instaRain';
import { Ring } from './ring';
import { Stage, type Viewport } from './stage';

// Point d'entrée de la 3D de la landing, chargé à part pour que le texte s'affiche avant.
export async function initLanding3D(canvas: HTMLCanvasElement): Promise<void> {
  const stage = new Stage(canvas);
  const ring = await Ring.load();
  stage.scene.add(ring.root);
  stage.add(ring);

  // Traînée : desktop à la souris uniquement, coupée en prefers-reduced-motion.
  const coarse = window.matchMedia('(pointer: coarse)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const trail = new WorkTrail(canvas.parentElement!);
  let vp: Viewport = stage.viewport;
  stage.add({
    resize: (v) => {
      vp = v;
      trail.resize(v);
    },
    update: (time) => {
      if (!vp.mobile && !coarse.matches && !reduced.matches) trail.update(time);
    },
  });

  // Pluie Instagram : au survol à la souris uniquement. Sur mobile le lien s'ouvre directement.
  const rain = new InstaRain(stage);
  stage.add(rain);
  const insta = document.querySelector<HTMLAnchorElement>('.contact__insta');
  insta?.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && !vp.mobile && !reduced.matches) rain.start();
  });
  insta?.addEventListener('pointerleave', () => rain.stop());
  // En dev, ?rain déclenche la pluie sans survol (pour tester).
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('rain')) rain.start();

  stage.start();

  canvas.style.transitionDuration = `${config.stage.fadeInMs}ms`;
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
}
