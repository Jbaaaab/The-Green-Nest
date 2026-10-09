import { config } from '../config';
import { nav } from '../nav';
import media from '../works/media.generated.json';
import { Glow } from '../works/glow';
import logos from './brands.generated.json';
import { readUnit } from './unit';
import '../styles/brands.css';

/**
 * Popup « Brands » (demande du DA) : les marques avec lesquelles il a travaillé, en pong, sur un terrain de foot.
 * En fond, le case vidéo (avec son halo flou) ; les lignes du terrain en blanc translucide ; la balle est un
 * logo en blanc négatif, qui change à chaque rebond (raquette ou mur). Le joueur (raquette verte, à droite)
 * suit la souris, l'adversaire (rose, à gauche) joue seul. Le terrain s'incline un peu vers la balle. Si le
 * joueur rate la balle : Chaewon (pistolet en main), « YOU LOST / YOU OWE ME THE JOB NOW ». Au centre, « BRANDS / I'VE COOKED /
 * WITH » (maquette). Sur un écran en hauteur (mobile), le terrain est vertical : le joueur en bas, au doigt.
 * Chargé seulement au premier clic sur « Brands ».
 */
type Side = 'player' | 'cpu';

const gap = (n: number) => ' '.repeat(n);
const LINES = ['BRANDS', `I’VE${gap(10)}COOKED`, 'WITH']; // trou mesuré sur la maquette (10 espaces)
const DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// Terrain de foot (105 × 68 m), en fractions de la longueur (le long : d'un but à l'autre) et de la largeur.
const PITCH = {
  box: { depth: 16.5 / 105, width: 40.32 / 68 }, // surface de réparation
  goal: { depth: 5.5 / 105, width: 18.32 / 68 }, // surface de but
  spot: 11 / 105, // point de penalty
  circle: 9.15 / 68, // rayon du rond central et des arcs (en largeur de terrain)
  corner: 1 / 68, // arcs de coin
};

let game: BrandsGame | null = null;

/** Ouvre la popup (créée au premier clic). trigger : l'élément qui reprend le focus à la fermeture. */
export function openBrands(trigger?: HTMLElement): void {
  (game ??= new BrandsGame()).open(trigger ?? null);
  if (import.meta.env.DEV) Object.assign(window, { __brands: game }); // pour les tests
}

class BrandsGame {
  private root: HTMLElement;
  private board: HTMLElement; // tout ce qui s'incline : terrain, lignes, texte, balle
  private field: HTMLElement; // le case vidéo, à la taille du terrain, avec son halo
  private video: HTMLVideoElement;
  private glow: Glow;
  private glowTimer = 0;
  private lines: HTMLCanvasElement;
  private ballLayer: HTMLCanvasElement; // en mode différence : la balle en blanc négatif
  private blur: HTMLCanvasElement; // la vidéo, minuscule et floutée, agrandie au terrain
  private lostTilt: HTMLElement;
  private pointer = { x: 0, y: 0 }; // position de la souris (écran)
  private paddleEls: Record<Side, HTMLElement>;
  private text: HTMLElement;
  private lost: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private sprites: (HTMLImageElement | null)[];
  private trigger: HTMLElement | null = null;
  private frame = 0;
  private last = 0;
  private isOpen = false;
  private isLost = false;

  // Terrain (px écran). Horizontal : buts à gauche (adversaire) et à droite (joueur) ; vertical : en haut et en bas.
  private court = { x: 0, y: 0, w: 0, h: 0 };
  private vertical = false;
  private u = 1;
  private k = 1; // tailles : 1 sur desktop, plus petit sur mobile
  private hole = { x: 0, y: 0, w: 0, h: 0 }; // le texte du centre : les lignes s'interrompent autour
  private tilt = { x: 0, y: 0 }; // inclinaison actuelle du terrain (degrés)

