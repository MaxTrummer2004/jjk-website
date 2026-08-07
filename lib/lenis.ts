import type Lenis from "lenis";

/**
 * The live Lenis instance, set by components/smooth-scroll.tsx.
 *
 * Anything that needs to move the scroll position itself has to go through
 * Lenis rather than `window.scrollTo`: Lenis owns the scroll and will animate
 * straight back to where it thinks it should be otherwise.
 */
export const lenisRef: { current: Lenis | null } = { current: null };
