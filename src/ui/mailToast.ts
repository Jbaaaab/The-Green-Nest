/**
 * « MAIL COPIED » (demande du DA) : au clic sur Mail, l'adresse est copiée (header.ts). Pendant deux secondes,
 * tout l'écran s'assombrit et se floute (un voile), une enveloppe 3D tourne pile au centre façon PS3
 * (src/scene/mailEnvelope.ts, dans le canvas), avec un halo flou autour ; dessous, « MAIL COPIED » dans le style
 * des autres textes (négatif : blanc sur le voile), qui se dissout en se floutant. Sans 3D : une enveloppe SVG.
 *
 * Empilement pendant l'animation (classe is-mail) : la page, puis la scène 3D figée (.mail-freeze, dessinée par
 * la 3D au clic), puis le voile qui floute les deux, puis le canvas, où seuls l'enveloppe et le curseur sont
 * dessinés, puis le texte. Vers la fin (MAIL_SCENE_BACK), la 3D revient en direct sous le voile qui s'efface.
 */
import { config } from '../config';
import { tr } from '../i18n';
import { tint } from './tint';

export const MAIL_TOAST_MS = config.mail.duration;
/** Part de la durée où la scène 3D revient sous le voile (il s'efface jusqu'à la fin : 80 %, base.css). */
export const MAIL_SCENE_BACK = 0.8;

let freeze: HTMLCanvasElement | null = null;
let veil: HTMLElement | null = null;
let text: HTMLElement | null = null;
let twins: HTMLElement[] = []; // le texte en dégradé blanc → vert → noir (src/ui/tint.ts)
let timer = 0;
let sceneTimer = 0;

function create(): void {
  const root = document.documentElement.style;
  root.setProperty('--mail-ms', `${MAIL_TOAST_MS}ms`);
  root.setProperty('--mail-dark', String(config.mail.veil.dark));
  root.setProperty('--mail-blur', String(config.mail.veil.blur));
  freeze = document.createElement('canvas');
  freeze.className = 'mail-freeze';
  freeze.setAttribute('aria-hidden', 'true');
  veil = document.createElement('div');
  veil.className = 'mail-toast';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = `
    <span class="mail-toast__halo"></span>
    <svg class="mail-toast__icon" viewBox="0 0 30 20"><rect x="1" y="1" width="28" height="18" rx="2"/><path d="M1.5 2 15 11.5 28.5 2"/></svg>`;
  text = document.createElement('p');
  text.className = 'mail-toast__text';
  text.setAttribute('role', 'status');
  document.body.append(freeze, veil, text);
  twins = tint(text);
}

/** Le canvas où la scène 3D est figée pendant l'animation (src/scene/mailEnvelope.ts y dessine au clic). */
export const mailFreeze = () => freeze;

export function initMailToast(): void {
  window.addEventListener('mail:copied', () => {
    if (!veil || !text) create();
    text!.textContent = tr({ en: 'MAIL COPIED', fr: 'MAIL COPIÉ' });
    // Relance l'animation à chaque clic (les jumeaux du texte aussi : ils doivent la jouer en même temps).
    const els = [veil!, text!, ...twins];
    for (const el of els) el.classList.remove('is-on');
    void text!.offsetWidth;
    for (const el of els) el.classList.add('is-on');
    const root = document.documentElement.classList;
    root.add('is-mail');
    clearTimeout(timer);
    clearTimeout(sceneTimer);
    sceneTimer = window.setTimeout(() => root.remove('is-mail'), MAIL_TOAST_MS * MAIL_SCENE_BACK);
    timer = window.setTimeout(() => {
      for (const el of els) el.classList.remove('is-on');
    }, MAIL_TOAST_MS);
  });
}
