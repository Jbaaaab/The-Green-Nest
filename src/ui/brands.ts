import { config } from '../config';
import { nav } from '../nav';
import logos from './brands.generated.json';
import { readUnit } from './unit';
import '../styles/brands.css';

/**
 * Popup « Brands » (demande du DA) : les marques avec lesquelles il a travaillé, en pong. Terrain blanc aux
 * lignes vertes façon tennis ; le joueur (vert, à droite) suit la souris, l'adversaire (rose, à gauche) joue
 * seul. La balle est un logo : il change à chaque rebond (raquette ou mur) et prend la couleur du dernier qui
 * l'a frappé. Au centre, « BRANDS / I'VE COOKED / WITH » (maquette). Sur un écran en hauteur (mobile), le
 * terrain est vertical : le joueur en bas, au doigt. Chargé seulement au premier clic sur « Brands ».
 */
type Side = 'player' | 'cpu';
type Sprite = { name: string; ratio: number; tint: Record<Side, HTMLCanvasElement> | null };

const gap = (n: number) => ' '.repeat(n);
const LINES = ['BRANDS', `I’VE${gap(10)}COOKED`, 'WITH']; // trou mesuré sur la maquette (10 espaces)
const DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

let game: BrandsGame | null = null;

/** Ouvre la popup (créée au premier clic). trigger : l'élément qui reprend le focus à la fermeture. */
export function openBrands(trigger?: HTMLElement): void {
  (game ??= new BrandsGame()).open(trigger ?? null);
  if (import.meta.env.DEV) Object.assign(window, { __brands: game }); // pour les tests
}

class BrandsGame {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private text: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private sprites: Sprite[];
  private trigger: HTMLElement | null = null;
  private frame = 0;
  private last = 0;
  private isOpen = false;

  // Terrain (px écran). Horizontal : raquettes à gauche (adversaire) et à droite (joueur) ; vertical : en haut et en bas.
  private court = { x: 0, y: 0, w: 0, h: 0 };
  private vertical = false;
  private u = 1;
  private k = 1; // tailles : 1 sur desktop, plus petit sur mobile
  private hole = { x: 0, y: 0, w: 0, h: 0 }; // le texte du centre : les lignes s'interrompent autour

  // Le jeu se calcule le long du terrain (a : d'une raquette à l'autre) et en travers (c), en px écran.
  private ball = { a: 0, c: 0, va: 0, vc: 0, w: 0, h: 0, sprite: 0, by: 'cpu' as Side, pop: 0 };
  private paddles: Record<Side, number> = { player: 0, cpu: 0 }; // centre de chaque raquette, en travers
  private target = 0; // là où le joueur veut sa raquette (souris, doigt, flèches)
  private speed = 0;
  private serveIn = 0;
  private aim = 0; // erreur de visée de l'adversaire pour l'échange en cours

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'brands';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Brands I’ve cooked with');

    this.text = document.createElement('p');
    this.text.className = 'brands__text';
    for (const line of LINES) {
      const span = document.createElement('span');
      span.textContent = line;
      this.text.append(span);
    }
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'brands__court';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d')!;

    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.className = 'brands__close';
    this.closeBtn.textContent = 'Close';
    this.closeBtn.addEventListener('click', () => this.close());

    // Les marques, lisibles par les lecteurs d'écran et les moteurs de recherche.
    const list = document.createElement('ul');
    list.className = 'sr-only';
    for (const logo of logos) {
      const li = document.createElement('li');
      li.textContent = logo.name;
      list.append(li);
    }
    this.root.append(this.text, this.canvas, this.closeBtn, list);
    document.body.append(this.root);

