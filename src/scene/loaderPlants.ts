import { PlantBed } from './footerPlants';
import { Stage, steppedFrame } from './stage';

/**
 * Plantes 3D de l'écran de chargement (demande du DA : « les fleurs en 3D comme sur le footer ») : le même
 * massif que le footer, sur le canvas du loader, qui pousse avec le pourcentage (0 % : rien, 100 % : tout a
 * poussé et fleuri). Pieds juste sous le bas de l'écran ; au centre, les plantes restent sous le texte.
 * Renvoie la fonction qui libère tout (contexte WebGL compris) quand le chargement est fini.
 */
export function startLoaderPlants(canvas: HTMLCanvasElement, progress: () => number, textBottom: () => number): () => void {
  const stage = new Stage(canvas);
  const bed = new PlantBed();
  stage.scene.add(bed.group);
  stage.add({
    resize: (vp) =>
      bed.layout({
        vp,
        seed: 17,
        ground: (_x, rand) => vp.height / 2 + (4 + 10 * rand()) * vp.unit, // pieds cachés sous le bas de l'écran
        textBottom: textBottom(),
        depth: () => 0,
      }),
    update: (time) => {
      bed.pose(progress() * bed.duration, time, steppedFrame());
    },
  });
  stage.start();
  return () => {
    stage.dispose();
    bed.dispose();
  };
}
