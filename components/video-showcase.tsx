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
      preload="metadata"
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
 * Auch `position: sticky` wird hier nicht mehr blind vertraut — auf Mobile
 * blieb die Videobox nicht stehen, sondern scrollte mit hoch (bei der
 * Vorlage nicht). Statt CSS `sticky` das Anheften ueberlassen, wird die
 * Position hart aus scrollProgress abgeleitet: `fixed` waehrend die Section
 * aktiv ist (haengt garantiert am Viewport, egal was ein mobiler Browser mit
 * sticky+Adressleiste anstellt), `absolute` am Ende, damit sie sich exakt am
 * unteren Rand der 180svh-Section loest statt daran vorbeizuschweben.
 */
/** Ein bisschen groesser als exakt, damit ein kurz veralteter Wert (siehe
 *  unten) nie einen schwarzen Spalt zwischen Videobox und Viewportrand
 *  aufreissen laesst — durch overflow-x:hidden auf html/body und das
 *  overflow-hidden der Pin-Huelle ohnehin unsichtbar. */
const OVERSCAN = 3;

/** Ab welcher Lenis-Velocity ein Swipe als "zu stark" gilt und der
 *  Sanft-Stop (siehe Effect weiter unten) eingreift. Lenis' `velocity` ist
 *  grob px pro Frame der animierten (nicht der rohen) Scrollposition — bei
 *  `touchMultiplier: 2` reicht ein normaler Wisch am Handy im Alltag nicht
 *  annaehernd an diesen Wert heran, ein kraeftiger Flick schon deutlich.
 *
 *  Nochmal hoch angesetzt (vorher 42, davor 25): loeste bei 42 immer noch
 *  bei ganz normalen/mittleren Wischen aus, nicht nur bei sehr starken —
 *  fuehlte sich als staendiges Eingreifen an statt als Ausnahme fuer den
 *  Extremfall. Nur noch ein wirklich heftiger Flick, der das Video sonst
 *  komplett ueberspringt, soll ihn ausloesen; alles darunter fliesst frei
 *  durch. */
