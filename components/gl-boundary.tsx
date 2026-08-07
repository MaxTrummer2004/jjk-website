"use client";

/**
 * GLBoundary — a WebGL effect is never allowed to take the page with it.
 *
 * ── Why ─────────────────────────────────────────────────────────────────────
 * A browser gives a page a limited number of live WebGL contexts, and when the
 * limit is reached it does not refuse the next one — it silently kills the
 * oldest. Anything still holding that context then finds itself talking to a
 * dead object, and the failure surfaces somewhere far away and unhelpful:
 *
 *   Cannot read properties of null (reading 'alpha')
 *
 * which is `postprocessing` doing `renderer.getContext().getContextAttributes()
 * .alpha` on a context that has been taken away. `getContextAttributes` returns
 * null on a lost context; the effect composer does not check.
 *
 * That threw during render, so React unmounted the whole tree and the site went
 * to an error screen because a decorative ripple on a photograph three screens
 * down could not have a canvas. The real fix is to hold fewer contexts — see
 * the mounting rules in components/about-3.tsx and the disposal in
 * components/fly-in.tsx — but "fewer" is a budget, and budgets are guesses
 * about hardware nobody controls. This is the part that does not have to guess.
 *
 * ── What it does ────────────────────────────────────────────────────────────
 * Catches, renders `fallback`, and says so in development. Deliberately does
 * NOT retry: whatever killed the context is still true a frame later, and a
 * boundary that remounts a failing subtree is an infinite loop with extra steps.
 *
 * A class, because that is still the only thing React lets catch a render
 * error.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

export interface GLBoundaryProps {
  children: ReactNode;
  /** What to show instead. For a visual effect this should be the plain thing. */
  fallback: ReactNode;
  /** Named in the development warning, so the log says which one gave up. */
  label?: string;
}

interface GLBoundaryState {
  failed: boolean;
}

export class GLBoundary extends Component<GLBoundaryProps, GLBoundaryState> {
  override state: GLBoundaryState = { failed: false };

  static getDerivedStateFromError(): GLBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === "production") return;
    console.warn(
      `[gl] ${this.props.label ?? "effect"} fell back to plain rendering:`,
      error.message,
      info.componentStack
    );
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default GLBoundary;
