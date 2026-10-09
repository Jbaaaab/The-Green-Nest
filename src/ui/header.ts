import { config } from '../config';
import { nav } from '../nav';
import { initMailToast } from './mailToast';

export function initHeader(root: ParentNode = document): void {
  // Le bouton curseur du header émet `cursor:next`, écouté par le curseur 3D.
  const cursorBtn = root.querySelector<HTMLButtonElement>('.cursor-btn');
  cursorBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cursor:next'));
  });

  // Le logo ramène à l'accueil ; « Monstera » (l'à-propos) descend jusqu'aux photos du footer, la pile de
  // cartes complète (sans recharger la page).
  root.querySelector<HTMLAnchorElement>('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.goTo(0);
  });
  root.querySelector<HTMLAnchorElement>('.nav-monstera')?.addEventListener('click', (e) => {
    e.preventDefault();
    nav.goTo(nav.count - 1, config.footer.cards.pause ?? 0.76);
  });

  // « Mail » copie l'adresse (au lieu d'ouvrir la messagerie) : « MAIL COPIED » au centre de l'écran, qui se
  // dissout (src/ui/mailToast.ts). Si la copie est impossible, le lien s'ouvre normalement.
  initMailToast();
  const mail = root.querySelector<HTMLAnchorElement>('.contact__mail');
  mail?.addEventListener('click', (e) => {
    const address = mail.href.replace(/^mailto:/, '');
    if (!navigator.clipboard?.writeText) return;
    e.preventDefault();
    navigator.clipboard.writeText(address).then(
      () => window.dispatchEvent(new CustomEvent('mail:copied')),
      () => (location.href = mail.href),
    );
  });

  // « Brands » ouvre le pong des marques (chargé au premier clic).
  const brands = root.querySelector<HTMLButtonElement>('.nav-brands');
  brands?.addEventListener('click', () => {
    import('./brands').then(({ openBrands }) => openBrands(brands)).catch((err) => console.error('Brands indisponible :', err));
  });
}
