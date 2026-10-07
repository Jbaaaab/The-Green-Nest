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

  // Environnements qui se reflètent dans le métal poli (voir src/scene/environment.ts).
  // Couleurs en RGB linéaire 0-1 (au-delà de 1 = lumière très forte).
  // dir : direction de la lumière vue depuis l'objet (x droite, y haut, z vers la caméra) ;
  // size / softness en radians (taille de la source et largeur du fondu de son bord).
  // Au choix pour les curseurs (cursor.ambience), les chiffres (works.digitAmbience) et la pluie (rain.look.ambience).
  ambiences: {
    // Studio photo neutre.
    studio: {
      exposure: 2,
      floor: [0.02, 0.02, 0.02],
      horizon: [0.1, 0.1, 0.1],
      sky: [0.22, 0.22, 0.22],
      lights: [
        { dir: [-0.45, 0.55, 1], size: 0.35, softness: 0.55, color: [1, 1, 1], intensity: 1.3 },
        { dir: [0.7, -0.35, 0.6], size: 0.25, softness: 0.6, color: [1, 1, 1], intensity: 0.45 },
        { dir: [0.9, 0.5, -0.2], size: 0.2, softness: 0.4, color: [1, 1, 1], intensity: 1.2 },
      ],
    },
    // HDRI délirant façon rendu Blender : néons de couleur irréalistes + horizon net.
    neon: {
      exposure: 1.8,
      floor: [0.03, 0.0, 0.06],
      horizon: [0.25, 0.05, 0.35],
      sky: [0.02, 0.05, 0.18],
      horizonLine: { color: [1, 0.85, 0.95], width: 0.16, intensity: 1.4 },
      // Néons placés le long de la bande horizontale : c'est ce que les lettres reflètent en tournant.
      lights: [
        { dir: [-0.7, 0.15, 0.7], size: 0.22, softness: 0.25, color: [0.1, 1, 1], intensity: 2.8 }, // cyan
        { dir: [0.65, 0.2, 0.75], size: 0.2, softness: 0.22, color: [1, 0.1, 0.75], intensity: 3 }, // magenta
        { dir: [0.15, -0.35, 0.95], size: 0.16, softness: 0.2, color: [1, 0.6, 0.05], intensity: 2.6 }, // orange
        { dir: [-0.35, -0.25, 0.9], size: 0.08, softness: 0.1, color: [0.45, 1, 0.15], intensity: 3.2 }, // vert acide
        { dir: [0.05, 0.5, 0.85], size: 0.07, softness: 0.08, color: [1, 1, 1], intensity: 5 }, // point blanc
        { dir: [0.9, -0.1, 0.2], size: 0.25, softness: 0.3, color: [0.2, 0.3, 1], intensity: 2 }, // bleu électrique
        // Juste derrière la caméra : ce que les lettres reflètent quand elles sont de face.
        { dir: [-0.08, 0.14, 1], size: 0.1, softness: 0.24, color: [1, 0.3, 0.55], intensity: 2.4 }, // rose chaud
        { dir: [0.2, 0.0, 1], size: 0.05, softness: 0.12, color: [1, 0.85, 0.2], intensity: 2.6 }, // éclat jaune
      ],
    },
    // Chrome vert-bleu intense : curseurs, chiffres, et reflets des logos Instagram.
    // Ciel bleu électrique, sol vert profond, horizon aqua très lumineux, grandes sources émeraude et bleues.
    chrome: {
      exposure: 2.2,
      floor: [0.0, 0.035, 0.012], // vert presque noir
      horizon: [0.0, 0.5, 0.34], // émeraude lumineux
      sky: [0.0, 0.02, 0.24], // bleu nuit
      horizonLine: { color: [0.6, 1, 0.95], width: 0.05, intensity: 3 },
      lights: [
        { dir: [-0.55, 0.5, 0.65], size: 0.2, softness: 0.12, color: [0.0, 1, 0.4], intensity: 3.2 }, // émeraude, haut gauche
        { dir: [0.6, 0.35, 0.7], size: 0.18, softness: 0.1, color: [0.0, 0.3, 1], intensity: 3.6 }, // bleu électrique, haut droite
        { dir: [0.35, -0.4, 0.85], size: 0.14, softness: 0.1, color: [0.0, 0.95, 1], intensity: 3 }, // cyan, bas droite
        { dir: [-0.45, -0.35, 0.82], size: 0.08, softness: 0.06, color: [0.35, 1, 0.1], intensity: 3.5 }, // vert acide
        { dir: [0.1, 0.55, 0.83], size: 0.05, softness: 0.05, color: [1, 1, 1], intensity: 6 }, // point blanc
        // Juste derrière la caméra : ce que les lettres reflètent quand elles sont de face.
        { dir: [-0.15, 0.12, 1], size: 0.09, softness: 0.1, color: [0.0, 0.9, 0.5], intensity: 2.6 }, // vert
        { dir: [0.15, -0.1, 1], size: 0.09, softness: 0.1, color: [0.0, 0.45, 1], intensity: 2.6 }, // bleu
        // Sur les côtés : ce que reflètent les tranches des lettres quand elles tournent.
        { dir: [0.95, -0.1, 0.15], size: 0.25, softness: 0.2, color: [0.0, 0.15, 0.9], intensity: 2.2 }, // bleu profond
        { dir: [-0.95, 0.1, 0.15], size: 0.25, softness: 0.2, color: [0.0, 0.8, 0.35], intensity: 2 }, // émeraude
      ],
    },
    // Chrome froid façon écran de chargement PS3 : dégradé bleu nuit → blanc, horizon lumineux.
    ps3: {
      exposure: 2.2,
      floor: [0.0, 0.01, 0.04],
      horizon: [0.12, 0.2, 0.42],
      sky: [0.5, 0.62, 0.85],
      horizonLine: { color: [0.85, 0.92, 1], width: 0.05, intensity: 2.5 },
      lights: [
        { dir: [-0.3, 0.8, 0.6], size: 0.3, softness: 0.4, color: [1, 1, 1], intensity: 1.6 },
        { dir: [0.8, 0.1, 0.5], size: 0.12, softness: 0.2, color: [0.6, 0.8, 1], intensity: 2.2 },
      ],
    },
  },

  ring: {
    url: '/models/bague.glb',

    // Diamètre à l'écran, en px de maquette (mesuré sur le rendu Figma 1512 et ta capture 1920).
    diameter: { desktop: 264, mobile: 200 },
    // Centre du « creux de la table » (position de repos), en px de maquette depuis le centre de l'écran.
    // Maquette desktop : la bague est 33 px sous le centre (la bio passe dans son tiers haut).
    center: { desktop: [0, 33], mobile: [0, 0] },

    // La bague roule comme une pièce sur une table légèrement creuse, vue de dessus (l'écran est la table).
    // tiltDeg : angle entre le plan de la bague et la verticale. 90 = à plat, 70-80 = légèrement penchée.
    tiltDeg: 75,
    breathDeg: 6, // variation aléatoire de l'inclinaison, ± degrés (plus = plus chancelant)
    breathPeriod: 2.2, // secondes : échelle de temps de cette variation (plus bas = plus nerveux)

    // Un tour de précession (l'axe d'inclinaison fait le tour) à l'inclinaison de référence.
    // Comme un vrai disque d'Euler, ça accélère quand la bague s'aplatit et ralentit quand elle se redresse.
    precessionPeriod: 0.8,

    // Trajectoire : en roulant, la bague décrit des boucles dont le rayon change au hasard.
    orbit: {
      radiusMin: 8, // px de maquette : petites boucles serrées
      radiusMax: 170, // px de maquette : grandes boucles qui emmènent la bague plus loin
      changeEvery: 1.4, // secondes : vitesse à laquelle le rayon change (plus bas = plus nerveux)
      pull: 0.25, // rappel vers le creux de la table (ring.center) ; 0 = aucun
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
      size: 256, // résolution de la matcap (256 suffit pour une bague de ~264 px, et se calcule 4x plus vite)
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
      // Reflet brillant qui traverse la face quand elle s'incline vers la lumière.
      sheen: { dir: [-0.28, 0.32, 1], size: 0.05, softness: 0.16, strength: 0.55 },
      // Éclats sur les arêtes (angles autour de la bague, en degrés ; 90 = en haut).
      glints: { angles: [128, 32, 230, 300], width: 0.16, strength: 1.1, color: [214, 255, 170] },
      grain: 0, // aspérités : grain sur les arêtes et les flancs (0 = lisse, « shade smooth »)
      asperity: 0, // micro-relief sur les faces (carte de normales ; 0 = miroir parfait, pas de carte)
      asperityRepeat: 9, // taille du grain de la carte de normales (plus haut = plus fin)
    },
  },

  // Curseur 3D (souris uniquement, désactivé sur écran tactile). Chrome : ambiences.chrome.
  cursor: {
    dir: '/cursors', // GLB optimisés par npm run assets
    ambience: 'chrome', // reflets (voir ambiences)
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
    width: { min: 70, max: 100 }, // largeur du logo en px de maquette, tirée au hasard
    lifeSeconds: { min: 4, max: 5.5 }, // durée avant disparition
    fadeOutSeconds: 0.35, // durée du rétrécissement final
    gravity: 2800, // px/s²
    restitution: 0.35, // rebond (0 = aucun, 1 = parfait)
    friction: 0.6,
    depth: 120, // profondeur de la « boîte » où s'empilent les logos, en px
    // Laque rose (couleur du GLB) éclairée par le même HDRI que les curseurs (ambiences.chrome) :
    // le rose reste lisible, les reflets vert-bleu glissent dessus.
    look: {
      ambience: 'chrome', // HDRI des reflets (le même que les curseurs)
      key: [-0.4, 0.6, 1], // direction de la lumière qui éclaire le rose
      ambient: 0.35, // part du rose dans l'ombre (0 = noir, 1 = pas d'ombre)
      f0: 0.3, // reflet de face (vernis) ; monte vers 1 sur les bords (Fresnel)
      reflection: 3, // force des reflets de l'HDRI (au-delà de 1 : les sources se reflètent en couleur franche)
    },
  },

  // Scroll vertical (accueil puis projets empilés) et pages projets.
  works: {
    // Scroll fluide avec inertie (pas d'aimant), arrêt quand le texte d'un projet arrive au milieu.
    spacing: 1.15, // distance entre deux arrêts, en hauteurs d'écran (un peu d'air entre les pages)
    smooth: 6.5, // inertie du scroll : plus bas = plus glissé, plus haut = plus sec
    wheelMultiplier: 1, // sensibilité molette / trackpad
    touchMultiplier: 1.6, // sensibilité au doigt
    touchMomentum: 260, // élan après un glissé au doigt
    gestureQuietMs: 220, // silence qui marque la fin d'un geste (l'inertie du trackpad ne passe pas un arrêt)

    // Parallaxe : vitesse de défilement relative (1 = suit le scroll, plus = plus rapide).
    parallax: {
      text: 0.72, // textes des projets et bio de l'accueil : plus lents, comme le nom sur perappelgren.de
      ring: 0.85, // la bague de l'accueil
      windows: [1, 1.32], // fenêtres : vitesse tirée dans cette plage (déterministe, par position)
    },

    // Twist façon perappelgren.de : pendant le scroll, la page se courbe comme sur un tambour,
    // d'autant plus que le scroll est rapide ; au repos tout est plat.
    twist: {
      perSpeed: 0.00038, // radians de courbure par px/s de vitesse
      max: 0.6, // courbure maximale (radians, en bord d'écran)
      depth: 0.22, // recul en profondeur des fenêtres courbées (fraction de la hauteur d'écran)
    },

    // Cadre du contenu mobile, en px de maquette depuis les bords (hors maquette).
    box: {
      mobile: { side: 10, top: 66, bottom: 70 },
    },

    // Carrés de Take Care : leurs vidéos tournent au ralenti, à vitesse normale sous la souris,
    // et le carré survolé grandit un tout petit peu.
    hover: {
      sideRate: 0.5, // vitesse des vidéos des carrés (1 = normale)
      scale: 1.04, // taille du carré survolé
    },

    // Chiffre entouré de la page courante (chrome : ambiences.chrome) : rotation continue, façon écran de chargement PS3.
    digitAmbience: 'chrome', // reflets du chiffre (voir ambiences)
    digitSpinPeriod: 3.2, // secondes par tour
    digitBob: 0.08, // léger balancement (fraction de la taille)
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
