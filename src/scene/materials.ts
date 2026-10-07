import { Color, Mesh, MeshMatcapMaterial, MeshStandardMaterial, type Material, type Object3D } from 'three';
import { buildLacquerMatcap, type Lacquer } from './environment';

/**
 * Laque de la couleur du GLB, éclairée par un HDRI (matcap calculée en JS, voir environment.ts).
 * Shader minuscule, aucun environnement à précalculer : rapide à démarrer, même sur mobile.
 * Les normales propres sont calculées en amont par `npm run assets`.
 */
export function lacquer(source: Material, look: Lacquer): MeshMatcapMaterial {
  const color = source instanceof MeshStandardMaterial ? source.color : new Color(0xffffff); // RGB linéaire
  return new MeshMatcapMaterial({ matcap: buildLacquerMatcap([color.r, color.g, color.b], look), side: source.side });
}

// Premier mesh d'un GLB.
export function firstMesh(root: Object3D): Mesh {
  let found: Mesh | null = null;
  root.traverse((o) => {
    if (!found && o instanceof Mesh) found = o;
  });
  if (!found) throw new Error('GLB sans mesh');
  return found;
}
