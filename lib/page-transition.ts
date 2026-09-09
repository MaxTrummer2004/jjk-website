import { flushSync } from "react-dom";

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
 * Navigiert zu einer neuen Route mit dem Stairs-Overlay-Übergang.
 *
 * Ablauf:
 * 1. DOM-Cover dunkel sofort (kein React-Overhead, kein Blackscreen).
 * 2. Nach 300ms: flushSync → Preloader mountet synchron unter dem Cover.
 * 3. Zwei rAF: Browser malt den Preloader — erst dann navigieren.
 * 4. Cover weg (Preloader gleiche Farbe, nahtlos).
 * 5. DismissTransition auf der Zielseite löst Stairs-Exit aus.
 *
 * Warum double-rAF nach flushSync: router.push() startet eine Concurrent
 * Transition die den Preloader-Render unterbrechen kann wenn sie sofort
 * nach flushSync kommt. Zwei rAF garantieren einen echten Browser-Paint.
 */
export function navigateWithTransition(push: (href: string) => void, href: string): void {
  const cover = document.createElement("div");
  cover.setAttribute("aria-hidden", "true");
  cover.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#030304;opacity:0;pointer-events:none;transition:opacity 0.3s ease-in;";
  document.body.appendChild(cover);
  requestAnimationFrame(() => { cover.style.opacity = "1"; });

  setTimeout(() => {
    flushSync(() => { triggerPageTransition(); });
    // Double rAF: Preloader ist gemalt bevor Navigation startet
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cover.remove();
        push(href);
      });
    });
  }, 320);
}
