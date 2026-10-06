// Génère les versions optimisées de assets-src/ dans public/.
// Les originaux ne sont jamais modifiés. Lancer avec : npm run assets

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

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

await optimizeModels();
