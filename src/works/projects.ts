import { lang } from '../i18n';
import media from './media.generated.json';

/**
 * Contenu des pages projets (maquettes Figma : LONGTEMPS 16:5, F1 25:448, TAKE CARE 25:560, MAGAZINES 25:631,
 * 25:838, 25:888, 51:475, 51:525 ; SOCIAL MEDIA 25:938 pour son texte et son numéro, la mosaïque restant
 * celle d'après les indications du DA).
 * Les trous dans les textes sont voulus (comme sur la bio) : nombres d'espaces repris de Figma.
 * Version française (bouton FR, src/i18n.ts) : `fr`, avec les mêmes trous aux mêmes places ; largeur du bloc
 * mesurée pour que chaque ligne tienne sur sa ligne, comme en anglais.
 */
export type MainMedia =
  | { kind: 'video'; video: string; poster: string }
  | { kind: 'slides'; images: string[] } // diaporama en boucle (config.works.slideMs), en attendant la vidéo
  | { kind: 'placeholder' };
export type SideMedia = { image: string; video?: string; color?: string }; // color : fond pendant le chargement

export type Project = {
  id: string; // ancre d'URL (#longtemps…)
  number: number; // numéro affiché dans la rangée 1-8 (peut sauter : les projets 5 et 6 sont à venir)
  section: number; // index de section dans le scroll (0 = l'accueil) : rang dans la liste
  title: string; // texte du bouton vert
  lines: string[]; // description, ligne par ligne
  textWidth: number; // largeur du bloc de texte, px de maquette
  // magazine : 3D (src/scene/magazines.ts) ; social et posters : bandes qui défilent de côté (src/works/stripView.ts)
  layout: 'single' | 'mosaic' | 'magazine' | 'social' | 'posters';
  main: MainMedia;
  side: SideMedia[];
  columns?: { ratio: number; rows: number }[]; // posters : colonnes (format de leurs cases, nombre de cases), dans l'ordre de side
  link?: string; // lien externe (nouvel onglet) : clic sur la grande vidéo
  roles?: string[]; // ce que le DA a fait sur le projet : le « + » du bouton vert les déplie (textes du DA)
  fr: ProjectText; // version française
};

/** Ce qui change avec la langue. */
export type ProjectText = { title?: string; lines: string[]; textWidth: number; roles?: string[] };

/** Le projet dans la langue courante (titre, texte, largeur du bloc, rôles). */
export const local = (p: Project): Project => (lang === 'fr' ? { ...p, ...p.fr } : p);

const gap = (n: number) => ' '.repeat(n);

