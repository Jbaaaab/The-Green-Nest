import { PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { config } from '../config';
import { readUnit } from '../ui/unit';

export type Viewport = { width: number; height: number; unit: number; mobile: boolean };
export type Updatable = { update(time: number, delta: number): void; resize?(vp: Viewport): void };

// Compteur d'images rendues, pour animer les rotations « on twos » (une pose tenue 2 images).
let frameCount = 0;
/** Vrai une image sur config.stepped.every : les rotations des assets 3D ne bougent qu'à ces images. */
export const steppedFrame = () => !config.stepped.enabled || frameCount % config.stepped.every === 0;

/**
 * Canvas Three.js plein écran partagé par la bague, la pluie Insta et le curseur.
 * La caméra est réglée pour que 1 unité 3D = 1 px CSS dans le plan z = 0.
 * `overlay` est rendu après un effacement de la profondeur : toujours au premier plan (curseur).
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly overlay = new Scene();
  readonly camera: PerspectiveCamera;
  viewport: Viewport;

  private items: Updatable[] = [];
  private running = false;
  private last = 0;
  private elapsed = 0;
  private frame = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    // stencil : sert à masquer le chiffre 3D derrière les vidéos des pages (voir digits.ts).
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;

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
    frameCount++;
    for (const item of this.items) item.update(this.elapsed, delta);
    this.render();
    if (this.running) this.frame = requestAnimationFrame(this.tick);
  };

  private render(): void {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (this.overlay.children.length) {
      this.renderer.clearDepth();
      this.renderer.render(this.overlay, this.camera);
    }
  }

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
    if (!this.running) this.render();
  };

  // Boucle en pause quand l'onglet est masqué.
  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };
}
