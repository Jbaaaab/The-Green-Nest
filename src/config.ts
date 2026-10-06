// Tous les réglages du site au même endroit.

export const config = {
  clock: {
    locale: 'fr-FR',
  },

  music: {
    volume: 0.8, // volume de lecture (0 à 1)
    fadeInMs: 700, // montée du son au lancement d'un morceau
    fadeOutMs: 400, // descente du son à l'arrêt
  },

  stage: {
    maxPixelRatio: 2,
    fov: 25, // degrés ; plus bas = plus "plat", plus haut = plus de perspective
    fadeInMs: 900, // fondu d'apparition de la 3D une fois chargée
  },

  // Studio photo virtuel qui se reflète dans le métal poli (bague, logos Insta, curseurs).
  // dir : direction de la lumière vue depuis l'objet (x droite, y haut, z vers la caméra).
  // size / softness en radians (taille de la softbox et largeur du fondu de son bord).
  studio: {
    size: 256, // résolution de l'image de reflets (matcap), en px
    exposure: 2, // plus haut = reflets plus clairs (les hautes lumières saturent en douceur)
    floor: 0.02, // luminosité du fond, en bas
    ceiling: 0.22, // luminosité du fond, en haut
    key: { dir: [-0.45, 0.55, 1], size: 0.35, softness: 0.55, intensity: 1.3 }, // grande softbox principale
    fill: { dir: [0.7, -0.35, 0.6], size: 0.25, softness: 0.6, intensity: 0.45 }, // contre-jour doux
    rim: { dir: [0.9, 0.5, -0.2], size: 0.2, softness: 0.4, intensity: 1.2 }, // liseré sur les bords
  },

  ring: {
    url: '/models/bague.glb',

    // Diamètre à l'écran, en px de maquette (mesuré sur le rendu Figma 1512 et ta capture 1920).
    diameter: { desktop: 264, mobile: 200 },

    // La bague roule comme une pièce sur une table légèrement creuse, vue de dessus (l'écran est la table).
    // tiltDeg : angle entre le plan de la bague et la verticale. 90 = à plat, 70-80 = légèrement penchée.
    tiltDeg: 75,
    breathDeg: 4, // variation aléatoire de l'inclinaison, ± degrés
    breathPeriod: 4, // secondes : échelle de temps de cette variation

    // Un tour de précession (l'axe d'inclinaison fait le tour) à l'inclinaison de référence.
    // Comme un vrai disque d'Euler, ça accélère quand la bague s'aplatit et ralentit quand elle se redresse.
    precessionPeriod: 1.3,

    // Trajectoire : en roulant, la bague décrit des boucles dont le rayon change au hasard.
    orbit: {
      radiusMin: 8, // px de maquette : petites boucles serrées
      radiusMax: 220, // px de maquette : grandes boucles qui emmènent la bague plus loin
      changeEvery: 1.8, // secondes : vitesse à laquelle le rayon change (plus bas = plus nerveux)
      pull: 0.25, // rappel vers le centre de l'écran (creux de la table) ; 0 = aucun
      maxOffset: 230, // px de maquette : au-delà, le rappel se renforce nettement
      bigLoopSlowdown: 60, // px de maquette : plus bas = les grandes boucles ralentissent davantage
      mobileScale: 0.35, // sur mobile, boucles et écart max réduits (l'écran fait ~400 px de large)
    },

    // Rotation propre due au roulement sans glissement (1 = physique, 0 = aucune).
    rollFactor: 1,

    // prefers-reduced-motion : précession lente, sur place.
    reducedMotion: {
      precessionPeriod: 10,
    },

    // Rendu, calibré sur le rendu Blender de la maquette (couleurs sRGB relevées sur l'image).
    look: {
      size: 512, // résolution de la matcap
      light: [-0.3, 0.5, 1], // direction de la lumière principale (haut-gauche, devant)
      faceDark: [6, 97, 64], // #066140 face côté ombre
      face: [8, 110, 72], // #086E48 face (teinte dominante)
      faceLight: [19, 124, 74], // #137C4A face côté lumière
      faceLitRange: [0.72, 0.99], // plage d'éclairage qui va de faceDark à faceLight
      highlight: [80, 168, 107], // #50A86B liseré des arêtes
      highlightPeak: [158, 212, 128], // liseré côté lumière, entre #91CC9E et le vert citron des arêtes
      bevelAngles: [28, 50, 72], // degrés : début, pic et fin du liseré (0° = face, 90° = flanc)
      sideDark: [29, 71, 17], // #1D4711 flanc
      sideLight: [104, 170, 48], // reflets vert-jaune des flancs
      mottleCount: 9, // nombre de marbrures autour de la bague
    },
  },

  // Curseur 3D (souris uniquement, désactivé sur écran tactile).
  cursor: {
    dir: '/cursors', // GLB optimisés par npm run assets
    default: 'wow', // curseur au chargement ; l'icône du header fait défiler click → great → iluvyou → iwannahire → super → wow
    hover: 'click', // au survol d'un lien ou d'un bouton
    height: 18, // hauteur des lettres, en px de maquette
    offset: { x: 0, y: 0 }, // décalage du mot par rapport à la pointe de la souris, en px de maquette
    follow: 18, // vitesse de suivi (plus haut = colle plus à la souris)
    spinPeriod: 2.4, // secondes pour un tour sur lui-même
    popSpeed: 14, // vitesse du petit rebond quand le mot change
    fadeSpeed: 12, // vitesse d'apparition / disparition quand la souris entre / sort de la fenêtre
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
  },

  // Pages projets (Works) : on y accède en scrollant depuis l'accueil.
  works: {
    duration: 1.5, // secondes pour passer d'une page à la voisine
    durationPerExtra: 0.35, // secondes ajoutées par page sautée (ex. retour à l'accueil depuis la 3)
    durationReduced: 0.45, // prefers-reduced-motion : simple fondu, court
    wheelThreshold: 40, // px de molette / trackpad pour déclencher le passage à la page voisine
    wheelQuietMs: 220, // silence de molette qui marque la fin d'un geste (ignore l'inertie du trackpad)
    swipeThreshold: 40, // px de glissé au doigt pour changer de page
    // Cadre du contenu, en px de maquette depuis les bords (frames 16:5, 25:448, 25:560).
    box: {
      desktop: { side: 60, top: 135, bottom: 140 },
      mobile: { side: 10, top: 66, bottom: 70 }, // hors maquette
    },
    // Fenêtres sur un anneau invisible qui tourne (cf. symbolsofwealth.studio), une page à la fois.
    radiusFactor: 1.3, // rayon de l'anneau, en largeurs d'écran
    maxAngleDeg: 40, // rotation d'une fenêtre quand elle quitte le champ
    stagger: 0.16, // léger décalage de gauche à droite entre fenêtres (0 = toutes ensemble)
    fadeStart: 0.55, // phase où la fenêtre commence à disparaître…
    fadeEnd: 0.95, // …et où elle a disparu (l'anneau ne se voit pas)

    digitSpinSeconds: 1.4, // le chiffre entouré tourne sur lui-même quand sa page arrive
    digitSpinTurns: 1,
  },

  // Apparitions de projets en fond (desktop uniquement) : des vignettes surgissent au hasard
  // sur la page, vivent ~1 s en rétrécissant, puis disparaissent.
  trail: {
    manifest: '/work/thumbs/manifest.json', // généré par npm run assets
    interval: { min: 280, max: 640 }, // ms entre deux apparitions, tiré au hasard
    lifeMs: 2000, // durée de vie d'une vignette
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
