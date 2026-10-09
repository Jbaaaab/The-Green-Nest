# CLAUDE.md — The Green Nest (site DWAM v2)

Ce fichier est lu automatiquement par Claude Code à chaque session. Il contient le contexte, les règles et le plan du projet.

## Contexte

- Site portfolio de **Designer With A Monstera (DWAM)**, directeur artistique et designer basé à Paris.
- Objectif : un site niveau Awwwards, plus adulte, avec moins de texte, plus de démo et plus de 3D. C'est un site à garder longtemps et avec lequel prospecter.
- Le DA a fait la maquette et produit tous les assets lui-même. **La maquette Figma fait foi** : en cas de doute, demande-lui plutôt que d'interpréter.
- Il a oublié Git et Vercel. **À chaque commande git, explique en une phrase simple, en français, ce qu'elle fait.**
- Langue de travail : français, ton direct.

## Règles absolues

1. **L'ancien site reste intact.** Il vit ailleurs (repo `monstera-site`, projet Vercel `monstera-site`, toujours en ligne sur https://monstera-site.vercel.app ; le lien F1 y renvoie) : ne touche pas à son repo ni à son projet. **Le nom de domaine `www.designer-with-a-monstera.art` passe sur ce site** (décision du DA, 9 octobre 2026) : le transfert se fait par le DA dans Vercel (CNAME chez OVH déjà vers Vercel). Aucune autre modification DNS sans son accord.
2. Repo : https://github.com/Jbaaaab/The-Green-Nest (branche `main`). Ce repo devient le site v2.
3. Ne supprime jamais un asset source. Les fichiers de `assets-src/` sont les originaux.
4. Avant de commit ou de push, montre ce qui change et demande validation.
5. Avance par étapes (voir le plan plus bas). À la fin de chaque étape, lance le serveur local, dis comment tester, et attends le retour avant de passer à la suite.

## Figma

- Fichier : `WEBSITE-2027`, fileKey `nCrXLpigcjAbPhawgdT8kV`
- **Landing desktop de référence : MacBook Pro 14" (1512×982)** : https://www.figma.com/design/nCrXLpigcjAbPhawgdT8kV/WEBSITE-2027?node-id=53-586
  - **Écran de référence : 1512×949**, la zone visible du MacBook Pro 14" en plein écran (sous l'encoche). Les valeurs desktop sont relevées au pixel sur les captures 1:1 de la maquette envoyées par le DA (Figma présenté en plein écran), puis vérifiées en superposant le site (écart ≤ 0,5 px). C'est du minimalisme : **les rapports doivent être exacts**.
  - **Unité `--u` = 1 px de maquette = `min(1px, 100vw / 1512, 100vh / 949)`** (`tokens.css`, lue en JS par `readUnit()`). Tailles et décalages en `N × --u`. À 1512×949 et plus grand : tailles exactes de la maquette (jamais plus grand). Fenêtre plus petite (Chrome avec ses onglets ≈ 1512×860) : tout rétrécit uniformément, les rapports restent ceux de la maquette. Positions horizontales en % de la largeur + décalage (contraintes Figma : Works à 25 % + 35, About à 37,5 % + 23, Instagram/Mail et dock calés sur 87,5 % + 0, bord droit à 87,5 % + 120). Ne pas mettre à l'échelle de la largeur seule : c'était faux.
- Ancienne landing desktop (1440×1024, remplacée par la précédente) : https://www.figma.com/design/nCrXLpigcjAbPhawgdT8kV/WEBSITE-2027?node-id=2-3
- Landing mobile (402×874) : https://www.figma.com/design/nCrXLpigcjAbPhawgdT8kV/WEBSITE-2027?node-id=46-410
- Croquis de la traînée de frames : `assets-src/refs/croquis-trainee.png` (frames sombres en diagonale vers le bas-droite, la plus récente en haut et la plus grande, les plus anciennes rétrécissent et pâlissent ; vignette ≈ 91×96 px)

Configure le MCP Figma pour ce projet en créant `.mcp.json` à la racine :

```json
{
  "mcpServers": {
    "figma": { "type": "http", "url": "https://mcp.figma.com/mcp" }
  }
}
```

Ensuite, aide-moi à l'authentifier avec la commande `/mcp`. Récupère depuis Figma les typos, tailles, couleurs, espacements et la grille. **N'invente aucune valeur.**

- **Accès Figma en pratique** : le connecteur Figma de claude.ai est authentifié, mais le plan **Starter** limite le MCP à 20 lectures par mois (quota vite épuisé). Pas de `.mcp.json` (doublon). Deux voies : les **captures 1:1** envoyées par le DA (mesures au pixel ; les trous des textes se convertissent en espaces : 1 espace = 3,5 px en Epilogue 700 14 px), ou l'**API REST** : `npm run figma -- <liens>` (`scripts/figma.mjs`, jeton `FIGMA_TOKEN` dans `.env.local`, sortie dans `.figma/`, tous deux ignorés par git).

## Stack

