import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { config } from '../config';
import { createNoise1D } from './noise';

/**
 * Matcap en couleur de la bague, calibrée sur le rendu Blender de la maquette (Figma « bague 1 ») :
 * - faces (normale vers nous)      : vert émeraude, légèrement plus clair vers la lumière (haut-gauche) ;
 * - arrondi des arêtes             : fin liseré clair vert menthe ;
 * - flancs (normale perpendiculaire) : vert olive sombre, marbré de reflets vert-jaune.
 * Les couleurs sont dans config.ring.look (sRGB, relevées sur le rendu).
 */
let cached: Texture | null = null;

type RGB = readonly [number, number, number];
const mix = (a: RGB, b: RGB, t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export function ringMatcap(): Texture {
  if (cached) return cached;
  const look = config.ring.look;
  const size = look.size;
  const L = look.light.map((v, _, a) => v / Math.hypot(...a)) as [number, number, number];
  const mottle = createNoise1D();

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const half = size / 2;

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
      const angle = (Math.acos(nz) * 180) / Math.PI; // 0° = face tournée vers nous
      const lit = nx * L[0] + ny * L[1] + nz * L[2]; // éclairage de la softbox principale

      // Faces : sombre → moyen → clair selon l'orientation vers la lumière.
      const t = clamp01((lit - look.faceLitRange[0]) / (look.faceLitRange[1] - look.faceLitRange[0]));
      let c = t < 0.5 ? mix(look.faceDark, look.face, t * 2) : mix(look.face, look.faceLight, (t - 0.5) * 2);

      // Arrondi des arêtes : liseré clair, plus fort côté lumière.
      const [b0, b1, b2] = look.bevelAngles;
      const band = smooth(b0, b1, angle) * (1 - smooth(b1, b2, angle));
      const toLight = clamp01(0.35 + 0.65 * (nx * L[0] + ny * L[1]) / Math.max(1e-3, Math.hypot(nx, ny)));
      c = mix(c, mix(look.highlight, look.highlightPeak, toLight), band * (0.55 + 0.45 * toLight));

      // Flancs : olive sombre marbré de reflets vert-jaune (la marbrure tourne autour de la normale).
      const side = smooth(b2 - 6, b2 + 6, angle);
      const phi = Math.atan2(ny, nx);
      const m = clamp01(0.5 + 0.5 * mottle((phi / (Math.PI * 2)) * look.mottleCount + 37));
      const sideColor = mix(look.sideDark, look.sideLight, Math.pow(m, 1.6) * (0.5 + 0.5 * toLight));
      c = mix(c, sideColor, side);

      const o = (j * size + i) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  cached = new CanvasTexture(canvas);
  cached.colorSpace = SRGBColorSpace;
  return cached;
}
