// Génère les versions optimisées de assets-src/ dans public/.
// Les originaux ne sont jamais modifiés. Lancer avec : npm run assets

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, unweld, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = (p) => path.join(root, 'assets-src', p);
const out = (p) => path.join(root, 'public', p);

// [source, destination, options]. simplify : part de sommets gardés (version allégée, pour les modèles affichés en masse).
const MODELS = [
  ['models/bague.glb', 'models/bague.glb'],
  ['models/daruma.glb', 'models/daruma-lite.glb', { simplify: 0.3 }], // montagne de daruma du footer (des centaines, petits)
  ['models/instagram.glb', 'models/instagram.glb'],
  ...['click', 'great', 'iluvyou', 'iwannahire', 'super', 'wow'].map((n) => [
    `cursors/glb/${n}.glb`,
    `cursors/${n}.glb`,
  ]),
  // Chiffres entourés de la rangée des projets (le numéro courant tourne en 3D).
  ...['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => [`digit/${n}.glb`, `digits/${n}.glb`]),
];

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`;

// Au-delà de cet angle entre deux faces voisines, l'arête reste vive ; en dessous, elle est lissée.
const CREASE_DEG = 35;

/**
 * Recalcule des normales propres (équivalent Blender : Weighted Normal + Auto Smooth).
 *
 * Pourquoi : les GLB issus de SVG extrudés sont exportés en Shade Smooth partout. Les grandes faces
 * plates, découpées en longs triangles, héritent des normales penchées des bords, et le métal poli
 * montre des stries en diagonale. Ici :
 * - deux faces ne partagent leur normale que si leur angle est < CREASE_DEG (arêtes vives conservées) ;
 * - les normales sont pondérées par l'aire des faces : les grandes faces plates restent parfaitement plates.
 * À appliquer sur une géométrie non indexée (unweld) ; weld() refusionne ensuite les sommets identiques.
 */
function creasedNormals(creaseDeg) {
  const cosCrease = Math.cos((creaseDeg * Math.PI) / 180);
  return (doc) => {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const count = pos.getCount();
        const p = new Float32Array(count * 3);
        const tmp = [];
        for (let i = 0; i < count; i++) p.set(pos.getElement(i, tmp), i * 3);

        // Normale et aire de chaque face.
        const faces = count / 3;
        const fn = new Float32Array(faces * 3);
        const fa = new Float32Array(faces);
        for (let f = 0; f < faces; f++) {
          const o = f * 9;
          const ux = p[o + 3] - p[o], uy = p[o + 4] - p[o + 1], uz = p[o + 5] - p[o + 2];
          const vx = p[o + 6] - p[o], vy = p[o + 7] - p[o + 1], vz = p[o + 8] - p[o + 2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const len = Math.hypot(nx, ny, nz);
          fa[f] = len / 2;
          fn.set(len ? [nx / len, ny / len, nz / len] : [0, 0, 1], f * 3);
        }

        // Coins regroupés par position (tolérance relative à la taille de l'objet).
        const min = pos.getMin([]);
        const max = pos.getMax([]);
        const eps = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 1e-5 || 1e-9;
        const key = (i) => `${Math.round(p[i * 3] / eps)},${Math.round(p[i * 3 + 1] / eps)},${Math.round(p[i * 3 + 2] / eps)}`;
        const keys = new Array(count);
        const byPos = new Map();
        for (let i = 0; i < count; i++) {
          const k = (keys[i] = key(i));
          if (!byPos.has(k)) byPos.set(k, []);
          byPos.get(k).push((i / 3) | 0);
        }

        // Normale de chaque coin : somme pondérée par l'aire des faces voisines « assez parallèles ».
        const n = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const f = (i / 3) | 0;
          let x = 0, y = 0, z = 0;
          for (const g of byPos.get(keys[i])) {
            const dot = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2];
            if (dot < cosCrease) continue;
            x += fn[g * 3] * fa[g];
            y += fn[g * 3 + 1] * fa[g];
            z += fn[g * 3 + 2] * fa[g];
          }
          const len = Math.hypot(x, y, z);
          n.set(len ? [x / len, y / len, z / len] : fn.subarray(f * 3, f * 3 + 3), i * 3);
        }

        const normal = doc.createAccessor().setType('VEC3').setArray(n).setBuffer(pos.getBuffer());
        prim.setAttribute('NORMAL', normal);
      }
    }
  };
}

async function optimizeModels() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  for (const [from, to, options = {}] of MODELS) {
    const doc = await io.read(src(from));
    if (options.simplify) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: options.simplify, error: 0.01 }));
    await doc.transform(
      dedup(),
      prune(),
      unweld(),
      creasedNormals(CREASE_DEG),
      weld(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    await mkdir(path.dirname(out(to)), { recursive: true });
    await io.write(out(to), doc);
    const [a, b] = await Promise.all([stat(src(from)), stat(out(to))]);
    const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices() ?? p.getAttribute('POSITION')).getCount() / 3, 0);
    console.log(`${to.padEnd(28)} ${kb(a.size).padStart(7)} → ${kb(b.size).padStart(7)}, ${Math.round(tris)} triangles`);
  }
}

// Vignettes des projets pour les apparitions de la landing : 240 px de large (2x pour ~120 px affichés), WebP.
// Un manifeste (fichiers + ratio) est écrit à côté, lu par src/ui/workTrail.ts.
const THUMBS = {
  from: 'work/music-culture',
  to: 'work/thumbs',
  width: 240,
  // Doublons à ne pas afficher deux fois (même fichier que halsey.jpg).
  skip: ['v1-low.jpg'],
};

async function optimizeThumbs() {
  const files = (await readdir(src(THUMBS.from)))
    .filter((f) => /\.(png|jpe?g)$/i.test(f) && !THUMBS.skip.includes(f))
    .sort();
  await mkdir(out(THUMBS.to), { recursive: true });

  const manifest = [];
  let before = 0;
  let after = 0;
  for (const f of files) {
    const name = f.replace(/\.[^.]+$/, '.webp');
    const input = src(`${THUMBS.from}/${f}`);
    const output = out(`${THUMBS.to}/${name}`);
    const info = await sharp(input).resize({ width: THUMBS.width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(output);
    manifest.push({ src: `/${THUMBS.to}/${name}`, ratio: +(info.width / info.height).toFixed(4) });
    before += (await stat(input)).size;
    after += info.size;
  }
  await writeFile(out(`${THUMBS.to}/manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${files.length} vignettes ${THUMBS.from}`.padEnd(28), `${kb(before).padStart(7)} → ${kb(after).padStart(7)}`);
}

// Versions web de toutes les images sources lourdes (originaux jusqu'à 50 Mo) : WebP qualité 82,
// 2000 px max sur le grand côté (1080 pour les posts Instagram, leur taille d'origine). Pas de perte
// visible en plein écran. Mêmes noms et sous-dossiers que les sources, dans public/.
const GALLERIES = [
  { from: 'work/music-culture', to: 'work/music-culture', max: 2000 },
  { from: 'work/magazine', to: 'work/magazine', max: 2000 },
  { from: 'work/social-media', to: 'work/social-media', max: 1080 },
];

async function optimizeGalleries() {
  for (const g of GALLERIES) {
    const files = (await readdir(src(g.from), { recursive: true })).filter((f) => /\.(png|jpe?g|jfif|webp)$/i.test(f)).sort();
    let before = 0;
    let after = 0;
    for (const f of files) {
      const input = src(path.join(g.from, f));
      const output = out(path.join(g.to, f.replace(/\.[^.]+$/, '.webp')));
      await mkdir(path.dirname(output), { recursive: true });
      if (!(await newer(output, input))) {
        await sharp(input).resize({ width: g.max, height: g.max, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(output);
      }
      before += (await stat(input)).size;
      after += (await stat(output)).size;
    }
    console.log(`${g.to}`.padEnd(28), `${files.length} images, ${kb(before).padStart(9)} → ${kb(after).padStart(8)}`);
  }
}

// Médias des pages projets. Vidéos en MP4 H.264 sans son (lecture auto, muette), image d'attente WebP.
// Nécessite ffmpeg dans le PATH. Écrit src/works/media.generated.json, importé par src/works/projects.ts.
const PROJECTS = {
  takeCare: {
    from: 'work/take-care-beauty',
    to: 'work/take-care',
    main: 'case-take-care.mov', // grand rectangle central
    mainWidth: 720, // ~2x les 371 px affichés
    sideWidth: 480, // ~2x les 237 px affichés
    // Les 14 carrés autour, dans l'ordre de lecture de la maquette (ligne par ligne).
    side: [
      'airdrop.png', '02.mp4', '05-1.png', 'tickets-v2.mp4', 'mess.png',
      'kuromi.mp4', '3-1-1.png', 'take-care-saint-valentin-v2.mp4', 'dsc3276-1.png',
      'stop-mo-trousse.mp4', 'kuromi-1.png', 'whatsinmybag.mp4', 'take-care-de-paques.mp4', 'corporate-guuuurl-v2.mp4',
    ],
  },
  formulaOne: {
    from: 'work/formula one/anims',
    to: 'work/formula-one',
    main: 'CASE F1.mov', // le case, dans le grand cadre (1320 px affichés)
    mainWidth: 1600,
    mainCrf: 27, // 18 s en 1600 px : un poil plus compressé pour rester léger
    side: [],
  },
};

// Diaporamas (en attendant les vidéos) : toutes les images d'un dossier, dans l'ordre alphabétique,
// en WebP 1600 px (cadre de 1320 px). Ajoutés à media.generated.json sous { slides: [...] }.
const SLIDES = {
  longtemps: { from: 'work/longtemps', to: 'work/longtemps', width: 1600 },
  // Cartes du footer (315 px affichées) : 1xp, 2chaewon, 3duo, 4windows (la 1 est devant).
  footer: { from: 'footer-photos', to: 'footer', width: 640 },
};

// Page Social Media : mosaïque de petits carrés (122,5×116,5 px, 1/4 des carrés de Take Care) triés par
// couleur, et une grande vidéo au centre. Carrés en WebP 2x recadrés, vidéos en MP4 muet.
const SOCIAL = {
  from: 'work/social-media',
  to: 'work/social-media/tiles',
  tile: [246, 234],
  main: 'snapinsta-to-aqmvyfng8zqq41', // début du nom de la vidéo du grand rectangle central (720×960, 13 s)
  mainWidth: 720,
  rows: 6, // rangées de la mosaïque : l'ordre des couleurs se lit colonne par colonne, de gauche à droite
  neutral: 0.13, // en dessous de cette saturation moyenne, une image est rangée avec les neutres
};

const run = promisify(execFile);
const isVideo = (f) => /\.(mp4|mov|webm)$/i.test(f);
const base = (f) => f.replace(/\.[^.]+$/, '');
const slug = (f) => base(f).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function newer(output, input) {
  try {
    return (await stat(output)).mtimeMs >= (await stat(input)).mtimeMs;
  } catch {
    return false;
  }
}

async function encodeVideo(input, output, width, crf) {
  if (await newer(output, input)) return;
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', input, '-an',
    '-vf', `scale=${width}:-2:flags=lanczos,fps=30`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    output,
  ]);
}

async function videoStill(input, output, width) {
  if (await newer(output, input)) return;
  const tmp = output.replace(/\.webp$/, '.tmp.png');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.8', '-i', input, '-frames:v', '1', '-vf', `scale=${width}:-2`, tmp]);
  await sharp(tmp).webp({ quality: 80 }).toFile(output);
  await rm(tmp);
}

async function imageStill(input, output, width) {
  if (await newer(output, input)) return;
  await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
}

// Couleur perçue d'une image : teinte moyenne pondérée par la saturation (un fond blanc ou noir ne
// compte presque pas), saturation moyenne, clarté moyenne et couleur moyenne (fond du carré au chargement).
async function colorOf(input) {
  const { data } = await sharp(input).resize(48, 48, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = data.length / 3;
  let x = 0, y = 0, sat = 0, light = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 3) {
    const R = data[i] / 255, G = data[i + 1] / 255, B = data[i + 2] / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B), c = max - min;
    light += (max + min) / 2;
    r += R; g += G; b += B;
    sat += c * c;
    if (c < 1e-3) continue;
    const h = max === R ? (G - B) / c : max === G ? (B - R) / c + 2 : (R - G) / c + 4; // sixièmes de tour
    x += Math.cos((h * Math.PI) / 3) * c * c;
    y += Math.sin((h * Math.PI) / 3) * c * c;
  }
  const hex = [r, g, b].map((v) => Math.round((v / n) * 255).toString(16).padStart(2, '0')).join('');
  return { hue: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, saturation: Math.sqrt(sat / n), light: light / n, color: `#${hex}` };
}