    // Logos : chargés maintenant, teintés une fois pour toutes en vert et en rose.
    this.sprites = logos.map((logo) => ({ name: logo.name, ratio: logo.ratio, tint: null }));
    logos.forEach((logo, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const tint = (color: string) => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const x = c.getContext('2d')!;
          x.drawImage(img, 0, 0);
          x.globalCompositeOperation = 'source-in';
          x.fillStyle = color;
          x.fillRect(0, 0, c.width, c.height);
          return c;
        };
        this.sprites[i].tint = { player: tint(config.brands.player), cpu: tint(config.brands.cpu) };
      };
      img.src = logo.src;
    });

    this.root.addEventListener('pointermove', this.onPointer);
    this.root.addEventListener('pointerdown', this.onPointer);
    window.addEventListener('resize', () => this.isOpen && this.layout());
  }

  open(trigger: HTMLElement | null): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.trigger = trigger;
    this.root.hidden = false;
    document.documentElement.classList.add('is-brands');
    nav.locked = true;
    this.layout();
    this.reset();
    requestAnimationFrame(() => this.root.classList.add('is-open'));
    this.closeBtn.focus({ preventScroll: true });
    document.addEventListener('keydown', this.onKey);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('is-open');
    document.documentElement.classList.remove('is-brands');
    nav.locked = false;
    document.removeEventListener('keydown', this.onKey);
    cancelAnimationFrame(this.frame);
    setTimeout(() => {
      if (!this.isOpen) this.root.hidden = true;
    }, 300);
    this.trigger?.focus({ preventScroll: true });
  }

  // Terrain : le cadre des pages projets sur desktop (1320×749), le cadre mobile sinon (vertical).
  private layout(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const u = (this.u = readUnit());
    const mobile = W < 768;
    this.k = mobile ? config.brands.mobileBall : 1;
    if (!mobile && W >= H) {
      const w = 1320 * u;
      const h = 749 * u;
      this.court = { x: (W - w) / 2, y: (H - h) / 2 + 0.5 * u, w, h };
    } else {
      const m = config.works.box.mobile;
      this.court = { x: m.side * u, y: m.top * u, w: W - 2 * m.side * u, h: H - (m.top + m.bottom) * u };
    }
    this.vertical = this.court.h > this.court.w;
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Texte au centre du terrain ; les lignes s'arrêtent un peu avant lui.
    const cx = this.court.x + this.court.w / 2;
    const cy = this.court.y + this.court.h / 2;
    Object.assign(this.text.style, { left: `${cx}px`, top: `${cy}px` });
    const r = this.text.getBoundingClientRect();
    const pad = 14 * u;
    this.hole = { x: r.left - pad, y: r.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad };
    this.ballSize();
    this.ball.c = clamp(this.ball.c, 0, this.cross());
    this.ball.a = clamp(this.ball.a, 0, this.along());
  }

  private along = () => (this.vertical ? this.court.h : this.court.w);
  private cross = () => (this.vertical ? this.court.w : this.court.h);
  // Demi-tailles de la balle le long du terrain et en travers.
  private ha = () => (this.vertical ? this.ball.h : this.ball.w) / 2;
  private hc = () => (this.vertical ? this.ball.w : this.ball.h) / 2;
  private paddle() {
    const p = config.brands.paddle;
    const k = this.k === 1 ? 1 : config.brands.mobilePaddle;
    return { len: p.length * this.u * k, thick: p.thickness * this.u * k, inset: p.inset * this.u * k };
  }

  // Taille du logo-balle : même surface quel que soit son format, dans les limites.
  private ballSize(): void {
    const { ballArea, ballMax } = config.brands;
    const s = this.sprites[this.ball.sprite];
    const u = this.u * this.k;
    let w = Math.sqrt(ballArea * s.ratio) * u;
    let h = w / s.ratio;
    if (w > ballMax[0] * u) [w, h] = [ballMax[0] * u, (ballMax[0] * u) / s.ratio];
    if (h > ballMax[1] * u) [w, h] = [ballMax[1] * u * s.ratio, ballMax[1] * u];
    this.ball.w = w;
    this.ball.h = h;
  }

  // Un autre logo (jamais le même deux fois de suite), à chaque rebond.
  private bounce(): void {
    const n = this.sprites.length;
    this.ball.sprite = (this.ball.sprite + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.ballSize();
    this.ball.pop = 1;
    this.ball.c = clamp(this.ball.c, this.hc(), this.cross() - this.hc());
  }

  // Nouvel échange : balle au centre, service vers le joueur après une courte pause.
  private reset(): void {
    this.ball.a = this.along() / 2;
    this.ball.c = this.cross() / 2;
    this.ball.va = this.ball.vc = 0;
    this.ball.by = 'cpu';
    this.ball.sprite = Math.floor(Math.random() * this.sprites.length);
    this.ballSize();
    this.paddles.player = this.paddles.cpu = this.target = this.cross() / 2;
    this.serveIn = config.brands.serveDelay;
  }

  private serve(): void {
    this.speed = config.brands.speed * this.along();
    const angle = (Math.random() * 2 - 1) * 25 * DEG;
    this.ball.va = this.speed * Math.cos(angle);
    this.ball.vc = this.speed * Math.sin(angle);
    this.aim = (Math.random() * 2 - 1) * config.brands.cpuError * this.paddle().len;
  }

  // Frappe : la balle repart selon l'endroit où elle touche la raquette, un peu plus vite, à la couleur du frappeur.
  private hit(side: Side): void {
    const { len } = this.paddle();
    const { speedUp, maxSpeed, maxAngle, cpuError } = config.brands;
    this.bounce();
    const offset = clamp((this.ball.c - this.paddles[side]) / (len / 2 + this.hc()), -1, 1);
    const angle = offset * maxAngle * DEG;
    this.speed = Math.min(this.speed * speedUp, maxSpeed * config.brands.speed * this.along());
    const dir = side === 'cpu' ? 1 : -1;
    this.ball.va = dir * this.speed * Math.cos(angle);
    this.ball.vc = this.speed * Math.sin(angle);
    this.ball.by = side;
    if (side === 'player') this.aim = (Math.random() * 2 - 1) * cpuError * len; // nouvelle erreur de visée
  }

  private step(dt: number): void {
    const L = this.along();
    const C = this.cross();
    const { len, thick, inset } = this.paddle();
    const b = this.ball;
    b.pop = Math.max(0, b.pop - dt * 6);

    // Le joueur suit la souris (à peine lissé) ; l'adversaire suit la balle quand elle vient vers lui.
    this.paddles.player += (clamp(this.target, len / 2, C - len / 2) - this.paddles.player) * (1 - Math.exp(-30 * dt));
    const goal = b.va < 0 ? b.c + this.aim : C / 2;
    const max = config.brands.cpuSpeed * C * dt;
    this.paddles.cpu = clamp(this.paddles.cpu + clamp(goal - this.paddles.cpu, -max, max), len / 2, C - len / 2);

    if (this.serveIn > 0) {
      this.serveIn -= dt;
      if (this.serveIn <= 0) this.serve();
      return;
    }
    b.a += b.va * dt;
    b.c += b.vc * dt;

    // Murs (les côtés du terrain).
    if (b.c - this.hc() < 0) {
      b.c = this.hc();
      b.vc = Math.abs(b.vc);
      this.bounce();
    } else if (b.c + this.hc() > C) {
      b.c = C - this.hc();
      b.vc = -Math.abs(b.vc);
      this.bounce();
    }

    // Raquettes : l'adversaire du côté a = 0, le joueur du côté a = L.
    const near = (side: Side) => Math.abs(b.c - this.paddles[side]) <= len / 2 + this.hc();
    if (b.va < 0 && b.a - this.ha() <= inset + thick && b.a + this.ha() >= inset && near('cpu')) {
      this.hit('cpu');
      b.a = inset + thick + this.ha();
    } else if (b.va > 0 && b.a + this.ha() >= L - inset - thick && b.a - this.ha() <= L - inset && near('player')) {
      this.hit('player');
      b.a = L - inset - thick - this.ha();
    }

    // Point : la balle sort du terrain, on rejoue.
    if (b.a + this.ha() < -40 * this.u || b.a - this.ha() > L + 40 * this.u) this.reset();
  }

  // Coordonnées (le long, en travers) → écran.
  private pt(a: number, c: number): [number, number] {
    const { x, y } = this.court;
    return this.vertical ? [x + c, y + a] : [x + a, y + c];
  }

  private draw(): void {
    const ctx = this.ctx;
    const u = this.u;
    const L = this.along();
    const C = this.cross();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Lignes du terrain, façon tennis (interrompues autour du texte du centre).
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, window.innerWidth, window.innerHeight);
    ctx.rect(this.hole.x, this.hole.y, this.hole.w, this.hole.h);
    ctx.clip('evenodd');
    ctx.strokeStyle = config.brands.player;
    ctx.lineWidth = config.brands.line * u;
    const line = (a0: number, c0: number, a1: number, c1: number) => {
      ctx.moveTo(...this.pt(a0 * L, c0 * C));
      ctx.lineTo(...this.pt(a1 * L, c1 * C));
    };
    ctx.beginPath();
    line(0, 0, 1, 0); // le cadre
    line(1, 0, 1, 1);
    line(1, 1, 0, 1);
    line(0, 1, 0, 0);
    line(0, 0.125, 1, 0.125); // couloirs du simple
    line(0, 0.875, 1, 0.875);
    line(0.231, 0.125, 0.231, 0.875); // lignes de service
    line(0.769, 0.125, 0.769, 0.875);
    line(0.231, 0.5, 0.769, 0.5); // ligne médiane de service
    line(0, 0.5, 0.018, 0.5); // marques centrales
    line(0.982, 0.5, 1, 0.5);
    ctx.stroke();
    // Le filet, en pointillés (c'est un pong).
    ctx.beginPath();
    ctx.setLineDash([8 * u, 8 * u]);
    line(0.5, 0, 0.5, 1);
    ctx.stroke();
    ctx.restore();

    // Raquettes.
    const { len, thick, inset } = this.paddle();
    for (const side of ['cpu', 'player'] as Side[]) {
      const a = side === 'cpu' ? inset : L - inset - thick;
      const [x0, y0] = this.pt(a, this.paddles[side] - len / 2);
      const [x1, y1] = this.pt(a + thick, this.paddles[side] + len / 2);
      ctx.fillStyle = config.brands[side];
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }

    // La balle : le logo, à la couleur du dernier qui l'a frappée ; petit « pop » à chaque rebond.
    const tint = this.sprites[this.ball.sprite].tint;
    if (tint) {
      const s = 1 + 0.2 * this.ball.pop;
      const [x, y] = this.pt(this.ball.a, this.ball.c);
      const w = this.ball.w * s;
      const h = this.ball.h * s;
      ctx.drawImage(tint[this.ball.by], x - w / 2, y - h / 2, w, h);
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.draw();
    if (this.isOpen) this.frame = requestAnimationFrame(this.tick);
  };

  // La raquette du joueur suit la souris ou le doigt (en travers du terrain).
  private onPointer = (e: PointerEvent) => {
    this.target = this.vertical ? e.clientX - this.court.x : e.clientY - this.court.y;
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
    const step = this.paddle().len * 0.6;
    const back = this.vertical ? 'ArrowLeft' : 'ArrowUp';
    const fwd = this.vertical ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back || e.key === fwd) {
      e.preventDefault();
      this.target = clamp(this.paddles.player + (e.key === fwd ? step : -step), 0, this.cross());
    }
  };
}

