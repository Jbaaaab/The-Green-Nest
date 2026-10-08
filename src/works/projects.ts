import media from './media.generated.json';

/**
 * Contenu des pages projets (maquettes Figma : LONGTEMPS 16:5, F1 25:448, TAKE CARE 25:560 ; SOCIAL MEDIA
 * d'après les indications du DA).
 * Les trous dans les textes sont voulus (comme sur la bio) : nombres d'espaces repris de Figma.
 */
export type MainMedia =
  | { kind: 'video'; video: string; poster: string }
  | { kind: 'slides'; images: string[] } // diaporama en boucle (config.works.slideMs), en attendant la vidéo
  | { kind: 'placeholder' };
export type SideMedia = { image: string; video?: string; color?: string }; // color : fond pendant le chargement

export type Project = {
  id: string; // ancre d'URL (#longtemps…)
  number: number; // numéro dans la rangée 1-8 (= index de section)
  title: string; // texte du bouton vert
  lines: string[]; // description, ligne par ligne
  textWidth: number; // largeur du bloc de texte, px de maquette
  layout: 'single' | 'mosaic' | 'magazine' | 'social'; // magazine : 3D (src/scene/magazines.ts) ; social : src/works/socialView.ts
  main: MainMedia;
  side: SideMedia[];
};

const gap = (n: number) => ' '.repeat(n);

export const PROJECTS: Project[] = [
  {
    id: 'longtemps',
    number: 1,
    title: 'LONGTEMPS',
    lines: [
      'LONGTEMPS',
      `AN EXPERIMENTAL MUSIC VIDEO${gap(12)}FROM THE GROUP “LUCA”`,
      `ALL CREATED ANIMATED IN 3D,${gap(17)}IN BLENDER, IN COLLABORATION WITH LEO MOURRAY COLINE REVERBEL AND MARTINA DOLL.${gap(7)}PRODUCTED BY 3 JOURS DE MARCHE`,
    ],
    textWidth: 649,
    layout: 'single',
    main: { kind: 'slides', images: media.longtemps.slides }, // en attendant la vidéo : images du clip
    side: [],
  },
  {
    id: 'formula-one',
    number: 2,
    title: 'FORMULA ONE',
    lines: [
      'FORMULA ONE',
      `A FULL ASSET REBRANDING${gap(13)}FOR DIGITAL AND LIVE TV PRODUCTION`,
      `PRODUCTED IN COLLABORATION${gap(11)}WITH MAXENCE AUBERT AND MATHIS COURVILLERS`,
      `MADE BY FANS WITH LOVE${gap(11)}AND SICKNESS`,
    ],
    textWidth: 667,
    layout: 'single',
    main: { kind: 'video', ...media.formulaOne.main }, // le case F1
    side: [],
  },
  {
    id: 'take-care',
    number: 3,
    title: 'TAKE CARE',
    lines: [
      'TAKE CARE BEAUTY',
      'A SANRIO’S LICENCE BEAUTY PRODUCT BRAND',
      `BEEN${gap(10)}ART DIRECTING AND CRAFTING FOR THEM${gap(8)}FOR ONE YEAR`,
    ],
    textWidth: 209,
    layout: 'mosaic',
    main: { kind: 'video', ...media.takeCare.main },
    side: media.takeCare.side,
  },
  {
    id: 'magazines',
    number: 4,
    title: 'MAGAZINES',
    lines: [], // pas de texte pour l'instant
    textWidth: 0,
    layout: 'magazine', // les magazines sont en 3D, dans le canvas : src/scene/magazines.ts
    main: { kind: 'placeholder' },
    side: [],
  },
  {
    id: 'social-media',
    number: 5,
    title: 'SOCIAL MEDIA',
    lines: [], // pas de texte pour l'instant
    textWidth: 0,
    layout: 'social',
    main: { kind: 'video', ...media.socialMedia.main },
    side: media.socialMedia.tiles, // déjà triés par couleur (npm run assets), colonne par colonne
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
  textTop: 347, // haut du texte, depuis le haut du cadre
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
export const SOCIAL = {
  box: MOSAIC.box,
  tile: { w: MOSAIC.square.w / 2, h: MOSAIC.square.h / 2 },
  rows: 6,
  columns: 10, // colonnes dans le cadre, à l'arrêt
  center: MOSAIC.center,
};

// Rangée 1-8 + symbole de fin, calée sur le cadre SINGLE (centres, en px depuis son coin haut-gauche).
// Derrière les vidéos : sur Longtemps seuls le 1 et le symbole dépassent, de part et d'autre du cadre.
export const NAV_ROW = {
  numbers: [-8, 159, 326, 493, 660, 818, 985, 1152],
  end: 1326,
  y: 23.5, // centre des numéros et du symbole
  currentY: 21, // centre du numéro courant (19 px, un peu plus haut)
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
