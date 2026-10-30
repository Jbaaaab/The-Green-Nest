import { initLang } from '../i18n';
import { nav } from '../nav';
import { go, page } from '../router';
import { initMailToast } from './mailToast';

export function initHeader(root: ParentNode = document): void {
  // « FR » / « EN » : la langue du site (src/i18n.ts).
  initLang();

  // Le logo ramène en haut de l'accueil (depuis About : directement, sans traverser les projets) ; « About »
  // (ex-Monstera) ouvre la page About, à /about (src/router.ts), sans recharger : la musique continue.
  root.querySelector<HTMLAnchorElement>('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (page === 'about') {
      nav.jumpTo(0);
      go('home');
    } else nav.goTo(0);
  });
  root.querySelector<HTMLAnchorElement>('.nav-about')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (page === 'about') window.dispatchEvent(new Event('about:top')); // déjà sur About : retour en haut
    else go('about');
  });

  // « Mail » copie l'adresse (au lieu d'ouvrir la messagerie) : une enveloppe 3D tourne, « MAIL COPIED » dessous
  // qui se dissout (src/ui/mailToast.ts et src/scene/mailEnvelope.ts). Si la copie est impossible, le lien
  // s'ouvre normalement.
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
