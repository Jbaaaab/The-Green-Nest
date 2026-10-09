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

  // Rotations des assets 3D (bague, curseurs, chiffres) « on twos », comme en animation :
  // chaque pose est tenue `every` images (2 = moitié du framerate). Les déplacements restent fluides.
  stepped: {
    enabled: true,
    every: 2,
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
    // Chrome vert, un poil de rose (comme les fleurs du footer) : curseurs, chiffres, reflets des plantes.
    // Ciel vert profond, sol vert presque noir, horizon vert flash très lumineux, grandes sources vertes,
    // et deux petites touches rose poison (#ff1fb4) qui passent sur les tranches en tournant.
    // Vert flash #41F373 en RGB linéaire = [0.053, 0.896, 0.171] ; rose poison #ff1fb4 = [1, 0.014, 0.456].
    chrome: {
      exposure: 2.2,
      floor: [0.0, 0.03, 0.008], // vert presque noir
      horizon: [0.03, 0.55, 0.12], // vert flash lumineux
      sky: [0.0, 0.11, 0.03], // vert profond
      horizonLine: { color: [0.75, 1, 0.8], width: 0.05, intensity: 3 }, // ligne menthe, presque blanche
      lights: [
        { dir: [-0.55, 0.5, 0.65], size: 0.2, softness: 0.12, color: [0.053, 0.896, 0.171], intensity: 3.4 }, // vert flash, haut gauche
        { dir: [0.6, 0.35, 0.7], size: 0.17, softness: 0.1, color: [0.0, 0.62, 0.2], intensity: 3.2 }, // émeraude, haut droite
        { dir: [0.35, -0.4, 0.85], size: 0.13, softness: 0.1, color: [0.35, 1, 0.1], intensity: 3 }, // vert acide, bas droite
        { dir: [-0.45, -0.35, 0.82], size: 0.07, softness: 0.06, color: [1, 0.014, 0.456], intensity: 2.6 }, // rose poison, bas gauche
        { dir: [0.1, 0.55, 0.83], size: 0.05, softness: 0.05, color: [1, 1, 1], intensity: 6 }, // point blanc
        // Juste derrière la caméra : ce que les lettres reflètent quand elles sont de face.
        { dir: [-0.15, 0.12, 1], size: 0.09, softness: 0.1, color: [0.053, 0.896, 0.171], intensity: 2.6 }, // vert flash
        { dir: [0.15, -0.1, 1], size: 0.08, softness: 0.1, color: [0.0, 0.4, 0.12], intensity: 2.4 }, // vert sombre
        // Sur les côtés : ce que reflètent les tranches des lettres quand elles tournent.
        { dir: [0.95, -0.1, 0.15], size: 0.25, softness: 0.2, color: [0.0, 0.35, 0.08], intensity: 2.2 }, // vert profond
        { dir: [-0.95, 0.1, 0.15], size: 0.2, softness: 0.2, color: [1, 0.014, 0.456], intensity: 1.2 }, // rose poison
      ],
    },
    // L'inverse, pour les logos Instagram : chrome rose poison, un poil de vert flash.
    pinkChrome: {
      exposure: 2.2,
      floor: [0.03, 0.0, 0.012], // rose presque noir
      horizon: [0.75, 0.02, 0.32], // rose poison lumineux
      sky: [0.16, 0.0, 0.07], // rose profond
      horizonLine: { color: [1, 0.8, 0.92], width: 0.05, intensity: 3 }, // ligne rose pâle, presque blanche
      lights: [
        { dir: [-0.55, 0.5, 0.65], size: 0.2, softness: 0.12, color: [1, 0.014, 0.456], intensity: 3.4 }, // rose poison, haut gauche
        { dir: [0.6, 0.35, 0.7], size: 0.17, softness: 0.1, color: [0.75, 0.0, 0.5], intensity: 3.2 }, // magenta, haut droite
        { dir: [0.35, -0.4, 0.85], size: 0.13, softness: 0.1, color: [1, 0.12, 0.3], intensity: 3 }, // rose chaud, bas droite
        { dir: [-0.45, -0.35, 0.82], size: 0.07, softness: 0.06, color: [0.053, 0.896, 0.171], intensity: 2.6 }, // vert flash, bas gauche
        { dir: [0.1, 0.55, 0.83], size: 0.05, softness: 0.05, color: [1, 1, 1], intensity: 6 }, // point blanc
        { dir: [-0.15, 0.12, 1], size: 0.09, softness: 0.1, color: [1, 0.014, 0.456], intensity: 2.6 }, // rose, de face
        { dir: [0.15, -0.1, 1], size: 0.08, softness: 0.1, color: [0.4, 0.0, 0.16], intensity: 2.4 }, // rose sombre, de face
        { dir: [0.95, -0.1, 0.15], size: 0.25, softness: 0.2, color: [0.35, 0.0, 0.14], intensity: 2.2 }, // rose profond
        { dir: [-0.95, 0.1, 0.15], size: 0.2, softness: 0.2, color: [0.053, 0.896, 0.171], intensity: 1.2 }, // vert flash
      ],
    },
    // Chrome à fond, reflets #41F373 (le vert de la marque) : la bague.
    // Recette du chrome : ciel lumineux (#41F373), sol noir, ligne d'horizon blanche et nette entre les deux.
    // Quand la bague vacille, sa face passe du vert éclatant au noir en traversant la ligne blanche.
    // #41F373 en RGB linéaire = [0.053, 0.896, 0.171].
    greenChrome: {
      exposure: 2.4,
      floor: [0.0, 0.006, 0.002], // sol presque noir
      horizon: [0.002, 0.02, 0.006], // juste sous la ligne : sombre (contraste net)
      sky: [0.032, 0.54, 0.1], // ciel #41F373 lumineux
      horizonLine: { color: [1, 1, 1], width: 0.035, intensity: 4 },
      lights: [
        { dir: [-0.45, 0.55, 0.7], size: 0.16, softness: 0.05, color: [0.053, 0.896, 0.171], intensity: 3 }, // softbox verte, haut gauche
        { dir: [0.7, -0.25, 0.65], size: 0.1, softness: 0.05, color: [0.053, 0.896, 0.171], intensity: 3.5 }, // bande verte dans le sol, droite
        { dir: [-0.35, -0.45, 0.8], size: 0.06, softness: 0.04, color: [0.053, 0.896, 0.171], intensity: 3.5 }, // reflet vert dans le sol, gauche
        { dir: [0.95, 0.05, 0.25], size: 0.16, softness: 0.06, color: [0.053, 0.896, 0.171], intensity: 3 }, // flanc droit
        { dir: [-0.95, -0.1, 0.25], size: 0.16, softness: 0.06, color: [0.053, 0.896, 0.171], intensity: 3 }, // flanc gauche
        { dir: [0.2, 0.45, 0.87], size: 0.035, softness: 0.035, color: [1, 1, 1], intensity: 10 }, // éclat blanc
        { dir: [-0.3, 0.25, 0.92], size: 0.025, softness: 0.03, color: [1, 1, 1], intensity: 8 }, // éclat blanc
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
    // Demande du DA : « qu'elle chancelle fort en étant un poil plus fixe » (avant : ±11° toutes les 0,9 s).
    breathDeg: 13, // variation aléatoire de l'inclinaison, ± degrés (plus = plus chancelant ; 75 + 13 → 2° de la table)
    breathPeriod: 0.75, // secondes : échelle de temps de cette variation (plus bas = plus nerveux)

    // Un tour de précession (l'axe d'inclinaison fait le tour) à l'inclinaison de référence.
    // Comme un vrai disque d'Euler, ça accélère quand la bague s'aplatit et ralentit quand elle se redresse.
    precessionPeriod: 0.38,

    // Trajectoire : en roulant, la bague décrit des boucles dont le rayon change au hasard.
    // Un poil plus fixe (demande du DA) : boucles plus petites (avant 8-150 px), rappel plus fort (avant 0,25 et 230 px).
    orbit: {
      radiusMin: 5, // px de maquette : petites boucles serrées
      radiusMax: 75, // px de maquette : grandes boucles qui emmènent la bague plus loin
      changeEvery: 0.8, // secondes : vitesse à laquelle le rayon change (plus bas = plus nerveux)
      pull: 0.5, // rappel vers le creux de la table (ring.center) ; 0 = aucun
      maxOffset: 120, // px de maquette : au-delà, le rappel se renforce nettement
      bigLoopSlowdown: 45, // px de maquette : plus bas = les grandes boucles ralentissent davantage
      mobileScale: 0.35, // sur mobile, boucles et écart max réduits (l'écran fait ~400 px de large)
    },

    // Rotation propre due au roulement sans glissement (1 = physique, 0 = aucune).
    rollFactor: 1,

    // prefers-reduced-motion : précession lente, sur place.
    reducedMotion: {
      precessionPeriod: 10,
    },

    // Reflets de la bague : un HDRI de `ambiences` (chrome), ou 'maquette' pour le rendu émeraude
    // calibré sur le rendu Blender de la maquette (réglages `look` ci-dessous).
    ambience: 'greenChrome',

    // Rendu « maquette », calibré sur le rendu Blender (couleurs sRGB relevées sur l'image).
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
    maxInstances: 120, // plafond : au-delà, les plus anciens disparaissent pour laisser tomber les suivants (pluie continue)
    spawnPerSecond: 40,
    minEmitSeconds: 0.6, // émission minimale après un survol, même très bref
    width: { min: 70, max: 100 }, // largeur du logo en px de maquette, tirée au hasard
    lifeSeconds: { min: 4, max: 5.5 }, // durée avant disparition
    fadeOutSeconds: 0.35, // durée du rétrécissement final
    gravity: 2800, // px/s²
    restitution: 0.35, // rebond (0 = aucun, 1 = parfait)
    friction: 0.6,
    depth: 120, // profondeur de la « boîte » où s'empilent les logos, en px
    // Chrome rose, un poil de vert : l'inverse des curseurs (demande du DA). null = laque rose (look ci-dessous).
    chrome: 'pinkChrome' as 'pinkChrome' | null,
    // Laque rose (couleur du GLB) éclairée par le même HDRI que les curseurs (ambiences.chrome), si chrome = null.
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
    smooth: 5.5, // inertie du scroll : plus bas = plus glissé, plus haut = plus sec (avant 6,5 : plus fluide, demande du DA)
    // Résistance de chaque arrêt (pages, magazines, pile de cartes…), en hauteurs d'écran de scroll : le geste
    // doit la « dépenser » pour passer. Avant : arrêt net, il fallait un nouveau geste (« laborieux », DA).
    resistance: 0.28,
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
      mobileTextGap: 18, // grands cadres sur mobile : écart entre le texte (au-dessus) et la vidéo 16:9
    },

    // Halo lumineux autour des fenêtres (façon symbolsofwealth.studio, en plus serré) :
    // la fenêtre « éclaire » un peu autour d'elle, aux couleurs de son image ou de sa vidéo.
    glow: {
      enabled: true,
      margin: 30, // de combien le halo déborde autour de la fenêtre (px de maquette), quelle que soit sa taille
      blur: 22, // flou du halo à l'écran (px de maquette)
      opacity: 0.6,
      saturate: 1.5, // couleurs du halo plus vives que l'image
      videoFps: 8, // rafraîchissements par seconde du halo d'une vidéo
    },

    // Diaporamas (main.kind 'slides', en attendant une vidéo ; plus utilisé depuis le précase de Longtemps).
    slideMs: 375, // durée d'une image

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

  // Page MAGAZINES (src/scene/magazines.ts ; textes des maquettes : src/works/magazineTexts.ts) : les 3 magazines en 3D, en cercle.
  // Celui de devant prend la place d'une case (le grand rectangle de Take Care). Au scroll, il s'ouvre,
  // ses doubles pages se tournent, il se referme sur sa 4e de couv, puis le cercle tourne jusqu'au suivant.
  magazines: {
    pageHeight: 547, // hauteur d'une page du magazine de devant, fermé (px de maquette) : celle du grand rectangle de Take Care
    openHeight: 749, // ouvert : la hauteur des grands cadres (Longtemps, F1), il prend la place d'une case normale
    space: 0.5, // espace en plus avant la page (hauteurs d'écran) : les magazines arrivent plus tard
    flip: 0.28, // scroll pour tourner une page (hauteurs d'écran)
    turn: 0.6, // scroll pour faire tourner le cercle jusqu'au magazine suivant (hauteurs d'écran)
    // Cercle (px de maquette) : rayons en largeur et en profondeur, ceux du fond montent un peu (lift)
    // et tournent légèrement avec le cercle (face : 0 = toujours de face, 1 = tournés vers l'extérieur).
    ring: { rx: 900, rz: 520, lift: 0, face: 0.35 }, // à plat (demande du DA : « plus horizontal »)
    arrive: 0.5, // en arrivant, le cercle tourne pour amener le premier magazine (part de la distance entre deux magazines)
    // Les magazines arrivent de la droite et repartent par la gauche (comme Social Media), pendant la fin
    // de l'approche et le début du départ (part de la distance entre deux pages).
    slide: 0.6,
    // Papier : page bombée (bend), qui sort de la reliure (rise, magazine ouvert), pli quand on la tourne
    // (curl), en radians ; épaisseur d'une feuille (px).
    paper: { bend: 0.22, rise: 0.5, curl: 0.9, thickness: 0.8 },
    tilt: 0.16, // magazines un peu couchés vers l'arrière (radians) : la courbure et les reflets se voient mieux
    varnish: 0.75, // vernis : force des reflets (0 = papier mat)
    sway: 0.07, // léger balancement au repos (radians) : les reflets glissent sur le papier
  },

  // Page MUSIC & CULTURE (src/works/stripView.ts) : comme Social Media, sans vidéo au centre (la pochette de
  // 4000 km en grand, puis colonnes de carrés et d'affiches).
  musicCulture: {
    scrollPerPx: 1, // scroll consommé par px de défilement horizontal (plus = défilement plus lent)
    arrive: 0.65, // les colonnes arrivent pendant la fin de l'approche de la page (fraction de la distance entre deux pages)
    stagger: 0.06, // décalage d'arrivée entre deux colonnes (fraction de l'arrivée)
    twist: true, // pendant le défilement horizontal, la bande se courbe comme un tambour vertical (selon la vitesse)
    glowPalette: null as string[] | null, // halo : couleurs d'origine (voir social.glowPalette)
  },

  // Page SOCIAL MEDIA (src/works/stripView.ts) : les posts arrivent du côté droit, colonne par colonne,
  // puis la mosaïque défile vers la droite (la page reste fixe) avant que le scroll vertical reprenne.
  social: {
    scrollPerPx: 1, // scroll consommé par px de défilement horizontal (plus = défilement plus lent)
    arrive: 0.65, // les carrés arrivent pendant la fin de l'approche de la page (fraction de la distance entre deux pages)
    stagger: 0.04, // décalage d'arrivée entre deux colonnes (fraction de l'arrivée)
    twist: true, // pendant le défilement horizontal, la mosaïque se courbe comme un tambour vertical (selon la vitesse)
    mobileGap: 6, // écart entre les carrés sur mobile (hors maquette), px
    // Halo en dégradé : chaque couleur devient celle de la palette selon sa clarté (du plus clair au plus
    // sombre), ex. ['#ffffff', '#41f373', '#000000']. Testé en blanc / vert / noir, écarté par le DA :
    // null = couleurs d'origine.
    glowPalette: null as string[] | null,
  },

  // Footer (maquette « Scroll » 9:22, frame 1440×1024) : à la fin du scroll. Les cartes (photos) empilées
  // s'envolent vers le haut et révèlent le texte ; une montagne de daruma remplace le trait rouge.
  // Positions en px de maquette ; y depuis le centre de l'écran (frame : centre à y = 512).
  footer: {
    reveal: 1.5, // scroll après l'arrêt du footer : les cartes arrivent, puis on les envoie (hauteurs d'écran)
    // Calques inversés par rapport à la maquette (demande du DA) : la photo 1 est au fond, la 4 devant.
    // En arrivant il n'y a rien ; au scroll, les cartes montent d'en bas une à une (1, 2, 3, 4), chacune
    // posée devant la précédente et un peu plus bas (les autres dépassent au-dessus, comme sur la maquette) ;
    // arrêt quand la pile est complète ; le scroll suivant les envoie toutes d'un coup (animation).
    // Timings en fractions de la zone du footer (reveal).
    cards: {
      w: 315,
      h: 442,
      tops: [-298, -309, -318, -327], // haut des cartes, de celle de devant à celle du fond (maquette)
      dx: 0.5,
      arrive: { start: 0.04, stagger: 0.16, duration: 0.2 }, // arrivée de la 1, puis des suivantes
      pause: 0.76 as number | null, // arrêt du scroll quand la pile est complète (null : pas d'arrêt)
      flyMs: 1100, // durée de l'envol de la pile (déclenché par le scroll qui suit l'arrêt)
      flyStagger: 0.06, // décalage entre les cartes qui s'envolent (fraction de l'envol), celle de devant d'abord
      enter: 1.1, // les cartes arrivent d'en bas (hauteurs d'écran)
      lift: 1.3, // hauteur de l'envol (hauteurs d'écran)
      rotateDeg: 8, // petite rotation en arrivant et en partant (alternée)
    },
    text: { top: -43, width: 692 }, // bloc de texte centré
    // Grand logo en bas, plein cadre : 1473×173 dans une frame de 1440, débordant de 46 px en bas.
    logo: { w: 1473, h: 173, bottom: -46, frame: 1440 },
    // Icône en haut à droite (retour en haut) : 38 px à gauche du bord droit du header (87,5 % + 120), 111 px du haut.
    symbol: { right: 38, top: 111, size: 20 },

    // Tas de daruma (demande du DA, à la place du trait rouge de la maquette) : il part du bas de l'écran
    // et monte entre 1/3 et 2/3 des lettres du grand logo, qu'il recouvre en partie.
    daruma: {
      url: '/models/daruma-lite.glb', // version allégée (npm run assets) : ils sont des centaines
      // Rouge du corps : absent du GLB (la texture ne contient que les coulures dorées) → posé dessous. À valider par le DA.
      red: '#d0202a',
      height: 28, // hauteur d'un daruma (px de maquette)
      mobileHeight: 24, // sur mobile (hors maquette) : le logo est petit ; avant 12, trop petits (retour du DA)
      heap: [1 / 3, 2 / 3] as [number, number], // haut du tas : entre 1/3 et 2/3 de la hauteur visible des lettres du logo
      mobileHeap: [0.6, 1] as [number, number], // mobile : les lettres sont minuscules, le tas monte plus haut (jusqu'en haut des lettres)
      waves: [[1.3, 1], [3.1, 0.6], [7.7, 0.3]] as [number, number][], // relief du tas : [ondulations sur la largeur, poids]
      spacing: 0.8, // écart entre deux colonnes de la pile (fraction de la largeur d'un daruma ; < 1 = ils se chevauchent)
      rowStep: 0.6, // écart entre deux daruma empilés (fraction de la hauteur) : celui du dessous cache le bas de l'autre
      depth: 0.3, // chaque daruma passe devant celui du dessus (recul, fraction de la hauteur)
      jitter: 0.2, // désordre de la pile (fraction de la taille)
      tiltDeg: 12, // dans la pile, ils penchent un peu au hasard (±)
      sink: 0.3, // le bas du tas est coupé par le bord de l'écran (fraction de la hauteur)
      scale: [0.85, 1.15], // taille tirée au hasard
      faceDeg: 90, // rotation qui tourne le visage (vers -X dans le GLB) face à l'écran
      yawDeg: 28, // orientation au hasard autour de la verticale (±)
      rock: { deg: 7, period: 1.6, below: 0.3 }, // culbutos ; ceux du dessous, coincés, bougent moins (below)
      // Laque éclairée par le studio : le rouge reste franc, des reflets blancs glissent dessus.
      look: { ambience: 'studio', key: [-0.4, 0.6, 1], ambient: 0.5, f0: 0.25, reflection: 1.6 },
    },

    // Plantes (demande du DA : « pousser tout doucement en mode blossom ») : des tiges vert flash sortent du tas
    // de daruma quand on arrive sur le footer ; leurs feuilles se déplient au passage du bourgeon, et une fleur
    // rose poison éclot au bout (ou la tige finit en vrille). Hautes sur les côtés, basses sous le texte.
    // Tailles en px de maquette, durées en secondes (src/scene/footerPlants.ts).
    plants: {
      count: 18, // tiges sur desktop
      mobileCount: 8,
      // Mobile (avant : tout à 55 %, trop petit, retour du DA) : tiges, feuilles et fleurs à 90 % de la taille
      // desktop, et des tiges plus hautes (toujours sous le texte).
      mobileScale: 0.9,
      mobileHeight: [120, 280] as [number, number],
      green: '#41f373', // tiges, feuilles, cœurs des fleurs
      pink: '#ff1fb4', // pétales (rose poison)
      stem: [3.4, 1.1] as [number, number], // rayon de la tige à la base et au bout
      height: { center: [70, 190], sides: [320, 660] }, // hauteur au-dessus du tas : sous le texte, et sur les côtés
      clear: 400, // demi-largeur de la zone sous le texte, où les plantes restent sous lui
      textGap: 36, // marge entre le haut des plantes du centre et le bas du texte
      top: 150, // les plus hautes s'arrêtent à cette distance du haut de l'écran
      start: 0.5, // elles commencent à pousser quand le footer est à moitié arrivé (fraction de la hauteur d'écran restant à monter)
      grow: [7, 12] as [number, number], // durée de pousse d'une tige (tirée au hasard ; les grandes poussent plus longtemps)
      delay: [0, 2.5] as [number, number], // départs échelonnés
      leaves: [3, 6] as [number, number], // feuilles par tige
      leafSize: [16, 30] as [number, number], // longueur d'une feuille
      flower: 0.7, // part des tiges qui finissent en fleur (les autres en vrille)
      flowerSize: [30, 52] as [number, number], // diamètre d'une fleur ouverte
      sideFlower: 0.3, // part des feuilles qui ont une petite fleur à côté
      bloom: 2.2, // durée d'éclosion d'une fleur
      sway: { deg: 2.2, period: 6 }, // balancement autour du pied (on twos)
      // Laque éclairée par le même HDRI que les curseurs et la pluie (reflets vert-bleu).
      look: { ambience: 'chrome', key: [-0.4, 0.6, 1], ambient: 0.45, f0: 0.25, reflection: 1.4 },
    },
  },

  // Popup « Brands » (src/ui/brands.ts, demande du DA) : un pong sur un terrain de foot, le case vidéo en fond
  // (avec son halo), lignes en blanc translucide. Le joueur (raquette verte, à droite ; en bas sur mobile) suit
  // la souris ou le doigt, l'adversaire (rose) joue seul. La balle est un logo de marque en blanc négatif, qui
  // change à chaque rebond (raquette ou mur) ; le terrain s'incline un peu vers elle. Raté : « YOU LOST ».
  // Tailles en px de maquette, vitesses en longueurs de terrain par seconde.
  brands: {
    player: '#41f373', // raquette du joueur (vert flash)
    cpu: '#ff1fb4', // raquette de l'adversaire (rose poison)
    lines: 'rgba(255, 255, 255, 0.6)', // lignes du terrain, en transparence sur la vidéo
    // Le terrain s'incline vers la balle (degrés max le long et en travers ; ease : vitesse du suivi ;
    // perspective en px de maquette).
    tilt: { along: 7, cross: 4, ease: 3, perspective: 1800 },
    ballArea: 3400, // surface du logo-balle : même poids visuel quel que soit son format
    ballMax: [150, 84] as [number, number], // largeur et hauteur max du logo-balle
    mobileBall: 0.6, // logo-balle sur mobile (× la taille desktop)
    paddle: { length: 120, thickness: 10, inset: 26 }, // raquettes ; inset : écart avec la ligne de fond
    mobilePaddle: 0.7, // raquettes sur mobile (× la taille desktop)
    line: 2, // épaisseur des lignes du terrain
    speed: 0.6, // vitesse de départ de la balle
    speedUp: 1.06, // accélération à chaque frappe
    maxSpeed: 1.4, // vitesse max (× la vitesse de départ)
    maxAngle: 55, // angle max au renvoi (degrés), selon l'endroit où la balle touche la raquette
    cpuSpeed: 0.95, // vitesse max de la raquette adverse (largeurs de terrain par seconde)
    cpuError: 0.4, // erreur de visée de l'adversaire (× longueur de raquette) : il rate parfois
    serveDelay: 0.8, // pause avant le service, après un point (s)
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
