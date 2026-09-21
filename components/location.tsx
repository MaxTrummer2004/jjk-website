"use client";

/**
 * Location — "Wo wir sind", an der Stelle, an der vorher das Video lag.
 *
 * ── Die Huelle ──────────────────────────────────────────────────────────────
 * Scrollstrecke, Pin und das Wachsen von der kleinen Karte auf Vollbild sind
 * aus components/video-showcase.tsx uebernommen, absichtlich unveraendert: die
 * Mechanik ist dort ueber mehrere Runden auf Lenis und auf mobile Adressleisten
 * eingestellt worden, und der Scroll soll sich anfuehlen wie vorher. Was sich
 * aendert, ist ausschliesslich der Inhalt der Box.
 *
 * Eine Sache aus dem Video ist NICHT mit uebernommen: der Sanft-Stop am Handy,
 * der einen kraeftigen Wisch bei GROWTH_END abfing. Der existierte, weil das
 * Video nach dem Wachsen nichts mehr zu zeigen hatte und man es sonst
 * uebersprang. Hier faengt bei GROWTH_END die Zuendung erst an — die restliche
 * Strecke ist der Inhalt, nicht Leerlauf.
 *
 * ── Warum eine eigene Karte ─────────────────────────────────────────────────
 * Siehe den Kopf von components/street-map.tsx. Kurz: kein Token, kein
 * Drittanbieter-Aufruf, kein Eintrag mehr in der Datenschutzerklaerung, und
 * die Karte sieht aus wie diese Seite statt wie Mapbox.
 */

import { useReducedMotion } from "@/lib/motion";
import { isOpeningDone, isOpeningDoneOnServer, subscribeOpening } from "@/lib/opening";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { StreetMap } from "@/components/street-map";
import { siteConfig } from "@/lib/config";

const MAX_WIDTH = 1440;
const CAPTION = "Hier findest du uns";

const PEEK_VISIBLE = 24;
const PEEK_WIDTH = 400;
const PEEK_HEIGHT = 260;
const NAV_OFFSET = 96;
const BOTTOM_GAP = 24;
const OVERSCAN = 0;
// Frueher gelockt als beim Video (dort 0,55): die Box soll schnell stehen,
// denn erst DANN faengt der Zoom an, und der ist der eigentliche Inhalt.
const GROWTH_END = 0.34;

/** Deckt sich mit dem Seitenpolster der Sektionen darunter: px-5 / sm:px-8 / lg:px-10 */
function sectionPadding(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 40;
  if (viewportWidth >= 640) return 32;
  return 20;
}

function AddressPlate({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-3.5"}>
      <span className="flex items-center gap-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.24em] text-accent">
        <MapPin className="size-3" strokeWidth={1.8} aria-hidden="true" />
        Jiu-Jitsu Kaisen Academy
      </span>
      <p
        className="text-[clamp(1.6rem,3.6vw,2.9rem)] font-semibold leading-[1.05] tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {siteConfig.address.street}
        <br />
        {siteConfig.address.city}
      </p>
      <a
        href={siteConfig.address.maps}
        target="_blank"
        rel="noopener noreferrer"
        className="jjk-btn inline-flex w-fit items-center gap-2 px-5 py-2.5 text-sm font-medium"
      >
        In Google Maps öffnen
        <ArrowUpRight className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
      </a>
    </div>
  );
}

