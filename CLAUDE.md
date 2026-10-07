# CLAUDE.md — The Green Nest (site DWAM v2)

Ce fichier est lu automatiquement par Claude Code à chaque session. Il contient le contexte, les règles et le plan du projet.

## Contexte

- Site portfolio de **Designer With A Monstera (DWAM)**, directeur artistique et designer basé à Paris.
- Objectif : un site niveau Awwwards, plus adulte, avec moins de texte, plus de démo et plus de 3D. C'est un site à garder longtemps et avec lequel prospecter.
- Le DA a fait la maquette et produit tous les assets lui-même. **La maquette Figma fait foi** : en cas de doute, demande-lui plutôt que d'interpréter.
- Il a oublié Git et Vercel. **À chaque commande git, explique en une phrase simple, en français, ce qu'elle fait.**
- Langue de travail : français, ton direct.

## Règles absolues

1. **L'ancien site (designer-with-a-monstera.art) reste intact.** Il vit ailleurs : ne touche à aucun DNS, aucun domaine, aucun autre repo.
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

## Stack

- **Vite + TypeScript, en vanilla** (pas de framework UI pour l'instant). Prévois la structure pour des pages Works et About plus tard.
- **Three.js** pour la bague, la pluie Instagram et les curseurs 3D.
- **GSAP** pour les animations DOM, avec `prefers-reduced-motion` respecté.
- **Physique de la pluie Insta** : `@dimforge/rapier3d-compat`, chargé à la demande au premier déclenchement seulement, jamais au chargement de la page.
- **Optimisation des modèles** : `@gltf-transform/cli`, compression meshopt ou draco, sur les fichiers copiés depuis `assets-src` vers `public`.
- **Optimisation des images** : conversion en WebP/AVIF (avec `sharp`), redimensionnées pour leur taille d'affichage réelle.
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
- **`daruma.glb`** : ré-exporté, 185 Ko pour 3,5k triangles. Il n'est pas utilisé sur la landing, n'y touche pas pour l'instant.
- **Logo Instagram 3D** : `assets-src/models/instagram.glb` (5k triangles, rose `#FF039F`, roughness 0,34). Échelle minuscule et origine décentrée sur X : recentrer et normaliser dans le code.
- **Posters de `music & culture`** : jusqu'à 7,8 Mo et 3508×4961 px. Dans la traînée, ils s'affichent autour de 120 px, donc génère des versions de 240 px de large (pour le 2x) en WebP.

## Spec de la landing

### Header (desktop)

- **À gauche** : le symbole du logo (noir dans Figma, `src/assets/icons/logo.svg`) suivi de "DESIGNER WITH A MONSTERA". "DWAM" sur mobile seulement (sur desktop tout est proportionnel : le nom complet ne touche jamais "Works").
- **Au centre** : les liens Works et About, qui ne mènent nulle part pour l'instant (`#`).
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
- Rotation propre par roulement sans glissement, bien visible. Précession rapide (0,8 s par tour), qui accélère quand la bague s'aplatit (comme un vrai disque d'Euler). Inclinaison qui varie au hasard (±6°, toutes les ~2 s) : **chancelante**. Boucles de 8 à 170 px.
- Position de repos (creux de la table) : 33 px sous le centre de l'écran, comme sur la maquette (la bio passe dans son tiers haut). `config.ring.center`.
- **Rendu calqué sur le rendu Blender de la maquette** (Figma « bague 1 »), **lisse et métallique** : faces émeraude `#086E48`, liseré clair sur les arêtes, flancs olive marbrés de vert-jaune, reflet brillant qui traverse la face quand elle s'incline, éclats qui glissent sur les arêtes. **« Shade smooth »** : grain et aspérités à 0 (ils striaient les flancs). Matcap en couleur calculée en JS (`src/scene/ringMatcap.ts`, couleurs relevées sur l'image dans `config.ring.look`). Normales recalculées au build (`npm run assets`, équivalent Weighted Normal + Auto Smooth à 35°) : pas de stries. Pas de PMREM : sa compilation bloquait le mobile > 1 s.
- Tous les réglages vont dans `config.ts` : inclinaison, souffle, vitesse de précession, trajectoire (`ring.orbit`), studio.

