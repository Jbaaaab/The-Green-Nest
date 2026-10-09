/**
 * « MAIL COPIED » (demande du DA) : au clic sur Mail, l'adresse est copiée (header.ts) et ces mots apparaissent
 * au centre de l'écran, dans le style des autres textes (noir négatif), puis se dissolvent : opacité de 100 à 0
 * en se floutant (base.css). Une seconde en tout.
 */
export const MAIL_TOAST_MS = 1000;

let toast: HTMLElement | null = null;
let timer = 0;

export function initMailToast(): void {
  window.addEventListener('mail:copied', () => {
    if (!toast) {
      toast = document.createElement('p');
      toast.className = 'mail-toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    const el = toast;
    el.textContent = 'MAIL COPIED';
    // Relance l'animation à chaque clic.
    el.classList.remove('is-on');
    void el.offsetWidth;
    el.classList.add('is-on');
    clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('is-on'), MAIL_TOAST_MS);
  });
}