export function Location(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const scrollProgress = useMotionValue(0);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });

  const openingDone = useSyncExternalStore(
    subscribeOpening,
    isOpeningDone,
    isOpeningDoneOnServer,
  );

  /**
   * Fortschritt von Hand, nicht ueber Framers `useScroll` — dieselbe
   * Begruendung wie im Video und im Hero: Lenis besitzt die Scrollposition.
   *
   * Nach dem Wachsen wird die Box nur noch bei einer BREITENaenderung neu
   * vermessen. Ein reines Ein- oder Ausklappen der mobilen Adressleiste
   * aendert nur die Hoehe und feuert trotzdem `resize`; ohne diese
   * Unterscheidung wuechse die Box nachtraeglich weiter.
   */
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
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

  const isMobile = viewport.w < 640;
  const fullHeight = viewport.h - NAV_OFFSET - BOTTOM_GAP + OVERSCAN;
  const fullWidth =
    Math.min(viewport.w, MAX_WIDTH) - sectionPadding(viewport.w) * 2 + OVERSCAN;

  const peekY = viewport.h - PEEK_VISIBLE - NAV_OFFSET;

  const width = useTransform(scrollProgress, [0, GROWTH_END], [PEEK_WIDTH, fullWidth]);
  const height = useTransform(scrollProgress, [0, GROWTH_END], [PEEK_HEIGHT, fullHeight]);
  const y = useTransform(scrollProgress, [0, GROWTH_END], [peekY, 0]);
  const captionOpacity = useTransform(scrollProgress, [0, 0.1], [1, 0]);
  const captionY = useTransform(y, (value) => NAV_OFFSET + value - 44);

  // Die Adresse kommt erst, wenn ganz hineingezoomt ist.
  const plateOpacity = useTransform(scrollProgress, [0.9, 0.99], [0, 1]);
  const plateY = useTransform(scrollProgress, [0.9, 0.99], [18, 0]);

  // Manuelles Pin statt CSS `sticky`: davor im Fluss, waehrend der Sektion am
  // Viewport fixiert, danach am unteren Rand der Sektion verankert.
  const pinPosition = useTransform(scrollProgress, (v) => (v >= 1 ? "absolute" : "fixed"));
  const pinTop = useTransform(scrollProgress, (v) => (v >= 1 ? "auto" : "0px"));
  const pinBottom = useTransform(scrollProgress, (v) => (v >= 1 ? "0px" : "auto"));

  if (prefersReducedMotion) {
    return (
      <section
        id="location"
        aria-label="Wo wir sind"
        className="flex min-h-svh flex-col items-center justify-center gap-10 px-6 py-24"
      >
        <div
          className="relative w-full overflow-hidden rounded-3xl"
          style={{ maxWidth: MAX_WIDTH, aspectRatio: "16 / 9", background: "#07070a" }}
        >
          <StreetMap progress={scrollProgress} from={0} />
        </div>
        <AddressPlate compact />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="location"
      aria-label="Wo wir sind"
      className="pointer-events-none relative z-20 [margin-top:-100svh] h-[250svh]"
    >
      <motion.div
        style={{
          position: pinPosition,
          top: pinTop,
          bottom: pinBottom,
          left: 0,
          right: 0,
          opacity: openingDone ? 1 : 0,
        }}
        className="z-20 h-lvh overflow-hidden transition-opacity duration-700 ease-out"
      >
        <motion.p
          style={{ x: "-50%", y: captionY, opacity: captionOpacity }}
          className="text-foreground absolute top-0 left-1/2 flex items-center gap-2.5 text-xs font-medium whitespace-nowrap"
        >
          <MapPin className="size-3" strokeWidth={1.8} aria-hidden="true" />
          {CAPTION}
        </motion.p>

        <motion.div
          style={{ x: "-50%", y, top: NAV_OFFSET, width, height }}
          className="absolute left-1/2 overflow-hidden rounded-3xl"
        >
          <StreetMap progress={scrollProgress} from={GROWTH_END} />

          {/* Die Adresse liegt als echter Text darueber, nicht im Canvas:
              lesbar fuer Suchmaschinen und Screenreader, kopierbar, und der
              Link funktioniert auch dann, wenn die Kartendatei nicht laedt. */}
          <motion.div
            style={{ opacity: plateOpacity, y: plateY }}
            className={`pointer-events-auto absolute ${
              isMobile ? "inset-x-5 bottom-6" : "bottom-9 left-9"
            }`}
          >
            <AddressPlate compact={isMobile} />
          </motion.div>

          <span className="pointer-events-none absolute right-3 bottom-2.5 font-mono text-[0.55rem] tracking-wide text-foreground/25">
            © OpenStreetMap contributors
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default Location;