### Apparitions de projets (desktop uniquement)

- **Pas une traînée** : des vignettes de projets apparaissent **au hasard, en fond** (derrière la bio et la bague), chacune pendant environ 2 secondes, en rétrécissant puis en disparaissant.
- Taille d'environ 90 à 120 px de large, cadence aléatoire (280-640 ms).
- Les images viennent de `work/music-culture` (vignettes WebP 240 px générées par `npm run assets`), tirées sans remise.
- Placement : une option `snapToGrid` dans `config.ts`, pour s'aligner ou non sur la grille (8 colonnes). Valeurs de grille mesurées sur le croquis, à confirmer.
- C'est fait en DOM, avec des `transform` et de l'`opacity` uniquement, pour les perfs.

### Pluie Instagram

- **Desktop** : le survol du lien Instagram fait tomber plein de logos Insta 3D rose flash (celle du GLB : `#FF039F`). Ils tombent du haut, rebondissent, s'empilent en bas, puis disparaissent après quelques secondes.
  - 70 à 100 px de large. Laque rose éclairée par **le même HDRI que les curseurs** : les sources vert-bleu s'y reflètent en couleur franche (`config.rain.look`).
  - Rendu en `InstancedMesh`, plafonné à environ 60 instances.
  - Le **clic** ouvre Instagram dans un nouvel onglet.
- **Mobile** : le tap ouvre directement Instagram, sans pluie.

### Curseur 3D (desktop uniquement)

- Le curseur natif est caché, et un texte 3D (les GLB de `cursors/`) suit la souris en tournant en boucle sur lui-même. 18 px de haut. **Chrome vert-bleu intense** (ciel bleu nuit, sol vert sombre, horizon aqua, sources émeraude, bleu électrique, cyan) : `config.ambiences.chrome`. Les autres HDRI (néons, PS3, studio) restent au choix dans `config.ambiences`.
- Le clic sur l'icône curseur du header passe au curseur suivant. L'ordre : click → great → iluvyou → iwannahire → super → wow, puis on reboucle.
- Curseur par défaut au chargement : **WOW!**. Au survol d'un élément cliquable (liens, boutons) : **CLICK!**.
- **Rendu dans le canvas principal, couche overlay** (dessinée après effacement de la profondeur, donc toujours devant) : pas de second contexte WebGL, et la boucle de rendu tourne déjà pour la bague. Le canvas est donc au premier plan (`z-index` 5, `pointer-events: none`) : la pluie passe aussi par-dessus le header.
- Juste après un clic sur l'icône du header, le nouveau curseur s'affiche même si la souris est encore dessus (CLICK! reprend au survol suivant).
- Le suivi de la souris est lissé avec un léger lerp.
- Tout est désactivé sur les écrans tactiles (`pointer: coarse`).

### Pages projets (Works)

