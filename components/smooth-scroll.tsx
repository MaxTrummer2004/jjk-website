"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";

const LENIS_OPTIONS = {
  duration: 1.6,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical" as const,
  gestureOrientation: "vertical" as const,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
};

const DESKTOP_MQ = "(min-width: 640px)";

function startLenis(): () => void {
  const lenis = new Lenis(LENIS_OPTIONS);
  lenisRef.current = lenis;

  function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  return () => {
    lenisRef.current = null;
    lenis.destroy();
  };
}

export function SmoothScroll({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const mq = window.matchMedia(DESKTOP_MQ);
    let destroyLenis: (() => void) | null = null;

    if (mq.matches) {
      destroyLenis = startLenis();
    }

    const onChange = (e: MediaQueryListEvent): void => {
      if (e.matches) {
        destroyLenis = startLenis();
      } else {
        destroyLenis?.();
        destroyLenis = null;
      }
    };

    mq.addEventListener("change", onChange);

    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const lenis = lenisRef.current;

      // On mobile Lenis is not running — let the browser handle anchors natively.
      if (!lenis) return;

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
      mq.removeEventListener("change", onChange);
      destroyLenis?.();
      destroyLenis = null;
    };
  }, []);

  return <>{children}</>;
}
