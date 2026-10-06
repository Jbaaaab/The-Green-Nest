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
  - **Tailles fixes en px** (texte, bio, bague), quelle que soit la largeur d'écran. Positions horizontales en % de la largeur + décalage (contraintes Figma : Works à 25 % + 35 px, About à 37,5 % + 23 px, Instagram/Mail et dock calés sur 87,5 %). Ne pas tout mettre à l'échelle de la largeur : c'était faux.
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

- **À gauche** : le symbole du logo (noir dans Figma, `src/assets/icons/logo.svg`) suivi de "DESIGNER WITH A MONSTERA". Sous ~1080 px de large (hors maquette), "DWAM" pour ne pas toucher "Works".
- **Au centre** : les liens Works et About, qui ne mènent nulle part pour l'instant (`#`).
- **L'icône curseur** : elle change le curseur (voir la section Curseur).
- **À droite** : Instagram → https://www.instagram.com/designer_with_a_monstera/, et Mail → `mailto:hello@designer-with-a-monstera.art`.

### Bio

- Le texte vient de Figma, avec ses trous volontaires entre les mots. **Les trous sont voulus, reproduis-les fidèlement.**
- C'est du vrai texte DOM, pour le SEO et l'accessibilité.

### Bague (élément central)

- `bague.glb` sur un canvas Three.js plein écran, posé au-dessus de la bio, avec `pointer-events: none`.
- **Physique réaliste de pièce qui roule** (l'écran = la table, vue de dessus), en boucle infinie. La bague est inclinée presque à plat (70-80° par rapport à la verticale), l'axe d'inclinaison tourne (précession, disque d'Euler), et elle ne tombe jamais.
- **Trajectoire imprévisible mais physique** : en roulant, le centre avance perpendiculairement au point de contact (le bord le plus bas), sur une courbe dont le rayon change au hasard (bruit lisse) → des boucles de tailles variées dont le centre se balade. Une « table légèrement creuse » la ramène vers le centre de l'écran. Les grandes boucles tournent moins vite (~1/√rayon), comme une vraie pièce. **Pas de balade façon logo DVD** (Lissajous : rejeté) **ni de cercles trop réguliers** (rejeté aussi).
- Rotation propre par roulement sans glissement, bien visible. Précession rapide, qui accélère quand la bague s'aplatit (comme un vrai disque d'Euler). Inclinaison qui varie au hasard.
- **Rendu métal poli très lisse, sans stries** : normales recalculées au build (`npm run assets`, équivalent Weighted Normal + Auto Smooth à 35°), matériau matcap d'un studio photo calculé en JS (`src/scene/environment.ts`, réglages `config.studio`). Pas de PMREM : sa compilation bloquait le mobile > 1 s.
- Tous les réglages vont dans `config.ts` : inclinaison, souffle, vitesse de précession, trajectoire (`ring.orbit`), studio.

### Apparitions de projets (desktop uniquement)

- **Pas une traînée** : des vignettes de projets apparaissent **au hasard, en fond** (derrière la bio et la bague), chacune pendant environ 2 secondes, en rétrécissant puis en disparaissant.
- Taille d'environ 90 à 120 px de large, cadence aléatoire (280-640 ms).
- Les images viennent de `work/music-culture` (vignettes WebP 240 px générées par `npm run assets`), tirées sans remise.
- Placement : une option `snapToGrid` dans `config.ts`, pour s'aligner ou non sur la grille (8 colonnes). Valeurs de grille mesurées sur le croquis, à confirmer.
- C'est fait en DOM, avec des `transform` et de l'`opacity` uniquement, pour les perfs.

### Pluie Instagram

- **Desktop** : le survol du lien Instagram fait tomber plein de logos Insta 3D rose flash (celle du GLB : `#FF039F`). Ils tombent du haut, rebondissent, s'empilent en bas, puis disparaissent après quelques secondes.
  - Rendu en `InstancedMesh`, plafonné à environ 60 instances.
  - Le **clic** ouvre Instagram dans un nouvel onglet.
