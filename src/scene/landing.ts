import { config } from '../config';
import { WorkTrail } from '../ui/workTrail';
import { nav } from '../nav';
import { PROJECTS } from '../works/projects';
import { Cursor3D } from './cursor';
import { DarumaMountain } from './darumaMountain';
import { Digits3D } from './digits';
import { FooterPlants } from './footerPlants';
import { MailEnvelope } from './mailEnvelope';
import { Magazines } from './magazines';
import { InstaRain } from './instaRain';
import { Ring } from './ring';
import { Stage, type Viewport } from './stage';

// Rend la main au navigateur entre deux étapes lourdes (évite une longue tâche qui fige la page sur mobile).
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Point d'entrée de la 3D de la landing, chargé à part pour que le texte s'affiche avant.
export async function initLanding3D(canvas: HTMLCanvasElement): Promise<void> {
  await yieldToMain();
  const stage = new Stage(canvas);
  await yieldToMain();
  const ring = await Ring.load();
  stage.scene.add(ring.root);
  stage.add(ring);
  // Compile les shaders sans bloquer (KHR_parallel_shader_compile quand le navigateur le permet).
  await stage.renderer.compileAsync(stage.scene, stage.camera);
  await yieldToMain();

  // Apparitions de projets : desktop à la souris uniquement, coupées en prefers-reduced-motion.
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
      // (seulement sur l'accueil : coupées dès qu'on scrolle vers les projets)
      if (!vp.mobile && !coarse.matches && !reduced.matches && nav.scroll < nav.sectionHeight * 0.3) trail.update(time);
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
  // En dev, ?rain déclenche la pluie sans survol (pour tester) ; la bague est exposée pour les tests.
  if (import.meta.env.DEV) {
    if (new URLSearchParams(location.search).has('rain')) rain.start();
    Object.assign(window, { __ring: ring });
  }

  stage.start();

  canvas.style.transitionDuration = `${config.stage.fadeInMs}ms`;
  requestAnimationFrame(() => {
    canvas.classList.add('is-ready');
    window.dispatchEvent(new Event('stage:ready')); // la bague est là : l'écran de chargement peut finir
  });

  // Montagne de daruma du footer : chargée seulement à l'approche du footer.
  DarumaMountain.watch(stage);
  FooterPlants.watch(stage); // et ses plantes, qui poussent quand on y arrive

  // Enveloppe 3D du « MAIL COPIED » (clic sur Mail).
  stage.add(new MailEnvelope(stage));

  // Magazines 3D (page Magazines) : chargés seulement à l'approche de la page.
  Magazines.watch(stage);

  // Chiffres entourés 3D de la rangée des projets.
  Digits3D.load(stage, PROJECTS.map((p) => p.number))
    .then((digits) => stage.add(digits))
    .catch((err) => console.error('Chiffres 3D indisponibles :', err));

  // Curseur 3D : seulement avec une vraie souris. Le curseur natif n'est caché qu'une fois les GLB chargés.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Cursor3D.load(stage)
      .then((cursor) => stage.add(cursor))
      .catch((err) => console.error('Curseur 3D indisponible :', err));
  }
}
