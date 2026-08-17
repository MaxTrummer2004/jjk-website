"use client";

import { useReducedMotion } from "@/lib/motion";
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

/** Feste Dauer (ms) fuer einen Durchlauf der Pin-and-Grow-Strecke (Richtung
 *  0->1 oder 1->0), egal wie kraeftig geswiped/gescrollt wird — siehe die
 *  ausfuehrliche Erklaerung beim Scroll-Lock-Effect weiter unten. */
const ANIMATION_DURATION = 650;

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

    const update = (): void => {
      const w = Math.ceil(vv?.width ?? window.innerWidth);
      const h = Math.ceil(vv?.height ?? window.innerHeight);
      setViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));

      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollableHeight = rect.height - h;
      const progress =
        scrollableHeight > 0
          ? Math.min(Math.max(-rect.top / scrollableHeight, 0), 1)
          : 0;
      scrollProgress.set(progress);
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
   * ── Scroll-Lock waehrend Pin-and-Grow ───────────────────────────────────
   * Bisher hing scrollProgress 1:1 an der echten Scrollposition. Bei einem
   * kraeftigen Swipe/Flick am Handy — inklusive der nativen
   * Momentum-Animation NACH dem Loslassen, die JS gar nicht mehr sieht,
   * sobald sie einmal laeuft — konnte die komplette Wachstumsstrecke in
   * einem einzigen, kaum wahrnehmbaren Sprung durchlaufen werden ("laeuft
   * ueber Video hinweg"). Jetzt wird genau in dieser Strecke (rect.top
   * zwischen 0 und -scrollableHeight, also waehrend die Box tatsaechlich
   * gepinnt ist) jedes wheel-/touchmove-Event abgefangen: preventDefault
   * verhindert, dass der Browser ueberhaupt erst eigene
   * Momentum-Physik startet, und nur die RICHTUNG des Inputs zaehlt — die
   * Staerke/Geschwindigkeit wird bewusst ignoriert. Stattdessen laeuft
   * scrollProgress per rAF immer ueber exakt ANIMATION_DURATION zum Ziel
   * (0 oder 1) und schreibt synchron per `window.scrollTo` die echte
   * Scrollposition mit, damit rect.top danach wieder zur Realitaet passt.
   * Sobald das Ziel erreicht ist UND der Input weiter in dieselbe Richtung
   * geht, wird die Kontrolle wieder an den nativen Scroll uebergeben.
   *
   * Ausserhalb dieser Strecke (Box noch nicht erreicht oder schon ganz
   * durchgescrollt) greift nichts davon — normales, freies Scrollen bleibt
   * ueberall sonst unveraendert.
   */
  const lockedRef = useRef(false);
  const animatingRef = useRef(false);
  const animatingTargetRef = useRef<0 | 1 | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const touchYRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const stopAnimation = (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      animatingRef.current = false;
      animatingTargetRef.current = null;
    };

    const animateTo = (target: 0 | 1, rect: DOMRect, viewportH: number): void => {
      const scrollableHeight = rect.height - viewportH;
      if (scrollableHeight <= 0) return;
      // documentTop/scrollableHeight bleiben fuer die Dauer der Animation
      // konstant: waehrend gesperrt ist, aendert nur UNSER window.scrollTo
      // unten die echte Position, nie ein natives Scroll-Event.
      const documentTop = rect.top + window.scrollY;
      const startProgress = scrollProgress.get();
      const startTime = performance.now();

      animatingRef.current = true;
      animatingTargetRef.current = target;

      const tick = (now: number): void => {
        const t = Math.min((now - startTime) / ANIMATION_DURATION, 1);
        const eased = easeOutCubic(t);
        const value = startProgress + (target - startProgress) * eased;
        scrollProgress.set(value);
        window.scrollTo(0, documentTop + value * scrollableHeight);

        if (t < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          stopAnimation();
          lockedRef.current = false;
        }
      };
      rafIdRef.current = requestAnimationFrame(tick);
    };

    const handleDirectionalInput = (deltaY: number, event: Event): void => {
      // Kleines Deadzone gegen Zittern/Rauschen einzelner touchmove-Events.
      if (Math.abs(deltaY) < 2) return;

      const el = sectionRef.current;
      if (!el) return;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const rect = el.getBoundingClientRect();
      const scrollableHeight = rect.height - viewportH;
      if (scrollableHeight <= 0) return;

      const wantsForward = deltaY > 0;
      const inPinRange = rect.top <= 0.5 && rect.top >= -(scrollableHeight + 0.5);

      // Ausserhalb der gepinnten Strecke (und nicht schon mitten in einer
      // gesperrten Animation) ist das hier nicht unsere Zustaendigkeit —
      // normal weiterscrollen lassen.
      if (!inPinRange && !lockedRef.current) return;

      const currentProgress = scrollProgress.get();
      const exitingTop = currentProgress <= 0.001 && !wantsForward;
      const exitingBottom = currentProgress >= 0.999 && wantsForward;
      if (exitingTop || exitingBottom) {
        // Rand der Strecke erreicht und weiter in dieselbe Richtung
        // unterwegs — dem nativen Scroll wieder das Feld ueberlassen.
        lockedRef.current = false;
        stopAnimation();
        return;
      }

      event.preventDefault();
      lockedRef.current = true;

      const target: 0 | 1 = wantsForward ? 1 : 0;
      if (animatingRef.current && animatingTargetRef.current === target) return; // schon unterwegs dorthin

      stopAnimation();
      animateTo(target, rect, viewportH);
    };

    const onWheel = (e: WheelEvent): void => handleDirectionalInput(e.deltaY, e);

    const onTouchStart = (e: TouchEvent): void => {
      touchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent): void => {
      const currentY = e.touches[0]?.clientY;
      if (currentY === undefined || touchYRef.current === null) return;
      const delta = touchYRef.current - currentY; // Finger nach oben = nach unten scrollen
      touchYRef.current = currentY;
      handleDirectionalInput(delta, e);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      stopAnimation();
    };
  }, [prefersReducedMotion, scrollProgress]);

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
