"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenisRef } from "@/lib/lenis";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * ── Warum 1.0 und nicht 1.6 ─────────────────────────────────────────────────
 * Das ist die Nachlaufzeit: wie lange Lenis braucht, um die tatsaechliche
 * Scrollposition an die eingegebene heranzufuehren. Bei 1.6 Sekunden liegt
 * zwischen dem, was der Leser tut, und dem, was die Seite ist, fast eine
 * ganze Sekunde — und da JEDE Animation auf dieser Seite an der tatsaechlichen
 * Position haengt, kommt alles zu spaet. Es fuehlt sich nicht smooth an,
 * sondern als haenge die Seite hinterher, weil sie das tut.
 */
const LENIS_OPTIONS = {
  duration: 1.0,
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
    // through Lenis instead of fighting it — see components/hero.tsx.
    lenisRef.current = lenis;

    // ── Die Kopplung an ScrollTrigger ────────────────────────────────────
    // Sie hat gefehlt, und das war der Grund, warum Texte auf der ganzen Seite
    // zu spaet eingeflogen sind: Lenis lief in SEINER
    // requestAnimationFrame-Schleife, GSAP in seiner, und welche pro Bild
    // zuerst drankommt, entscheidet der Zufall. ScrollTrigger las damit eine
    // Position, die ein Bild alt war — plus den Nachlauf von Lenis obendrauf.
    //
    // Beide Zeilen zusammen loesen es, und nur zusammen:
    //   · `lenis.on("scroll", ScrollTrigger.update)` — ScrollTrigger rechnet
    //     genau dann neu, wenn Lenis die Position TATSAECHLICH geaendert hat,
    //     nicht wenn der Browser ein Scroll-Ereignis meldet.
    //   · Lenis in GSAPs Ticker — damit gibt es nur noch EINE Schleife, und
    //     die Reihenfolge innerhalb eines Bildes ist festgelegt statt
    //     zufaellig. `lagSmoothing(0)` schaltet GSAPs Nothilfe bei
    //     Bildaussetzern ab, die sonst Zeit ueberspringt und die beiden wieder
    //     auseinanderlaufen laesst.
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number): void => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Und einmal alles neu vermessen, wenn Bilder und Schriften da sind. Ohne
    // das stehen die Startpunkte auf den Hoehen, die das Layout VOR dem Laden
    // hatte — bei einer Seite, deren halbe Hoehe aus Bildern besteht, sind das
    // mehrere Bildschirme Unterschied.
    const refresh = (): void => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const late = window.setTimeout(refresh, 1200);
    void document.fonts?.ready.then(refresh);

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
      window.removeEventListener("load", refresh);
      window.clearTimeout(late);
      gsap.ticker.remove(tick);
      lenis.off("scroll", ScrollTrigger.update);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
