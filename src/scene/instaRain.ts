import { InstancedMesh, Matrix4, Quaternion, Vector3, type Material } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type * as Rapier from '@dimforge/rapier3d-compat';
import { config } from '../config';
import { firstMesh, lacquer } from './materials';
import type { Stage, Updatable, Viewport } from './stage';

type RapierModule = typeof Rapier;

// La physique tourne en « mètres » (1 unité = 100 px) pour rester dans les tolérances de Rapier.
const SCALE = 100;
const STEP = 1 / 60;

type Slot = {
  body: Rapier.RigidBody | null;
  age: number;
  life: number;
  width: number; // px
};

/**
 * Pluie de logos Instagram 3D : InstancedMesh (plafonné) + physique Rapier.
 * Rien n'est chargé tant que le lien n'a pas été survolé une première fois.
 */
export class InstaRain implements Updatable {
  private R: RapierModule | null = null;
  private world: Rapier.World | null = null;
  private statics: Rapier.Collider[] = [];
  private mesh: InstancedMesh | null = null;
  private loading: Promise<void> | null = null;

  private slots: Slot[] = [];
  private normalize = new Matrix4(); // centre, redresse et ramène le logo à 1 de large
  private dims = new Vector3(1, 1, 1); // dimensions du logo normalisé

  private hovered = false;
  private emitTimer = 0;
  private spawnAcc = 0;
  private stepAcc = 0;
  private viewport: Viewport;

  private m = new Matrix4();
  private p = new Vector3();
  private q = new Quaternion();
  private s = new Vector3();
  private zero = new Matrix4().makeScale(0, 0, 0);

  constructor(private stage: Stage) {
    this.viewport = stage.viewport;
  }

  start(): void {
    this.hovered = true;
    this.emitTimer = config.rain.minEmitSeconds;
    this.loading ??= this.load().catch((err) => console.error('Pluie Instagram indisponible :', err));
  }

  stop(): void {
    this.hovered = false;
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    if (this.world) this.buildBounds();
  }

  update(_time: number, delta: number): void {
    const world = this.world;
    const mesh = this.mesh;
    if (!world || !mesh) return;

    // Émission tant que le lien est survolé (avec une durée minimale).
    this.emitTimer -= delta;
    if (this.hovered || this.emitTimer > 0) {
      this.spawnAcc += delta * config.rain.spawnPerSecond;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        this.spawn();
      }
    } else {
      this.spawnAcc = 0;
    }

    let active = 0;
    for (const slot of this.slots) if (slot.body) active++;
    if (!active) return;

    // Pas de temps fixe pour une physique stable.
    this.stepAcc = Math.min(this.stepAcc + delta, STEP * 3);
    while (this.stepAcc >= STEP) {
      world.step();
      this.stepAcc -= STEP;
    }

