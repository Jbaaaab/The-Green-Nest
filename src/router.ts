import { onLang, t } from './i18n';
import { nav, SECTION_IDS } from './nav';

/**
 * Pages du site : l'accueil (le scroll des projets, src/nav.ts) et About (src/about/aboutView.ts), à /about.
 * On change de page sans recharger (history.pushState) : le header, le dock, la musique et la 3D restent.
 * La classe is-about sur <html> masque les pages de l'accueil (base.css) et leur 3D (stage.site).
 * En ligne, vercel.json renvoie /about sur index.html (un lien direct ou un rechargement marche aussi).
 */
export type Page = 'home' | 'about';

const fromPath = (): Page => (/^\/about\/?$/.test(location.pathname) ? 'about' : 'home');

export let page: Page = fromPath();

const listeners: ((p: Page) => void)[] = [];

/** Appelé à chaque changement de page (pas tout de suite : lire `page` pour la page de départ). */
export function onPage(fn: (p: Page) => void): void {
  listeners.push(fn);
}

const NAME = 'Designer With A Monstera';
const setTitle = () => (document.title = page === 'about' ? `${t('nav.about')} — ${NAME}` : NAME);

function apply(): void {
  setTitle();
  document.documentElement.classList.toggle('is-about', page === 'about');
  nav.suspended = page === 'about'; // le scroll de l'accueil ne bouge plus derrière About
  const link = document.querySelector('.nav-about');
  if (page === 'about') link?.setAttribute('aria-current', 'page');
  else link?.removeAttribute('aria-current');
  for (const fn of listeners) fn(page);
}

/** Va sur une page (ajoute une entrée dans l'historique : le bouton retour du navigateur y revient). */
export function go(next: Page): void {
  if (next === page) return;
  page = next;
  const id = SECTION_IDS[nav.section];
  history.pushState(null, '', next === 'about' ? `/about${location.search}` : `/${location.search}${id ? `#${id}` : ''}`);
  apply();
}

export function initRouter(): void {
  onLang(setTitle);
  window.addEventListener('popstate', () => {
    const p = fromPath();
    if (p === page) return;
    page = p;
    apply();
  });
  if (page === 'about') apply();
}
