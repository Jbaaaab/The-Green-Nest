/**
 * « MAIL COPIED » (demande du DA) : au clic sur Mail, l'adresse est copiée (header.ts). Pendant une seconde, une
 * enveloppe 3D tourne au centre de l'écran façon PS3 (src/scene/mailEnvelope.ts, dans le canvas), avec un halo
 * flou autour ; dessous, « MAIL COPIED » dans le style des autres textes (noir négatif), qui se dissout en se
 * floutant (opacité 100 → 0). Sans 3D : une enveloppe SVG à la place.
 */
import { tint } from './tint';

export const MAIL_TOAST_MS = 1000;

let halo: HTMLElement | null = null;
let text: HTMLElement | null = null;
let twins: HTMLElement[] = []; // le texte en dégradé blanc → vert → noir (src/ui/tint.ts)
let timer = 0;

// Le halo (et l'enveloppe de secours) passent sous le canvas ; le texte au-dessus (deux éléments distincts).
function create(): void {
  halo = document.createElement('div');
  halo.className = 'mail-toast';
  halo.setAttribute('aria-hidden', 'true');
  halo.innerHTML = `
    <span class="mail-toast__halo"></span>
    <svg class="mail-toast__icon" viewBox="0 0 30 20"><rect x="1" y="1" width="28" height="18" rx="2"/><path d="M1.5 2 15 11.5 28.5 2"/></svg>`;
  text = document.createElement('p');
  text.className = 'mail-toast__text';
  text.setAttribute('role', 'status');
  document.body.append(halo, text);
  twins = tint(text);
}

export function initMailToast(): void {
  window.addEventListener('mail:copied', () => {
    if (!halo || !text) create();
    text!.textContent = 'MAIL COPIED';
    // Relance l'animation à chaque clic (les jumeaux du texte aussi : ils doivent la jouer en même temps).
    const els = [halo!, text!, ...twins];
    for (const el of els) el.classList.remove('is-on');
    void text!.offsetWidth;
    for (const el of els) el.classList.add('is-on');
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      for (const el of els) el.classList.remove('is-on');
    }, MAIL_TOAST_MS);
  });
}
