// Génère les versions optimisées de assets-src/ dans public/.
// Les originaux ne sont jamais modifiés. Lancer avec : npm run assets

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
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

async function optimizeModels() {
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  for (const [from, to] of MODELS) {
    const doc = await io.read(src(from));
    await doc.transform(dedup(), prune(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
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
