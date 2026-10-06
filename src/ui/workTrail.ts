import { config } from '../config';
import type { Viewport } from '../scene/stage';

type Thumb = { src: string; ratio: number };

/**
 * Apparitions de projets en fond : des vignettes surgissent à des endroits aléatoires,
 * vivent ~1 s en rétrécissant puis disparaissent. En DOM, animées uniquement en transform + opacity
 * (Web Animations API, gérée par le compositeur). Les éléments sont recyclés.
 */
export class WorkTrail {
  private el: HTMLDivElement;
  private pool: HTMLImageElement[] = [];
  private next = 0;
  private thumbs: Thumb[] = [];
  private bag: Thumb[] = [];
  private nextSpawn = 0;
  private lastCells: string[] = [];
  private viewport!: Viewport;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'trail';
    this.el.setAttribute('aria-hidden', 'true');
    parent.prepend(this.el);

    const { interval, lifeMs } = config.trail;
    const count = Math.ceil(lifeMs / interval.min) + 2;
    for (let i = 0; i < count; i++) {
      const img = document.createElement('img');
      img.className = 'trail__frame';
      img.alt = '';
      img.decoding = 'async';
      this.el.appendChild(img);
      this.pool.push(img);
    }

    this.load();
  }

  resize(vp: Viewport): void {
    this.viewport = vp;
  }

  update(time: number): void {
    if (!this.thumbs.length) return;
    const now = time * 1000;
    if (now < this.nextSpawn) return;
    const { min, max } = config.trail.interval;
    this.nextSpawn = now + min + Math.random() * (max - min);
    this.spawn();
  }

  // Charge le manifeste puis décode toutes les vignettes avant de commencer (pas de flash vide).
  private async load(): Promise<void> {
    try {
      const list: Thumb[] = await (await fetch(config.trail.manifest)).json();
      await Promise.all(
        list.map((t) => {
          const img = new Image();
          img.src = t.src;
          return img.decode().catch(() => undefined);
        }),
      );
      this.thumbs = list;
    } catch (err) {
      console.error('Vignettes indisponibles :', err);
    }
  }

  // Tirage sans remise : chaque image passe une fois avant que le paquet soit remélangé.
  private draw(): Thumb {
    if (!this.bag.length) {
      this.bag = [...this.thumbs];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }

  private spawn(): void {
    const { size, endScale, lifeMs } = config.trail;
    const u = this.viewport.unit;
    const thumb = this.draw();
    const w = (size.min + Math.random() * (size.max - size.min)) * u;
    const h = w / thumb.ratio;
    const pos = config.trail.snapToGrid ? this.gridPosition(w, h) : this.randomPosition(w, h);
    if (!pos) return;

    const img = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    img.getAnimations().forEach((a) => a.cancel());
    img.src = thumb.src;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;

    const at = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    img.animate(
      [
        { transform: `${at} scale(0.96)`, opacity: 0 },
        { transform: `${at} scale(1)`, opacity: 1, offset: 0.1 },
        { transform: `${at} scale(${endScale})`, opacity: 0 },
      ],
      { duration: lifeMs, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
    );
  }

  // Coin haut-gauche aléatoire, en évitant le header, le dock et les bords.
  private randomPosition(w: number, h: number): { x: number; y: number } {
    const { safe } = config.trail;
    const u = this.viewport.unit;
    const x0 = safe.side * u;
    const y0 = safe.top * u;
    const x1 = Math.max(x0, this.viewport.width - safe.side * u - w);
    const y1 = Math.max(y0, this.viewport.height - safe.bottom * u - h);
    return { x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0) };
  }

  // Case de grille aléatoire (différente des dernières utilisées), vignette centrée dans la case.
  private gridPosition(w: number, h: number): { x: number; y: number } | null {
    const { columns, margin, gutter, top, rowHeight, rowGutter } = config.trail.grid;
    const { safe } = config.trail;
    const u = this.viewport.unit;
    const colW = (this.viewport.width - 2 * margin * u - (columns - 1) * gutter * u) / columns;
    const rowPitch = (rowHeight + rowGutter) * u;
    const rowFirst = Math.ceil((safe.top * u - top * u) / rowPitch);
    const rowLast = Math.floor((this.viewport.height - safe.bottom * u - top * u - rowHeight * u) / rowPitch);
    if (rowLast < rowFirst) return null;

    for (let tries = 0; tries < 8; tries++) {
      const col = Math.floor(Math.random() * columns);
      const row = rowFirst + Math.floor(Math.random() * (rowLast - rowFirst + 1));
      const key = `${col}:${row}`;
      if (this.lastCells.includes(key)) continue;
      this.lastCells = [key, ...this.lastCells].slice(0, 4);
      return {
        x: margin * u + col * (colW + gutter * u) + colW / 2 - w / 2,
        y: top * u + row * rowPitch + (rowHeight * u) / 2 - h / 2,
      };
    }
    return null;
  }
}
