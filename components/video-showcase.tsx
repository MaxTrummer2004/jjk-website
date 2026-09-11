"use client";

import { useReducedMotion } from "@/lib/motion";
import { lenisRef } from "@/lib/lenis";
import { isOpeningDone, isOpeningDoneOnServer, subscribeOpening } from "@/lib/opening";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowDown, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";

// ── Nur noch EIN Clip (showcase-2), in Endlosschleife ────────────────────────
// Frueher liefen showcase-1 und showcase-2 abwechselnd mit Crossfade (zweites
// <video>, timeupdate-Handler, FADE_LEAD/FADE_MS). Auf Wunsch auf ein einzelnes
// Video zurueckgebaut. showcase-1.* bleibt in public/video/ liegen (Platzhalter,
// kommt evtl. zurueck). Zum Reaktivieren des Crossfades: den zwei-Clip-Stand aus
// dem Git-Verlauf zurueckholen (Commit vor diesem) — CLIPS-Array, zweite
// videoRef, activeIdx und der timeupdate-Effect kamen als geschlossener Block.
const CLIP = { mp4: "/video/showcase-2.mp4", webm: "/video/showcase-2.webm" } as const;
const POSTER = "/video/showcase-poster.jpg";

const MAX_WIDTH = 1440;
const CAPTION = "Watch the film — JJK Academy";

const PEEK_VISIBLE = 24;
const PEEK_WIDTH = 400;
const PEEK_HEIGHT = 260;
const NAV_OFFSET = 96;
const BOTTOM_GAP = 24;
const GROWTH_END = 0.55;
const PLAY_AT = 0.35;

// object-position für den Desktop-Crop: oberer/mittlerer Bereich, Köpfe im Bild
const DESKTOP_CROP_POSITION = "50% 35%";

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
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: DESKTOP_CROP_POSITION }}
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER}
        controls={controls}
        aria-label="JJK Academy training video"
      >
        <source src={CLIP.webm} type="video/webm" />
        <source src={CLIP.mp4} type="video/mp4" />
      </video>
    </div>
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
  // Die Videobox ist `fixed z-20` und liegt damit UEBER dem Hero — waehrend des
  // Intro-Loaders waeren Caption ("Watch the film") und die Peek-Box also schon
  // sichtbar. Sie sollen erst auftauchen, wenn der Intro-Verlauf durch ist
  // (opening done, gesetzt in jjk-hero.tsx am Ende des Verlaufs). Bei
  // Ruecknavigation/reduced-motion ist opening sofort done → sofort sichtbar.
  const openingDone = useSyncExternalStore(
    subscribeOpening,
    isOpeningDone,
    isOpeningDoneOnServer
  );
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
   * Lenis' eigene `scrollTo`-API nutzen: sobald der Scroll die Zone kurz
   * nach GROWTH_END durchquert, wird die laufende Lenis-Animation einmalig
   * sanft auf genau den GROWTH_END-Punkt umgelenkt (kurze eigene Dauer).
   *
   * Erst gab es hier eine Velocity-Schwelle (nur "starke" Wische fangen),
   * die dann noch mehrfach hochgesetzt wurde, weil sie trotzdem staendig bei
   * ganz normalen Wischen ausloeste. Jetzt keine Schwelle mehr: JEDER Swipe,
   * der die Zone durchquert, wird gefangen — einfacher und tut genau das,
   * was verlangt war ("man soll nie ueber das Video drueberkommen"), ohne
   * eine Geschwindigkeit zu erraten, ab der es "zu viel" wird.
   *
   * `lock: true` waehrend der kurzen Snap-Animation: ohne das konnte sich
   * ein sehr starker Wisch (dessen eigene Lenis-Momentum-Animation noch
   * weiterlief) ueber den Sanft-Stop hinweg fortsetzen — sichtbar als
   * "haelt kurz, geht dann trotzdem weiter". Die Sperre gilt nur fuer die
   * CATCH_DURATION (0.45s), danach ist die Seite sofort wieder frei
   * scrollbar; ein zweiter Swipe danach setzt normal fort.
   */
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;

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
      const inCatchZone = rawProgress > GROWTH_END && rawProgress < 0.95;

      if (!inCatchZone) {
        hasCaught = false;
        return;
      }
      if (hasCaught) return;

      hasCaught = true;
      const documentTop = rect.top + e.animatedScroll;
      const targetY = documentTop + GROWTH_END * scrollableHeight;
      // `lock: true`: waehrend der kurzen Snap-Animation wird kein weiterer
      // Scroll-Input verarbeitet. Ohne das setzte sich ein sehr starker
      // Wisch (dessen eigene Lenis-Momentum-Animation noch weiterlief) ueber
      // den Sanft-Stop hinweg fort — sichtbar als "haelt kurz, geht dann bei
      // starkem Scroll trotzdem weiter". Die Sperre gilt nur fuer die
      // CATCH_DURATION (0.45s), danach ist die Seite sofort wieder frei.
      lenis.scrollTo(targetY, {
        duration: CATCH_DURATION,
        easing: CATCH_EASE,
        lock: true,
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

  // ── IntersectionObserver + Play/Pause ─────────────────────────────────────
  // Ein Video: abspielen, wenn im Bild UND weit genug gescrollt (PLAY_AT),
  // sonst pausieren. loop-Attribut haelt es in Endlosschleife. Kein scroll/
  // resize-Listener — nur Video-Events und scrollProgress-Abo.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video) return;

    let inView = false;
    const sync = (): void => {
      const shouldPlay = inView && scrollProgress.get() >= PLAY_AT;
      if (shouldPlay) {
        if (video.paused) void video.play().catch(() => undefined);
      } else {
        if (!video.paused) video.pause();
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

  const isMobile = viewport.w < 640;

  // fullHeight ist in beiden Modi gleich
  const fullHeight = viewport.h - NAV_OFFSET - BOTTOM_GAP + OVERSCAN;

  // Desktop: Querformat wie bisher
  const fullWidthDesktop =
    Math.min(viewport.w, MAX_WIDTH) - sectionPadding(viewport.w) * 2 + OVERSCAN;

  // Mobil: Hochformat 9:16, passt in verfügbare Höhe, nie breiter als Viewport
  const fullWidthMobile = Math.min(
    Math.round(fullHeight * (9 / 16)),
    viewport.w - sectionPadding(viewport.w) * 2 + OVERSCAN
  );

  const fullWidth = isMobile ? fullWidthMobile : fullWidthDesktop;

  // Peek-Breite: auf Mobil proportional zum 9:16-Format
  const peekWidth = isMobile ? Math.round(PEEK_HEIGHT * (9 / 16)) : PEEK_WIDTH;

  const peekY = viewport.h - PEEK_VISIBLE - NAV_OFFSET;

  const width = useTransform(
    scrollProgress,
    [0, GROWTH_END],
    [peekWidth, fullWidth]
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
        style={{ position: pinPosition, top: pinTop, bottom: pinBottom, left: 0, right: 0, opacity: openingDone ? 1 : 0 }}
        className="z-20 h-lvh overflow-hidden transition-opacity duration-700 ease-out"
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
