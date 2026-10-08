import { config } from './config';

/**
 * Scroll vertical fluide (inertie, façon Lenis) sur toute la page : accueil puis projets empilés.
 * - Pas d'aimant : on scrolle librement.
 * - Arrêt net quand le texte d'un projet arrive au milieu de l'écran (une page alignée) :
 *   il faut un nouveau geste pour repartir (l'inertie du trackpad ne fait pas passer l'arrêt).
 * Toutes les animations lisent `scroll` (px) et `velocity` (px/s).
 */
// Une section peut avoir, après son arrêt, une zone de scroll où sa page reste fixe (holdOf) :
// - Social Media : la mosaïque défile vers la droite (longueur donnée par socialView.ts) ;
// - le footer (« hello », la dernière) : ses cartes s'envolent (config.footer.reveal, en hauteurs d'écran).
export const SECTION_IDS = ['', 'longtemps', 'formula-one', 'take-care', 'social-media', 'hello'] as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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
  private touchX = 0;
  private touchV = 0;
  private touchT = 0;

  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Hauteur d'une section (distance entre deux arrêts), en px. */
  get sectionHeight(): number {
    return window.innerHeight * config.works.spacing;
  }

  /** Position de l'arrêt de la section i (les zones fixes des sections précédentes s'ajoutent). */
  stopOf(i: number): number {
    let stop = i * this.sectionHeight;
    for (let j = 0; j < i; j++) stop += this.holdOf(j);
    return stop;
  }

  /** Longueur de la zone du footer après son arrêt (les cartes s'envolent), en px. */
  get footerReveal(): number {
    return window.innerHeight * config.footer.reveal;
  }

  /** Longueur de la zone fixe après l'arrêt de la section i, en px (0 = la page repart tout de suite). */
  holdOf(i: number): number {
    return i === this.count - 1 ? this.footerReveal : this.holds[i];
  }

  /**
   * Fixe la zone d'une section (recalculée au redimensionnement) ; garde la section affichée alignée.
   * horizontal : la page y défile de côté, les gestes horizontaux (trackpad, doigt) la font aussi avancer.
   */
  setHold(i: number, px: number, horizontal = false): void {
    if (horizontal) this.horizontal.add(i);
    if (Math.abs(this.holds[i] - px) < 0.5) return;
    const progress = this.holdProgress(this.section);
    this.holds[i] = px;
    this.scroll = this.target = this.stopOf(this.section) + progress * this.holdOf(this.section);
    this.emit();
  }

  /**
   * Décalage vertical de la page i, en px : < 0 elle arrive par le bas, 0 à l'arrêt et pendant
   * sa zone fixe, > 0 elle est repartie vers le haut.
   */
  offsetOf(i: number, scroll = this.scroll): number {
    const off = scroll - this.stopOf(i);
    return off > 0 ? Math.max(0, off - this.holdOf(i)) : off;
  }

  /** Avancée dans la zone fixe de la section i (0 → 1). */
  holdProgress(i: number, scroll = this.scroll): number {
    const hold = this.holdOf(i);
    return hold > 0 ? clamp01((scroll - this.stopOf(i)) / hold) : 0;
  }

  /** Position en sections (2,5 = entre la 2 et la 3), les zones fixes comptant comme l'arrêt. */
  position(scroll = this.scroll): number {
    for (let i = 0; i < this.count; i++) {
      if (scroll <= this.stopOf(i) + this.holdOf(i) || i === this.count - 1) return i + Math.min(0, this.offsetOf(i, scroll)) / this.sectionHeight;
    }
    return 0;
  }

  get max(): number {
    return this.stopOf(this.count - 1) + this.holdOf(this.count - 1);
  }

  private holds: number[] = SECTION_IDS.map(() => 0);
  private horizontal = new Set<number>();

  // Dans une zone qui défile de côté (ou à son arrêt) : un geste horizontal y compte comme un scroll.
  private sideways(): boolean {
    for (const i of this.horizontal) {
      if (this.target >= this.stopOf(i) - 1 && this.target <= this.stopOf(i) + this.holdOf(i) + 1) return true;
    }
    return false;
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
    const gates = this.gates();
    for (const stop of delta < 0 ? gates.reverse() : gates) {
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

  // Arrêts, dans l'ordre : celui de chaque section, plus les pauses dans les zones fixes.
  private gates(): number[] {
    const gates: number[] = [];
    for (let i = 0; i < this.count; i++) {
      gates.push(this.stopOf(i));
      for (const f of this.pauses[i]) gates.push(this.stopOf(i) + f * this.holdOf(i));
    }
    return gates;
  }

  /** Pauses dans la zone fixe de la section i (fractions de la zone) : le scroll s'y arrête comme à un arrêt. */
  setPauses(i: number, fractions: number[]): void {
    this.pauses[i] = fractions;
  }

  private pauses: number[][] = SECTION_IDS.map(() => []);

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
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) && this.sideways() ? e.deltaX : e.deltaY;
    const px = e.deltaMode === 1 ? delta * 32 : e.deltaMode === 2 ? delta * window.innerHeight : delta;
    this.push(px * config.works.wheelMultiplier);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0].clientY;
    this.touchX = e.touches[0].clientX;
    this.touchV = 0;
    this.touchT = performance.now();
    this.startGesture();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY === null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const now = performance.now();
    // Dans une zone qui défile de côté, un glissé horizontal fait avancer la page (vers la gauche = en avant).
    const side = Math.abs(this.touchX - x) > Math.abs(this.touchY - y) && this.sideways();
    const dy = (side ? this.touchX - x : this.touchY - y) * config.works.touchMultiplier;
    this.touchV = 0.8 * this.touchV + 0.2 * (dy / Math.max(1, now - this.touchT));
    this.touchY = y;
    this.touchX = x;
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
    const page = () => Math.round(this.position(this.target));
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

    const s = Math.min(this.count - 1, Math.round(this.position()));
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