  // Le jeu se calcule le long du terrain (a : d'un but à l'autre) et en travers (c), en px écran.
  private ball = { a: 0, c: 0, va: 0, vc: 0, w: 0, h: 0, sprite: 0, pop: 0 };
  private paddles: Record<Side, number> = { player: 0, cpu: 0 }; // centre de chaque raquette, en travers
  private target = 0; // là où le joueur veut sa raquette (souris, doigt, flèches)
  private speed = 0;
  private serveIn = 0;
  private aim = 0; // erreur de visée de l'adversaire pour l'échange en cours

  constructor() {
    const el = (tag: string, cls: string) => {
      const e = document.createElement(tag);
      e.className = cls;
      return e;
    };
    this.root = el('div', 'brands');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Brands I’ve cooked with');

    this.board = el('div', 'brands__board');
    this.field = el('div', 'brands__field');
    this.video = document.createElement('video');
    Object.assign(this.video, { muted: true, loop: true, playsInline: true, preload: 'none', poster: media.videotape.main.poster });
    this.video.setAttribute('aria-hidden', 'true');
    // Fond ultra flou (demande du DA) : la vidéo recopiée dans une image minuscule, floutée puis agrandie au
    // terrain. Presque gratuit, même sur mobile (un flou CSS de cette taille sur une vidéo coûterait cher).
    this.blur = document.createElement('canvas');
    this.blur.className = 'brands__blur';
    this.blur.setAttribute('aria-hidden', 'true');
    this.field.append(this.video, this.blur);
    this.glow = new Glow(this.field);
    this.video.addEventListener('loadeddata', () => this.glow.paint(this.video));

    const canvas = (cls: string) => {
      const c = el('canvas', cls) as HTMLCanvasElement;
      c.setAttribute('aria-hidden', 'true');
      return c;
    };
    this.lines = canvas('brands__lines');
    this.ballLayer = canvas('brands__ball');
    this.text = el('p', 'brands__text');
    for (const line of LINES) {
      const span = document.createElement('span');
      span.textContent = line;
      this.text.append(span);
    }
    this.paddleEls = { cpu: el('div', 'brands__paddle'), player: el('div', 'brands__paddle') };
    for (const side of ['cpu', 'player'] as Side[]) this.paddleEls[side].style.background = config.brands[side];
    this.board.append(this.field, this.lines, this.paddleEls.cpu, this.paddleEls.player, this.text, this.ballLayer);

    // Perdu : Chaewon, et la dette. La photo s'incline avec la souris (comme le terrain).
    this.lost = el('div', 'brands__lost');
    this.lost.hidden = true;
    this.lost.innerHTML = `
      <figure class="brands__lost-card"><div class="brands__lost-tilt">
        <img src="/brands/you-lost.webp" alt="" width="368" height="445" />
        <figcaption class="brands__lost-text"><span>YOU LOST</span><span>NOW YOU OWE ME THE JOB</span></figcaption>
      </div></figure>
      <button class="brands__again" type="button">Play again</button>`;
    this.lostTilt = this.lost.querySelector<HTMLElement>('.brands__lost-tilt')!;

    // Un clic hors du terrain ferme la popup ; perdu, un clic sur le terrain relance la partie.
    this.root.addEventListener('click', (e) => {
      const t = e.target as Element;
      if (t.closest('.brands__close')) return;
      if (t.closest('.brands__again')) return this.replay();
      const { x, y, w, h } = this.court;
      const inside = e.clientX >= x && e.clientX <= x + w && e.clientY >= y && e.clientY <= y + h;
      if (!inside) this.close();
      else if (this.isLost) this.replay();
    });

    this.closeBtn = el('button', 'brands__close') as HTMLButtonElement;
    this.closeBtn.type = 'button';
    this.closeBtn.textContent = 'Close';
    this.closeBtn.addEventListener('click', () => this.close());

    // Les marques, lisibles par les lecteurs d'écran et les moteurs de recherche.
    const list = el('ul', 'sr-only');
    for (const logo of logos) {
      const li = document.createElement('li');
      li.textContent = logo.name;
      list.append(li);
    }
    this.root.append(this.board, this.lost, this.closeBtn, list);
    document.body.append(this.root);

    // Logos : masques blancs (la balle est dessinée telle quelle, en mode différence).
    this.sprites = logos.map(() => null);
    logos.forEach((logo, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => (this.sprites[i] = img);
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
    if (!this.video.src) this.video.src = media.videotape.main.video;
    this.video.play().catch(() => undefined);
    this.glowTimer = window.setInterval(() => this.glow.paint(this.video), 1000 / config.works.glow.videoFps);
    this.layout();
    this.replay();
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
    clearInterval(this.glowTimer);
    this.video.pause();
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
    const { x, y, w, h } = this.court;
    Object.assign(this.field.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    this.glow.resize(w, h, u);
    const res = config.brands.blur.size; // largeur de l'image floutée (px) : plus petit = plus flou
    this.blur.width = w >= h ? res : Math.max(8, Math.round((res * w) / h));
    this.blur.height = w >= h ? Math.max(8, Math.round((res * h) / w)) : res;
    this.board.style.transformOrigin = `${x + w / 2}px ${y + h / 2}px`; // il s'incline autour du centre du terrain
    const dpr = Math.min(window.devicePixelRatio, 2);
    for (const c of [this.lines, this.ballLayer]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Texte au centre du terrain (dans le rond central) ; les lignes s'arrêtent un peu avant lui.
    Object.assign(this.text.style, { left: `${x + w / 2}px`, top: `${y + h / 2}px` });
    const r = this.text.getBoundingClientRect();
    const pad = 12 * u;
    this.hole = { x: r.left - pad, y: r.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad };
    this.ballSize();
    this.ball.c = clamp(this.ball.c, 0, this.cross());
    this.ball.a = clamp(this.ball.a, 0, this.along());
    this.drawLines();
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
    const ratio = logos[this.ball.sprite].ratio;
    const u = this.u * this.k;
    let w = Math.sqrt(ballArea * ratio) * u;
    let h = w / ratio;
    if (w > ballMax[0] * u) [w, h] = [ballMax[0] * u, (ballMax[0] * u) / ratio];
    if (h > ballMax[1] * u) [w, h] = [ballMax[1] * u * ratio, ballMax[1] * u];
    this.ball.w = w;
    this.ball.h = h;
  }

  // Un autre logo (jamais le même deux fois de suite), à chaque rebond.
  private bounce(): void {
    const n = logos.length;
    this.ball.sprite = (this.ball.sprite + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.ballSize();
    this.ball.pop = 1;
    this.ball.c = clamp(this.ball.c, this.hc(), this.cross() - this.hc());
  }

  // Nouvelle partie : balle au centre, service vers le joueur après une courte pause.
  private replay(): void {
    this.isLost = false;
    this.lost.hidden = true;
    this.lost.classList.remove('is-shown');
    this.reset();
  }

  private reset(): void {
    this.ball.a = this.along() / 2;
    this.ball.c = this.cross() / 2;
    this.ball.va = this.ball.vc = 0;
    this.ball.sprite = Math.floor(Math.random() * logos.length);
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

  // Perdu : le joueur a laissé passer la balle.
  private lose(): void {
    this.isLost = true;
    this.lost.hidden = false;
    requestAnimationFrame(() => this.lost.classList.add('is-shown'));
  }

  // Frappe : la balle repart selon l'endroit où elle touche la raquette, un peu plus vite.
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

    // Le terrain s'incline un peu vers la balle (comme une caméra qui la suit) ; perdu, vers la souris.
    const { x: cx, y: cy, w: cw, h: ch } = this.court;
    const [pa, pc] = this.vertical ? [this.pointer.y - cy, this.pointer.x - cx] : [this.pointer.x - cx, this.pointer.y - cy];
    const na = clamp(((this.isLost ? pa : b.a) - L / 2) / (L / 2), -1, 1);
    const nc = clamp(((this.isLost ? pc : b.c) - C / 2) / (C / 2), -1, 1);
    const { along: ta, cross: tc } = config.brands.tilt;
    if (this.isLost) {
      // La photo de Chaewon s'incline aussi, un peu plus fort, vers la souris.
      const mx = clamp((this.pointer.x - (cx + cw / 2)) / (cw / 2), -1, 1);
      const my = clamp((this.pointer.y - (cy + ch / 2)) / (ch / 2), -1, 1);
      const t = config.brands.lostTilt;
      this.lostTilt.style.transform = `perspective(${900 * this.u}px) rotateX(${(my * t).toFixed(2)}deg) rotateY(${(-mx * t).toFixed(2)}deg)`;
    }
    const goalX = this.vertical ? na * ta : nc * tc; // rotateX : le haut ou le bas vient vers nous
    const goalY = this.vertical ? -nc * tc : -na * ta; // rotateY : la gauche ou la droite vient vers nous
    const ease = 1 - Math.exp(-config.brands.tilt.ease * dt);
    this.tilt.x += (goalX - this.tilt.x) * ease;
    this.tilt.y += (goalY - this.tilt.y) * ease;
    const persp = config.brands.tilt.perspective * this.u;
    this.board.style.transform = `perspective(${persp}px) rotateX(${this.tilt.x.toFixed(3)}deg) rotateY(${this.tilt.y.toFixed(3)}deg)`;

    if (this.isLost) return;
    if (this.serveIn > 0) {
      this.serveIn -= dt;
      if (this.serveIn <= 0) this.serve();
      return;
    }
    b.a += b.va * dt;
    b.c += b.vc * dt;

    // Murs (les lignes de touche).
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

    // Sortie : derrière l'adversaire, on rejoue ; derrière le joueur, il a perdu.
    if (b.a + this.ha() < -40 * this.u) this.reset();
    else if (b.a - this.ha() > L + 40 * this.u) this.lose();
  }

  // Coordonnées (le long, en travers) → écran.
  private pt(a: number, c: number): [number, number] {
    const { x, y } = this.court;
    return this.vertical ? [x + c, y + a] : [x + a, y + c];
  }

  // Les lignes du terrain de foot, en blanc translucide (interrompues autour du texte du centre).
  private drawLines(): void {
    const ctx = this.lines.getContext('2d')!;
    const u = this.u;
    const L = this.along();
    const C = this.cross();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, window.innerWidth, window.innerHeight);
    ctx.rect(this.hole.x, this.hole.y, this.hole.w, this.hole.h);
    ctx.clip('evenodd');
    ctx.strokeStyle = config.brands.lines;
    ctx.fillStyle = config.brands.lines;
    ctx.lineWidth = config.brands.line * u;
    const seg = (a0: number, c0: number, a1: number, c1: number) => {
      ctx.moveTo(...this.pt(a0, c0));
      ctx.lineTo(...this.pt(a1, c1));
    };
    // Rectangle (le long × en travers), en px du terrain.
    const rect = (a0: number, c0: number, a1: number, c1: number) => {
      seg(a0, c0, a1, c0);
      seg(a1, c0, a1, c1);
      seg(a1, c1, a0, c1);
      seg(a0, c1, a0, c0);
    };
    // Arc de cercle autour d'un point du terrain ; les angles sont mesurés depuis l'axe « le long ».
    const arc = (a: number, c: number, r: number, from: number, to: number) => {
      const [x, y] = this.pt(a, c);
      const base = this.vertical ? Math.PI / 2 : 0; // l'axe « le long » est vertical sur mobile
      ctx.moveTo(x + r * Math.cos(base + from), y + r * Math.sin(base + from));
      ctx.arc(x, y, r, base + from, base + to);
    };
    const r = PITCH.circle * C;
    ctx.beginPath();
    rect(0, 0, L, C); // lignes de touche et de but
    seg(L / 2, 0, L / 2, C); // ligne médiane
    arc(L / 2, C / 2, r, 0, Math.PI * 2); // rond central
    for (const end of [0, L]) {
      const dir = end === 0 ? 1 : -1; // vers le centre
      const box = (depth: number, width: number) => rect(end, ((1 - width) / 2) * C, end + dir * depth * L, ((1 + width) / 2) * C);
      box(PITCH.box.depth, PITCH.box.width); // surface de réparation
      box(PITCH.goal.depth, PITCH.goal.width); // surface de but
      // Arc de la surface : la partie du cercle (centré sur le point de penalty) qui dépasse de la surface.
      const spot = end + dir * PITCH.spot * L;
      const d = (PITCH.box.depth - PITCH.spot) * L;
      if (d < r) {
        const half = Math.acos(d / r);
        const toward = end === 0 ? 0 : Math.PI;
        arc(spot, C / 2, r, toward - half, toward + half);
      }
    }
    // Arcs de coin : un quart de cercle vers l'intérieur, aux quatre coins (à l'écran, quelle que soit l'orientation).
    const rc = Math.max(PITCH.corner * C, 6 * u);
    const { x, y, w, h } = this.court;
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      const a0 = cx === x ? 0 : Math.PI; // vers l'intérieur, à l'horizontale
      const a1 = cy === y ? Math.PI / 2 : -Math.PI / 2; // vers l'intérieur, à la verticale
      const ccw = (cx === x) !== (cy === y); // le petit arc entre les deux
      ctx.moveTo(cx + rc * Math.cos(a0), cy + rc * Math.sin(a0));
      ctx.arc(cx, cy, rc, a0, a1, ccw);
    }
    ctx.stroke();
    // Points : centre et penalty.
    for (const a of [L / 2, PITCH.spot * L, L - PITCH.spot * L]) {
      const [x, y] = this.pt(a, C / 2);
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private draw(): void {
    const ctx = this.ballLayer.getContext('2d')!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    // Raquettes : vert (joueur), rose (adversaire), hors du calque en différence pour garder leurs couleurs.
    const { len, thick, inset } = this.paddle();
    const L = this.along();
    for (const side of ['cpu', 'player'] as Side[]) {
      const a = side === 'cpu' ? inset : L - inset - thick;
      const [x0, y0] = this.pt(a, this.paddles[side] - len / 2);
      const [x1, y1] = this.pt(a + thick, this.paddles[side] + len / 2);
      Object.assign(this.paddleEls[side].style, {
        left: `${Math.min(x0, x1)}px`,
        top: `${Math.min(y0, y1)}px`,
        width: `${Math.abs(x1 - x0)}px`,
        height: `${Math.abs(y1 - y0)}px`,
      });
    }

    // La balle : le logo en blanc (le calque est en mode différence : blanc négatif) ; « pop » à chaque rebond.
    const img = this.sprites[this.ball.sprite];
    if (img) {
      const s = 1 + 0.2 * this.ball.pop;
      const [x, y] = this.pt(this.ball.a, this.ball.c);
      const w = this.ball.w * s;
      const h = this.ball.h * s;
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.draw();
    // Fond : l'image de la vidéo, minuscule et floutée (débordant un peu, pour que le flou ne pâlisse pas les bords).
    if (this.video.readyState >= 2) {
      const ctx = this.blur.getContext('2d')!;
      const { width: bw, height: bh } = this.blur;
      const m = Math.max(2, bw * 0.08);
      ctx.filter = `blur(${config.brands.blur.radius}px)`;
      ctx.drawImage(this.video, -m, -m, bw + 2 * m, bh + 2 * m);
    }
    if (this.isOpen) this.frame = requestAnimationFrame(this.tick);
  };

  // La raquette du joueur suit la souris ou le doigt (en travers du terrain).
  private onPointer = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.target = this.vertical ? e.clientX - this.court.x : e.clientY - this.court.y;
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
    if (this.isLost && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.replay();
      return;
    }
    const step = this.paddle().len * 0.6;
    const back = this.vertical ? 'ArrowLeft' : 'ArrowUp';
    const fwd = this.vertical ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back || e.key === fwd) {
      e.preventDefault();
      this.target = clamp(this.paddles.player + (e.key === fwd ? step : -step), 0, this.cross());
    }
  };
}