- **Vite + TypeScript, en vanilla** (pas de framework UI pour l'instant). Prévois la structure pour des pages Works et About plus tard.
- **Three.js** pour la bague, la pluie Instagram et les curseurs 3D.
- **GSAP** pour les animations DOM, avec `prefers-reduced-motion` respecté.
- **Physique de la pluie Insta** : `@dimforge/rapier3d-compat`, chargé à la demande au premier déclenchement seulement, jamais au chargement de la page.
- **Optimisation des modèles** : `@gltf-transform/cli`, compression meshopt ou draco, sur les fichiers copiés depuis `assets-src` vers `public`.
- **Optimisation des images** : conversion en WebP/AVIF (avec `sharp`), redimensionnées pour leur taille d'affichage réelle. Toutes les images sources lourdes (music-culture, magazine, social-media : jusqu'à 50 Mo pièce) ont une version web dans `public/work/…` (`GALLERIES` : WebP qualité 82, 2000 px max, 1080 pour les posts Instagram ; 397 Mo → 31 Mo, sans perte visible).
- **Sources gardées en local seulement** (`.gitignore`, trop lourdes pour GitHub) : `assets-src/work/social-media/` (80 Mo) et `assets-src/work/videos/` (le case `VIDEO CASE.mov`, 95 Mo ; les anciennes vidéos sources ont été retirées par le DA). Seules leurs versions optimisées de `public/` partent en ligne.
- Déploiement sur **Vercel**, branche `main` = production, une URL de preview par branche.

## Structure cible

```
/
├─ assets-src/          ← originaux (l'actuel img/ déplacé ici)
│  ├─ models/           bague.glb, daruma.glb, instagram.glb (à venir)
│  ├─ cursors/glb/  cursors/svg/
│  ├─ digit/
│  └─ work/music-culture/
├─ public/              ← versions optimisées, générées par script
├─ src/
│  ├─ main.ts
│  ├─ styles/           tokens.css (issus de Figma), base.css
│  ├─ scene/            ring.ts, instaRain.ts, cursor.ts
│  ├─ ui/               header.ts, clock.ts, musicPlayer.ts, workTrail.ts
│  └─ config.ts         tous les réglages (vitesses, tailles, durées)
├─ scripts/optimize-assets.mjs
├─ index.html
└─ CLAUDE.md
```

Renomme les dossiers et fichiers sans espaces, sans `&` ni accents (en kebab-case). Le double dossier `img/case/case/` disparaît.

## Problèmes d'assets déjà repérés

- ~~Les 15 GLB de `cursors/glb/` et `digit/` étaient des copies identiques.~~ **Réglé** : ré-exportés un objet par fichier. Ils ont une échelle minuscule (≈ 0,006 unité de haut) et leur origine dans un coin : recentrer et normaliser dans le code, comme la bague. Matériau gris neutre `#ccc`, roughness 0,17.
- **Doublons** (gardés, mais à ne pas utiliser deux fois) : `work/music-culture/halsey.jpg` = `v1-low.jpg`, `cursors/svg/calque-2.svg` = `digit/etoile.svg`.
- **`bague.glb`** : son origine n'est pas au centre de l'objet, et l'échelle est minuscule (≈ 0,0076 unité). Recentre et normalise dans le code ; le DA peut aussi faire Origin → Geometry dans Blender. La couleur du matériau est verte, avec une roughness de 0,17 : garde ce rendu, et ajoute un environnement HDRI léger pour les reflets.
- **`daruma.glb`** : ré-exporté, 185 Ko pour 3,5k triangles. Utilisé pour la montagne du footer, en version allégée (`public/models/daruma-lite.glb`, 1 265 triangles). Visage tourné vers -X dans le GLB ; le rouge du corps manque (voir Footer).
- **Logo Instagram 3D** : `assets-src/models/instagram.glb` (5k triangles, rose `#FF039F`, roughness 0,34). Échelle minuscule et origine décentrée sur X : recentrer et normaliser dans le code.
- **Posters de `music & culture`** : jusqu'à 7,8 Mo et 3508×4961 px. Dans la traînée, ils s'affichent autour de 120 px, donc génère des versions de 240 px de large (pour le 2x) en WebP.

## Spec de la landing

### Header (desktop)

- **À gauche** : le symbole du logo (noir dans Figma, `src/assets/icons/logo.svg`) suivi de "DESIGNER WITH A MONSTERA". "DWAM" sur mobile seulement (sur desktop tout est proportionnel : le nom complet ne touche jamais "Works").
- **Au centre** : les liens Works (va au projet 1) et About (descend tout en bas, sur le footer et sa bio, cartes envolées : `src/ui/header.ts`).
- **L'icône curseur** : elle change le curseur (voir la section Curseur).
- **À droite** : Instagram → https://www.instagram.com/designer_with_a_monstera/, et Mail → `mailto:hello@designer-with-a-monstera.art`.

### Bio

- Le texte vient de Figma, avec ses trous volontaires entre les mots. **Les trous sont voulus, reproduis-les fidèlement.**
- C'est du vrai texte DOM, pour le SEO et l'accessibilité.
- Desktop : 17,67 px (COOL : 22,65 px), bloc de 839 px de large, centré à l'écran (1 px plus haut).

