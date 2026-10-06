// Tous les réglages du site au même endroit.

export const config = {
  clock: {
    locale: 'fr-FR',
  },

  stage: {
    maxPixelRatio: 2,
    fov: 25, // degrés ; plus bas = plus "plat", plus haut = plus de perspective
    fadeInMs: 900, // fondu d'apparition de la 3D une fois chargée
  },

  ring: {
    url: '/models/bague.glb',

    // Diamètre à l'écran, en px de maquette (mesuré sur le rendu Figma 1512 et ta capture 1920).
    diameter: { desktop: 264, mobile: 200 },

    // La bague roule comme une pièce sur une table, vue de dessus (l'écran est la table).
    // tiltDeg : angle entre le plan de la bague et la verticale. 90 = à plat, 70-80 = légèrement penchée.
    tiltDeg: 75,
    breathDeg: 3, // « souffle » sur l'inclinaison
    breathPeriod: 7, // secondes pour un souffle complet

    // Un tour de précession (l'axe d'inclinaison fait le tour) à l'inclinaison de référence.
    // Comme un vrai disque d'Euler, ça accélère quand la bague s'aplatit et ralentit quand elle se redresse.
    precessionPeriod: 1.3,

    // Le centre de la bague décrit des cercles autour du centre de l'écran, en phase avec l'inclinaison
    // (le bord qui touche la « table » est toujours vers l'extérieur). Le rayon varie lentement → cercles concentriques.
    orbit: {
      radiusMin: 15, // px de maquette
      radiusMax: 70, // px de maquette
      period: 18, // secondes pour passer du petit au grand cercle et revenir
    },

    // Rotation propre due au roulement sans glissement (1 = physique, 0 = aucune).
    rollFactor: 1,

    // prefers-reduced-motion : précession lente, sur place.
    reducedMotion: {
      precessionPeriod: 10,
    },

    material: {
      envIntensity: 0.45, // intensité des reflets de l'environnement (plus bas = vert plus profond)
    },
  },

  // Pluie Instagram au survol du lien (desktop uniquement). Physique Rapier chargée au premier survol.
  rain: {
    url: '/models/instagram.glb',
    maxInstances: 60,
    spawnPerSecond: 20,
    minEmitSeconds: 0.6, // émission minimale après un survol, même très bref
    width: { min: 140, max: 200 }, // largeur du logo en px de maquette, tirée au hasard
    lifeSeconds: { min: 4, max: 5.5 }, // durée avant disparition
    fadeOutSeconds: 0.35, // durée du rétrécissement final
    gravity: 2800, // px/s²
    restitution: 0.35, // rebond (0 = aucun, 1 = parfait)
    friction: 0.6,
    depth: 120, // profondeur de la « boîte » où s'empilent les logos, en px
    envIntensity: 1, // reflets sur le métal rose
  },

  // Apparitions de projets en fond (desktop uniquement) : des vignettes surgissent au hasard
  // sur la page, vivent ~1 s en rétrécissant, puis disparaissent.
  trail: {
    manifest: '/work/thumbs/manifest.json', // généré par npm run assets
    interval: { min: 140, max: 320 }, // ms entre deux apparitions, tiré au hasard
    lifeMs: 1000, // durée de vie d'une vignette
    size: { min: 90, max: 120 }, // largeur en px de maquette, tirée au hasard
    endScale: 0.8, // taille relative en fin de vie
    // Zones évitées, en px de maquette depuis les bords (header en haut, dock en bas).
    safe: { top: 100, bottom: 130, side: 61 },

    // Alignement sur la grille Figma (8 colonnes). Valeurs mesurées sur le croquis, à confirmer.
    snapToGrid: false,
    grid: {
      columns: 8,
      margin: 60, // marge gauche / droite
      gutter: 20, // espace entre colonnes
      top: 61, // haut de la première rangée
      rowHeight: 135,
      rowGutter: 20,
    },
  },
} as const;
