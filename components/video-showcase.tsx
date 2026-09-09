"use client";

import { useReducedMotion } from "@/lib/motion";
import { lenisRef } from "@/lib/lenis";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowDown, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

const VIDEO_SRC = "/video/hero-bjj.mp4";
const VIDEO_POSTER = "/video/hero-poster.jpg";
const MAX_WIDTH = 1440;
const CAPTION = "Watch the film — JJK Academy";

const PEEK_VISIBLE = 24;
const PEEK_WIDTH = 400;
const PEEK_HEIGHT = 260;
const NAV_OFFSET = 96;
const BOTTOM_GAP = 24;
const GROWTH_END = 0.55;
const PLAY_AT = 0.35;

/** Matches the horizontal padding of sections below: px-5 / sm:px-8 / lg:px-10 */
function sectionPadding(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 40;
  if (viewportWidth >= 640) return 32;
  return 20;
}

function ShowcaseVideo({
  videoRef,
  controls = false,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  controls?: boolean;
}): ReactNode {
  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      src={VIDEO_SRC}
      poster={VIDEO_POSTER}
      muted
      loop
      playsInline
      controls={controls}
      preload="auto"
      aria-label="BJJ training at JJK Academy"
    />
  );
}

/**
 * ── Scroll-Fortschritt ───────────────────────────────────────────────────
 * Direkt aus der echten Position des Sections-Elements berechnet (siehe
 * jjk-hero.tsx fuer dieselbe Begruendung) statt ueber Framers `useScroll`.
 *
 * ── Das Pinning ──────────────────────────────────────────────────────────
 * position: sticky; top: 0 auf dem Wrapper-Div. Das ist geometrisch
 * aequivalent zum frueheren fixed/absolute-Wechsel:
 *
 *   Bei scrollProgress < 1: sticky-Element am Viewport-Top, genau wie fixed.
 *   Bei scrollProgress >= 1: Section-Bottom erreicht Element-Bottom, Element
 *   loest sich und scrollt mit — Endposition identisch zu absolute; bottom:0.
 *   (Nachweis: sticky_top = section_bottom - wrapper_height = 180svh-100lvh;
 *    absolute_top = 180svh - 100lvh; identisch.)
 *
 * Kein Positions-Wechsel, kein Reflow, keine MotionValue-driven Styles auf
 * dem Wrapper. Der fruehere fixed/absolute-Wechsel (bis Commit b6d0d91) hat
 * bei Touch-Momentum um scrollProgress≈1 mehrfach zwischen fixed und
 * absolute hin- und hergeschaltet — ein Reflow pro Sprung, spuerbar als
 * kurze Sperre am Ende der Video-Section.
 *
 * Sticky war vorher auf Mobile gescheitert ("Videobox scrollte mit hoch"),
 * weil Lenis auf Mobile transforms auf den Scroll-Container setzte und damit
 * sticky bricht. Seit smooth-scroll.tsx (Commit f3789ed) laeuft Lenis auf
 * Mobile nicht mehr. Kein overflow:hidden in html/body/main — keine
 * Vorfahren-Einschraenkung fuer sticky.
 */
/** Ein bisschen groesser als exakt, damit ein kurz veralteter Wert (siehe
 *  unten) nie einen schwarzen Spalt zwischen Videobox und Viewportrand
 *  aufreissen laesst — durch overflow-x:hidden auf html/body und das
 *  overflow-hidden der Pin-Huelle ohnehin unsichtbar. */
const OVERSCAN = 3;

/** Dauer des Sanft-Stops. War kurzzeitig auf 1s hochgesetzt, damit der
 *  Scroll weicher in den Zielpunkt hineingleitet — genau das sorgte aber
 *  dafuer, dass die Seite noch eine volle Sekunde lang sichtbar
 *  weiterscrollte, nachdem der Finger laengst vom Screen war ("scrollt von
 *  selbst weiter, ohne dass man was macht"). Zurueck auf eine kurze Dauer:
 *  der Umlenker soll spuerbar bremsen, aber fertig sein, bevor er wie
 *  eigenstaendige Bewegung wirkt statt wie ein Ausklingen des Wisches. */
const CATCH_DURATION = 0.45;

/** easeOutCubic — startet mit der Restgeschwindigkeit des Wisches und laeuft
 *  weich aus, statt Lenis' Default gegen die eigene Momentum-Animation zu
 *  setzen (was den harten Stopp mit ausmachte). */
