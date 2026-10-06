import { config } from '../config';

// Met à jour chaque <time data-tz="..."> en HH:MM, synchronisé sur le changement de minute.
export function initClock(root: ParentNode = document): void {
  const els = [...root.querySelectorAll<HTMLTimeElement>('time[data-tz]')];
  if (!els.length) return;

  const formatters = els.map(
    (el) =>
      new Intl.DateTimeFormat(config.clock.locale, {
        timeZone: el.dataset.tz,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
  );

  const tick = () => {
    const now = new Date();
    els.forEach((el, i) => {
      el.textContent = formatters[i].format(now);
      el.dateTime = now.toISOString();
    });
    setTimeout(tick, 60_000 - (now.getTime() % 60_000));
  };

  tick();
}