// Ordre du scroll (demande du DA) : le Showreel d'abord, puis Longtemps, F1, Take Care, Magazines, Music &
// Culture, Social Media. Numéros dans le même ordre.
const LIST: Omit<Project, 'section'>[] = [
  {
    // Le case des vidéos (ex-VIDEOTAPE, 4e) devenu le showreel, en premier (demande du DA) : « SHOWREEL » au-dessus
    // du texte de la maquette.
    id: 'showreel',
    number: 1,
    title: 'SHOWREEL',
    lines: ['SHOWREEL', `LET’S WATCH A${gap(5)}VIDEOTAPE`, 'TOGETHER'], // maquette « LETS » : apostrophe ajoutée (fautes corrigées, accord du DA)
    textWidth: 194,
    layout: 'single', // comme Longtemps : le case dans le grand cadre, le texte centré dessus
    main: { kind: 'video', ...media.videotape.main },
    side: [],
    roles: ['Creative Direction', 'Editing', 'Color Grading'],
    fr: {
      lines: ['SHOWREEL', `ON REGARDE UNE${gap(5)}CASSETTE`, 'ENSEMBLE'],
      textWidth: 207,
      roles: ['Direction de création', 'Montage', 'Étalonnage'],
    },
  },
  {
    id: 'longtemps',
    number: 2,
    title: 'LONGTEMPS',
    lines: [
      'LONGTEMPS',
      `AN EXPERIMENTAL MUSIC VIDEO${gap(12)}FOR THE BAND “LUCA”`,
      `ALL CREATED AND ANIMATED IN 3D,${gap(17)}IN BLENDER, IN COLLABORATION WITH LEO MOURRAY, COLINE REVERBEL AND MARTINA DOLL.${gap(7)}PRODUCED BY 3 JOURS DE MARCHE`,
    ],
    textWidth: 662, // 649 sur la maquette : élargi pour que « LEO MOURRAY, » reste sur sa ligne (corrections de texte)
    layout: 'single',
    main: { kind: 'video', ...media.longtemps.main }, // le précase (6 s, en boucle)
    side: [],
    link: 'https://www.youtube.com/channel/UCP9Gi6CObkBgustzOim7EvA',
    roles: ['3D Modeling', 'Art Direction', 'Titling'], // « Titleling » dans le message du DA : corrigé
    fr: {
      lines: [
        'LONGTEMPS',
        `UN CLIP EXPÉRIMENTAL${gap(12)}POUR LE GROUPE «\u00a0LUCA\u00a0»`,
        `ENTIÈREMENT CRÉÉ ET ANIMÉ EN 3D,${gap(17)}SOUS BLENDER, EN COLLABORATION AVEC LEO MOURRAY, COLINE REVERBEL ET MARTINA DOLL.${gap(7)}PRODUIT PAR 3 JOURS DE MARCHE`,
      ],
      textWidth: 698, // comme en anglais : « LEO MOURRAY, » reste sur la première ligne
      roles: ['Modélisation 3D', 'Direction artistique', 'Titrage'],
    },
  },
  {
    id: 'formula-one',
    number: 3,
    title: 'FORMULA ONE',
    lines: [
      'FORMULA ONE',
      `A FULL REBRAND${gap(13)}FOR DIGITAL AND LIVE TV PRODUCTION`,
      `PRODUCED IN COLLABORATION${gap(11)}WITH MAXENCE AUBERT AND MATHIS COURVILLERS`,
      `MADE BY FANS WITH LOVE${gap(11)}AND SICKNESS`,
    ],
    textWidth: 667,
    layout: 'single',
    main: { kind: 'video', ...media.formulaOne.main }, // le case F1
    side: [],
    // L'ancien case F1 (ancien site). Adresse Vercel de l'ancien projet : elle reste valable quand le nom de
    // domaine passe sur ce site (designer-with-a-monstera.art/work/f1.html, elle, ne le sera plus).
    link: 'https://monstera-site.vercel.app/work/f1.html',
    roles: ['Art Direction', 'Motion Design'],
    fr: {
      lines: [
        'FORMULA ONE',
        `UN REBRANDING COMPLET${gap(13)}POUR LE DIGITAL ET LA TV EN DIRECT`,
        `PRODUIT EN COLLABORATION${gap(11)}AVEC MAXENCE AUBERT ET MATHIS COURVILLERS`,
        `FAIT PAR DES FANS AVEC AMOUR${gap(11)}ET MALADIE`,
      ],
      textWidth: 667,
      roles: ['Direction artistique', 'Motion design'],
    },
  },
  {
    id: 'take-care',
    number: 4,
    title: 'TAKE CARE',
    lines: [
      'TAKE CARE BEAUTY',
      'A SANRIO-LICENSED', // coupé en deux lignes (bloc étroit) : « BRAND » seul sur sa ligne sinon
      'BEAUTY BRAND',
      `I’VE BEEN${gap(10)}ART DIRECTING AND CRAFTING FOR THEM${gap(8)}FOR A YEAR`,
    ],
    textWidth: 209,
    layout: 'mosaic',
    main: { kind: 'video', ...media.takeCare.main },
    side: media.takeCare.side,
    link: 'https://www.instagram.com/take.care.beauty/',
    roles: ['Art Direction', 'Motion Design'],
    fr: {
      lines: [
        'TAKE CARE BEAUTY',
        'UNE MARQUE BEAUTÉ',
        'SOUS LICENCE SANRIO',
        `J’Y FAIS${gap(10)}LA DIRECTION ARTISTIQUE ET LES CRÉAS${gap(8)}DEPUIS UN AN`,
      ],
      textWidth: 209,
      roles: ['Direction artistique', 'Motion design'],
    },
  },
  {
    id: 'magazines',
    number: 5,
    title: 'MAGAZINES',
    lines: [], // pas de texte pour l'instant
    textWidth: 0,
    layout: 'magazine', // les magazines sont en 3D, dans le canvas : src/scene/magazines.ts
    main: { kind: 'placeholder' },
    side: [],
    roles: ['Art Direction', 'Craft', 'Prepress'],
    fr: { lines: [], textWidth: 0, roles: ['Direction artistique', 'Fabrication', 'Prépresse'] },
  },
  {
    id: 'music-culture',
    number: 6, // maquette : ⑥
    title: 'MUSIC & CULTURE',
    lines: [
      'MUSIC & CULTURE',
      `I’VE DONE THAT SHIT${gap(15)}FOR YEARS${gap(8)}WITH PASSION`,
      `AND HEART${gap(2)}AND POOR${gap(9)}PAY.`,
      `NOW I WANNA WORK${gap(10)}FOR AESPA${gap(12)}AND BE RICH PLZ`,
    ],
    textWidth: 406,
    layout: 'posters',
    main: { kind: 'placeholder' }, // pas de vidéo au centre
    side: media.musicCulture.columns.flatMap((c) => c.tiles),
    columns: media.musicCulture.columns.map((c) => ({ ratio: c.ratio, rows: c.tiles.length })),
    roles: ['Art Direction', 'Graphic Design', 'Styling', 'Clip & MV Direction'], // « Stylism » dans le message du DA
    fr: {
      title: 'MUSIQUE & CULTURE',
      lines: [
        'MUSIQUE & CULTURE',
        `J’AI FAIT CE TAF${gap(15)}PENDANT DES ANNÉES${gap(8)}AVEC PASSION`,
        `ET DU CŒUR${gap(2)}ET UNE PAIE${gap(9)}DE MISÈRE.`,
        `LÀ JE VEUX BOSSER${gap(10)}POUR AESPA${gap(12)}ET ÊTRE RICHE STP`,
      ],
      textWidth: 439,
      roles: ['Direction artistique', 'Design graphique', 'Stylisme', 'Réalisation de clips'],
    },
  },
  {
    id: 'social-media',
    number: 7, // maquette 25:938 : ⑦
    title: 'SOCIAL MEDIA',
    lines: [
      'SOCIAL MEDIA',
      `I’VE DONE THAT SHIT${gap(11)}FOR YEARS TOO`,
      `NOT ALWAYS${gap(6)}SATISFYING THO${gap(7)}TBH.`,
    ],
    textWidth: 285,
    layout: 'social',
    main: { kind: 'video', ...media.socialMedia.main }, // le case, dans le grand rectangle central
    side: media.socialMedia.tiles, // mélangés (npm run assets), colonne par colonne
    roles: ['Art & Creative Direction', 'Graphic Design', 'Editing'],
    fr: {
      title: 'RÉSEAUX SOCIAUX',
      lines: [
        'RÉSEAUX SOCIAUX',
        `J’AI FAIT CE TAF${gap(11)}PENDANT DES ANNÉES AUSSI`,
        `PAS TOUJOURS${gap(6)}SATISFAISANT CELA DIT${gap(7)}TBH.`,
      ],
      textWidth: 343,
      roles: ['Direction artistique & de création', 'Design graphique', 'Montage'],
    },
  },
];

