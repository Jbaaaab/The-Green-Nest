import '@fontsource/epilogue/latin-700.css';
import '@fontsource/epilogue/latin-800.css';
import './styles/tokens.css';
import './styles/base.css';

import { initHeader } from './ui/header';
import { initClock } from './ui/clock';
import { initMusicPlayer } from './ui/musicPlayer';

initHeader();
initClock();
initMusicPlayer(document.querySelector<HTMLButtonElement>('.music'));

// La 3D (Three.js) est chargée après le premier affichage du texte.
const canvas = document.querySelector<HTMLCanvasElement>('.stage');
if (canvas) {
  window.addEventListener(
    'load',
    () => {
      import('./scene/landing')
        .then(({ initLanding3D }) => initLanding3D(canvas))
        .catch((err) => console.error('3D indisponible :', err));
    },
    { once: true },
  );
}