async function optimizeSocial() {
  const p = SOCIAL;
  await mkdir(out(p.to), { recursive: true });
  const url = (f) => `/${p.to}/${f}`;
  const files = (await readdir(src(p.from))).sort();
  const mainFile = files.find((f) => f.startsWith(p.main));

  // Grande vidéo centrale.
  const mainIn = src(`${p.from}/${mainFile}`);
  await encodeVideo(mainIn, out(`${p.to}/main.mp4`), p.mainWidth, 26);
  await videoStill(mainIn, out(`${p.to}/main.webp`), p.mainWidth);

  // Carrés : images recadrées au format du carré, vidéos réduites (sans les doublons exacts).
  const seen = new Set();
  const tiles = [];
  for (const f of files) {
    if (f === mainFile || !/\.(png|jpe?g|jfif|webp|mp4|mov)$/i.test(f)) continue;
    const input = src(`${p.from}/${f}`);
    const sum = createHash('sha1').update(await readFile(input)).digest('hex');
    if (seen.has(sum)) continue;
    seen.add(sum);
    const name = base(f).slice(0, 48); // les noms Instagram sont interminables
    const image = `${name}.webp`;
    let still = input;
    const tile = {};
    if (isVideo(f)) {
      await encodeVideo(input, out(`${p.to}/${name}.mp4`), 300, 28);
      await videoStill(input, out(`${p.to}/${image}`), p.tile[0]);
      tile.video = url(`${name}.mp4`);
      still = out(`${p.to}/${image}`);
    } else if (!(await newer(out(`${p.to}/${image}`), input))) {
      await sharp(input).resize(p.tile[0], p.tile[1], { fit: 'cover' }).webp({ quality: 78 }).toFile(out(`${p.to}/${image}`));
    }
    tiles.push({ image: url(image), ...tile, ...(await colorOf(still)) });
  }

  // Tri par couleur : les couleurs dans l'ordre de l'arc-en-ciel (du rouge au rose), puis les neutres du
  // plus sombre au plus clair (la mosaïque finit sur du blanc, comme la page). Dans chaque colonne,
  // du plus clair en haut au plus sombre en bas.
  const colored = tiles.filter((t) => t.saturation >= p.neutral).sort((a, b) => ((a.hue + 20) % 360) - ((b.hue + 20) % 360));
  const neutral = tiles.filter((t) => t.saturation < p.neutral).sort((a, b) => a.light - b.light);
  const sorted = [...colored, ...neutral];
  const ordered = [];
  for (let i = 0; i < sorted.length; i += p.rows) ordered.push(...sorted.slice(i, i + p.rows).sort((a, b) => b.light - a.light));

  let total = 0;
  for (const f of await readdir(out(p.to))) total += (await stat(out(`${p.to}/${f}`))).size;
  console.log(`${p.to}`.padEnd(28), `${tiles.length} carrés (${colored.length} en couleur, ${neutral.length} neutres), ${kb(total)}`);
  return {
    main: { video: url('main.mp4'), poster: url('main.webp') },
    tiles: ordered.map(({ image, video, color }) => (video ? { image, video, color } : { image, color })),
  };
}