- Maquettes : LONGTEMPS `16:5`, FORMULA ONE `25:448`, TAKE CARE `25:560` (frames 1440×1024). **Carré rouge sur la maquette = asset à mettre.**
- **Scroll vertical, fluide, façon perappelgren.de** (`src/nav.ts`, scroll virtuel avec inertie type Lenis : molette/trackpad, tactile avec élan, clavier). Accueil puis pages empilées verticalement. **Pas d'aimant** : on scrolle librement. **Arrêt net quand le texte d'un projet arrive au milieu de l'écran** (la page est alors à ses proportions Figma) ; il faut un nouveau geste pour continuer (l'inertie du trackpad ne passe pas l'arrêt). Ancre d'URL par projet (`#longtemps`, `#formula-one`, `#take-care`). Le logo et le symbole en fin de rangée ramènent à l'accueil, « Works » va au projet 1.
- **Twist façon perappelgren.de** (`src/works/scrollFx.ts`) : pendant le scroll, la page se courbe comme un tambour (en haut ça bascule vers l'arrière par le haut, en bas par le bas), d'autant plus que le scroll est rapide ; au repos tout est plat. **Parallaxe** : fenêtres à des vitesses différentes, textes (et bio) plus lents. La bague 3D suit (parallaxe + twist). Réglages : `config.works`.
- Historique des refus du DA : fenêtres éparpillées au hasard sur un cylindre horizontal (« goofy »), puis transitions page par page façon diaporama (« trop diaporama, trop aimanté »).
- **Proportions** (`src/works/projects.ts`) : chaque page est posée dans un cadre centré à l'écran, à l'échelle `--u`. LONGTEMPS et FORMULA ONE : cadre vidéo 1320×749, texte centré dessus (maquette Longtemps 1512×949, vérifiée au pixel). TAKE CARE : la composition de la frame 1440×1024 à l'identique (grille régulière 5×3, carrés 237×233, écarts de 34 et 25 px, grande vidéo 371×547) dans un cadre 1321×749. Rangée 1-8 calée sur le cadre. Bouton « PROJET + » à 60 px du bord gauche et 47 px du bas. Les contraintes 1440×1024 appliquées « telles quelles » à l'écran 1512×949 cassaient la grille (écarts irréguliers, rangées collées) : abandonnées.
- Rangée 1-8 + symbole en haut, **derrière les vidéos** : sur Longtemps, seuls le 1 et le symbole dépassent de part et d'autre du cadre ; sur F1 et Take Care, le numéro courant est caché par la vidéo ou un carré. **Le numéro courant est le chiffre entouré en 3D** (GLB `digit/n`, 19 px), **façon écran de chargement PS3** (rotation continue et régulière, léger flottement), en chrome vert-bleu. Il est dessiné dans le canvas (au premier plan) mais masqué au stencil là où une fenêtre de la page le recouvre (`src/scene/digits.ts`).
- Bouton vert « PROJET + » en bas à gauche : UI seulement pour l'instant (action du « + » à définir).
- LONGTEMPS et FORMULA ONE : un grand cadre vidéo — **placeholders gris** en attendant les vidéos. Les assets F1 sont dans `assets-src/work/formula one/` (pas encore renommés ni utilisés).
- TAKE CARE : vidéo `case-take-care` au centre, **au premier plan, en boucle à vitesse normale** ; 14 carrés d'assets autour (`PROJECTS.takeCare` dans `scripts/optimize-assets.mjs`). Les vidéos des carrés tournent toutes **à ×0,5**, à ×1 sous la souris ; le carré survolé grandit un tout petit peu (×1,04) et passe devant ses voisins. Réglages : `config.works.hover`.
- Contenu (textes avec trous, médias) : `src/works/projects.ts`. Médias générés par `npm run assets` (ffmpeg requis) → `public/work/take-care/`, `src/works/media.generated.json`.
- Mobile (hors maquette) : même structure ; TAKE CARE n'affiche que la vidéo centrale.
- Perf : pages construites quand le navigateur est inactif, pages lointaines retirées du rendu, médias chargés à l'approche.

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
7. **Pages projets** : LONGTEMPS (1), FORMULA ONE (2) avec placeholders vidéo, TAKE CARE (3) avec ses assets. Ensuite : vidéos 1 et 2, projets 4 à 8, action du bouton « + ».

## Trous à remplir par le DA

Tous remplis (croquis, lien Instagram, mail, GLB Instagram, rose, curseur par défaut).

- Question ouverte : avec WOW! par défaut et CLICK! au survol, l'icône curseur du header fait-elle toujours défiler les 6 curseurs ? (Implémenté : oui, elle change le curseur « de repos », CLICK! reste celui du survol.)
