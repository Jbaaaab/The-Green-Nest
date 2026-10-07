import media from './media.generated.json';

/**
 * Contenu des pages projets (maquettes Figma : LONGTEMPS 16:5, F1 25:448, TAKE CARE 25:560).
 * Les trous dans les textes sont voulus (comme sur la bio) : nombres d'espaces repris de Figma.
 */
export type MainMedia = { kind: 'video'; video: string; poster: string } | { kind: 'placeholder' };
export type SideMedia = { image: string; video?: string };

export type Project = {
  id: string; // ancre d'URL (#longtemps…)
  number: number; // numéro dans la rangée 1-8 (= index de section)
  title: string; // texte du bouton vert
  lines: string[]; // description, ligne par ligne
  textWidth: number; // largeur du bloc de texte, px de maquette
  layout: 'single' | 'mosaic';
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
    main: { kind: 'placeholder' }, // vidéo à venir
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
    main: { kind: 'placeholder' }, // vidéo à venir
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

// TAKE CARE (frame 25:560, 1440×1024) : la composition de la frame, à l'identique, dans son cadre.
// Grille régulière : 5 colonnes (237 px, 34 px d'écart), 3 rangées (233 px, 25 px d'écart).
export const MOSAIC = {
  box: { w: 1321, h: 749, dx: 0.5, dy: -2.5 } as Box,
  square: { w: 237, h: 233 },
  columns: [0, 271, 542, 813, 1084],
  rows: [0, 258, 516],
  // Cases occupées par les carrés (la case centrale de la 2e ligne est sous le grand rectangle).
  cells: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [0, 1], [1, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  ] as [number, number][],
  center: { x: 475, y: 101, w: 371, h: 547 }, // grande vidéo, au premier plan
  textTop: 336,
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