- **Mobile** : le tap ouvre directement Instagram, sans pluie.

### Curseur 3D (desktop uniquement)

- Le curseur natif est caché, et un texte 3D (les GLB de `cursors/`) suit la souris en tournant en boucle sur lui-même.
- Le clic sur l'icône curseur du header passe au curseur suivant. L'ordre : click → great → iluvyou → iwannahire → super → wow, puis on reboucle.
- Curseur par défaut au chargement : **WOW!**. Au survol d'un élément cliquable (liens, boutons) : **CLICK!**.
- **Rendu dans le canvas principal, couche overlay** (dessinée après effacement de la profondeur, donc toujours devant) : pas de second contexte WebGL, et la boucle de rendu tourne déjà pour la bague. Le canvas est donc au premier plan (`z-index` 5, `pointer-events: none`) : la pluie passe aussi par-dessus le header.
- Juste après un clic sur l'icône du header, le nouveau curseur s'affiche même si la souris est encore dessus (CLICK! reprend au survol suivant).
- Le suivi de la souris est lissé avec un léger lerp.
- Tout est désactivé sur les écrans tactiles (`pointer: coarse`).

### Pages projets (Works)

- Maquettes : LONGTEMPS `16:5`, FORMULA ONE `25:448`, TAKE CARE `25:560` (frames 1440×1024). **Carré rouge sur la maquette = asset à mettre.**
- **On y accède en scrollant depuis l'accueil** (scroll virtuel `src/nav.ts` : molette/trackpad, tactile, clavier ; la page suit le geste puis se cale). Ancre d'URL par projet (`#longtemps`, `#formula-one`, `#take-care`). Le logo et le symbole en fin de rangée ramènent à l'accueil, « Works » ouvre le projet 1.
- **Comportement inspiré de symbolsofwealth.studio** : les fenêtres arrivent par le côté en volant sur un grand cylindre invisible, l'une après l'autre (décalage + hasard), mais **on ne voit qu'une page (une vidéo) à la fois** : le cercle ne se voit pas. L'accueil (bio + bague) repart de la même façon. Réglages : `config.works`.
- Rangée 1-8 + symbole en haut ; **le numéro courant est le chiffre entouré en 3D** (GLB `digit/n`), qui fait un tour sur lui-même quand sa page arrive.
- Bouton vert « PROJET + » en bas à gauche : UI seulement pour l'instant (action du « + » à définir).
- LONGTEMPS et FORMULA ONE : un grand cadre vidéo — **placeholders gris** en attendant les vidéos. Les assets F1 sont dans `assets-src/work/formula one/` (pas encore renommés ni utilisés).
- TAKE CARE : vidéo `case-take-care` au centre, 14 carrés d'assets autour (`PROJECTS.takeCare` dans `scripts/optimize-assets.mjs`). **Une vidéo à la fois** : survoler un carré vidéo le lance et met la centrale en pause.
- Contenu (textes avec trous, médias) : `src/works/projects.ts`. Médias générés par `npm run assets` (ffmpeg requis) → `public/work/take-care/`, `src/works/media.generated.json`.
- Mobile (hors maquette) : même structure ; TAKE CARE n'affiche que la vidéo centrale.
- Perf : pages construites quand le navigateur est inactif, pages lointaines retirées du rendu, médias chargés à l'approche.

### Horloge

- En bas à droite sur desktop, en bas à gauche sur mobile : "Paris HH:MM" et "Seoul HH:MM", en temps réel.
- Utilise `Intl.DateTimeFormat` avec les fuseaux `Europe/Paris` et `Asia/Seoul`.
- Les icônes (marcheur, cœur) viennent de Figma.

### Music player

- Le bouton vert "Music player" est en UI seulement pour l'instant : pas d'audio.
- Prépare le module `musicPlayer.ts` : plus tard, chaque clic jouera un morceau.

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
