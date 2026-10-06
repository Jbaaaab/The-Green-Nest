// Bruit 1D lisse (value noise, interpolation quintique), valeurs dans [-1, 1].
// Tiré au hasard à chaque chargement : le mouvement ne se répète jamais à l'identique.
export function createNoise1D(): (t: number) => number {
  const size = 256;
  const values = Float32Array.from({ length: size }, () => Math.random() * 2 - 1);
  return (t: number) => {
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    const a = values[i & (size - 1)];
    const b = values[(i + 1) & (size - 1)];
    return a + (b - a) * u;
  };
}

// Deux octaves superposées : moins régulier qu'une seule.
export function createFractalNoise1D(): (t: number) => number {
  const n1 = createNoise1D();
  const n2 = createNoise1D();
  return (t: number) => n1(t) * 0.7 + n2(t * 2.3) * 0.3;
}
