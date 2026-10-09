import { nav } from '../nav';

export function initHeader(root: ParentNode = document): void {
  // Le bouton curseur du header émet `cursor:next`, écouté par le curseur 3D.
  const cursorBtn = root.querySelector<HTMLButtonElement>('.cursor-btn');
  cursorBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cursor:next'));
  });

  // Le logo ramène à l'accueil ; « Monstera » (l'à-propos) descend tout en bas, sur le footer et sa bio,
  // cartes envolées (sans recharger la page).
  root.querySelector<HTMLAnchorElement>('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.goTo(0);
  });
  root.querySelector<HTMLAnchorElement>('.nav-monstera')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.goTo(nav.count);
  });

  // « Brands » ouvre le pong des marques (chargé au premier clic).
  const brands = root.querySelector<HTMLButtonElement>('.nav-brands');
  brands?.addEventListener('click', () => {
    import('./brands').then(({ openBrands }) => openBrands(brands)).catch((err) => console.error('Brands indisponible :', err));
  });
}
