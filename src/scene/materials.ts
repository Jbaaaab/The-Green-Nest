import { Color, Mesh, MeshMatcapMaterial, MeshStandardMaterial, type Material, type Object3D } from 'three';
import { studioMatcap } from './environment';

/**
 * Métal poli léger : matcap du studio (voir environment.ts) teintée par la couleur du GLB.
 * Shader minuscule, aucun environnement à précalculer : rapide à démarrer, même sur mobile.
 * Les normales propres sont calculées en amont par `npm run assets`.
 */
export function polishedMetal(source: Material): MeshMatcapMaterial {
  const color = source instanceof MeshStandardMaterial ? source.color.clone() : new Color(0xffffff);
  return new MeshMatcapMaterial({ color, matcap: studioMatcap(), side: source.side });
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
