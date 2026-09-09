type Listener = () => void;

const triggerListeners: Listener[] = [];
const dismissListeners: Listener[] = [];

export function triggerPageTransition(): void {
  for (const l of triggerListeners) l();
}

export function dismissPageTransition(): void {
  for (const l of dismissListeners) l();
}

export function subscribePageTransition(l: Listener): () => void {
  triggerListeners.push(l);
  return () => {
    const i = triggerListeners.indexOf(l);
    if (i >= 0) triggerListeners.splice(i, 1);
  };
}

export function subscribePageTransitionDismiss(l: Listener): () => void {
  dismissListeners.push(l);
  return () => {
    const i = dismissListeners.indexOf(l);
    if (i >= 0) dismissListeners.splice(i, 1);
  };
}

/**
 * Navigiert mit Stairs-Overlay-Übergang.
 * push: Arrow-Wrapper um router.push — kein this-Binding-Verlust.
 *
 * Ablauf:
 * 1. DOM-Cover dunkel sofort (direktes DOM, kein React-Frame nötig).
 * 2. Nach 300ms: flushSync-Callback → Preloader mountet synchron unter Cover.
 * 3. Double-rAF: Browser malt Preloader — erst dann navigieren.
 * 4. Cover weg (Preloader gleiche Farbe, nahtlos).
 * 5. DismissTransition auf Zielseite löst Stairs-Exit aus.
 */
export function navigateWithTransition(
  push: (href: string) => void,
  href: string,
  trigger: () => void,
): void {
  const cover = document.createElement("div");
  cover.setAttribute("aria-hidden", "true");
  cover.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#030304;opacity:0;pointer-events:none;transition:opacity 0.3s ease-in;";
  document.body.appendChild(cover);
  requestAnimationFrame(() => { cover.style.opacity = "1"; });

  setTimeout(() => {
    trigger();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cover.remove();
        push(href);
      });
    });
  }, 320);
}
