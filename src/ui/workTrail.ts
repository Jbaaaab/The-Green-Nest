import { config } from '../config';
import type { Viewport } from '../scene/stage';

export type Point = { x: number; y: number };

/**
 * Traînée de vignettes qui tourne en ellipse autour de la bio. En DOM, animée uniquement
 * en transform + opacity (Web Animations API, donc gérée par le compositeur). Les éléments sont recyclés.
 */
export class WorkTrail {
  private el: HTMLDivElement;
  private pool: HTMLDivElement[] = [];
  private next = 0;
  private lastSpawn = -Infinity;
  private lastCell = '';
  private viewport!: Viewport;
  private orbit = { cx: 0, cy: 0, rx: 0, ry: 0 };

  constructor(
    parent: HTMLElement,
    private target: () => HTMLElement | null, // la zone autour de laquelle tourner (la bio visible)
  ) {
    this.el = document.createElement('div');
    this.el.className = 'trail';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);

    const { intervalMs, lifeMs } = config.trail;
    const count = Math.ceil(lifeMs / intervalMs) + 2;
    for (let i = 0; i < count; i++) {
      const frame = document.createElement('div');
      frame.className = 'trail__frame';
      frame.style.background = config.trail.placeholder.color;
      this.el.appendChild(frame);
      this.pool.push(frame);
    }
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
    const r = this.target()?.getBoundingClientRect();
    if (!r) return;
    const { padX, padY } = config.trail.orbit;
    this.orbit = {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      rx: r.width / 2 + padX * vp.unit,
      ry: r.height / 2 + padY * vp.unit,
    };
  }

  update(time: number): void {
    const now = time * 1000;
    if (now - this.lastSpawn < config.trail.intervalMs) return;

    const { period, direction } = config.trail.orbit;
    const a = (direction * Math.PI * 2 * time) / period;
    const { cx, cy, rx, ry } = this.orbit;
    let p: Point = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    if (config.trail.snapToGrid) {
      const cell = this.snap(p);
      if (cell.key === this.lastCell) return; // déjà une frame dans cette case
      this.lastCell = cell.key;
      p = cell;
    }

    this.lastSpawn = now;
    this.spawn(p);
  }

  private spawn({ x, y }: Point): void {
    const { size, endScale, lifeMs, placeholder } = config.trail;
    const u = this.viewport.unit;
    const w = (size.min + Math.random() * (size.max - size.min)) * u;
    const h = w / placeholder.aspect;

    const frame = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;

    frame.getAnimations().forEach((a) => a.cancel());
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;

    const at = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
    frame.animate(
      [
        { transform: `${at} scale(1)`, opacity: 1 },
        { transform: `${at} scale(${endScale})`, opacity: 0 },
      ],
      { duration: lifeMs, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
    );
  }

  // Ramène un point au centre de la case de grille la plus proche.
  private snap({ x, y }: Point): Point & { key: string } {
    const { columns, margin, gutter, top, rowHeight, rowGutter } = config.trail.grid;
    const u = this.viewport.unit;
    const colW = (this.viewport.width - 2 * margin * u - (columns - 1) * gutter * u) / columns;
    const colPitch = colW + gutter * u;
    const rowPitch = (rowHeight + rowGutter) * u;

    const col = Math.min(columns - 1, Math.max(0, Math.round((x - margin * u - colW / 2) / colPitch)));
    const row = Math.max(0, Math.round((y - top * u - (rowHeight * u) / 2) / rowPitch));

    return {
      key: `${col}:${row}`,
      x: margin * u + col * colPitch + colW / 2,
      y: top * u + row * rowPitch + (rowHeight * u) / 2,
    };
  }
}