    const { fadeOutSeconds } = config.rain;
    this.slots.forEach((slot, i) => {
      const body = slot.body;
      if (!body) return;

      slot.age += delta;
      const left = slot.life - slot.age;
      if (left <= 0) {
        world.removeRigidBody(body);
        slot.body = null;
        mesh.setMatrixAt(i, this.zero);
        return;
      }

      const shrink = left < fadeOutSeconds ? left / fadeOutSeconds : 1;
      const t = body.translation();
      const r = body.rotation();
      this.p.set(t.x * SCALE, t.y * SCALE, t.z * SCALE);
      this.q.set(r.x, r.y, r.z, r.w);
      this.s.setScalar(slot.width * shrink);
      this.m.compose(this.p, this.q, this.s).multiply(this.normalize);
      mesh.setMatrixAt(i, this.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  private async load(): Promise<void> {
    const [R, gltf] = await Promise.all([
      import('@dimforge/rapier3d-compat').then(async (mod) => {
        const R = (mod.default ?? mod) as RapierModule;
        await R.init();
        return R;
      }),
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(config.rain.url),
    ]);

    // Le GLB est posé à plat (normale = +Y, comme la bague) : on le redresse face caméra,
    // on le recentre et on le ramène à 1 de large. Ce calcul est inclus dans chaque matrice d'instance.
    const src = firstMesh(gltf.scene);
    const geometry = src.geometry;
    gltf.scene.updateMatrixWorld(true);
    const upright = new Matrix4().makeRotationX(Math.PI / 2).multiply(src.matrixWorld);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!.clone().applyMatrix4(upright);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const width = Math.max(size.x, size.y);
    this.normalize
      .makeScale(1 / width, 1 / width, 1 / width)
      .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z))
      .multiply(upright);
    this.dims.copy(size).divideScalar(width);

    // Rose du GLB, éclairé par le même HDRI que les curseurs.
    const material = lacquer(src.material as Material, config.rain.look);

    const max = config.rain.maxInstances;
    const mesh = new InstancedMesh(geometry, material, max);
    mesh.frustumCulled = false;
    for (let i = 0; i < max; i++) mesh.setMatrixAt(i, this.zero);
    this.slots = Array.from({ length: max }, () => ({ body: null, age: 0, life: 0, width: 0 }));
    this.stage.scene.add(mesh);

    this.R = R;
    this.world = new R.World({ x: 0, y: -config.rain.gravity / SCALE, z: 0 });
    this.world.timestep = STEP;
    this.mesh = mesh;
    this.buildBounds();
  }

  // Sol, murs gauche/droite et avant/arrière, aux bords de l'écran.
  private buildBounds(): void {
    const R = this.R!;
    const world = this.world!;
    for (const c of this.statics) world.removeCollider(c, false);

    const w = this.viewport.width / 2 / SCALE;
    const h = this.viewport.height / 2 / SCALE;
    const d = config.rain.depth / 2 / SCALE;
    const t = 1; // épaisseur des murs
    const tall = h * 4; // les murs montent bien au-dessus de l'écran

    const boxes: [number, number, number, number, number, number][] = [
      [w + t, t, d + t, 0, -h - t, 0], // sol
      [t, tall, d + t, -w - t, 0, 0], // gauche
      [t, tall, d + t, w + t, 0, 0], // droite
      [w + t, tall, t, 0, 0, -d - t], // arrière
      [w + t, tall, t, 0, 0, d + t], // avant
    ];
    this.statics = boxes.map(([hx, hy, hz, x, y, z]) =>
      world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z)),
    );
  }

  private spawn(): void {
    const i = this.slots.findIndex((s) => !s.body);
    if (i < 0) {
      // Plafond atteint : le plus ancien encore entier commence à disparaître, et laisse sa place au
      // suivant dans quelques images. La pluie ne s'arrête pas.
      let oldest: Slot | null = null;
      for (const s of this.slots) if (s.life - s.age > config.rain.fadeOutSeconds && (!oldest || s.age > oldest.age)) oldest = s;
      if (oldest) oldest.life = oldest.age + config.rain.fadeOutSeconds;
      return;
    }
    const R = this.R!;
    const world = this.world!;
    const cfg = config.rain;
    const { width: vw, height: vh, unit } = this.viewport;

    const widthPx = (cfg.width.min + Math.random() * (cfg.width.max - cfg.width.min)) * unit;
    const hx = (this.dims.x * widthPx) / 2 / SCALE;
    const hy = (this.dims.y * widthPx) / 2 / SCALE;
    const hz = (this.dims.z * widthPx) / 2 / SCALE;

    const margin = hx;
    const x = (Math.random() * (vw / SCALE - 2 * margin) - vw / 2 / SCALE + margin);
    const y = vh / 2 / SCALE + hx + Math.random() * 2;
    const z = (Math.random() - 0.5) * Math.max(0, cfg.depth / SCALE - 2 * hz);
    const rot = new Quaternion().setFromAxisAngle(
      new Vector3(Math.random() - 0.5, Math.random() - 0.5, 1).normalize(),
      (Math.random() - 0.5) * Math.PI * 0.6,
    );

    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })
        .setLinvel((Math.random() - 0.5) * 2, -Math.random() * 3, 0)
        .setAngvel({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 6 }),
    );
    world.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz).setRestitution(cfg.restitution).setFriction(cfg.friction),
      body,
    );

    const slot = this.slots[i];
    slot.body = body;
    slot.age = 0;
    slot.life = cfg.lifeSeconds.min + Math.random() * (cfg.lifeSeconds.max - cfg.lifeSeconds.min);
    slot.width = widthPx;
  }
}
