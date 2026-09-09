"use client";

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
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
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

  useEffect(() => {
    const unsubscribe = scrollFraction.on("change", (fraction) => {
      const shouldShow = fraction < 0.6;
      setShowBackground((prev) => (prev === shouldShow ? prev : shouldShow));
    });
    return unsubscribe;
  }, [scrollFraction]);

  // Bei 50% der eigenen Hoehe komplett verblasst — danach ist der Hero
  // wirklich weg (opacity 0), nicht nur fast.
  const scrollFade = useTransform(scrollFraction, [0, 0.5], [1, 0]);

  // ── Das Pinning ──────────────────────────────────────────────────────────
  // Der Hero war bisher ein ganz normaler, mitscrollender Abschnitt: beim
  // ersten Swipe wanderte er einfach nach oben aus dem Bild, WAEHRENDDESSEN
  // faded er zwar, aber das Video reagierte in genau diesem Swipe kaum
  // sichtbar mit — es fuehlte sich an, als wuerde nur der Hero wegscrollen
  // und erst ein zweiter Swipe das Video bringen. Jetzt exakt wie die
  // Video-Box in video-showcase.tsx gepinnt: `fixed` (haengt fest am
  // Viewport, bewegt sich NICHT mit dem Scroll) solange scrollFraction < 1,
  // danach `absolute` am unteren Rand der eigenen h-svh-Box verankert — zu
  // dem Zeitpunkt ist die Opacity laengst 0, der Wechsel unsichtbar. Die
  // Section selbst bleibt im Fluss und beansprucht weiter genau eine
  // h-svh-Scrollstrecke, nur ihr INHALT bewegt sich nicht mehr mit.
  const pinPosition = useTransform(scrollFraction, (v) =>
    v >= 1 ? "absolute" : "fixed"
  );
  const pinTop = useTransform(scrollFraction, (v) => (v >= 1 ? "auto" : "0px"));
  const pinBottom = useTransform(scrollFraction, (v) =>
    v >= 1 ? "0px" : "auto"
  );
  // Der Inhalt (inkl. Buttons) haengt jetzt bis fraction=1 fix am Viewport,
  // auch nachdem er bei fraction=0.5 unsichtbar geworden ist — ohne das hier
  // blieben "Book a trial class"/"Schedule" unsichtbar, aber bildschirmfest
  // anklickbar und wuerden Klicks/Taps abfangen, die eigentlich dem Video
  // oder was danach kommt galten. Gleiche Schwelle wie der Opacity-Fade.
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

  // Nav soll warten, bis Loader fertig ist.
  useEffect(() => {
    setOpeningDone(false);
    return () => { setOpeningDone(true); };
  }, []);

  // prefers-reduced-motion: sofort fertig.
  useEffect(() => {
    if (!prefersReducedMotion) return;
    setProgress(100);
    setLoading(false);
    setOpeningDone(true);
    setRevealed(true);
  }, [prefersReducedMotion]);

  // Progress-Counter: alle 45 ms +1 bis 100.
  useEffect(() => {
    if (!loading || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p + 1, 100));
    }, 45);
    return () => window.clearInterval(id);
  }, [loading, prefersReducedMotion]);

  // Bei 100: kurzer Hold, dann Loader ausblenden und Hero starten.
  useEffect(() => {
    if (!loading || progress < 100 || prefersReducedMotion) return;
    const holdT = window.setTimeout(() => {
      setLoading(false);
      setOpeningDone(true);
      // Hero-Reveal startet waehrend Loader noch ausblendet (~400ms ins Exit).
      window.setTimeout(() => setRevealed(true), 400);
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
      // korrekt zentriert im Normalzustand. Diese Section selbst ist kein
      // `position: fixed` (nur ihr Inhalt gleich, siehe pinPosition) — sie
      // beansprucht nur weiterhin genau eine h-svh-Scrollstrecke im Fluss.
      className="relative h-svh min-h-[640px]"
      aria-label={siteConfig.fullName}
    >
      <motion.div
        style={{ position: pinPosition, top: pinTop, bottom: pinBottom, left: 0, right: 0 }}
        className="bg-background-deep z-0 flex h-svh min-h-[640px] items-center justify-center overflow-hidden"
      >
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
          {showBackground && (
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
      </motion.div>
    </section>

      <AnimatePresence>
        {loading && <IntroLoader key="intro-loader" progress={progress} />}
      </AnimatePresence>
    </>
  );
}
