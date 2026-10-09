/**
 * « MAIL COPIED » (demande du DA) : au clic sur Mail, l'adresse est copiée (header.ts) et ceci s'affiche une
 * seconde au centre de l'écran : le texte, dans le style des autres (noir négatif), et un halo flou autour de
 * l'enveloppe 3D qui tourne au-dessus (src/scene/mailEnvelope.ts, dans le canvas). Sans 3D : une enveloppe SVG.
 */
export const MAIL_TOAST_MS = 1000;

let toast: HTMLElement | null = null;
let timer = 0;

function create(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mail-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="mail-toast__halo" aria-hidden="true"></span>
    <svg class="mail-toast__icon" viewBox="0 0 30 20" aria-hidden="true"><rect x="1" y="1" width="28" height="18" rx="2"/><path d="M1.5 2 15 11.5 28.5 2"/></svg>
    <p class="mail-toast__text"></p>`;
  document.body.append(el);
  return el;
}

export function initMailToast(): void {
  window.addEventListener('mail:copied', () => {
    const el = (toast ??= create());
    el.querySelector('.mail-toast__text')!.textContent = 'MAIL COPIED';
    // Relance l'animation à chaque clic.
    el.classList.remove('is-on');
    void el.offsetWidth;
    el.classList.add('is-on');
    clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('is-on'), MAIL_TOAST_MS);
  });
}