export const PROJECTS: Project[] = LIST.map((p, i) => ({ ...p, section: i + 1 }));

/**
 * Textes de la page MAGAZINES (un par maquette), centrés à l'écran, par-dessus les magazines 3D : celui du
 * magazine de devant. Les hors-séries Music et Fashion sont des sections de Typeshit : leur texte prend le
 * relais sur leurs doubles pages (spreads : de la n-ième à la m-ième, comptées à partir de 1, dans l'ordre de
 * MAGAZINES, scripts/optimize-assets.mjs). Sans spreads : le texte du magazine, couvertures comprises.
 * Fautes de la maquette corrigées (accord du DA) ; trous mesurés au pixel (une espace = 3,5 px de maquette).
 */
export type MagazineText = { mag: string; spreads?: [number, number]; lines: string[]; textWidth: number; fr: ProjectText };

/** Le texte de magazine dans la langue courante. */
export const localText = (m: MagazineText): MagazineText => (lang === 'fr' ? { ...m, ...m.fr } : m);

export const MAGAZINE_TEXTS: MagazineText[] = [
  {
    mag: 'typeshit',
    lines: [
      'TYPESHIT MAGAZINE',
      `A BIANNUAL MAGAZINE ABOUT${gap(9)}FASHION, TRAVEL AND LIFE`,
      `76 PAGES${gap(8)}MADE WITH PASSION.${gap(11)}TYPESHIT.`,
    ],
    textWidth: 422, // 392 sur la maquette : élargi pour que « LIFE » reste sur sa ligne (corrections de texte)
    fr: {
      lines: [
        'TYPESHIT MAGAZINE',
        `UN MAGAZINE SEMESTRIEL SUR${gap(9)}LA MODE, LE VOYAGE ET LA VIE`,
        `76 PAGES${gap(8)}FAITES AVEC PASSION.${gap(11)}TYPESHIT.`,
      ],
      textWidth: 450,
    },
  },
  {
    mag: 'typeshit',
    spreads: [4, 6],
    lines: [
      'MUSIC HORS-SÉRIE',
      `FOCUSED ON${gap(12)}A SELECTION OF GOOD MUSIC`,
      `CAUSE I HAVE GOATED${gap(14)}MUSIC TASTE`,
    ],
    textWidth: 332,
    fr: {
      lines: [
        'HORS-SÉRIE MUSIQUE',
        `CENTRÉ SUR${gap(12)}UNE SÉLECTION DE BONNE MUSIQUE`,
        `PARCE QUE J’AI DES GOÛTS${gap(14)}MUSICAUX DE GOAT`,
      ],
      textWidth: 373,
    },
  },
  {
    mag: 'typeshit',
    spreads: [7, 9],
    lines: [
      `FASHION${gap(5)}HORS-SÉRIE`,
      `FOCUSED ON${gap(11)}INTERESTING BRANDS`,
      `BUT YOU GUYS ONLY WATCH${gap(10)}DOLCE & GABBANA`,
    ],
    textWidth: 354, // 339 sur la maquette : élargi pour que « GABBANA » reste sur sa ligne (corrections de texte)
    fr: {
      lines: [
        `HORS-SÉRIE${gap(5)}MODE`,
        `CENTRÉ SUR${gap(11)}DES MARQUES INTÉRESSANTES`,
        `MAIS VOUS NE REGARDEZ QUE${gap(10)}DOLCE & GABBANA`,
      ],
      textWidth: 367,
    },
  },
  {
    mag: 'cpgcqd',
    lines: [
      'CPGCQDB MAGAZINE',
      `A${gap(10)}ONCE-IN-A-LIFETIME${gap(10)}CULINARY STORY`, // trou avant « ONCE » : il ne peut plus couper le mot composé
      `BASICALLY A MAGAZINE I MADE FOR${gap(11)}MY FAMILY, WITH`,
      `ALL OUR${gap(5)}RECIPES`,
    ],
    textWidth: 396, // 391 sur la maquette : élargi pour que « WITH » reste sur sa ligne (corrections de texte)
    fr: {
      lines: [
        'CPGCQDB MAGAZINE',
        `UNE HISTOIRE${gap(10)}CULINAIRE${gap(10)}UNIQUE AU MONDE`,
        `EN GROS UN MAGAZINE FAIT POUR${gap(11)}MA FAMILLE, AVEC`,
        `TOUTES NOS${gap(5)}RECETTES`,
      ],
      textWidth: 396,
    },
  },
  {
    mag: 'dpp',
    lines: [
      'DA PUNK PROPAGANDA',
      `MUSIC FANZINE${gap(12)}MADE FOR FUN`,
      `IN A${gap(8)}PUNK ROCK STYLE.`,
    ],
    textWidth: 254,
    fr: {
      lines: [
        'DA PUNK PROPAGANDA',
        `FANZINE MUSICAL${gap(12)}FAIT POUR LE FUN`,
        `DANS UN${gap(8)}STYLE PUNK ROCK.`,
      ],
      textWidth: 286,
    },
  },
];