### Bague (élément central)

- `bague.glb` sur un canvas Three.js plein écran, posé au-dessus de la bio, avec `pointer-events: none`.
- **Physique réaliste de pièce qui roule** (l'écran = la table, vue de dessus), en boucle infinie. La bague est inclinée presque à plat (70-80° par rapport à la verticale), l'axe d'inclinaison tourne (précession, disque d'Euler), et elle ne tombe jamais.
- **Trajectoire imprévisible mais physique** : en roulant, le centre avance perpendiculairement au point de contact (le bord le plus bas), sur une courbe dont le rayon change au hasard (bruit lisse) → des boucles de tailles variées dont le centre se balade. Une « table légèrement creuse » la ramène vers le centre de l'écran. Les grandes boucles tournent moins vite (~1/√rayon), comme une vraie pièce. **Pas de balade façon logo DVD** (Lissajous : rejeté) **ni de cercles trop réguliers** (rejeté aussi).
- Rotation propre par roulement sans glissement, bien visible. **Archi chancelante (demande du DA : « à balle »)** : précession très rapide (0,38 s par tour), qui s'emballe quand la bague s'aplatit (comme un vrai disque d'Euler en fin de course). Inclinaison qui varie au hasard (±13°, toutes les ~0,75 s, jusqu'à 2° de la table). **Un poil plus fixe** (demande du DA : « qu'elle chancelle fort en étant un poil plus fixe ») : boucles de 5 à 75 px (avant 8 à 150), rappel vers le centre deux fois plus fort (`orbit.pull` 0,5, `maxOffset` 120 px).
- Position de repos (creux de la table) : 33 px sous le centre de l'écran, comme sur la maquette (la bio passe dans son tiers haut). `config.ring.center`.
- **Rendu actuel : chrome à fond, reflets #41F373** (`config.ring.ambience: 'greenChrome'`) : HDRI au ciel #41F373 lumineux, sol noir et ligne d'horizon blanche nette ; quand la bague vacille, sa face passe du vert éclatant au noir en traversant des filets blancs. Le rendu « maquette » ci-dessous reste disponible avec `ambience: 'maquette'`.
- Rendu « maquette » (option) : **calqué sur le rendu Blender de la maquette** (Figma « bague 1 »), **lisse et métallique** : faces émeraude `#086E48`, liseré clair sur les arêtes, flancs olive marbrés de vert-jaune, reflet brillant qui traverse la face quand elle s'incline, éclats qui glissent sur les arêtes. **« Shade smooth »** : grain et aspérités à 0 (ils striaient les flancs). Matcap en couleur calculée en JS (`src/scene/ringMatcap.ts`, couleurs relevées sur l'image dans `config.ring.look`). Normales recalculées au build (`npm run assets`, équivalent Weighted Normal + Auto Smooth à 35°) : pas de stries. Pas de PMREM : sa compilation bloquait le mobile > 1 s.
- Tous les réglages vont dans `config.ts` : inclinaison, souffle, vitesse de précession, trajectoire (`ring.orbit`), studio.

### Apparitions de projets (desktop uniquement)

- **Pas une traînée** : des vignettes de projets apparaissent **au hasard, en fond** (derrière la bio et la bague), chacune pendant environ 2 secondes, en rétrécissant puis en disparaissant.
- Taille d'environ 90 à 120 px de large, cadence aléatoire (280-640 ms).
- Les images viennent de `work/music-culture` (vignettes WebP 240 px générées par `npm run assets`), tirées sans remise.
- Placement : une option `snapToGrid` dans `config.ts`, pour s'aligner ou non sur la grille (8 colonnes). Valeurs de grille mesurées sur le croquis, à confirmer.
- C'est fait en DOM, avec des `transform` et de l'`opacity` uniquement, pour les perfs.

### Pluie Instagram

- **Desktop** : le survol du lien Instagram fait tomber plein de logos Insta 3D rose flash (celle du GLB : `#FF039F`). Ils tombent du haut, rebondissent, s'empilent en bas, puis disparaissent après quelques secondes. **Pluie doublée et continue** (40 logos/s) : au plafond, les plus anciens rétrécissent et disparaissent pour laisser tomber les suivants.
  - 70 à 100 px de large. **Chrome rose, un poil de vert** : l'inverse des curseurs (HDRI `config.ambiences.pinkChrome`, `config.rain.chrome` ; `null` remet l'ancienne laque rose de `config.rain.look`).
  - Rendu en `InstancedMesh`, plafonné à 120 instances.
  - Le **clic** ouvre Instagram dans un nouvel onglet.
- **Mobile** : le tap ouvre directement Instagram, sans pluie.

### Curseur 3D (desktop uniquement)

