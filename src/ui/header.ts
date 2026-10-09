import { nav } from '../nav';

export function initHeader(root: ParentNode = document): void {
  // Le bouton curseur du header émet `cursor:next`, écouté par le curseur 3D.
  const cursorBtn = root.querySelector<HTMLButtonElement>('.cursor-btn');
  cursorBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cursor:next'));
  });

  // Le logo ramène à l'accueil, « Works » ouvre le premier projet, « About » descend tout en bas, sur le
  // footer et sa bio, cartes envolées (sans recharger la page).
  const about = root.querySelector<HTMLAnchorElement>('.nav-about');
  if (about) {
    about.href = '#hello';
    about.addEventListener('click', (e) => {
      e.preventDefault();
      nav.goTo(nav.count);
    });
  }
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
