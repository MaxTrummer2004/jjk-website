/**
 * One bit of shared state: is the title card's opening still running?
 *
 * The two pointer effects hand over at it. The ring cursor frames what you are
 * about to fly into while the opening is up; the ember plume takes the pointer
 * from the moment the camera has landed. They must never both be on screen, and
 * they live in different parts of the tree — the plume is mounted by
 * components/providers.tsx, above everything, and the thing that knows when the
 * opening ends is components/hero.tsx, well below it.
 *
 * A module-level store rather than a context, for the same reason `lenisRef` in
 * lib/lenis.ts is one: it is a single value, written from one place, and
 * threading a provider through the tree for it would be more moving parts than
 * the fact deserves.
 *
 * It starts NOT done — both on the server and on the first client paint. The
 * only readers (components/site-nav.tsx, components/video-showcase.tsx) live on
 * the home page, which always has the hero, and the hero resolves this: it marks
 * it done when the intro finishes (or immediately for reduced motion / on a
 * client-side return, where the module value is already `true` from the earlier
 * run). Starting NOT done is what keeps the nav and the video HIDDEN in the very
 * first painted frame after a hard reload — otherwise they flash in for one
 * frame before the hero's effect runs and hides them again. (If a hero-less page
 * ever needs to read this, it would have to flip it done itself.)
 */

let done = false;
const listeners = new Set<() => void>();

export function subscribeOpening(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isOpeningDone(): boolean {
  return done;
}

/** For `useSyncExternalStore` — SSR renders the intro as NOT yet done, so the
 *  nav/video are hidden in the initial HTML and don't flash on reload. */
export function isOpeningDoneOnServer(): boolean {
  return false;
}

export function setOpeningDone(value: boolean): void {
  if (done === value) return;
  done = value;
  for (const cb of listeners) cb();
}
