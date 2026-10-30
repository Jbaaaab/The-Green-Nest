import { config } from '../config';
import { nav } from '../nav';
import { onPage, page } from '../router';
import { readUnit } from '../ui/unit';

type Listener = (scroll: number, velocity: number) => void;

/**
 * Scroll de la page About (le scroll de l'accueil, src/nav.ts, est suspendu pendant ce temps) : About 1 en haut
 * (0), About 2 en bas (max), la frise des logos passe entre les deux. Même inertie que l'accueil, libre entre les
 * deux arrêts (pas d'aimant). Molette / trackpad, doigt (gestes verticaux : un glissé horizontal reste à la frise,
 * qui défile toute seule sur mobile), clavier. Bloqué pendant le pong (nav.locked).
 */
class AboutScroll {
  /** Position affichée (lissée), en px. */
  scroll = 0;
  /** Vitesse lissée, en px/s. */
  velocity = 0;

  private target = 0;
  private listeners: Listener[] = [];
  private frame = 0;
  private last = 0;
  private touch: { x: number; y: number; t: number; v: number; axis: 'x' | 'y' | null } | null = null;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', () => {
      // Garde la même page à l'écran.
      this.scroll = this.target = this.target > this.max / 2 ? this.max : 0;
      this.emit();
    });
    // Chaque ouverture de la page repart de About 1.
    onPage((p) => p === 'about' && this.jump(0));
  }

  /**
   * Distance de About 1 à About 2, en px : au plus juste pour que la frise des logos (à mi-chemin) reste hors de
   * l'écran sur l'une et l'autre (une hauteur d'écran, plus la frise et ses marges).
   */
  get max(): number {
    const { band, bandGap } = config.about;
    const u = readUnit();
    const k = window.matchMedia('(max-width: 767px)').matches ? band.mobileScale : 1;
    return window.innerHeight + (band.max[1] * k + 2 * bandGap) * u;
  }

  onScroll(fn: Listener): void {
    this.listeners.push(fn);
    fn(this.scroll, this.velocity);
  }

  /** Va en douceur à une position (0 : About 1, max : About 2). */
  goTo(y: number): void {
    this.target = Math.min(this.max, Math.max(0, y));
    this.animate();
  }

  /** Saute à une position, sans animation. */
  jump(y: number): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.scroll = this.target = Math.min(this.max, Math.max(0, y));
    this.velocity = 0;
    this.emit();
  }

  private get active(): boolean {
    return page === 'about' && !nav.locked;
  }

  private push(delta: number): void {
    this.goTo(this.target + delta);
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.active) return; // (l'accueil, lui, empêche déjà le scroll natif de la page)
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    this.push(d * config.works.wheelMultiplier);
  };

  private onTouchStart = (e: TouchEvent) => {
    if (!this.active) return;
    const t = e.touches[0];
    this.touch = { x: t.clientX, y: t.clientY, t: performance.now(), v: 0, axis: null };
  };

  private onTouchMove = (e: TouchEvent) => {
    const g = this.touch;
    if (!g) return;
    const t = e.touches[0];
    const dx = g.x - t.clientX;
    const dy = g.y - t.clientY;
    // Le premier mouvement décide : horizontal, le geste est laissé à la frise (elle défile au doigt sur mobile).
    if (!g.axis) g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (g.axis === 'x') return;
    e.preventDefault();
    const now = performance.now();
    const d = dy * config.works.touchMultiplier;
    g.v = 0.8 * g.v + 0.2 * (d / Math.max(1, now - g.t));
    g.x = t.clientX;
    g.y = t.clientY;
    g.t = now;
    this.push(d);
  };

  private onTouchEnd = () => {
    const g = this.touch;
    this.touch = null;
    if (g?.axis === 'y') this.push(g.v * config.works.touchMomentum); // élan
  };

  private onKey = (e: KeyboardEvent) => {
    if (!this.active) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const down = () => this.goTo(this.max);
    const up = () => this.goTo(0);
    const map: Record<string, () => void> = {
      ArrowDown: down,
      PageDown: down,
      End: down,
      ArrowUp: up,
      PageUp: up,
      Home: up,
      ' ': e.shiftKey ? up : down,
    };
    const action = map[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  private animate(): void {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const prev = this.scroll;
    const k = this.reduced.matches ? 30 : config.works.smooth;
    this.scroll += (this.target - this.scroll) * (1 - Math.exp(-k * dt));
    if (Math.abs(this.target - this.scroll) < 0.3) this.scroll = this.target;
    const v = dt > 0 ? (this.scroll - prev) / dt : 0;
    this.velocity += (v - this.velocity) * (1 - Math.exp(-12 * dt));
    if (this.scroll === this.target && Math.abs(this.velocity) < 5) this.velocity = 0;
    this.emit();
    this.frame = this.scroll !== this.target || this.velocity !== 0 ? requestAnimationFrame(this.tick) : 0;
  };

  private emit(): void {
    for (const fn of this.listeners) fn(this.scroll, this.velocity);
  }
}

export const aboutScroll = new AboutScroll();