async function optimizeProjects() {
  try {
    await run('ffmpeg', ['-version']);
  } catch {
    console.warn('ffmpeg introuvable : médias projets ignorés (installe ffmpeg puis relance npm run assets).');
    return;
  }

  const media = {};
  for (const [key, p] of Object.entries(PROJECTS)) {
    await mkdir(out(p.to), { recursive: true });
    const url = (f) => `/${p.to}/${f}`;

    const mainIn = src(`${p.from}/${p.main}`);
    const mainName = slug(p.main);
    await encodeVideo(mainIn, out(`${p.to}/${mainName}.mp4`), p.mainWidth, p.mainCrf ?? 26);
    await videoStill(mainIn, out(`${p.to}/${mainName}.webp`), p.mainWidth);

    const side = [];
    for (const f of p.side) {
      const input = src(`${p.from}/${f}`);
      const still = `${base(f)}.webp`;
      if (isVideo(f)) {
        await encodeVideo(input, out(`${p.to}/${base(f)}.mp4`), p.sideWidth, 28);
        await videoStill(input, out(`${p.to}/${still}`), p.sideWidth);
        side.push({ image: url(still), video: url(`${base(f)}.mp4`) });
      } else {
        await imageStill(input, out(`${p.to}/${still}`), p.sideWidth);
        side.push({ image: url(still) });
      }
    }

    media[key] = { main: { video: url(`${mainName}.mp4`), poster: url(`${mainName}.webp`) }, side };
    const files = await readdir(out(p.to));
    let total = 0;
    for (const f of files) total += (await stat(out(`${p.to}/${f}`))).size;
    console.log(`${p.to}`.padEnd(28), `${files.length} fichiers, ${kb(total)}`);
  }

  for (const [key, s] of Object.entries(SLIDES)) {
    await mkdir(out(s.to), { recursive: true });
    const files = (await readdir(src(s.from))).filter((f) => /\.(png|jpe?g|jfif|webp)$/i.test(f)).sort();
    const slides = [];
    let total = 0;
    for (const f of files) {
      const name = `${f.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.webp`;
      await imageStill(src(`${s.from}/${f}`), out(`${s.to}/${name}`), s.width);
      slides.push(`/${s.to}/${name}`);
      total += (await stat(out(`${s.to}/${name}`))).size;
    }
    media[key] = { slides };
    console.log(`${s.to}`.padEnd(28), `${slides.length} images, ${kb(total)}`);
  }

  media.socialMedia = await optimizeSocial();

  await writeFile(path.join(root, 'src/works/media.generated.json'), JSON.stringify(media, null, 2) + '\n');
}