- Le curseur natif est caché, et un texte 3D (les GLB de `cursors/`) suit la souris en tournant en boucle sur lui-même. 18 px de haut. **Chrome vert, un poil de rose comme les fleurs du footer** (ciel vert profond, sol vert presque noir, horizon vert flash, sources vertes, deux petites touches rose poison qui passent sur les tranches) : `config.ambiences.chrome` (avant : vert-bleu ; partagé avec les chiffres et les reflets des plantes). Les autres HDRI (néons, PS3, studio) restent au choix dans `config.ambiences`.
- Le clic sur l'icône curseur du header passe au curseur suivant. L'ordre : click → great → iluvyou → iwannahire → super → wow, puis on reboucle.
- Curseur par défaut au chargement : **WOW!**. Au survol d'un élément cliquable (liens, boutons) : **CLICK!**.
- **Rendu dans le canvas principal, couche overlay** (dessinée après effacement de la profondeur, donc toujours devant) : pas de second contexte WebGL, et la boucle de rendu tourne déjà pour la bague. Le canvas est donc au premier plan (`z-index` 5, `pointer-events: none`) : la pluie passe aussi par-dessus le header.
- Juste après un clic sur l'icône du header, le nouveau curseur s'affiche même si la souris est encore dessus (CLICK! reprend au survol suivant).
- Le suivi de la souris est lissé avec un léger lerp.
- Tout est désactivé sur les écrans tactiles (`pointer: coarse`).

### Rotations « on twos »

- Les rotations des assets 3D (bague, curseurs, chiffres) sont animées **« on twos »** comme en animation : chaque pose est tenue 2 images (moitié du framerate). Les déplacements restent fluides (la bague qui roule, le curseur qui suit la souris). Réglages : `config.stepped`.

### Pages projets (Works)

