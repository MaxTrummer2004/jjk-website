"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";

/**
 * Duration/Easing wie in der Vorlage.
 */
const LENIS_OPTIONS = {
  duration: 1.6,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical" as const,
  gestureOrientation: "vertical" as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
};

export function SmoothScroll({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis(LENIS_OPTIONS);
    // Published so components that need to reposition the scroll can do it
    // through Lenis instead of fighting it.
    lenisRef.current = lenis;

    // Eigene rAF-Schleife, unabhaengig von GSAP — wie in der Vorlage. Kein
    // Intro-Lock mehr: unser Hero hat keinen Preload-Loader (Watercolor
    // braucht keinen), also gibt es auch nichts, auf das Lenis warten
    // muesste — vorher haengte das hier an einem `markIntroDone()`, das nie
    // jemand rief, und Lenis blieb permanent gestoppt.
    function raf(time: number): void {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      e.preventDefault();

      if (href === "#") {
        lenis.scrollTo(0, { offset: 0 });
        return;
      }

      if (href === "#contact") {
        lenis.scrollTo("bottom", { offset: 0 });
        return;
      }

      const element = document.querySelector(href);
      if (!element) return;

      lenis.scrollTo(element as HTMLElement, { offset: -100 });
    }

    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