// Music player : AAC 128 kbit/s (lu partout, Safari compris), volume harmonisé (-16 LUFS).
// Écrit src/ui/tracks.generated.json, lu par src/ui/musicPlayer.ts.
const MUSIC = {
  from: 'music',
  to: 'music',
  intro: { file: 'chaewon-lock-in.mp3' }, // petite phrase jouée une fois, au tout premier clic
  tracks: [
    { file: 'childish-gambino-redbone.mp3', title: 'Redbone', artist: 'Childish Gambino' },
    { file: 'aespa-supernova.mp3', title: 'Supernova', artist: 'aespa' },
    { file: 'laylow-megatron.mp3', title: 'MEGATRON', artist: 'Laylow' },
    { file: 'mf-doom-doomsday.mp3', title: 'Doomsday', artist: 'MF DOOM' },
    { file: 'cortis-redred.mp3', title: 'REDRED', artist: 'CORTIS' },
  ],
};

async function encodeAudio(input, output) {
  if (await newer(output, input)) return;
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', input, '-vn',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
    output,
  ]);
}

async function optimizeMusic() {
  try {
    await run('ffmpeg', ['-version']);
  } catch {
    console.warn('ffmpeg introuvable : musique ignorée.');
    return;
  }
  await mkdir(out(MUSIC.to), { recursive: true });
  const url = (f) => `/${MUSIC.to}/${base(f)}.m4a`;
  const encode = (f) => encodeAudio(src(`${MUSIC.from}/${f}`), out(`${MUSIC.to}/${base(f)}.m4a`));

  await encode(MUSIC.intro.file);
  for (const t of MUSIC.tracks) await encode(t.file);

  const manifest = {
    intro: url(MUSIC.intro.file),
    tracks: MUSIC.tracks.map((t) => ({ src: url(t.file), title: t.title, artist: t.artist })),
  };
  await writeFile(path.join(root, 'src/ui/tracks.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
  let total = 0;
  for (const f of await readdir(out(MUSIC.to))) total += (await stat(out(`${MUSIC.to}/${f}`))).size;
  console.log(`${MUSIC.to}`.padEnd(28), `${MUSIC.tracks.length + 1} fichiers, ${kb(total)}`);
}

const only = process.argv[2];
if (!only || only === 'models') await optimizeModels();
if (!only || only === 'thumbs') await optimizeThumbs();
if (!only || only === 'galleries') await optimizeGalleries();
if (!only || only === 'projects') await optimizeProjects();
if (!only || only === 'music') await optimizeMusic();
