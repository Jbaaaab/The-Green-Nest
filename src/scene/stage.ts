import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { config } from '../config';
import { readUnit } from '../ui/unit';

export type Viewport = { width: number; height: number; unit: number; mobile: boolean };
export type Updatable = { update(time: number, delta: number): void; resize?(vp: Viewport): void };

/**
 * Canvas Three.js plein écran partagé par la bague (et plus tard la pluie Insta).
 * La caméra est réglée pour que 1 unité 3D = 1 px CSS dans le plan z = 0.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  viewport: Viewport;

  private items: Updatable[] = [];
  private running = false;
  private last = 0;
  private elapsed = 0;
  private frame = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);

    // Environnement léger généré en code (pas de fichier HDRI à télécharger) pour les reflets.
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new PerspectiveCamera(config.stage.fov, 1, 1, 10000);
    this.viewport = this.measure();
    this.applySize();

    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  add(item: Updatable): void {
    this.items.push(item);
    item.resize?.(this.viewport);
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private tick = (now: number) => {
    const delta = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.elapsed += delta;
    for (const item of this.items) item.update(this.elapsed, delta);
    this.renderer.render(this.scene, this.camera);
    if (this.running) this.frame = requestAnimationFrame(this.tick);
  };

  private measure(): Viewport {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      unit: readUnit(),
      mobile: window.matchMedia('(max-width: 767px)').matches,
    };
  }

  private applySize(): void {
    const { width, height } = this.viewport;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.stage.maxPixelRatio));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Distance telle que la hauteur visible en z = 0 vaut `height` unités.
    this.camera.position.z = height / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    this.camera.near = this.camera.position.z / 10;
    this.camera.far = this.camera.position.z * 10;
    this.camera.updateProjectionMatrix();
  }

  private onResize = () => {
    this.viewport = this.measure();
    this.applySize();
    for (const item of this.items) item.resize?.(this.viewport);
    if (!this.running) this.renderer.render(this.scene, this.camera);
  };

  // Boucle en pause quand l'onglet est masqué.
  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };
}
