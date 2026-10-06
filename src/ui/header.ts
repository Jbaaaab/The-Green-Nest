// Le bouton curseur du header émet `cursor:next` ; le curseur 3D (étape 5) l'écoutera.
export function initHeader(root: ParentNode = document): void {
  const cursorBtn = root.querySelector<HTMLButtonElement>('.cursor-btn');
  cursorBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cursor:next'));
  });
}
