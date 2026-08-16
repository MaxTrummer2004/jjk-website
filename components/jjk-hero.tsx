"use client";

import { MagneticLink } from "@/components/magnetic-link";
import { softEase, useReducedMotion } from "@/lib/motion";
import Watercolor from "@/components/watercolor";
import { siteConfig } from "@/lib/config";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ── Der Scroll-Fade ──────────────────────────────────────────────────────
 * Framers `useScroll({ target, offset })` hat sich in diesem Repo wiederholt
 * als unzuverlaessig gezeigt — auch mit dem exakt gleichen Code wie in der
 * funktionierenden Vorlage, auch nach etlichen anderen Fixes. Statt weiter
 * auf diese Zielverfolgung zu vertrauen, liest dieser Hero die tatsaechliche
 * Position des eigenen Elements direkt: bei jedem "scroll"/"resize"-Ereignis
 * per `getBoundingClientRect()`, live, ohne zwischengespeicherte Hoehe, die
 * veralten koennte. `rect.top` ist 0, wenn der Hero ganz oben im Viewport
 * steht, und negativ, sobald man daran vorbeiscrollt — daraus direkt der
 * Scroll-Anteil, keine Umwege.
 */
export function JJKHero(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const scrollFraction = useMotionValue(0);

  useEffect(() => {
    const update = (): void => {
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = rect.height || 1;
      const fraction = Math.min(Math.max(-rect.top / height, 0), 1);
      scrollFraction.set(fraction);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollFraction]);

  // Bei 50% der eigenen Hoehe komplett verblasst — danach ist der Hero
  // wirklich weg (opacity 0), nicht nur fast.
  const scrollFade = useTransform(scrollFraction, [0, 0.5], [1, 0]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }
    const id = window.setTimeout(() => setRevealed(true), 150);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  const fadeUp = (delay: number) => ({
    initial: false as const,
    animate: revealed
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    transition: prefersReducedMotion
      ? { duration: 0.01 }
      : revealed
        ? { duration: 0.7, ease: softEase, delay: delay + 0.35 }
        : { duration: 0 },
  });

  return (
    <section
      ref={heroRef}
      className="bg-background-deep relative flex h-svh min-h-[640px] items-center justify-center"
      aria-label={siteConfig.fullName}
    >
      <motion.div
        style={{ opacity: prefersReducedMotion ? 1 : scrollFade }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          initial={false}
          animate={
            revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : revealed
                ? { duration: 1.3, ease: softEase, delay: 0.15 }
                : { duration: 0 }
          }
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1"
        >
          {/* -inset-1 statt inset-0: der WebGL-Canvas (r3f/ResizeObserver)
              hinkt der CSS-Groesse auf Mobile manchmal einen Frame hinterher,
              wenn die Adressleiste beim Swipen ein-/ausblendet — sichtbar als
              schwarzer/dunkler Rand rechts oder unten. 4px Ueberstand auf
              allen Seiten (durch overflow-x:hidden auf html/body ohnehin
              unsichtbar) puffert das ab. */}
          <Watercolor
            className="absolute inset-0"
            color1="#030304"
            color2="#7a1a08"
            saturation={0.65}
            brightness={0.04}
            opacity={1}
            speed={0.3}
            scale={0.8}
            driftSpeed={0.025}
            warpSpeed={0.05}
          />
        </motion.div>

        <div className="relative z-10 flex max-w-3xl flex-col items-center px-6 text-center">
          <motion.p
            {...fadeUp(0.1)}
            lang="ja"
            aria-hidden="true"
            className="text-foreground/50 mb-2 text-sm tracking-[0.3em] uppercase"
            style={{ fontFamily: "var(--font-jp)" }}
          >
            柔術廻戦
          </motion.p>
          <motion.h1
            {...fadeUp(0.2)}
            className="text-foreground mt-1 text-[clamp(44px,7.5vw,84px)] leading-[1.02] font-medium tracking-tight text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Jiu-Jitsu Kaisen Academy
          </motion.h1>
          <motion.p
            {...fadeUp(0.32)}
            className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed"
          >
            {siteConfig.tagline}
          </motion.p>
          <motion.div {...fadeUp(0.44)} className="mt-9 flex items-center gap-3">
            <MagneticLink
              href="#pricing"
              reduce={prefersReducedMotion}
              className="bg-foreground text-background inline-flex h-13 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Book a trial class
            </MagneticLink>
            <a
              href="#schedule"
              className="bg-background text-foreground border-border hover:bg-muted inline-flex h-13 items-center rounded-full border px-8 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Schedule
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
