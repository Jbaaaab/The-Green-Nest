// Génère les versions optimisées de assets-src/ dans public/.
// Les originaux ne sont jamais modifiés. Lancer avec : npm run assets

import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, unweld, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = (p) => path.join(root, 'assets-src', p);
const out = (p) => path.join(root, 'public', p);

// [source, destination]. daruma.glb n'est pas utilisé sur la landing.
const MODELS = [
  ['models/bague.glb', 'models/bague.glb'],
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
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  for (const [from, to] of MODELS) {
    const doc = await io.read(src(from));
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
    console.log(`${from.padEnd(28)} ${kb(a.size).padStart(7)} → ${kb(b.size).padStart(7)}`);
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
};

const run = promisify(execFile);
const isVideo = (f) => /\.(mp4|mov|webm)$/i.test(f);
const base = (f) => f.replace(/\.[^.]+$/, '');

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
    await encodeVideo(mainIn, out(`${p.to}/${base(p.main)}.mp4`), p.mainWidth, 26);
    await videoStill(mainIn, out(`${p.to}/${base(p.main)}.webp`), p.mainWidth);

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

    media[key] = { main: { video: url(`${base(p.main)}.mp4`), poster: url(`${base(p.main)}.webp`) }, side };
    const files = await readdir(out(p.to));
    let total = 0;
    for (const f of files) total += (await stat(out(`${p.to}/${f}`))).size;
    console.log(`${p.to}`.padEnd(28), `${files.length} fichiers, ${kb(total)}`);
  }
  await writeFile(path.join(root, 'src/works/media.generated.json'), JSON.stringify(media, null, 2) + '\n');
}

const only = process.argv[2];
if (!only || only === 'models') await optimizeModels();
if (!only || only === 'thumbs') await optimizeThumbs();
if (!only || only === 'projects') await optimizeProjects();
