import { config } from './config';

/**
 * Navigation entre les sections : 0 = accueil, puis un projet par section.
 * Un geste (molette / trackpad, glissé au doigt, flèches du clavier) déclenche une transition
 * complète et maîtrisée vers la section voisine ; l'inertie du trackpad est ignorée.
 * La progression `p` (continue) pilote toutes les animations.
 */
export const SECTION_IDS = ['', 'longtemps', 'formula-one', 'take-care'] as const;

type Listener = (p: number) => void;

// Accélération et décélération douces (équivalent cubic-bezier(0.65, 0, 0.35, 1)).
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class Nav {
  /** Progression affichée. */
  p = 0;
  /** Section visée (ou atteinte). */
  section = 0;
  readonly count = SECTION_IDS.length;

  private listeners: Listener[] = [];
  private sectionListeners: ((s: number) => void)[] = [];
  private anim: { from: number; to: number; start: number; duration: number } | null = null;
  private frame = 0;

  // Molette : cumul du geste, et verrou tant que le trackpad envoie son inertie.
  private wheelSum = 0;
  private lastWheel = 0;
  private touchY: number | null = null;

  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  init(): void {
    const fromHash = this.indexOf(location.hash.slice(1));
    if (fromHash > 0) this.p = this.section = fromHash;

    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('hashchange', () => this.goTo(Math.max(0, this.indexOf(location.hash.slice(1)))));
    this.emit();
  }

  onProgress(fn: Listener): void {
    this.listeners.push(fn);
    fn(this.p);
  }

  onSection(fn: (s: number) => void): void {
    this.sectionListeners.push(fn);
    fn(this.section);
  }

  get busy(): boolean {
    return this.anim !== null;
  }

  goTo(section: number): void {
    const s = Math.min(this.count - 1, Math.max(0, Math.round(section)));
    if (s === this.section && !this.anim) return;
    const { duration, durationPerExtra, durationReduced } = config.works;
    const distance = Math.abs(s - this.p);
    this.anim = {
      from: this.p,
      to: s,
      start: performance.now(),
      duration: 1000 * (this.reduced.matches ? durationReduced : duration + durationPerExtra * Math.max(0, distance - 1)),
    };
    this.setSection(s);
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  next(): void {
    this.goTo(this.section + 1);
  }

  prev(): void {
    this.goTo(this.section - 1);
  }

  private indexOf(id: string): number {
    return SECTION_IDS.indexOf(id as (typeof SECTION_IDS)[number]);
  }

  private setSection(s: number): void {
    if (s === this.section) return;
    this.section = s;
    const id = SECTION_IDS[s];
    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
    for (const fn of this.sectionListeners) fn(s);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    const quiet = now - this.lastWheel > config.works.wheelQuietMs;
    this.lastWheel = now;
    // Pendant une transition, et tant que l'inertie qui a suivi continue : on ignore.
    if (this.anim || (!quiet && this.wheelSum === Infinity)) return;
    if (quiet) this.wheelSum = 0;
    this.wheelSum += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    if (Math.abs(this.wheelSum) >= config.works.wheelThreshold) {
      if (this.wheelSum > 0) this.next();
      else this.prev();
      this.wheelSum = Infinity; // verrou jusqu'au prochain geste (après un silence)
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0].clientY;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY !== null) e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchY === null || this.anim) return;
    const dy = this.touchY - e.changedTouches[0].clientY;
    this.touchY = null;
    if (Math.abs(dy) < config.works.swipeThreshold) return;
    if (dy > 0) this.next();
    else this.prev();
  };

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const map: Record<string, () => void> = {
      ArrowDown: () => this.next(),
      PageDown: () => this.next(),
      ArrowRight: () => this.next(),
      ' ': () => (e.shiftKey ? this.prev() : this.next()),
      ArrowUp: () => this.prev(),
      PageUp: () => this.prev(),
      ArrowLeft: () => this.prev(),
      Home: () => this.goTo(0),
      End: () => this.goTo(this.count - 1),
    };
    const action = map[e.key];
    if (!action) return;
    e.preventDefault();
    if (!this.anim) action();
  };

  private tick = (now: number) => {
    const a = this.anim;
    if (!a) {
      this.frame = 0;
      return;
    }
    const t = Math.min(1, (now - a.start) / a.duration);
    this.p = a.from + (a.to - a.from) * easeInOutCubic(t);
    if (t >= 1) {
      this.p = a.to;
      this.anim = null;
    }
    this.emit();
    this.frame = this.anim ? requestAnimationFrame(this.tick) : 0;
  };

  private emit(): void {
    for (const fn of this.listeners) fn(this.p);
  }
}

export const nav = new Nav();
