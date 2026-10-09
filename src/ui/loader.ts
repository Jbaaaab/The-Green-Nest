import { config } from '../config';
import { readUnit } from './unit';

/**
 * Écran de chargement (demande du DA) : le pourcentage au centre, « cool kids love monsteras » dessous, et les
 * plantes 3D du footer qui poussent depuis le bas de l'écran au fil du chargement (feuilles qui se déplient,
 * fleurs rose poison qui éclosent à la fin) : src/scene/loaderPlants.ts, chargé tout de suite (Three.js sert
 * ensuite à la bague). Si la 3D ne peut pas démarrer, les plantes sont dessinées en SVG.
 * Le pourcentage suit les vraies étapes (polices, page, module 3D, bague prête) et avance doucement entre
 * elles ; à 100 %, les fleurs s'ouvrent, puis l'écran s'efface.
 */
const SVG = 'http://www.w3.org/2000/svg';
const MILESTONES = { fonts: 0.3, page: 0.55, module: 0.8, ready: 1 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (t: number) => (t <= 0 ? 0 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Grown = { el: SVGGElement; at: number }; // feuille ou fleur, qui sort quand la tige atteint `at`
type Plant = { paths: SVGPathElement[]; length: number; delay: number; leaves: Grown[]; flower: SVGGElement | null };

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const node = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

// Les tiges : réparties sur la largeur, hautes sur les côtés, basses sous le texte du milieu.
function grow(svg: SVGSVGElement): Plant[] {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const u = readUnit();
  const mobile = W < 768;
  const { green, pink } = config.footer.plants;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const rand = random(7);
  const count = mobile ? 8 : 16;
  const k = mobile ? 0.7 : 1;
  const plants: Plant[] = [];
  for (let i = 0; i < count; i++) {
    const x0 = W * ((i + 0.15 + 0.7 * rand()) / count);
    const side = mobile ? 0.35 : Math.min(1, Math.max(0, (Math.abs(x0 - W / 2) - 260 * u) / (220 * u)));
    const low = H / 2 + 70 * u; // sous le texte du centre
    const top = lerp(low + (H - low) * 0.45 * rand(), H * (0.18 + 0.2 * rand()), side);
    const height = H - top;
    const lean = ((x0 - W / 2) / W) * (0.4 + 0.5 * rand()) * height;
    const wave = (10 + 22 * rand()) * u * k;
    const freq = 1 + 1.5 * rand();
    const phase = rand() * Math.PI * 2;
    let d = '';
    for (let j = 0; j <= 28; j++) {
      const t = j / 28;
      const x = x0 + lean * t * t + wave * Math.sin(phase + t * freq * Math.PI) * t;
      const y = H + 4 - height * t;
      d += `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const w = (3 + 1.5 * rand()) * u * k;
    const stem = node('path', { d, fill: 'none', stroke: green, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    // Reflet de la laque, un peu décalé sur la tige.
    const shine = node('path', { d, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.45, 'stroke-width': w * 0.3, 'stroke-linecap': 'round', transform: `translate(${-w * 0.22} 0)` });
    svg.append(stem, shine);
    const length = stem.getTotalLength();
    for (const p of [stem, shine]) p.setAttribute('stroke-dasharray', `${length} ${length}`);

    // Feuilles alternées : une ellipse pointue, la nervure plus claire.
    const leaves: Grown[] = [];
    const n = Math.max(1, Math.round(lerp(2, 5, rand()) * Math.min(1, height / (300 * u))));
    for (let j = 0; j < n; j++) {
      const at = lerp(0.2, 0.78, (j + 0.3 + 0.4 * rand()) / n);
      const p = stem.getPointAtLength(at * length);
      const q = stem.getPointAtLength(Math.min(length, at * length + 2));
      const dir = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      const size = (16 + 14 * rand()) * u * k;
      const angle = dir + (j % 2 ? 1 : -1) * lerp(45, 70, rand());
      const g = node('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})` });
      const inner = node('g', { transform: 'scale(0)' });
      inner.append(
        node('path', { d: `M0 0 Q${size * 0.45} ${-size * 0.32} ${size} 0 Q${size * 0.45} ${size * 0.32} 0 0Z`, fill: green }),
        node('path', { d: `M${size * 0.08} 0 L${size * 0.8} 0`, stroke: '#ffffff', 'stroke-opacity': 0.45, 'stroke-width': 1 * u }),
      );
      g.append(inner);
      svg.append(g);
      leaves.push({ el: inner, at });
    }

    // Fleur au bout (la plupart) : deux couronnes de pétales roses, cœur vert.
    let flower: SVGGElement | null = null;
    if (rand() < 0.75) {
      const tip = stem.getPointAtLength(length);
      const r = (13 + 10 * rand()) * u * k;
      const g = node('g', { transform: `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)})` });
      flower = node('g', { transform: 'scale(0)' });
      const turn = rand() * 72;
      for (const [count, len, offset, opacity] of [[6, 1, 0, 1], [5, 0.62, 36, 0.85]] as const) {
        for (let j = 0; j < count; j++) {
          flower.append(
            node('ellipse', { cx: r * 0.5 * len, cy: 0, rx: r * 0.5 * len, ry: r * 0.26 * len, fill: pink, 'fill-opacity': opacity, transform: `rotate(${turn + offset + (j * 360) / count})` }),
          );
        }
      }
      flower.append(node('circle', { r: r * 0.2, fill: green }));
      g.append(flower);
      svg.append(g);
    }
    plants.push({ paths: [stem, shine], length, delay: 0.35 * rand(), leaves, flower });
  }
  return plants;
}

