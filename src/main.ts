import '@fontsource/epilogue/latin-700.css';
import '@fontsource/epilogue/latin-800.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/works.css';
import './styles/footer.css';

import { FooterView } from './footer/footerView';
import { nav } from './nav';
import { initHeader } from './ui/header';
import { initClock } from './ui/clock';
import { startLoader } from './ui/loader';
import { initMusicPlayer } from './ui/musicPlayer';
import { WorksView } from './works/worksView';

// Écran de chargement : il suit les étapes (événements stage:module et stage:ready, plus bas et dans landing.ts).
startLoader();
initHeader();
initClock();
initMusicPlayer(document.querySelector<HTMLElement>('.music'));

// Pages projets : on y accède en scrollant depuis l'accueil. Construites tout de suite si on arrive
// par un lien direct (#take-care…), sinon dès que le navigateur a fini d'afficher l'accueil.
nav.init();
if (import.meta.env.DEV) Object.assign(window, { __nav: nav }); // pour les tests
const buildWorks = () => {
  const main = document.querySelector('main')!;
  new WorksView(main, () => document.querySelector('.trail'));
  new FooterView(main); // le footer, tout en bas du scroll
};
if (nav.section > 0) buildWorks();
else if ('requestIdleCallback' in window) requestIdleCallback(buildWorks, { timeout: 1500 });
else setTimeout(buildWorks, 800);

// La 3D (Three.js) est chargée après le premier affichage du texte.
const canvas = document.querySelector<HTMLCanvasElement>('.stage');
if (canvas) {
  window.addEventListener(
    'load',
    () => {
      import('./scene/landing')
        .then(({ initLanding3D }) => {
          window.dispatchEvent(new Event('stage:module'));
          return initLanding3D(canvas);
        })
        .catch((err) => {
          console.error('3D indisponible :', err);
          window.dispatchEvent(new Event('stage:ready')); // l'écran de chargement n'attend pas une 3D qui ne viendra pas
        });
    },
    { once: true },
  );
}
