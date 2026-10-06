import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { config } from '../config';

/**
 * « Matcap » de studio photo : l'image d'une sphère en métal parfaitement poli, calculée en JS
 * une seule fois (quelques ms), au lieu d'un environnement PMREM dont la compilation des shaders
 * bloquait le mobile plus d'une seconde. Le studio (fond en dégradé + softboxes floues) est fixe
 * par rapport à la caméra : les reflets bougent bien quand l'objet s'incline.
 *
 * Repère : x à droite, y en haut, z vers la caméra.
 */
let cached: Texture | null = null;

export function studioMatcap(): Texture {
  if (cached) return cached;
  const { size, exposure, floor, ceiling, key, fill, rim } = config.studio;

  const lights = [key, fill, rim].map((l) => {
    const len = Math.hypot(l.dir[0], l.dir[1], l.dir[2]);
    return { x: l.dir[0] / len, y: l.dir[1] / len, z: l.dir[2] / len, size: l.size, soft: l.softness, power: l.intensity };
  });
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  // Lumière vue dans la direction (x, y, z).
  const studio = (x: number, y: number, z: number) => {
    let c = floor + (ceiling - floor) * smooth(-1, 1, y);
    for (const l of lights) {
      const a = Math.acos(Math.min(1, Math.max(-1, x * l.x + y * l.y + z * l.z)));
      c += l.power * (1 - smooth(l.size, l.size + l.soft, a));
    }
    return c;
  };
  const toSRGB = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // Normale de la sphère vue de face (bord légèrement rentré pour éviter les artefacts).
      let nx = (i + 0.5) / half - 1;
      let ny = 1 - (j + 0.5) / half;
      const r = Math.hypot(nx, ny);
      if (r > 0.999) {
        nx *= 0.999 / r;
        ny *= 0.999 / r;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      // Direction réfléchie pour un regard venant de +z.
      const radiance = studio(2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1);
      const v = Math.round(255 * toSRGB(1 - Math.exp(-radiance * exposure)));
      const o = (j * size + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  cached = new CanvasTexture(canvas);
  cached.colorSpace = SRGBColorSpace;
  return cached;
}
