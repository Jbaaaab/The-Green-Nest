import { config } from './config';

/**
 * Scroll vertical fluide (inertie, façon Lenis) sur toute la page : accueil puis projets empilés.
 * - Pas d'aimant : on scrolle librement.
 * - Arrêt net quand le texte d'un projet arrive au milieu de l'écran (une page alignée) :
 *   il faut un nouveau geste pour repartir (l'inertie du trackpad ne fait pas passer l'arrêt).
 * Toutes les animations lisent `scroll` (px) et `velocity` (px/s).
 */
// Dernière section : le footer (« hello »). Au-delà de son arrêt, une zone de scroll où la page reste fixe
// pendant que ses cartes s'envolent (config.footer.reveal, en hauteurs d'écran).
export const SECTION_IDS = ['', 'longtemps', 'formula-one', 'take-care', 'hello'] as const;

type Listener = (scroll: number, velocity: number) => void;

class Nav {
  /** Position affichée (lissée), en px. */
  scroll = 0;
  /** Vitesse lissée, en px/s (pour les déformations). */
  velocity = 0;
  /** Section la plus proche du centre. */
  section = 0;
  readonly count = SECTION_IDS.length;

  private target = 0;
  private listeners: Listener[] = [];
  private sectionListeners: ((s: number) => void)[] = [];
  private frame = 0;
  private last = 0;

  // Gestes : un geste = une suite d'événements sans silence ; il peut franchir au plus l'arrêt où il commence.
  private lastInput = 0;
  private gestureFrom = 0;
  private touchY: number | null = null;
  private touchV = 0;
  private touchT = 0;

  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Hauteur d'une section (distance entre deux arrêts), en px. */
  get sectionHeight(): number {
    return window.innerHeight * config.works.spacing;
  }

  /** Position de l'arrêt de la section i. */
  stopOf(i: number): number {
    return i * this.sectionHeight;
  }

  /** Longueur de la zone du footer après son arrêt (les cartes s'envolent), en px. */
  get footerReveal(): number {
    return window.innerHeight * config.footer.reveal;
  }

  get max(): number {
    return this.stopOf(this.count - 1) + this.footerReveal;
  }

  init(): void {
    const fromHash = SECTION_IDS.indexOf(location.hash.slice(1) as (typeof SECTION_IDS)[number]);
    if (fromHash > 0) this.scroll = this.target = this.stopOf(fromHash);
    this.section = Math.max(0, fromHash);

    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', () => {
      // Garde la même section alignée après un redimensionnement.
      this.scroll = this.target = this.stopOf(this.section);
      this.emit();
    });
    this.emit();
  }

  onScroll(fn: Listener): void {
    this.listeners.push(fn);
    fn(this.scroll, this.velocity);
  }

  onSection(fn: (s: number) => void): void {
    this.sectionListeners.push(fn);
    fn(this.section);
  }

  /** Va (en douceur) jusqu'à l'arrêt d'une section. */
  goTo(section: number): void {
    const s = Math.max(0, Math.round(section));
    // Au-delà du footer : tout en bas (cartes envolées).
    this.target = s > this.count - 1 ? this.max : this.stopOf(s);
    this.animate();
  }

  // Avance la cible d'un delta, en s'arrêtant au premier arrêt rencontré (sauf celui d'où le geste
  // est parti). Une fois arrêté, le reste du geste est ignoré : il faut relâcher et rescroller.
  private push(delta: number): void {
    if (this.blocked) return;
    const from = this.target;
    let to = Math.min(this.max, Math.max(0, from + delta));
    for (let i = 0; i < this.count; i++) {
      const stop = this.stopOf(i);
      if (Math.abs(stop - this.gestureFrom) < 2) continue; // l'arrêt de départ du geste est franchissable
      const crossing = (from < stop && to >= stop) || (from > stop && to <= stop);
      if (crossing) {
        to = stop;
        this.blocked = true;
        break;
      }
    }
    this.target = to;
    this.animate();
  }

  private blocked = false;

  private startGesture(): void {
    this.gestureFrom = this.target;
    this.blocked = false;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (now - this.lastInput > config.works.gestureQuietMs) this.startGesture();
    this.lastInput = now;
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    this.push(px * config.works.wheelMultiplier);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0].clientY;
    this.touchV = 0;
    this.touchT = performance.now();
    this.startGesture();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY === null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = performance.now();
    const dy = (this.touchY - y) * config.works.touchMultiplier;
    this.touchV = 0.8 * this.touchV + 0.2 * (dy / Math.max(1, now - this.touchT));
    this.touchY = y;
    this.touchT = now;
    this.push(dy);
  };

  private onTouchEnd = () => {
    if (this.touchY === null) return;
    this.touchY = null;
    // Élan : on prolonge le geste selon la vitesse du doigt (toujours bloqué par les arrêts).
    this.push(this.touchV * config.works.touchMomentum);
  };

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const page = () => {
      const cur = Math.round(this.target / this.sectionHeight);
      return cur;
    };
    const map: Record<string, () => void> = {
      ArrowDown: () => this.goTo(page() + 1),
      PageDown: () => this.goTo(page() + 1),
      ' ': () => this.goTo(page() + (e.shiftKey ? -1 : 1)),
      ArrowUp: () => this.goTo(page() - 1),
      PageUp: () => this.goTo(page() - 1),
      Home: () => this.goTo(0),
      End: () => this.goTo(this.count),
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

    const s = Math.min(this.count - 1, Math.round(this.scroll / this.sectionHeight));
    if (s !== this.section) this.setSection(s);
    this.emit();
    this.frame = this.scroll !== this.target || this.velocity !== 0 ? requestAnimationFrame(this.tick) : 0;
  };

  private setSection(s: number): void {
    this.section = s;
    const id = SECTION_IDS[s];
    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
    for (const fn of this.sectionListeners) fn(s);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.scroll, this.velocity);
  }
}

export const nav = new Nav();
