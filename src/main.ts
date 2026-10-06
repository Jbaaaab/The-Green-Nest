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