/**
 * Mise en page desktop, en px de maquette (multipliés par --u, voir tokens.css).
 * Chaque page est une composition posée dans un cadre centré à l'écran : à l'échelle 1 (écran 1512×949),
 * c'est exactement la maquette ; si la fenêtre est plus petite, tout rétrécit avec les mêmes rapports.
 * Cadre : { w, h } et décalage de son centre par rapport au centre de l'écran { dx, dy }.
 */
export type Box = { w: number; h: number; dx: number; dy: number };

// LONGTEMPS (16:5) et FORMULA ONE (25:448) : grand cadre vidéo 1320×749 centré, texte centré dessus.
// Mesuré sur la maquette Longtemps 1512×949 (capture 1:1).
export const SINGLE = {
  box: { w: 1320, h: 749, dx: 0, dy: 0.5 } as Box,
  // Milieu du bloc de texte, depuis le haut du cadre : 347 (haut des 4 lignes de Longtemps et F1) + 2 × 14 ;
  // un texte plus court (la page vidéo, 2 lignes) reste centré au même endroit, comme sur sa maquette.
  textCenter: 375,
  textDx: 0.5, // le texte est centré 0,5 px à droite du centre de l'écran
};

// TAKE CARE (frame 25:560, 1440×1024) : la composition de la frame dans son cadre, centrée.
// Grille régulière : 5 colonnes (34 px d'écart), 3 rangées (233 px, 25 px d'écart).
// Carrés étirés en largeur (237 → 245 px, demande du DA) : la grille fait 1361 px, un poil plus que
// la rangée 1-8 (du bord gauche du « 1 » à -671 px au bord droit du symbole à +672 px du centre).
export const MOSAIC = {
  box: { w: 1361, h: 749, dx: 0, dy: -2.5 } as Box,
  square: { w: 245, h: 233 },
  columns: [0, 279, 558, 837, 1116],
  rows: [0, 258, 516],
  // Cases occupées par les carrés (la case centrale de la 2e ligne est sous le grand rectangle).
  cells: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [0, 1], [1, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  ] as [number, number][],
  center: { x: 495, y: 101, w: 371, h: 547 }, // grande vidéo, au premier plan, centrée sur la colonne du milieu
  textTop: 336,
};

