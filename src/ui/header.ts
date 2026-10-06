import { nav } from '../nav';

export function initHeader(root: ParentNode = document): void {
  // Le bouton curseur du header émet `cursor:next`, écouté par le curseur 3D.
  const cursorBtn = root.querySelector<HTMLButtonElement>('.cursor-btn');
  cursorBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cursor:next'));
  });

  // Le logo ramène à l'accueil, « Works » ouvre le premier projet (sans recharger la page).
  root.querySelector<HTMLAnchorElement>('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.goTo(0);
  });
  const works = root.querySelector<HTMLAnchorElement>('.nav-works');
  if (works) {
    works.href = '#longtemps';
    works.addEventListener('click', (e) => {
      e.preventDefault();
      nav.goTo(1);
    });
  }
}
