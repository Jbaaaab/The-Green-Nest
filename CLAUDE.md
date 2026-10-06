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
- Landing desktop (1440×1024) : https://www.figma.com/design/nCrXLpigcjAbPhawgdT8kV/WEBSITE-2027?node-id=2-3
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

- **À gauche** : le symbole du logo (`LOGO SYMB.svg`, vert `#41f373`) suivi de "DESIGNER WITH A MONSTERA".
- **Au centre** : les liens Works et About, qui ne mènent nulle part pour l'instant (`#`).
- **L'icône curseur** : elle change le curseur (voir la section Curseur).
- **À droite** : Instagram → https://www.instagram.com/designer_with_a_monstera/, et Mail → `mailto:hello@designer-with-a-monstera.art`.

### Bio

- Le texte vient de Figma, avec ses trous volontaires entre les mots. **Les trous sont voulus, reproduis-les fidèlement.**
- C'est du vrai texte DOM, pour le SEO et l'accessibilité.

### Bague (élément central)

- `bague.glb` sur un canvas Three.js plein écran, posé au-dessus de la bio, avec `pointer-events: none`.
- **Mouvement de disque d'Euler en boucle infinie.** La bague est inclinée presque à plat (entre 70 et 80° par rapport à la verticale, à régler), et c'est l'axe d'inclinaison qui tourne autour de l'axe vertical : c'est une précession, pas une rotation 360° sur elle-même. Elle ne tombe jamais. La vitesse est constante, avec un léger "souffle" sur l'angle.
- **En plus, la bague se déplace lentement** autour du centre (par exemple en courbe de Lissajous douce) pour révéler la bio petit à petit. Ce déplacement doit être lent et lisible. Si la lisibilité ne marche pas, on changera d'approche.
- Tous les réglages vont dans `config.ts` : inclinaison, vitesse de précession, amplitude et vitesse du déplacement.

### Traînée de frames (desktop uniquement)

- Des vignettes de projets apparaissent le long du trajet de la bague, comme une traînée (voir le croquis).
- Chaque frame vit environ 1 seconde. La plus récente est la plus grande et la plus opaque ; en vieillissant, elle rétrécit et disparaît en fondu.
- Taille d'environ 90 à 120 px dans la maquette, cadence d'apparition à régler (vers 150-250 ms).
- Les images viennent de `work/music-culture`, en boucle.
- Placement : une option `snapToGrid` dans `config.ts`, pour s'aligner ou non sur la grille Figma (8 colonnes). On testera les deux.
- C'est fait en DOM au-dessus du canvas, avec des `transform` et de l'`opacity` uniquement, pour les perfs.

### Pluie Instagram

- **Desktop** : le survol du lien Instagram fait tomber plein de logos Insta 3D rose flash (celle du GLB : `#FF039F`). Ils tombent du haut, rebondissent, s'empilent en bas, puis disparaissent après quelques secondes.
  - Rendu en `InstancedMesh`, plafonné à environ 60 instances.
  - Le **clic** ouvre Instagram dans un nouvel onglet.
- **Mobile** : le tap ouvre directement Instagram, sans pluie.

### Curseur 3D (desktop uniquement)

- Le curseur natif est caché, et un texte 3D (les GLB de `cursors/`) suit la souris en tournant en boucle sur lui-même.
- Le clic sur l'icône curseur du header passe au curseur suivant. L'ordre : click → great → iluvyou → iwannahire → super → wow, puis on reboucle.
- Curseur par défaut au chargement : **WOW!**. Au survol d'un élément cliquable (liens, boutons) : **CLICK!**.
- Rendu dans un petit canvas dédié, ou dans le canvas principal en overlay. Choisis l'option la plus légère et explique pourquoi.
- Le suivi de la souris est lissé avec un léger lerp.
- Tout est désactivé sur les écrans tactiles (`pointer: coarse`).

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

- Lighthouse mobile : viser 85 ou plus en performance.
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

## Trous à remplir par le DA

Tous remplis (croquis, lien Instagram, mail, GLB Instagram, rose, curseur par défaut).

- Question ouverte : avec WOW! par défaut et CLICK! au survol, l'icône curseur du header fait-elle toujours défiler les 6 curseurs ? (Pour l'instant : oui, elle change le curseur « de repos », CLICK! reste celui du survol.)
