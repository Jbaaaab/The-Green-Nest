import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { config } from '../config';

/**
 * « Matcaps » : l'image d'une sphère de métal parfaitement poli dans un environnement donné,
 * calculée en JS une seule fois (quelques ms). Le matériau y lit la couleur selon l'orientation
 * de chaque facette : les reflets glissent sur l'objet quand il tourne, sans aucun précalcul lourd.
 *
 * Repère : x à droite, y en haut, z vers la caméra.
 */
type RGB = readonly [number, number, number];
type Light = { dir: readonly number[]; size: number; softness: number; color: RGB; intensity: number };
export type Ambience = {
  exposure: number;
  floor: RGB; // couleur du bas de l'environnement
  horizon: RGB; // couleur à l'horizon
  sky: RGB; // couleur du haut
  horizonLine?: { color: RGB; width: number; intensity: number }; // ligne d'horizon nette (look chrome)
  lights: readonly Light[];
};

const cache = new Map<string, Texture>();
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const toSRGB = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export function buildMatcap(name: string, a: Ambience, size = 256): Texture {
  const hit = cache.get(name);
  if (hit) return hit;

  const lights = a.lights.map((l) => {
    const len = Math.hypot(l.dir[0], l.dir[1], l.dir[2]);
    return { ...l, x: l.dir[0] / len, y: l.dir[1] / len, z: l.dir[2] / len };
  });
  // Lumière (RGB linéaire) vue dans la direction (x, y, z).
  const env = (x: number, y: number, z: number, out: number[]) => {
    const up = smooth(-0.05, 0.6, y);
    const down = smooth(0.05, -0.6, y);
    for (let c = 0; c < 3; c++) out[c] = a.horizon[c] * (1 - up - down) + a.sky[c] * up + a.floor[c] * down;
    if (a.horizonLine) {
      const k = a.horizonLine.intensity * (1 - smooth(0, a.horizonLine.width, Math.abs(y)));
      for (let c = 0; c < 3; c++) out[c] += a.horizonLine.color[c] * k;
    }
    for (const l of lights) {
      const ang = Math.acos(Math.min(1, Math.max(-1, x * l.x + y * l.y + z * l.z)));
      const k = l.intensity * (1 - smooth(l.size, l.size + l.softness, ang));
      for (let c = 0; c < 3; c++) out[c] += l.color[c] * k;
    }
  };

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  const rgb = [0, 0, 0];
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let nx = (i + 0.5) / half - 1;
      let ny = 1 - (j + 0.5) / half;
      const r = Math.hypot(nx, ny);
      if (r > 0.999) {
        nx *= 0.999 / r;
        ny *= 0.999 / r;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      // Direction réfléchie pour un regard venant de +z.
      env(2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1, rgb);
      const o = (j * size + i) * 4;
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(255 * toSRGB(1 - Math.exp(-rgb[c] * a.exposure)));
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  cache.set(name, tex);
  return tex;
}

// Studio photo neutre (pluie Instagram).
export const studioMatcap = () => buildMatcap('studio', config.ambiences.studio);
// HDRI délirant, lumières irréalistes (curseur).
export const neonMatcap = () => buildMatcap('neon', config.ambiences.neon);
// Chrome froid façon écran de chargement PS3 (chiffres).
export const ps3Matcap = () => buildMatcap('ps3', config.ambiences.ps3);

/**
 * Carte de normales « aspérités » : bruit fin qui casse légèrement les reflets du métal,
 * comme une surface polie mais pas parfaite. Se répète (à poser avec des UV).
 */
export function asperityNormalMap(size = 256): Texture {
  const hit = cache.get('asperity');
  if (hit) return hit;
  // Bruit de valeur périodique (se raccorde sur les bords), 3 octaves.
  const grid = (cells: number) => {
    const v = Array.from({ length: cells * cells }, () => Math.random());
    return (x: number, y: number) => {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const at = (a: number, b: number) => v[((b + cells) % cells) * cells + ((a + cells) % cells)];
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      return top + (bottom - top) * sy;
    };
  };
  const octaves = [grid(8), grid(24), grid(64)];
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      height[y * size + x] = octaves[0](x, y) * 0.5 + octaves[1](x, y) * 0.3 + octaves[2](x, y) * 0.2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 4;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 4;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = Math.round((-dx / len) * 127.5 + 127.5);
      img.data[o + 1] = Math.round((-dy / len) * 127.5 + 127.5);
      img.data[o + 2] = Math.round((1 / len) * 127.5 + 127.5);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  cache.set('asperity', tex);
  return tex;
}
