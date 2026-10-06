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

    // Diamètre à l'écran, en px de maquette (mesuré sur le rendu Figma).
    diameter: { desktop: 260, mobile: 200 },

    // Disque d'Euler. L'angle se mesure entre le plan de la bague et la verticale,
    // la verticale étant l'axe de vue (on regarde la bague « posée sur l'écran », vue de dessus).
    // 90 = parfaitement à plat face à nous ; 70-80 = légère inclinaison.
    tiltDeg: 75,
    breathDeg: 3, // amplitude du « souffle » sur l'inclinaison
    breathPeriod: 6, // secondes pour un souffle complet
    precessionPeriod: 2.4, // secondes pour un tour complet de l'axe d'inclinaison
    // Rotation propre de la bague due au roulement (1 = physique, 0 = aucune).
    rollFactor: 1,

    // Déplacement lent autour du centre (courbe de Lissajous).
    // Amplitudes en fraction de la largeur / hauteur de l'écran.
    drift: {
      amplitudeX: 0.22,
      amplitudeY: 0.16,
      periodX: 34, // secondes
      periodY: 23, // secondes
    },

    // prefers-reduced-motion : précession ralentie, pas de déplacement.
    reducedMotion: {
      precessionPeriod: 12,
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

  // Traînée de frames (desktop uniquement). Elle tourne sur sa propre orbite autour de la bio.
  trail: {
    orbit: {
      period: 6, // secondes pour un tour complet
      direction: 1, // 1 = sens horaire, -1 = anti-horaire
      padX: 40, // px de maquette ajoutés de chaque côté de la bio
      padY: 90, // px de maquette ajoutés au-dessus et en dessous
    },
    intervalMs: 200, // cadence d'apparition (150-250)
    lifeMs: 1000, // durée de vie d'une frame
    size: { min: 90, max: 120 }, // largeur en px de maquette, tirée au hasard
    endScale: 0.6, // taille relative en fin de vie
    // Placeholders tant que les images ne sont pas branchées (couleur et ratio du croquis).
    placeholder: { color: '#330000', aspect: 120 / 125 },

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