const CATCH_EASE = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Mindestgeschwindigkeit (px/Frame bei 60 fps), ab der ein Wisch als
 *  "schneller Swipe" gilt und eingefangen wird. Darunter = bewusstes
 *  langsames Scrollen, das nicht unterbrochen werden darf. */
const CATCH_MIN_VELOCITY = 30;

export function VideoShowcase(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const scrollProgress = useMotionValue(0);

  /**
   * Viewport-Messung und Scroll-Fortschritt in EINEM Handler, an mehr als
   * nur "resize" gehaengt: auf Mobile aendert die Adressleiste beim Swipen
   * `window.innerHeight`, ohne dass "resize" zuverlaessig (oder rechtzeitig)
   * feuert — das liess `viewport` veraltet stehen und die Videobox kurz zu
   * klein/gross erscheinen (sichtbarer Rand). `visualViewport` bekommt genau
   * diese Aenderungen mit, und "scroll" feuert ohnehin bei jedem Swipe-Frame,
   * also wird hier bei jedem Tick neu gemessen statt nur bei "resize".
   */
  useEffect(() => {
    const vv = window.visualViewport;
    // Einmal auf true gesetzt, sobald die Box fertig ausgewachsen ist
    // (progress >= GROWTH_END), und erst zurueckgesetzt, wenn wieder darunter
    // gescrollt wird. Verhindert, dass "viewport" (und damit fullHeight)
    // waehrend die Box schon fertig ist noch einmal neu gemessen wird.
    //
    // Wichtig: das laesst sich NICHT am Event-Typ festmachen ("scroll" vs.
    // "resize") — genau das war der erste Versuch hier und hat nichts
    // gebracht: mobile Browser feuern beim Ein-/Ausklappen der Adressleiste
    // haeufig ganz regulaer ein "resize" auf window bzw. visualViewport,
    // nicht nur "scroll". Ein pauschales "resize kommt immer durch" liess die
    // Box also trotzdem nachtraeglich wachsen. Der zuverlaessige
    // Unterschied ist stattdessen die BREITE: eine echte Rotation oder ein
    // echtes Resize aendert (fast immer) auch die Breite, ein reines
    // Einklappen der Adressleiste aendert nur die Hoehe. Solange die Box
    // fertig ist, wird deshalb nur bei einer Breitenaenderung neu gemessen.
    let grown = false;
    let lastWidth: number | null = null;

    const update = (): void => {
      const el = sectionRef.current;
      const h = Math.ceil(vv?.height ?? window.innerHeight);
      const w = Math.ceil(vv?.width ?? window.innerWidth);

      const widthChanged = lastWidth !== null && w !== lastWidth;
      lastWidth = w;

      if (!grown || widthChanged) {
        setViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }

      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollableHeight = rect.height - h;
      const progress =
        scrollableHeight > 0
          ? Math.min(Math.max(-rect.top / scrollableHeight, 0), 1)
          : 0;
      scrollProgress.set(progress);
      grown = progress >= GROWTH_END;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [scrollProgress]);

  /**
   * ── Sanft-Stop bei der voll ausgewachsenen Groesse (nur Desktop) ─────────
   * Auf Desktop: ein starker Scroll kann die Wachstumszone (bis GROWTH_END)
   * ueberfliegen. Einmalig per Lenis-scrollTo einrasten, wenn der Scroll
   * die schmale Zone knapp nach GROWTH_END durchquert.
   * Auf Mobile laeuft Lenis nicht (smooth-scroll.tsx), deshalb bailed dieser
   * Effect dort sofort — kein rAF-Polling, kein toter Code.
   */
  useEffect(() => {
    if (prefersReducedMotion) return;
    // Lenis does not run on mobile (see smooth-scroll.tsx) so there is nothing
    // to snap with there. Desktop only.
    if (!window.matchMedia("(min-width: 640px)").matches) return;

    let disposed = false;
    let hasCaught = false;
    let unsubscribe: (() => void) | null = null;

    // `any` bewusst: Lenis' eigener Event-Typ bringt hier mehr Aerger als
    // Nutzen (die Callback-Signatur in `lenis.on` ist je nach Version
    // uneinheitlich typisiert) - uns interessieren ohnehin nur diese zwei
    // Felder, die laut Lenis-Doku immer vorhanden sind.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onLenisScroll = (e: any): void => {
      const el = sectionRef.current;
      const lenis = lenisRef.current;
      if (!el || !lenis) return;

      const vh = window.visualViewport?.height ?? window.innerHeight;
      const rect = el.getBoundingClientRect();
      const scrollableHeight = rect.height - vh;
      if (scrollableHeight <= 0) return;

      // Ungeklemmt, um zu erkennen, dass wir GENAU jetzt durch die Zone
      // knapp nach GROWTH_END fliegen (die geklemmte scrollProgress bliebe
      // ab 1 einfach bei 1 stehen und wuerde das "gerade durchquert" nicht
      // mehr hergeben).
      const rawProgress = -rect.top / scrollableHeight;
      const inCatchZone = rawProgress > GROWTH_END && rawProgress < GROWTH_END + 0.06;

      if (!inCatchZone) return;

      // Only snap on the way down, never on upward scroll
      if (e.direction !== 1) return;

      // Fire once per page load — no reset after catch, so repeated scrolling
      // through the video section never re-triggers the lock
      if (hasCaught) return;

      hasCaught = true;
      const documentTop = rect.top + e.animatedScroll;
      const targetY = documentTop + GROWTH_END * scrollableHeight;
      lenis.scrollTo(targetY, {
        duration: CATCH_DURATION,
        easing: CATCH_EASE,
      });
    };

    // lenisRef.current ist evtl. noch null, wenn dieser Effect vor dem
    // Effect von SmoothScroll laeuft (Kind-Effects feuern vor denen der
    // Eltern) — deshalb kurz per rAF pollen statt direkt zu subscriben.
    const trySubscribe = (): void => {
      if (disposed) return;
      const lenis = lenisRef.current;
      if (!lenis) {
        requestAnimationFrame(trySubscribe);
        return;
      }
      lenis.on("scroll", onLenisScroll);
      unsubscribe = () => lenis.off("scroll", onLenisScroll);
    };
    trySubscribe();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [prefersReducedMotion]);

  /**
   * ── Sanft-Stop (native, nur Mobile) ──────────────────────────────────────
   * Ohne Lenis kein lenis.scrollTo() — stattdessen native scroll-Events mit
   * rAF-Throttle und window.scrollTo({ behavior: "smooth" }).
   *
   * Ausloesung nur wenn:
   *   - rawProgress in der schmalen Zone knapp nach GROWTH_END
   *   - Scrollrichtung nach unten (dy > 0)
   *   - Geschwindigkeit >= CATCH_MIN_VELOCITY px/Frame (kein langsames Scrollen)
   *   - einmal pro Seitenaufruf (hasCaught)
   *
   * Abbrechbar: touchstart oder wheel waerendd des smooth-Scrolls rufen
   * sofort window.scrollTo({ behavior: "instant" }) auf — kein Verschlucken,
   * kein Timeout, keine Sperre. hasCaught bleibt trotzdem gesetzt.
   */
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    let hasCaught = false;
    let rafPending = false;
    let prevScrollY = window.scrollY;
    let cleanupSnap: (() => void) | null = null;

    const onScroll = (): void => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (hasCaught) return;

        const currentScrollY = window.scrollY;
        const dy = currentScrollY - prevScrollY;
        prevScrollY = currentScrollY;

        if (dy < CATCH_MIN_VELOCITY) return;

        const el = sectionRef.current;
        if (!el) return;

        const vh = window.visualViewport?.height ?? window.innerHeight;
        const rect = el.getBoundingClientRect();
        const scrollableHeight = rect.height - vh;
        if (scrollableHeight <= 0) return;

        const rawProgress = -rect.top / scrollableHeight;
        if (!(rawProgress > GROWTH_END && rawProgress < GROWTH_END + 0.06)) return;

        hasCaught = true;

        // targetY: Scrollposition, bei der rawProgress genau GROWTH_END ist.
        // Herleitung: rawProgress = -rect.top / scrollableHeight = GROWTH_END
        // => rect.top_target = -GROWTH_END * scrollableHeight
        // => targetY = currentScrollY + (rect.top - rect.top_target)
        //            = currentScrollY + rect.top + GROWTH_END * scrollableHeight
        const targetY = currentScrollY + rect.top + GROWTH_END * scrollableHeight;
        window.scrollTo({ top: targetY, behavior: "smooth" });

        // Abbruch bei neuem Touch oder Wheel: smooth-Scroll sofort stoppen.
        const abort = (): void => {
          window.scrollTo({ top: window.scrollY, behavior: "instant" });
          cleanupSnap?.();
          cleanupSnap = null;
        };
        window.addEventListener("touchstart", abort, { once: true, passive: true });
        window.addEventListener("wheel", abort, { once: true, passive: true });
        cleanupSnap = () => {
          window.removeEventListener("touchstart", abort);
          window.removeEventListener("wheel", abort);
        };
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cleanupSnap?.();
    };
  }, [prefersReducedMotion]);

  const fullWidth =
    Math.min(viewport.w, MAX_WIDTH) - sectionPadding(viewport.w) * 2 + OVERSCAN;
  const fullHeight = viewport.h - NAV_OFFSET - BOTTOM_GAP + OVERSCAN;
  const peekY = viewport.h - PEEK_VISIBLE - NAV_OFFSET;

  const width = useTransform(
    scrollProgress,
    [0, GROWTH_END],
    [PEEK_WIDTH, fullWidth]
  );
  const height = useTransform(
    scrollProgress,
    [0, GROWTH_END],
    [PEEK_HEIGHT, fullHeight]
  );
  const y = useTransform(scrollProgress, [0, GROWTH_END], [peekY, 0]);
  const captionOpacity = useTransform(scrollProgress, [0, 0.1], [1, 0]);
  const captionY = useTransform(y, (value) => NAV_OFFSET + value - 44);
  const scrollHintOpacity = useTransform(
    scrollProgress,
    [GROWTH_END, GROWTH_END + 0.1, 0.9, 0.98],
    [0, 1, 1, 0]
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video) return;

    let inView = false;
    const sync = (): void => {
      const shouldPlay = inView && scrollProgress.get() >= PLAY_AT;
      if (shouldPlay) {
        if (video.paused) void video.play().catch(() => undefined);
      } else if (!video.paused) {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0 }
    );
    observer.observe(video);

    const unsubscribe = scrollProgress.on("change", sync);
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [scrollProgress, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <section
        id="video"
        aria-label="BJJ showcase"
        className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-24"
      >
        <p className="text-foreground flex items-center gap-2.5 text-sm font-medium">
          <Play className="size-3.5 fill-current" aria-hidden="true" />
          {CAPTION}
        </p>
        <div
          className="relative w-full overflow-hidden rounded-3xl bg-black"
          style={{ maxWidth: MAX_WIDTH, aspectRatio: "16 / 9" }}
        >
          <ShowcaseVideo videoRef={videoRef} controls />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="video"
      aria-label="BJJ showcase"
      className="pointer-events-none relative z-20 [margin-top:-100svh] h-[180svh] [overflow-anchor:none]"
    >
      {/* sticky top-0: Browser pinnt ohne Position-Wechsel und ohne Reflow.
          h-lvh: muss den Viewport beim Einblenden der Adressleiste abdecken
          (svh waere zu kurz — schwarzer Rand unten). z-20: Stacking-Context
          explizit auf dem tatsaechlich gepinnten Element setzen, damit der
          Watercolor-Hintergrund im Hero darunter bleibt. */}
      <div className="sticky top-0 z-20 h-lvh overflow-hidden">
        <motion.p
          style={{ x: "-50%", y: captionY, opacity: captionOpacity }}
          className="text-foreground absolute top-0 left-1/2 flex items-center gap-2.5 text-xs font-medium whitespace-nowrap"
        >
          <Play className="size-3 fill-current" aria-hidden="true" />
          {CAPTION}
        </motion.p>

        <motion.div
          style={{ x: "-50%", y, top: NAV_OFFSET, width, height }}
          className="absolute left-1/2 overflow-hidden rounded-3xl bg-black"
        >
          <ShowcaseVideo videoRef={videoRef} />
          <motion.div
            style={{ x: "-50%", opacity: scrollHintOpacity }}
            aria-hidden="true"
            className="absolute bottom-5 left-1/2 flex items-center gap-2 rounded-full bg-black/55 py-2 pr-3 pl-4 text-white/90"
          >
            <span className="text-[11px] font-medium tracking-wider uppercase">
              Scroll down
            </span>
            <motion.span
              animate={{ y: [0, 3, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowDown
                className="size-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
