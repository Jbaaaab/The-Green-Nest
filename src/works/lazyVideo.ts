// Vidéo muette en boucle, chargée seulement à l'approche de sa page (data-src → src).
export function lazyVideo(src: string, poster: string, rate: number): HTMLVideoElement {
  const v = document.createElement('video');
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'none';
  v.defaultPlaybackRate = rate;
  v.playbackRate = rate;
  v.dataset.src = src;
  v.dataset.poster = poster;
  return v;
}

/** Lance le chargement d'une vidéo préparée par lazyVideo (une seule fois). */
export function loadVideo(v: HTMLVideoElement): void {
  if (v.src) return;
  v.poster = v.dataset.poster!;
  v.src = v.dataset.src!;
  v.preload = 'auto';
}
