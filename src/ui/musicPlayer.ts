import { config } from '../config';
import tracks from './tracks.generated.json';

type Track = { src: string; title: string; artist: string };

/**
 * Music player du dock. Le rectangle vert garde son look de maquette, avec deux zones :
 * - l'icône : lance / arrête la musique (égaliseur animé pendant la lecture) ;
 * - le texte : passe au morceau suivant (« chaque clic joue un morceau »), affiche le titre en cours.
 * Au tout premier lancement, une courte intro est jouée avant le premier morceau.
 * Morceaux générés par `npm run assets` (src/ui/tracks.generated.json).
 */
export function initMusicPlayer(root: HTMLElement | null): void {
  if (!root) return;
  const toggle = root.querySelector<HTMLButtonElement>('.music__toggle')!;
  const next = root.querySelector<HTMLButtonElement>('.music__next')!;
  const label = root.querySelector<HTMLElement>('.music__label')!;
  const title = root.querySelector<HTMLElement>('.music__title')!;
  const idleText = title.textContent ?? 'Music player';

  const audio = new Audio();
  audio.preload = 'none';
  let bag: Track[] = [];
  let current: Track | null = null;
  let introPlayed = false;
  let playingIntro = false;
  let fade = 0;

  // Tirage sans remise : tous les morceaux passent avant qu'un revienne.
  const draw = (): Track => {
    if (!bag.length) {
      bag = [...tracks.tracks].sort(() => Math.random() - 0.5);
      if (current && bag.length > 1 && bag[bag.length - 1].src === current.src) bag.unshift(bag.pop()!);
    }
    return bag.pop()!;
  };

  const fadeTo = (target: number, ms: number, done?: () => void) => {
    cancelAnimationFrame(fade);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      audio.volume = from + (target - from) * t;
      if (t < 1) fade = requestAnimationFrame(step);
      else done?.();
    };
    fade = requestAnimationFrame(step);
  };

  const setTitle = (text: string) => {
    title.textContent = text;
    label.classList.remove('is-scrolling');
    // Si le titre dépasse, il défile (distance et durée calculées sur la largeur réelle).
    requestAnimationFrame(() => {
      const overflow = title.scrollWidth - label.clientWidth;
      if (overflow > 2) {
        label.style.setProperty('--marquee-shift', `${-overflow}px`);
        label.style.setProperty('--marquee-duration', `${Math.max(4, overflow / 12)}s`);
        label.classList.add('is-scrolling');
      }
    });
  };

  const setPlaying = (on: boolean) => {
    root.classList.toggle('is-playing', on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Arrêter la musique' : 'Lancer la musique');
    if (!on) setTitle(idleText);
  };

  const start = (src: string) => {
    audio.src = src;
    audio.volume = 0;
    audio.play().then(() => fadeTo(config.music.volume, config.music.fadeInMs)).catch(() => setPlaying(false));
    setPlaying(true);
  };

  const playTrack = (track: Track) => {
    current = track;
    playingIntro = false;
    start(track.src);
    setTitle(`${track.title} — ${track.artist}`);
  };

  const play = () => {
    if (!introPlayed && tracks.intro) {
      introPlayed = true;
      playingIntro = true;
      start(tracks.intro);
      setTitle('Lock in…');
      return;
    }
    // Reprise après un arrêt : on continue là où on en était.
    if (audio.src && audio.paused) {
      setPlaying(true);
      if (current) setTitle(`${current.title} — ${current.artist}`);
      audio.play().then(() => fadeTo(config.music.volume, config.music.fadeInMs)).catch(() => setPlaying(false));
      return;
    }
    playTrack(draw());
  };

  const stop = () => {
    setPlaying(false);
    fadeTo(0, config.music.fadeOutMs, () => audio.pause());
  };

  toggle.addEventListener('click', () => (root.classList.contains('is-playing') ? stop() : play()));
  next.addEventListener('click', () => {
    if (!root.classList.contains('is-playing')) return play();
    if (playingIntro) return; // l'intro est courte : le morceau arrive juste après
    fadeTo(0, 150, () => playTrack(draw()));
  });
  // Fin d'un morceau (ou de l'intro) : on enchaîne.
  audio.addEventListener('ended', () => playTrack(draw()));
}
