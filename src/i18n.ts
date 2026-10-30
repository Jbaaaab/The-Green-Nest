/**
 * Langue du site (demande du DA) : anglais par défaut ; « FR » dans le header passe tout le site en français
 * (et le bouton devient « EN »). Le choix est gardé d'une visite à l'autre ; ?lang=fr (ou en) dans l'adresse
 * l'impose.
 * - Textes de index.html : data-i18n="clé" (contenu, HTML permis), data-i18n-label="clé" (aria-label),
 *   data-i18n-title="clé" (title), avec les textes de STRINGS ci-dessous.
 * - Textes construits en JS : tr({ en, fr }) donne celui de la langue courante ; onLang() pour les remettre à
 *   jour quand elle change (les modules relaient alors leurs textes et refont leur mise en page).
 * Les trous des textes sont voulus, en français comme en anglais (mêmes nombres d'espaces, aux mêmes places).
 */
export type Lang = 'en' | 'fr';
export type Localized<T = string> = { en: T; fr: T };

const KEY = 'dwam-lang';

function initial(): Lang {
  const asked = new URLSearchParams(location.search).get('lang');
  if (asked === 'fr' || asked === 'en') return asked;
  try {
    return localStorage.getItem(KEY) === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export let lang: Lang = initial();

/** Le texte dans la langue courante. */
export const tr = <T>(text: Localized<T>): T => text[lang];

const listeners: ((l: Lang) => void)[] = [];

/** Appelé à chaque changement de langue (pas tout de suite : les modules partent déjà dans la bonne langue). */
export function onLang(fn: (l: Lang) => void): void {
  listeners.push(fn);
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // navigation privée : le choix vaut pour cette visite
  }
  applyStatic();
  for (const fn of listeners) fn(next);
}

const gap = (n: number) => ' '.repeat(n);

// Textes de index.html. Bio : retours à la ligne forcés aux places de la maquette (desktop), trous voulus.
export const STRINGS: Record<string, Localized> = {
  'meta.description': {
    en: 'Designer With A Monstera is an art director and designer based in Paris, working 360° across music, fashion, and advertising.',
    fr: 'Designer With A Monstera est directeur artistique et designer, basé à Paris. Il travaille à 360° dans la musique, la mode et la publicité. Son travail\u00a0: rendre les choses cool pour les gens et les marques.',
  },
  'nav.about': { en: 'About', fr: 'À propos' },
  'nav.brands': { en: 'Brands', fr: 'Marques' },
  // Le bouton de langue affiche l'autre langue.
  'nav.lang': { en: 'FR', fr: 'EN' },
  'nav.lang.label': { en: 'Version française', fr: 'English version' },
  'bio.desktop': {
    en: `DESIGNER WITH A MONSTERA IS AN ART DIRECTOR${gap(20)}AND DESIGNER BASED IN PARIS,<br />WORKING 360°${gap(22)}ACROSS MUSIC, FASHION, AND ADVERTISING.${gap(23)}HIS WORK FOCUSES<br />ON MAKING THINGS LOOK <strong class="bio__cool">COOL</strong> FOR PEOPLE AND BRANDS.`,
    fr: `DESIGNER WITH A MONSTERA EST DIRECTEUR ARTISTIQUE${gap(20)}ET DESIGNER BASÉ À PARIS,<br />IL TRAVAILLE À 360°${gap(22)}DANS LA MUSIQUE, LA MODE ET LA PUBLICITÉ.${gap(23)}SON TRAVAIL\u00a0:<br />RENDRE LES CHOSES <strong class="bio__cool">COOL</strong> POUR LES GENS ET LES MARQUES.`,
  },
  'bio.mobile': {
    en: `DESIGNER WITH A MONSTERA <br />IS AN ART DIRECTOR${gap(20)}AND DESIGNER${gap(7)}BASED IN PARIS, <br />WORKING 360°${gap(22)}ACROSS <br />MUSIC, FASHION, AND ADVERTISING.${gap(23)}HIS WORK FOCUSES ON MAKING THINGS LOOK <strong class="bio__cool">COOL</strong> FOR PEOPLE AND BRANDS.`,
    fr: `DESIGNER WITH A MONSTERA <br />EST DIRECTEUR ARTISTIQUE${gap(20)}ET DESIGNER${gap(7)}BASÉ À PARIS, <br />IL TRAVAILLE À 360°${gap(22)}DANS <br />LA MUSIQUE, LA MODE ET LA PUBLICITÉ.${gap(23)}SON TRAVAIL\u00a0: RENDRE LES CHOSES <strong class="bio__cool">COOL</strong> POUR LES GENS ET LES MARQUES.`,
  },
  'clock.seoul': { en: 'Seoul', fr: 'Séoul' },
  'music.label': { en: 'Music player', fr: 'Lecteur de musique' },
  'music.idle': { en: 'Music player', fr: 'Musique' },
  'music.play': { en: 'Play music', fr: 'Lancer la musique' },
  'music.stop': { en: 'Stop music', fr: 'Arrêter la musique' },
  'music.next': { en: 'Next track', fr: 'Morceau suivant' },
};

/** Texte de index.html (STRINGS) dans la langue courante. */
export const t = (key: string): string => STRINGS[key]?.[lang] ?? key;

function applyStatic(): void {
  const root = document.documentElement;
  root.lang = lang;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  // (sauf dans les jumeaux en négatif de src/ui/tint.ts, qui recopient leur original)
  const all = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => !el.closest('.is-tint'));
  for (const el of all('[data-i18n]')) el.innerHTML = t(el.dataset.i18n!);
  for (const el of all('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel!));
  for (const el of all('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle!);
  // Le bouton de langue est écrit dans l'autre langue.
  document.querySelector('.nav-lang')?.setAttribute('lang', lang === 'en' ? 'fr' : 'en');
}

/** Pose la langue de départ sur index.html (en anglais tel quel : rien à remplacer). */
export function initLang(): void {
  if (lang !== 'en') applyStatic();
  document.querySelector('.nav-lang')?.addEventListener('click', () => setLang(lang === 'en' ? 'fr' : 'en'));
}
