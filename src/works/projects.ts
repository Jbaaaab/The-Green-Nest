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

// Mosaïque TAKE CARE : positions dans un cadre de 1321×749 px de maquette (frame 25:630).
export const MOSAIC = {
  width: 1321,
  height: 749,
  square: { w: 237, h: 233 },
  columns: [0, 271, 542, 813, 1084],
  rows: [0, 258, 516],
  // Cases occupées par les carrés (la case centrale de la 2e ligne est sous le grand rectangle).
  cells: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [0, 1], [1, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  ] as [number, number][],
  center: { x: 475, y: 101, w: 371, h: 547 },
};