const CATCH_VELOCITY = 70;

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
   * ── Sanft-Stop bei der voll ausgewachsenen Groesse (nur mobil) ──────────
   * Nur am Handy laesst sich das Video bei einem kraeftigen Swipe komplett
   * uebersehen: die Wachstumsanimation ist bei GROWTH_END (55%) fertig,
   * aber die Pin-Strecke laeuft bis 100% weiter — ein starker Wisch reisst
   * ueber die volle Strecke, und "fertig gewachsen" wird nie wirklich
   * wahrgenommen.
   *
   * Der fruehere Versuch, das per manuellem preventDefault + eigenem
   * `window.scrollTo` zu verhindern, fuehlte sich steif an — aus gutem
   * Grund: die Seite scrollt hier ueber Lenis (components/smooth-scroll.tsx),
   * und Lenis "besitzt" die Scrollposition und animiert bei jedem eigenen
   * `window.scrollTo`-Aufruf von aussen dagegen an (siehe Kommentar in
   * lib/lenis.ts). Deshalb jetzt NICHT mehr gegen Lenis ankaempfen, sondern
   * Lenis' eigene `scrollTo`-API nutzen: sobald ein SCHNELLER Scroll (hohe
   * `velocity`) die Zone kurz nach GROWTH_END durchquert, wird die laufende
   * Lenis-Animation einmalig sanft auf genau den GROWTH_END-Punkt
   * umgelenkt (kurze eigene Dauer) — kein Sperren, kein Abfangen von
   * Touch-Events, die Seite bleibt frei scrollbar. Ein zweiter Swipe
   * danach setzt normal fort.
   *
   * ── Ausnahme: der erste Swipe aus dem Hero heraus ───────────────────────
   * Die Velocity-Schwelle sorgt dafuer, dass der Sanft-Stop nur bei einem
   * wirklich heftigen Flick eingreift — genau richtig fuer Swipes, die schon
   * IM Video sind. Aber der Wisch, der noch im Hero beginnt und in einem
   * Zug bis ueber das Video hinaustraegt, soll IMMER gefangen werden, egal
   * wie schnell er ist: sonst kann man mit einem einzigen, ganz normalen
   * Swipe vom Hero komplett am Video vorbeiscrollen, ohne es je in voller
   * Groesse gesehen zu haben. Ein `touchstart`, der noch VOR der Pin-Section
   * liegt (rawProgress <= 0), markiert die laufende Beruehrung dafuer als
   * "startet im Hero" — die Velocity-Schwelle wird fuer sie ausgesetzt, bis
   * die naechste Beruehrung beginnt.
   */
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    let disposed = false;
    let hasCaught = false;
    let touchStartedInHero = false;
    let unsubscribe: (() => void) | null = null;

    const onTouchStart = (): void => {
      const el = sectionRef.current;
      if (!el) {
        touchStartedInHero = false;
        return;
      }
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const rect = el.getBoundingClientRect();
      const scrollableHeight = rect.height - vh;
      const rawProgress = scrollableHeight > 0 ? -rect.top / scrollableHeight : 0;
      touchStartedInHero = rawProgress <= 0;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });

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
      const inCatchZone = rawProgress > GROWTH_END && rawProgress < 0.95;

      if (!inCatchZone) {
        hasCaught = false;
        return;
      }
      if (hasCaught) return;
      if (Math.abs(e.velocity) < CATCH_VELOCITY && !touchStartedInHero) return;

      hasCaught = true;
      const documentTop = rect.top + e.animatedScroll;
      const targetY = documentTop + GROWTH_END * scrollableHeight;
      lenis.scrollTo(targetY, { duration: CATCH_DURATION, easing: CATCH_EASE });
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
      window.removeEventListener("touchstart", onTouchStart);
      unsubscribe?.();
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

  // Manuelles Pin statt CSS `sticky`: vor der Section normal im Fluss,
  // waehrend der Section hart am Viewport fixiert, danach am unteren Rand
  // der 180svh-Section verankert (die Section selbst ist `relative`).
  const pinPosition = useTransform(scrollProgress, (v) =>
    v >= 1 ? "absolute" : "fixed"
  );
  const pinTop = useTransform(scrollProgress, (v) => (v >= 1 ? "auto" : "0px"));
  const pinBottom = useTransform(scrollProgress, (v) => (v >= 1 ? "0px" : "auto"));

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
      className="pointer-events-none relative z-20 [margin-top:-100svh] h-[180svh]"
    >
      <motion.div
        style={{ position: pinPosition, top: pinTop, bottom: pinBottom, left: 0, right: 0 }}
        className="z-20 h-lvh overflow-hidden"
      >
        {/* z-20 direkt hier (nicht nur auf der Section aussen): `position:
            fixed`-Kindelemente stapeln sich zwar innerhalb des
            Stacking-Contexts der Section, aber ein z-index direkt auf dem
            tatsaechlich fixierten Element ist eindeutig statt sich auf diese
            Vererbung zu verlassen — der Watercolor-Hintergrund im Hero
            (siehe jjk-hero.tsx, dort bewusst niedriger) schien sonst
            teilweise ueber dem Video statt darunter. */}
        {/* h-lvh statt h-svh: dieser Wrapper ist waehrend des Pins `position:
            fixed` und muss den sichtbaren Bereich IMMER voll abdecken. `svh`
            geht von eingeblendeter Adressleiste aus (kleinstmoegliche Hoehe)
            — blendet die Leiste auf einem echten Handy beim Scrollen aus,
            wird der sichtbare Bereich groesser als `100svh`, und der fixierte
            Wrapper bleibt zu kurz: schwarzer Rand unten. `lvh` geht vom
            eingeklappten Zustand aus (groesstmoegliche Hoehe) und deckt den
            Viewport so immer ab. Beides sind statische Werte (kein
            Nachzittern wie bei `dvh`), Chrome-DevTools-Emulation ohne echte
            Adressleiste zeigt den Unterschied nie. */}
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
      </motion.div>
    </section>
  );
}
