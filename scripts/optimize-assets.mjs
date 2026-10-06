// Génère les versions optimisées de assets-src/ dans public/.
// Les originaux ne sont jamais modifiés. Lancer avec : npm run assets

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
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

const only = process.argv[2];
if (!only || only === 'models') await optimizeModels();
if (!only || only === 'thumbs') await optimizeThumbs();
