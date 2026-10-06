import { config } from './config';

/**
 * Navigation par « scroll virtuel » entre les sections : 0 = accueil, puis un projet par section.
 * La progression `p` est continue (les transitions suivent le geste) puis se cale sur une section entière.
 * Molette / trackpad, tactile, clavier et liens (#id) la pilotent.
 */
export const SECTION_IDS = ['', 'longtemps', 'formula-one', 'take-care'] as const;

type Listener = (p: number) => void;

class Nav {
  /** Progression affichée (lissée). */
  p = 0;
  /** Progression visée. */
  target = 0;
  /** Section sur laquelle on est calé (ou vers laquelle on va). */
  section = 0;
  readonly count = SECTION_IDS.length;

  private listeners: Listener[] = [];
  private sectionListeners: ((s: number) => void)[] = [];
  private frame = 0;
  private last = 0;

  // Geste molette en cours
  private wheelTimer = 0;
  private locked = false;
  private lockTimer = 0;

  // Geste tactile en cours
  private touchY: number | null = null;
  private touchT = 0;

  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  init(): void {
    const fromHash = SECTION_IDS.indexOf(location.hash.slice(1) as (typeof SECTION_IDS)[number]);
    if (fromHash > 0) this.p = this.target = this.section = fromHash;

    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('hashchange', () => {
      const i = SECTION_IDS.indexOf(location.hash.slice(1) as (typeof SECTION_IDS)[number]);
      this.goTo(Math.max(0, i));
    });
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

  goTo(section: number): void {
    const s = Math.min(this.count - 1, Math.max(0, Math.round(section)));
    this.target = s;
    this.setSection(s);
    this.animate();
  }

  next(): void {
    this.goTo(this.section + 1);
  }

  prev(): void {
    this.goTo(this.section - 1);
  }

  private setSection(s: number): void {
    if (s === this.section) return;
    this.section = s;
    const id = SECTION_IDS[s];
    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
    for (const fn of this.sectionListeners) fn(s);
  }

  // Pendant un geste, la cible suit le geste mais reste à ±1 section de la section courante.
  private nudge(delta: number): void {
    this.target = Math.min(this.section + 1, Math.max(this.section - 1, this.target + delta));
    this.target = Math.min(this.count - 1, Math.max(0, this.target));
    this.animate();
  }

  // Fin de geste : on se cale sur la section suivante / précédente si on a assez poussé.
  private snap(velocity = 0): void {
    const { snapThreshold } = config.works;
    const diff = this.target - this.section;
    let s = this.section;
    if (diff > snapThreshold || velocity > 0.6) s += 1;
    else if (diff < -snapThreshold || velocity < -0.6) s -= 1;
    this.goTo(s);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Après un calage, on ignore la fin d'inertie du trackpad tant que les événements continuent.
    if (this.locked) {
      clearTimeout(this.lockTimer);
      this.lockTimer = window.setTimeout(() => (this.locked = false), 180);
      return;
    }
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    this.nudge(px / config.works.wheelPerSection);
    clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => {
      this.snap();
      this.locked = true;
      clearTimeout(this.lockTimer);
      this.lockTimer = window.setTimeout(() => (this.locked = false), 180);
    }, 140);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0].clientY;
    this.touchT = performance.now();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY === null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    this.nudge((this.touchY - y) / (window.innerHeight * config.works.touchPerSection));
    this.touchY = y;
  };

  private onTouchEnd = () => {
    if (this.touchY === null) return;
    const dt = Math.max(1, performance.now() - this.touchT);
    const velocity = ((this.target - this.section) / dt) * 1000; // sections / s sur tout le geste
    this.touchY = null;
    this.snap(velocity);
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
    action();
  };

  // Boucle d'animation, active seulement tant que p n'a pas rejoint la cible.
  private animate(): void {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const speed = this.reduced.matches ? config.works.followReduced : config.works.follow;
    this.p += (this.target - this.p) * (1 - Math.exp(-speed * dt));
    if (Math.abs(this.target - this.p) < 0.0005) this.p = this.target;
    this.emit();
    this.frame = this.p === this.target ? 0 : requestAnimationFrame(this.tick);
  };

  private emit(): void {
    for (const fn of this.listeners) fn(this.p);
  }
}

export const nav = new Nav();
