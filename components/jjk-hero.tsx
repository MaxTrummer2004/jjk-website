"use client";

// Ueberlebt client-seitige Navigation, wird bei Hard-Reload zurueckgesetzt.
// Verhindert, dass der Loader beim Zuruecknavigieren von /mitglieder erneut laeuft.
let introAlreadyPlayed = false;

import { MagneticLink } from "@/components/magnetic-link";
import { IntroLoader } from "@/components/intro-loader";
import { softEase, useReducedMotion } from "@/lib/motion";
import { setOpeningDone } from "@/lib/opening";
import Watercolor from "@/components/watercolor";
import { siteConfig } from "@/lib/config";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
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
  const [revealed, setRevealed] = useState(introAlreadyPlayed);
  const [loading, setLoading] = useState(!introAlreadyPlayed);
  const [progress, setProgress] = useState(introAlreadyPlayed ? 100 : 0);
  // introExited: true sobald AnimatePresence.onExitComplete gefeuert hat.
  // Hero-Canvas mountet erst dann — keine zwei WebGL-Layer gleichzeitig.
  const [introExited, setIntroExited] = useState(introAlreadyPlayed);
  const heroRef = useRef<HTMLElement>(null);
  const scrollFraction = useMotionValue(0);
  // Ab hier ist die Opacity (siehe scrollFade unten) schon laengst bei 0 —
  // der Canvas rendert bis dahin aber trotzdem jeden Frame weiter (r3f hat
  // keine "ist eh unsichtbar"-Erkennung). Genau in dem Moment, wenn man vom
  // Hero weiter zum Video scrollt, konkurriert dieses unsichtbare Rendern
  // mit der Scroll-getriebenen Berechnung der Video-Box um den Hauptthread
  // und laesst den Swipe ruckeln/haengenbleiben ("ein Swipe reicht nicht").
  // Etwas Puffer (0.6 statt exakt 0.5) gegen Flackern an der Fade-Grenze.
  const [showBackground, setShowBackground] = useState(true);
  const showBackgroundRef = useRef(true);

  useEffect(() => {
    let rafId: number | undefined;
    const flush = (): void => {
      rafId = undefined;
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = rect.height || 1;
      const fraction = Math.min(Math.max(-rect.top / height, 0), 1);
      scrollFraction.set(fraction);
      // setShowBackground aus dem Scroll-Pfad entfernt: MotionValue-Subscriber
      // unten liest showBackgroundRef und setzt State nur wenn noetig.
      const shouldShow = fraction < 0.6;
      if (showBackgroundRef.current !== shouldShow) {
        showBackgroundRef.current = shouldShow;
        setShowBackground(shouldShow);
      }
    };
    const schedule = (): void => {
      if (rafId === undefined) rafId = requestAnimationFrame(flush);
    };
    flush();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [scrollFraction]);

  // Bei 50% der eigenen Hoehe komplett verblasst — danach ist der Hero
  // wirklich weg (opacity 0), nicht nur fast.
  const scrollFade = useTransform(scrollFraction, [0, 0.5], [1, 0]);

  // ── Das Pinning ──────────────────────────────────────────────────────────
  // `position: sticky` statt manuell fixed→absolute: Die Section ist h-svh,
  // der Inhalt sticky top-0 h-svh — loest sich exakt dann, wenn die Section
  // komplett gescrollt ist (= scrollFraction 1). Kein compositor-layer Flush,
  // kein Reflow mitten im Scroll.
  // Der Inhalt ab fraction=0.5 pointer-events:none — "Book"/"Schedule" sollen
  // nach dem Fade keine Taps mehr abfangen.
  const pinPointerEvents = useTransform(scrollFraction, (v) =>
    v < 0.5 ? "auto" : "none"
  );

  // ── Intro-Loader ────────────────────────────────────────────────────────
  // Overflow sperren, solange Loader laeuft.
  useEffect(() => {
    if (!loading) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = prev; };
  }, [loading]);

  // Nav soll warten, bis Loader fertig ist — aber nur beim ersten Laden.
  // Bei client-seitiger Ruecknavigation ist introAlreadyPlayed true,
  // der Loader wird gar nicht angezeigt, Nav soll sofort einfahren.
  useEffect(() => {
    if (introAlreadyPlayed) return;
    setOpeningDone(false);
    return () => { setOpeningDone(true); };
  }, []);

  // prefers-reduced-motion: sofort auf 100 springen, dann Loader-Exit (0.01s)
  // ausloesen — onExitComplete kuemmert sich um introExited/opening/revealed.
  useEffect(() => {
    if (!prefersReducedMotion) return;
    setProgress(100);
    setLoading(false);
  }, [prefersReducedMotion]);

  // Progress-Counter: alle 30 ms +1 bis 100 (~3 s gesamt).
  useEffect(() => {
    if (!loading || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p + 1, 100));
    }, 30);
    return () => window.clearInterval(id);
  }, [loading, prefersReducedMotion]);

  // Bei 100: kurzer Hold, dann AnimatePresence-Exit starten.
  // setOpeningDone und setRevealed laufen in onExitComplete (nach dem Exit),
  // damit der Hero-Canvas nie waehrend des Intro-Canvas laeuft.
  useEffect(() => {
    if (!loading || progress < 100 || prefersReducedMotion) return;
    const holdT = window.setTimeout(() => {
      setLoading(false);
    }, 700);
    return () => window.clearTimeout(holdT);
  }, [loading, progress, prefersReducedMotion]);

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
    <>
    <section
      ref={heroRef}
      // h-svh, bewusst NICHT dvh/lvh: dvh folgt live der Adressleiste — genau
      // waehrend die beim ersten Swipe einklappt, aendert sich dann live die
      // Section-Hoehe MITTEN in der Wischgeste, was einen Teil davon
      // "auffrisst". lvh loeste zwar den Rand unten, verschob den
      // zentrierten Titel aber bei sichtbarer Leiste (Normalzustand beim
      // Laden) nach unten. svh ist statisch — kein Ruckeln, Titel/Buttons
      // korrekt zentriert im Normalzustand. Inhalt sticky top-0, loest sich
      // exakt wenn die Section vollstaendig gescrollt ist.
      className="relative h-svh min-h-[640px]"
      aria-label={siteConfig.fullName}
    >
      <div className="sticky top-0 z-0 bg-background-deep flex h-svh min-h-[640px] items-center justify-center overflow-hidden">
      <motion.div
        style={{
          opacity: prefersReducedMotion ? 1 : scrollFade,
          pointerEvents: prefersReducedMotion ? "auto" : pinPointerEvents,
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          initial={false}
          animate={{ opacity: revealed ? 1 : 0 }}
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
          {/* introExited: Intro-Canvas muss vollstaendig abgebaut sein,
              bevor dieser Hero-Canvas mountet (eine WebGL-Instanz gleichzeitig).
              showBackground steuert nur noch den frameloop (paused=true stoppt
              useFrame ohne WebGL-Teardown) — kein Unmount mehr, weil ein
              Kontext-Teardown auf Handys mehrere Frames kostet und genau in
              dem Bereich landet, wo Hero und Video-Section ueberlappen. */}
          {introExited && (
            <Watercolor
              className="absolute inset-0"
              paused={!showBackground}
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
          )}
          {/* Nur opacity, kein "scale: 0.96 -> 1" mehr auf diesem Layer:
              react-three-fiber misst den Canvas seiner Groesse einmalig beim
              Mount ueber getBoundingClientRect() dieses Elternelements — traf
              das genau in einen Frame der Scale-Animation (z.B. 0.968 statt
              1), blieb der Canvas fuer immer auf dieser zu kleinen Pixelgroesse
              haengen (gemessen: 927x894 statt 958x924), sichtbar als
              schwarzer Rand rechts/unten, der "manchmal" auftrat, je nachdem
              in welchem Animationsframe gemessen wurde. Ohne Transform auf
              diesem Element misst r3f immer die volle, korrekte Groesse.
              -inset-1 bleibt als zusaetzlicher Puffer gegen mobile
              Adressleisten-Resizes (siehe video-showcase.tsx). */}
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
      </div>
    </section>

      {/* onExitComplete: Intro-Canvas vollstaendig abgebaut.
          Erst jetzt darf Hero-Canvas mounten und Nav einfahren. */}
      <AnimatePresence
        onExitComplete={() => {
          introAlreadyPlayed = true;
          setIntroExited(true);
          setOpeningDone(true);
          setRevealed(true);
        }}
      >
        {loading && <IntroLoader key="intro-loader" progress={progress} />}
      </AnimatePresence>
    </>
  );
}