- Maquettes : LONGTEMPS `16:5`, FORMULA ONE `25:448`, TAKE CARE `25:560` (frames 1440×1024). **Carré rouge sur la maquette = asset à mettre.**
- **Scroll vertical, fluide, façon perappelgren.de** (`src/nav.ts`, scroll virtuel avec inertie type Lenis : molette/trackpad, tactile avec élan, clavier). Accueil puis pages empilées verticalement. **Pas d'aimant** : on scrolle librement. **Arrêt net quand le texte d'un projet arrive au milieu de l'écran** (la page est alors à ses proportions Figma) ; il faut un nouveau geste pour continuer (l'inertie du trackpad ne passe pas l'arrêt). Ancre d'URL par projet (`#longtemps`, `#formula-one`, `#take-care`, `#videotape`, `#magazines`, `#music-culture`, `#social-media` ; sections = ordre de `PROJECTS`, `SECTION_IDS` en est tiré). Une section peut avoir après son arrêt une **zone fixe** (`nav.holdOf`) : la page ne bouge plus pendant ce scroll (magazines 3D, défilement horizontal de Music & Culture et Social Media, cartes du footer), avec d'éventuels **arrêts intermédiaires** (`nav.setPauses` : chaque nouveau magazine, pile de cartes complète). Le logo et le symbole en fin de rangée ramènent à l'accueil, « Works » va au projet 1.
- **Twist façon perappelgren.de** (`src/works/scrollFx.ts`) : pendant le scroll, la page se courbe comme un tambour (en haut ça bascule vers l'arrière par le haut, en bas par le bas), d'autant plus que le scroll est rapide ; au repos tout est plat. **Parallaxe** : fenêtres à des vitesses différentes, textes (et bio) plus lents. La bague 3D suit (parallaxe + twist). Réglages : `config.works`.
- Historique des refus du DA : fenêtres éparpillées au hasard sur un cylindre horizontal (« goofy »), puis transitions page par page façon diaporama (« trop diaporama, trop aimanté »).
- **Proportions** (`src/works/projects.ts`) : chaque page est posée dans un cadre centré à l'écran, à l'échelle `--u`. LONGTEMPS, FORMULA ONE et VIDEOTAPE : cadre vidéo 1320×749, texte centré dessus (maquette Longtemps 1512×949, vérifiée au pixel ; milieu du bloc à 375 px du haut du cadre, `SINGLE.textCenter`, quel que soit son nombre de lignes). TAKE CARE : la composition de la frame 1440×1024 (grille régulière 5×3, écarts de 34 et 25 px, grande vidéo 371×547 sur la colonne du milieu), **carrés étirés en largeur à 245×233** (demande du DA) pour que la grille (1361 px, centrée) dépasse d'un poil la rangée 1-8 : bord gauche du « 1 » à −671 px, bord droit du symbole à +672 px du centre, grille à ±680,5 px (mesuré à 1512×949). Rangée 1-8 calée sur le cadre. Bouton « PROJET + » à 60 px du bord gauche et 47 px du bas. Les contraintes 1440×1024 appliquées « telles quelles » à l'écran 1512×949 cassaient la grille (écarts irréguliers, rangées collées) : abandonnées.
- **Rangée 1-7 + symbole** en haut (un numéro par projet, le 8 retiré : 8 éléments répartis régulièrement du « 1 » au symbole, `NAV_ROW`), **derrière les vidéos, à cheval sur leur bord haut** (demande du DA) : la moitié des chiffres gris dépasse (centre 0,75 px au-dessus du cadre de Longtemps, mesuré sur les maquettes ; sur Take Care, dont la grille est 3 px plus haute, un peu moins). **Le numéro courant est le chiffre entouré en 3D** (GLB `digit/n`, 19 px), **13,25 px au-dessus des autres**, donc entièrement visible, **façon écran de chargement PS3** (rotation continue et régulière, léger flottement), en chrome vert (`ambiences.chrome`). Il est dessiné dans le canvas (au premier plan) mais masqué au stencil là où une fenêtre de la page le recouvre (`src/scene/digits.ts`). Mobile : même principe sur le cadre mobile (66 px).
- **Liens des projets** (`Project.link`, nouvel onglet) : un clic sur la grande vidéo (curseur CLICK!) ou sur le bouton vert « PROJET + » les ouvre. LONGTEMPS → la chaîne YouTube, FORMULA ONE → l'ancien case (https://monstera-site.vercel.app/work/f1.html : l'adresse de l'ancien projet Vercel, qui reste valable après le transfert du domaine), TAKE CARE → l'Instagram de Take Care. Les autres projets n'ont pas encore de lien (le bouton ne fait rien).
- Bouton vert « PROJET + » en bas à gauche. Il s'élargit quand le titre ne tient pas (MUSIC & CULTURE), avec les marges de la maquette (`fitButton`).
- LONGTEMPS, FORMULA ONE et VIDEOTAPE : un grand cadre vidéo. **FORMULA ONE : le case** (`assets-src/work/formula one/anims/CASE F1.mov`, 1920×1080, 18 s) en MP4 1600 px muet, 3,3 Mo (`PROJECTS.formulaOne`). **LONGTEMPS : le précase** (`assets-src/work/longtemps/precase-longtemps.mov`, 6 s, en boucle ; copié depuis les Téléchargements du DA) en MP4 1600 px, 1,6 Mo ; il remplace le diaporama d'attente (type `slides`, toujours disponible, `config.works.slideMs`). (Le dossier `formula one` n'a pas pu être renommé : verrouillé par Windows.)
- **VIDEOTAPE (projet 4, avant Magazines, demande du DA)** : le case des vidéos (`assets-src/work/videos/VIDEO CASE.mov`, 1920×1080, 31 s) en MP4 1600 px, CRF 30 (montage très découpé : 8 Mo), dans le grand cadre comme Longtemps. Texte de la maquette « LET’S WATCH A … VIDEOTAPE / TOGETHER » (apostrophe ajoutée, trou de 5 espaces). La maquette entourait le ⑦ (copie de Social Media) : numéros remis dans l'ordre du scroll (4 Videotape, 5 Magazines).
- **Halo lumineux autour des fenêtres** (façon symbolsofwealth.studio, en plus serré : « juste les alentours ») : chaque fenêtre éclaire autour d'elle aux couleurs de son image ou de sa vidéo (miniature 16 px floutée puis agrandie derrière la fenêtre, `src/works/glow.ts`). Marge et flou fixes à l'écran (30 et 22 px de maquette), quelle que soit la taille de la fenêtre. Réglages : `config.works.glow`.
- TAKE CARE : vidéo `case-take-care` au centre, **au premier plan, en boucle à vitesse normale** ; 14 carrés d'assets autour (`PROJECTS.takeCare` dans `scripts/optimize-assets.mjs`). Les vidéos des carrés tournent toutes **à ×0,5**, à ×1 sous la souris ; le carré survolé grandit un tout petit peu (×1,04) et passe devant ses voisins. Réglages : `config.works.hover`.
- Contenu (textes avec trous, médias) : `src/works/projects.ts`. Médias générés par `npm run assets` (ffmpeg requis) → `public/work/take-care/`, `src/works/media.generated.json`.
- Mobile (hors maquette) : même structure ; TAKE CARE n'affiche que la vidéo centrale.
- Perf : pages construites quand le navigateur est inactif, pages lointaines retirées du rendu, médias chargés à l'approche.
- **Textes des projets en « noir négatif »** (demande du DA, « TAKE CARE BEAUTY… ») : blancs en `mix-blend-mode: difference`, ils sont noirs sur le blanc et inversent les images qu'ils survolent. Ils vivent dans un calque à part (`.works-texts`, au-dessus de `.works` qui isole les mélanges) et portent leur propre perspective (même twist que leur page).

### Magazines (projet 5 ; maquettes Figma 25:631, 25:838, 25:888, 51:475, 51:525 : textes appliqués)

