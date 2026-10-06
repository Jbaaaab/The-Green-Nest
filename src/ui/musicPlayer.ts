// UI seulement pour l'instant. Plus tard : chaque clic jouera un morceau de `tracks`.

const tracks: string[] = [];
let index = -1;

export function initMusicPlayer(button: HTMLButtonElement | null): void {
  if (!button) return;

  button.addEventListener('click', () => {
    if (!tracks.length) return;
    index = (index + 1) % tracks.length;
    // TODO : lecture audio de tracks[index]
  });
}
