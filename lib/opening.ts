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
 * It starts DONE. Pages without a hero — and the server render, which has no
 * idea — should behave as though the opening is over rather than waiting for
 * something that will never happen. The hero marks it undone while it is
 * mounted and done again when it lands or unmounts.
 */

let done = true;
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

/** For `useSyncExternalStore` — there is no opening on the server. */
export function isOpeningDoneOnServer(): boolean {
  return true;
}

export function setOpeningDone(value: boolean): void {
  if (done === value) return;
  done = value;
  for (const cb of listeners) cb();
}