- `src/scene/magazines.ts` (3D, dans le canvas) + `src/works/magazineTimeline.ts` (chronologie), section `#magazines` entre VIDEOTAPE et MUSIC & CULTURE. **Les 3 magazines en 3D, en cercle à plat** (« plus horizontal ») : **Typeshit d'abord**, puis CPGCQD et DPP (couverture, doubles pages, 4e de couv ; `MAGAZINES` dans `scripts/optimize-assets.mjs`). Doubles pages de Typeshit : les siennes, puis ses **hors-séries Music puis Fashion** (sections de Typeshit, choix du DA ; pas de couvertures à part). **Fermé, celui de devant a la taille d'une case** (page de 547 px de haut = grand rectangle de Take Care) ; **ouvert, il grandit jusqu'à la hauteur des grands cadres** (749 px, la place d'une case normale de Longtemps / F1). Les autres sont derrière, sur les côtés.
- **Ils arrivent de la droite et repartent par la gauche** (comme Social Media, sans mouvement vertical), pendant la fin de l'approche (`config.magazines.slide`, `magazineSlide`). **Espace en plus avant la page** (`config.magazines.space`, `nav.setSpace`) : ils n'apparaissent qu'une fois la page précédente (Videotape) partie.
- **Textes des maquettes** (`MAGAZINE_TEXTS` dans `src/works/projects.ts`, `src/works/magazineTexts.ts`) : un par maquette (Typeshit, Music hors-série, Fashion hors-série, CPGCQDB, DPP), centrés à l'écran, en noir négatif **au-dessus du canvas** (ils inversent les magazines 3D), et ils glissent de côté avec eux. Celui du magazine de devant s'affiche ; sur Typeshit, le texte du hors-série prend le relais sur ses doubles pages (fondu, à mi-page). Fautes de la maquette corrigées avec l'accord du DA (BIANNUAL, MUSIC, BASICALLY, BRANDS, GABBANA).
- **Rangée 1-8 visible** (maquettes ; ⑤ entouré depuis l'arrivée de Videotape) : le magazine ouvert la recouvre comme les vidéos des autres pages ; le papier marque le stencil, donc le chiffre 3D passe derrière.
- Zone fixe pilotée par le scroll : le magazine de devant **s'ouvre, ses doubles pages se tournent une à une** (pli de la page qui tourne), il **se referme sur sa 4e de couv**, puis **le cercle tourne** jusqu'au suivant ; arrêt à chaque nouveau magazine. Réglages : `config.magazines` (`flip`, `turn`, `ring`, `paper`, `varnish`, `tilt`, `sway`).
- **Papier** : feuilles souples calculées en JS (bombées, qui sortent de la reliure quand le magazine est ouvert, qui se plient en tournant). **Vernis** : reflets ajoutés à l'image (matcap de bandes de lumière) qui glissent quand la page se courbe, tourne ou se balance (léger balancement au repos). Pas d'environnement à précalculer (même principe que le reste du site).
- Textures WebP (pages ~700 px, 3,9 Mo pour les 3 magazines) chargées à l'approche de la page ; pages intérieures ensuite, magazine par magazine ; réduites au décodage sur mobile.
- Mobile (hors maquette) : même chose, le magazine ouvert tient dans la largeur.

### Music & Culture (projet ⑥ ; maquette envoyée en capture, d'après les indications du DA)

- **Se comporte comme Social Media** (même code : `src/works/stripView.ts`, `postersStrip`), **sans vidéo au centre**. Section `#music-culture` entre MAGAZINES et SOCIAL MEDIA.
- **La pochette de 4000 km (Hakil) en grand d'abord** (carré de 749 px, toute la hauteur du cadre de Take Care), puis des colonnes qui remplissent la hauteur, avec les écarts de Take Care (34 et 25 px, `POSTERS`) : **colonnes carrées** (les assets carrés, 2 carrés de 362 px ; le dos de 4000 km juste après la pochette) et **colonnes d'affiches format A** (3 affiches de 165×233 ; une ou deux colonnes de 2, 256×362, absorbent le reste), au rythme carrés / affiches / affiches. Colonnes toujours pleines. Les 4:5 vont dans les affiches (un peu recadrés). Composition faite par `npm run assets` (`MUSIC_CULTURE` dans `scripts/optimize-assets.mjs` : `hero`, `first`, `skip`, `pattern`) → `media.musicCulture.columns`, WebP 2x dans `public/work/music-culture/grid/`.
- Ignorés : le doublon `halsey.jpg` / `v1-low.jpg`, et la carte titre de Longtemps (paysage 16:9, ni carré ni affiche).
- Texte de la maquette (« MUSIC & CULTURE / I’VE DONE THAT SHIT… »), centré à l'écran, en noir négatif. Le trait pâle sous « AND POOR … RETRIBUTION. » de la capture a été pris pour un artefact Figma (pas reproduit). Rangée 1-8 masquée, comme sur Social Media. Réglages : `config.musicCulture`.
- Mobile (hors maquette) : la pochette tient dans la largeur, la bande est centrée dans la hauteur.

### Social Media (projet ⑦ ; maquette 25:938 pour le texte et le numéro, la mosaïque reste celle d'après les indications du DA)

- **Numéro 7** dans la rangée (maquette). `Project.number` = numéro affiché, `Project.section` = index de section dans le scroll (rang dans `PROJECTS`) : ils coïncident aujourd'hui (1 à 7, le 8 est libre), mais ne pas les confondre.

- `src/works/stripView.ts` (`socialStrip`), section `#social-media` entre MUSIC & CULTURE et le footer. On descend sur une page blanche, **les posts arrivent du côté droit** colonne par colonne (pendant la fin de l'approche, `config.social.arrive`), puis à l'arrêt **la mosaïque défile vers la droite** (zone fixe, 1 px de scroll = 1 px de défilement ; molette, trackpad ou doigt, vertical comme horizontal), avant que le scroll vertical reprenne vers le footer. Pendant le défilement horizontal, les colonnes se courbent comme un tambour vertical (twist, selon la vitesse).
- **Petits carrés de 1/4 de ceux de Take Care** (122,5×116,5 px), **6 rangées × 10 colonnes** dans le cadre de Take Care (1361×749, écarts recalculés pour le remplir exactement : 15,1 et 10 px), qui dépasse à droite (18 colonnes, 108 posts). **Grille toujours finie** (demande du DA) : les posts en trop (moins d'une colonne) ne sont pas affichés. **Grand rectangle vidéo au centre** (371×547, comme Take Care), qui reste en place. La maquette 25:938 (gros carrés sur 3 rangées) est volontairement ignorée pour la mosaïque (demande du DA).
- **Mélangés** (demande du DA : le tri par couleur faisait trop ordonné ; `SOCIAL.order` dans `scripts/optimize-assets.mjs`, `'color'` le remet, `seed` change l'ordre). Doublons exacts retirés. Carrés WebP 246×234 (2x), fond de leur couleur moyenne en attendant l'image.
- **Halo global** : un pixel par carré à sa couleur moyenne, flouté et agrandi derrière la mosaïque (mêmes marge et flou que les halos des autres fenêtres) : la lumière déborde autour de la mosaïque et dans ses interstices. Un dégradé blanc / vert #41F373 / noir selon la clarté a été testé puis écarté par le DA (`config.social.glowPalette`, désactivé : `null`).
- La rangée 1-8 est masquée sur cette page (elle passerait entre les petits carrés) ; le bouton « SOCIAL MEDIA + » reste. Carrés construits seulement quand on quitte l'accueil (perfs).
- **Texte de la maquette** (« SOCIAL MEDIA / I’VE DONE THAT SHIT… »), centré à l'écran, en noir négatif, géré par `worksView.ts` comme ceux des autres pages. **Vidéo centrale : le case** (`case social media.mov`, 1080×1920, 15 s → `case.mp4` 720 px, `SOCIAL.main`) ; l'ancienne reel de 13 s et les 2 autres vidéos sont des carrés.

### Footer (maquette « Scroll » 9:22)

- **Tout en bas du scroll**, après SOCIAL MEDIA : dernière section `#hello` (`src/footer/footerView.ts`). Arrêt quand la page est en place : **il n'y a pas encore de cartes**. Puis, dans la zone fixe (`config.footer.reveal`), **les 4 cartes** (photos de `assets-src/footer-photos/`) **montent d'en bas une à une : 1xp, 2chaewon, 3duo, 4windows**, chacune posée devant la précédente (**calques inversés par rapport à la maquette**, demande du DA : la 1 au fond, la 4 devant) et un peu plus bas : **les cartes du dessous dépassent au-dessus, comme sur la maquette** (positions de la maquette par profondeur). **Arrêt du scroll quand la pile est complète** (`config.footer.cards.pause`), puis **un seul scroll les envoie toutes d'un coup** (animation de 1,1 s, celle de devant un poil avant ; elles reviennent si on remonte) et dégage le texte (« HI /안녕하세요/… » + bio avec ses trous, toujours visible sur les côtés). Photos en WebP 640 px (`SLIDES.footer`), chargées à l'approche.
- Grand logo « DESIGNER WITH A MONSTERA » en bas, pleine largeur (SVG de Figma, `src/assets/footer/`). Symbole en haut à droite (38 px à gauche du bord droit du header, 111 px du haut) : retour à l'accueil.
- **Tas de daruma** (`src/scene/darumaMountain.ts`, à la place du trait rouge de la maquette, demande du DA) : **un amoncellement qui part du bas de l'écran et monte entre 1/3 et 2/3 de la hauteur visible des lettres du grand logo** (relief en ondulations lentes, `config.footer.daruma.heap` / `waves`), devant le bas des lettres. Petits daruma (28 px), colonnes serrées, chaque daruma passe devant celui du dessus, un peu de désordre (décalages, tailles, inclinaisons) ; face à l'écran, ils se balancent comme des culbutos (on twos), ceux du dessous moins. Chargés seulement à l'approche du footer. **Perfs** : modèle allégé `daruma-lite.glb` (1 265 triangles, généré par `npm run assets`, option `simplify`), instancié (un appel de dessin par matériau) ; ~310 daruma sur desktop, 60 images/s ; matrices recalculées seulement quand une pose change.
- Le **rouge du corps des daruma n'est pas dans le GLB** (la texture ne contient que les coulures dorées sur fond transparent) : il est posé dessous dans le code, `config.footer.daruma.red` (`#d0202a`, **à valider par le DA**).
- **Plantes** (`src/scene/footerPlants.ts`, demande du DA : « pousser tout doucement en mode blossom », vert flash et un peu de rose poison) : dès que le footer est à moitié arrivé (avant les photos, demande du DA : « plus tôt »), 18 tiges vert flash (`#41f373`) sortent du tas de daruma (pied caché dedans, `heapTop`) et poussent lentement (7 à 12 s, départs échelonnés sur 2,5 s ; premières fleurs pendant les photos), un bourgeon brillant au bout ; les feuilles se déplient à son passage ; au bout, une fleur rose poison (`#ff1fb4`, deux couronnes de pétales, cœur vert) éclot, ou la tige finit en vrille ; quelques petites fleurs le long des tiges. Hautes sur les côtés (jusqu'à 150 px du haut), basses au centre, **jamais sur le texte** (hauteur limitée par le bas du texte). Puis léger balancement autour du pied (on twos). Laque en matcap (même HDRI que les curseurs), rien à charger ; une tige = un appel de dessin, feuilles / pétales / bourgeons instanciés (~5 % du rendu du footer). Mobile : 8 tiges, toutes sous le texte. Mouvement réduit : tout est déjà poussé. Réglages : `config.footer.plants`.
- Le dock (horloge + music player) s'efface sur le footer (absent de la maquette) ; la musique continue.
- Pas encore fait (vu sur la maquette 9:22) : lien « Spin » dans le header et pastille verte devant « Works ».
- Mobile (hors maquette) : même structure, daruma de 12 px.

### Horloge

- En bas à droite sur desktop, en bas à gauche sur mobile : "Paris HH:MM" et "Seoul HH:MM", en temps réel.
- Utilise `Intl.DateTimeFormat` avec les fuseaux `Europe/Paris` et `Asia/Seoul`.
- Les icônes (marcheur, cœur) viennent de Figma. Desktop : le cœur remonte sous le marcheur (icône combinée). Dock calé en bas : bas du music player à 43 px du bas de l'écran, haut de l'horloge 36,5 px au-dessus du haut du bouton.

### Music player

- Le rectangle vert garde le look de la maquette, avec deux zones : **l'icône** lance / arrête (égaliseur animé pendant la lecture), **le texte** passe au morceau suivant (« chaque clic joue un morceau ») et affiche le titre en cours (défilement s'il est trop long).
- Au tout premier lancement : courte intro `chaewon-lock-in`, puis morceaux tirés au hasard sans remise, enchaînés automatiquement. Fondu à l'entrée et à l'arrêt.
- Sources : `assets-src/music/`. `npm run assets` les convertit en AAC 128 kbit/s avec volume harmonisé (-16 LUFS) → `public/music/`, liste et titres dans `scripts/optimize-assets.mjs` (`MUSIC`) → `src/ui/tracks.generated.json`. Un morceau ne se télécharge qu'au moment où il est lancé.

### Mobile (frame 46-410)

- Le header affiche "DWAM" au lieu du nom complet.
- La bio est plus grosse et centrée, la bague est plus grande en proportion.
- Pas de curseur 3D ni de traînée de frames.
- L'horloge est en bas à gauche, le music player en bas à droite.

## Performance et qualité

- Lighthouse mobile : viser 85 ou plus en performance. **Mesuré : 95-96** (accessibilité 95, bonnes pratiques 100, SEO 100). Seul point a11y restant : Instagram/Mail empilés à 14 px (cibles tactiles < 24 px), choix de maquette.
- Démarrage 3D découpé en petites tâches (`yieldToMain`, `compileAsync`) ; rien de lourd calculé dans le navigateur.
- Le texte s'affiche avant la 3D, et la 3D apparaît en fondu une fois chargée.
- Pixel ratio plafonné à 2. Mets la boucle de rendu en pause quand l'onglet est masqué.
- Avec `prefers-reduced-motion`, la bague tourne lentement et la pluie et la traînée sont désactivées.
- Teste dans Chrome, Safari et sur un vrai mobile.

## Plan par étapes (une étape = une validation)

0. **Setup.** Déplace `img/` vers `assets-src/` et renomme les fichiers. Initialise le projet Vite + TS, crée `.gitignore` (`node_modules`, `dist`) et `.mcp.json`. Commit, push, puis guide-moi pas à pas pour importer le repo dans Vercel.
1. **Layout statique.** Les tokens viennent de Figma, avec le header, la bio, l'horloge en direct et le bouton music player, en desktop et en mobile. Le rendu doit coller à la maquette.
2. **Bague.** Chargement, centrage, matériau, mouvement Euler et déplacement lent.
3. **Traînée de frames.**
4. **Pluie Instagram** (avec un placeholder tant que le GLB manque).
5. **Curseur 3D** (avec un placeholder tant que les GLB ne sont pas ré-exportés).
6. **Passe perfs et mobile**, puis déploiement de preview.
7. **Pages projets** : LONGTEMPS (1, précase), FORMULA ONE (2), TAKE CARE (3), VIDEOTAPE (4), MAGAZINES (5, 3D), MUSIC & CULTURE (6), SOCIAL MEDIA (7). Ensuite : projet 8 éventuel, action du bouton « + ».

## Trous à remplir par le DA

Tous remplis (croquis, lien Instagram, mail, GLB Instagram, rose, curseur par défaut).

- Question ouverte : avec WOW! par défaut et CLICK! au survol, l'icône curseur du header fait-elle toujours défiler les 6 curseurs ? (Implémenté : oui, elle change le curseur « de repos », CLICK! reste celui du survol.)
