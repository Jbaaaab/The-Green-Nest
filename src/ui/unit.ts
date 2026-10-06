// Lit la valeur réelle de --u (1 px de maquette en px CSS) définie dans tokens.css,
// pour que le JS et le CSS partagent la même échelle.
let probe: HTMLDivElement | null = null;

export function readUnit(): number {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:calc(1000 * var(--u));height:0';
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().width / 1000;
}