// SOCIAL MEDIA (pas de maquette, d'après les indications du DA) : petits carrés de 1/4 de ceux de Take Care
// (moitié de largeur et de hauteur), 6 rangées × 10 colonnes dans le même cadre (écarts recalculés pour le
// remplir exactement). La mosaïque dépasse à droite et défile ; le grand rectangle de Take Care reste au centre.
// Colonnes toujours pleines : les posts en trop (moins d'une colonne) ne sont pas affichés.
export const SOCIAL = {
  box: MOSAIC.box,
  tile: { w: MOSAIC.square.w / 2, h: MOSAIC.square.h / 2 },
  rows: 6,
  columns: 10, // colonnes dans le cadre, à l'arrêt
  center: MOSAIC.center,
};

// MUSIC & CULTURE (maquette ⑥, d'après les indications du DA) : bande comme Social Media, dans le cadre de Take
// Care (749 px de haut), avec ses écarts (34 px entre colonnes, 25 entre rangées). Chaque colonne a des cases de
// même format (ratio largeur / hauteur) qui remplissent la hauteur : la pochette (1 carré de 749), 2 carrés de
// 362, 3 affiches de 165×233 ou 2 de 256×362 (npm run assets compose les colonnes).
export const POSTERS = {
  box: MOSAIC.box,
  gapX: 34,
  gapY: 25,
};

// Rangée des numéros (un par projet, 1 à 7) + symbole de fin, calée sur le cadre SINGLE (centres, en px depuis
// son coin haut-gauche), répartis régulièrement du « 1 » au symbole. Derrière les vidéos, à cheval sur leur
// bord haut : la moitié des chiffres gris dépasse ; le chiffre courant (3D) est un peu au-dessus des autres.
// Mesuré sur les maquettes (Typeshit, Social Media, Music & Culture) : centre des chiffres 0,75 px au-dessus
// du haut des visuels, chiffre entouré 13,25 px plus haut.
export const NAV_ROW = {
  first: -8, // centre du « 1 »
  end: 1326, // centre du symbole
  y: -0.75, // centre des numéros et du symbole
  currentY: -14, // centre du numéro courant (19 px)
};

/** Rectangle d'un cadre à l'écran, en px CSS (u = valeur de --u). */
export function boxRect(box: Box, W: number, H: number, u: number) {
  return {
    left: W / 2 + (box.dx - box.w / 2) * u,
    top: H / 2 + (box.dy - box.h / 2) * u,
    width: box.w * u,
    height: box.h * u,
  };
}