export function startLoader(): void {
  const root = document.querySelector<HTMLElement>('.loader');
  if (!root) return;
  const svg = root.querySelector<SVGSVGElement>('.loader__plants')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.loader__canvas')!;
  const pct = root.querySelector<HTMLElement>('.loader__pct')!;
  const line = root.querySelector<HTMLElement>('.loader__line')!;

  // Plantes 3D dès que Three.js est là ; en SVG (secours) si la 3D ne peut pas démarrer.
  let plants: Plant[] = [];
  let svgOn = false;
  let stop3d: (() => void) | null = null;
  let finished = false;
  const resize = () => {
    if (svgOn) plants = grow(svg);
  };
  window.addEventListener('resize', resize);
  const fallback = () => {
    if (finished || svgOn) return;
    svgOn = true;
    canvas.remove();
    plants = grow(svg);
  };
  requestAnimationFrame(() =>
    import('../scene/loaderPlants')
      .then(({ startLoaderPlants }) => {
        if (finished) return;
        const textBottom = () => line.getBoundingClientRect().bottom - window.innerHeight / 2;
        stop3d = startLoaderPlants(canvas, () => shown, textBottom);
      })
      .catch(fallback),
  );

  // Étapes réelles du chargement ; entre deux, le pourcentage avance doucement sans jamais s'arrêter.
  let target = 0.06;
  let since = performance.now();
  const reach = (v: number) => {
    if (v > target) {
      target = v;
      since = performance.now();
    }
  };
  document.fonts?.ready.then(() => reach(MILESTONES.fonts));
  const onLoad = () => {
    reach(MILESTONES.page);
    setTimeout(() => reach(MILESTONES.ready), 9000); // filet de sécurité : 3D absente ou très lente
  };
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });
  window.addEventListener('stage:module', () => reach(MILESTONES.module), { once: true });
  window.addEventListener('stage:ready', () => reach(MILESTONES.ready), { once: true });

  let shown = 0;
  let last = performance.now();
  let doneAt = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const creep = target >= 1 ? 1 : Math.min(target + 0.15, 0.97, target + ((now - since) / 1000) * 0.05);
    shown += (creep - shown) * (1 - Math.exp(-4 * dt));
    if (target >= 1 && shown > 0.995) shown = 1;
    pct.textContent = `${Math.round(shown * 100)}%`;

    // Les tiges poussent jusqu'à 85 %, les fleurs éclosent sur la fin.
    for (const plant of plants) {
      const g = clamp01((shown - plant.delay) / (0.85 - plant.delay));
      for (const p of plant.paths) p.setAttribute('stroke-dashoffset', String(plant.length * (1 - g)));
      for (const leaf of plant.leaves) leaf.el.setAttribute('transform', `scale(${easeOutBack(clamp01((g - leaf.at) / 0.15)).toFixed(3)})`);
      if (plant.flower) {
        const b = easeOutBack(clamp01((shown - 0.82) / 0.18));
        plant.flower.setAttribute('transform', `rotate(${((1 - b) * -60).toFixed(1)}) scale(${b.toFixed(3)})`);
      }
    }

    // À 100 % : on laisse les fleurs s'ouvrir un instant, puis l'écran s'efface.
    if (shown === 1 && !doneAt) doneAt = now;
    if (doneAt && now - doneAt > 450) {
      finished = true;
      root.classList.add('is-done');
      document.documentElement.classList.add('is-loaded');
      window.removeEventListener('resize', resize);
      setTimeout(() => {
        stop3d?.();
        root.remove();
      }, 800);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
