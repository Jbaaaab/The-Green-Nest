import type { Localized } from '../i18n';
import type media from '../works/media.generated.json';

export type CaseKey = keyof typeof media.about;

/**
 * Étapes de la frise de la page About (maquette ABOUT 148:58, frame 1440×1024), de gauche à droite.
 * - below : un point vert sur le trait, titre et description dessous ; above : un trait vert qui monte, le titre
 *   au-dessus, et un carré vert (note) qui l'explique au survol.
 * - x : le point ou le trait vert, en px depuis le bord gauche de la frame ; textX : bord gauche du texte
 *   (bord droit avec align 'right').
 * - Textes ligne par ligne, comme sur la maquette (fautes d'anglais corrigées avec l'accord du DA : AT AN,
 *   WRITING, COFFEE SHOPS ; TWO-MONTH TRIP, WE’RE LAUNCHING… CRASH TEST dans les carrés). Les trous restent
 *   (« THIS  TOGETHER »). Version française : mêmes nombres de lignes.
 * - media : minicase affiché à la place de la photo de devant (media.about, npm run assets).
 */
export type Step = {
  id: string;
  side: 'below' | 'above';
  x: number;
  textX: number;
  align?: 'right';
  title: Localized<string[]>;
  desc?: Localized<string[]>;
  note?: Localized;
  media?: CaseKey;
};

export const STEPS: Step[] = [
  {
    id: 'studies',
    side: 'below',
    x: 48,
    textX: 40,
    title: { en: ['STUDIES AT', 'ISCOM'], fr: ['ÉTUDES', 'À L’ISCOM'] },
  },
  {
    id: 'rouen',
    side: 'below',
    x: 243,
    textX: 193,
    title: { en: ['ROUEN’S', 'DIOCESE'], fr: ['DIOCÈSE', 'DE ROUEN'] },
    desc: {
      en: ['GRAPHIC DESIGN', 'INTERNSHIP AT', 'ROUEN’S DIOCESE'],
      fr: ['STAGE', 'DE GRAPHISME AU', 'DIOCÈSE DE ROUEN'],
    },
    media: 'rouen',
  },
  {
    id: 'cambodia',
    side: 'above',
    x: 276,
    textX: 276,
    title: { en: ['THE CAMBODIA', 'PROJECT (MOVIE)'], fr: ['LE PROJET', 'CAMBODGE (FILM)'] },
    note: {
      en: 'A MOVIE ABOUT THE TWO-MONTH TRIP WE MADE IN CAMBODIA, ONLY WALKING AND HOW WE ALMOST DIED',
      fr: 'UN FILM SUR NOS DEUX MOIS DE VOYAGE AU CAMBODGE, UNIQUEMENT À PIED, ET COMMENT ON A FAILLI MOURIR',
    },
    media: 'cambodia',
  },
  {
    id: 'freelance-studying',
    side: 'above',
    x: 409,
    textX: 409,
    title: { en: ['FREELANCE', 'WHILE STUDYING'], fr: ['FREELANCE', 'PENDANT MES ÉTUDES'] },
    note: {
      en: 'CREATION OF MY FREELANCE GIG ON THE SIDE OF MY STUDIES, MOSTLY TO MAKE MY WIFE TRAVEL (I’M IN DEBT)',
      fr: 'LANCEMENT DE MON ACTIVITÉ FREELANCE À CÔTÉ DE MES ÉTUDES, SURTOUT POUR FAIRE VOYAGER MA FEMME (JE SUIS ENDETTÉ)',
    },
    media: 'freelanceStudying',
  },
  {
    id: 'black-duck',
    side: 'below',
    x: 438,
    textX: 383,
    title: { en: ['BLACK DUCK', 'AGENCY'], fr: ['AGENCE', 'BLACK DUCK'] },
    desc: {
      en: ['ART DIRECTOR', 'ASSISTANT AT AN', 'ADS DIGITAL AGENCY'],
      fr: ['ASSISTANT DIRECTEUR', 'ARTISTIQUE DANS UNE', 'AGENCE DE PUB DIGITALE'],
    },
    media: 'blackDuck',
  },
  {
    id: 'gust',
    side: 'below',
    x: 1003,
    textX: 953,
    title: { en: ['GUST! AGENCY'], fr: ['AGENCE GUST!'] },
    desc: {
      en: ['ART DIRECTOR IN AN', 'ADS & SOCIAL MEDIA', 'AGENCY IN PARIS'],
      fr: ['DIRECTEUR ARTISTIQUE', 'DANS UNE AGENCE DE PUB', 'ET SOCIAL MEDIA À PARIS'],
    },
    media: 'gust',
  },
  {
    id: 'jenesis',
    side: 'above',
    x: 1017,
    textX: 1017,
    title: { en: ['JENESIS'], fr: ['JENESIS'] },
    note: {
      en: 'WE’RE LAUNCHING THE FIRST CRASH TEST OF A DENIM BRAND, FIRST COLLECTION JANUARY 2027 OMG',
      fr: 'ON LANCE LE PREMIER CRASH TEST D’UNE MARQUE DE DENIM, PREMIÈRE COLLECTION EN JANVIER 2027 OMG',
    },
    media: 'jenesis',
  },
  {
    id: 'hours',
    side: 'above',
    x: 1107,
    textX: 1107,
    title: { en: ['1092 HOURS', 'PROJECT'], fr: ['PROJET', '1092 HEURES'] },
    note: {
      en: 'A GROUP OF FRIENDS TOOK THE DUMB DECISION TO WORK FREELANCE 1092 HOURS A YEAR ON THE SIDE OF THEIR JOB',
      fr: 'UNE BANDE DE POTES A PRIS LA DÉCISION DÉBILE DE BOSSER EN FREELANCE 1092 HEURES PAR AN EN PLUS DE LEUR JOB',
    },
    media: 'hours', // Longtemps (le précase)
  },
  {
    id: 'freelance-era',
    side: 'below',
    x: 1198,
    textX: 1148,
    title: { en: ['FREELANCE', 'ERA'], fr: ['L’ÈRE', 'FREELANCE'] },
    desc: {
      en: ['DOING COOL SHIT', 'FROM OVERPRICED', 'COFFEE SHOPS'],
      fr: ['FAIRE DES TRUCS COOL', 'DEPUIS DES CAFÉS', 'HORS DE PRIX'],
    },
    media: 'freelanceEra', // le showreel recadré
  },
  {
    id: 'idk',
    side: 'below',
    x: 1393,
    textX: 1397,
    align: 'right',
    title: { en: ['IDK GLORY', 'I GUESS'], fr: ['JSP, LA GLOIRE', 'J’IMAGINE'] },
    desc: {
      en: ['WE’RE WRITING', 'THIS  TOGETHER', 'I GUESS'],
      fr: ['ON L’ÉCRIT', 'ENSEMBLE,', 'J’IMAGINE'],
    },
    media: 'idk',
  },
];
