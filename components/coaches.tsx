"use client";

/**
 * Die Trainer — Karussell mit Beschriftung und Infofenster.
 *
 * ── Warum die Beschriftung nicht im Bild steckt ─────────────────────────────
 * Das Karussell ist WebGL: die Bilder sind Texturen auf Three.js-Flaechen, es
 * gibt keine DOM-Karten, auf die man ein `<div>` legen koennte. Name und
 * Guertel in die Textur zu backen waere der naheliegende Weg und der falsche —
 * unscharf sobald skaliert wird, nicht markierbar, fuer Screenreader
 * unsichtbar, und jede Aenderung am Text hiesse Bilder neu erzeugen.
 *
 * Stattdessen meldet das Karussell seine Geometrie nach aussen (`onLayout`,
 * siehe components/parallax-carousel.tsx) und hier liegt echtes HTML darueber.
 * Die Meldung kommt in JEDEM Bild, also wird sie auf Refs geschrieben und
 * nicht in den React-Zustand — sonst rendert die Seite sechzigmal je Sekunde.
 *
 * ── Warum der Klick nicht auf den Beschriftungen liegt ──────────────────────
 * Weil das Karussell mit demselben Zeiger gezogen wird. Klickflaechen darueber
 * wuerden das Ziehen schlucken. Der Klick haengt deshalb am Container, und die
 * Trefferpruefung rechnet aus der zuletzt gemeldeten Geometrie, welche Karte
 * unter dem Zeiger lag — mit einer Schwelle, damit das Ende einer Ziehbewegung
 * nicht als Klick durchgeht.
 *
 * Fuer Tastatur und Screenreader steht unter dem Karussell eine echte Liste
 * von Schaltflaechen. Ein Canvas ist nicht fokussierbar; ohne die Liste waere
 * die Sektion mit der Tastatur schlicht nicht bedienbar.
 */

import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ParallaxCarousel from "@/components/parallax-carousel";
import { coaches, schedule } from "@/lib/config";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const MOBILE_QUERY = "(max-width: 639px)";
const DAY_FULL: Record<string, string> = {
  Mo: "Montag",
  Di: "Dienstag",
  Mi: "Mittwoch",
  Do: "Donnerstag",
  Fr: "Freitag",
  Sa: "Samstag",
};

type Coach = (typeof coaches)[number];

/** Wann die genannten Programme laufen — aus `schedule`, nicht doppelt gepflegt. */
function sessionsFor(teaches: readonly string[]): { day: string; time: string; name: string }[] {
  if (!teaches.length) return [];
  const out: { day: string; time: string; name: string }[] = [];
  for (const col of schedule) {
    for (const c of col.classes) {
      if (c.program && teaches.includes(c.program)) {
        out.push({ day: DAY_FULL[col.day] ?? col.day, time: c.time, name: c.name });
      }
    }
  }
  return out;
}

// ── Infofenster ─────────────────────────────────────────────────────────────

function CoachSheet({
  coach,
  onClose,
}: {
  coach: Coach | null;
  onClose: () => void;
}): ReactNode {
  useEffect(() => {
    if (!coach) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [coach, onClose]);

  if (typeof document === "undefined") return null;
  const sessions = coach ? sessionsFor(coach.teaches) : [];

  return createPortal(
    <AnimatePresence>
      {coach ? (
        <motion.div
          key="coach"
          className="fixed inset-0 z-[120] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="absolute inset-0 cursor-default"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 0%, rgba(90,10,10,.55), rgba(3,3,4,.86))",
              backdropFilter: "blur(3px)",
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={coach.name}
            /* Mindestmasse statt "so gross wie der Inhalt": mit leerem Text
               fiel das Fenster vorher auf einen Streifen zusammen, in dem der
               Name neben dem Schliessen-Kreuz klebte. Ein Dialog soll seine
               Form behalten, egal wie viel drinsteht. */
            /* max-h + eigener Rollbereich am Handy: ohne das waechst das
               Fenster mit dem Text ueber den Schirm hinaus und laesst sich
               nicht mehr ganz sehen, weil der Seitenscroll gesperrt ist. */
            className="relative flex max-h-[88svh] w-full max-w-3xl flex-col overflow-y-auto overflow-x-hidden border border-border sm:max-h-[86svh] sm:min-h-[26rem] sm:flex-row"
            style={{ background: "var(--card-plate)" }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div
              /* `bg-center` hat bei Hochformaten den Kopf abgeschnitten: die
                 Mitte eines stehenden Portraets ist der Bauch. Der Ausschnitt
                 sitzt jetzt im oberen Drittel, wo bei einem Menschen das
                 Gesicht ist. */
              className="h-56 w-full shrink-0 bg-cover bg-[50%_22%] sm:h-auto sm:w-72"
              style={{ backgroundImage: `url(${coach.image})` }}
              aria-hidden="true"
            />

            <div className="flex min-w-0 flex-1 flex-col gap-5 px-8 py-9 pr-14">
              <div>
                {coach.belt ? (
                  <p className="flex items-center gap-2.5 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-foreground-dim">
                    <span
                      aria-hidden="true"
                      className="block h-[5px] w-7 rounded-[1px]"
                      style={{
                        background: coach.beltHex,
                        boxShadow: "inset 0 0 0 1px rgba(243,239,233,.28)",
                      }}
                    />
                    {coach.belt}
                  </p>
                ) : null}
                <h3
                  className="mt-3 text-4xl font-semibold leading-tight text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {coach.name}
                </h3>
              </div>

              {coach.bio ? (
                <p className="text-[0.95rem] leading-relaxed text-foreground-dim">
                  {coach.bio}
                </p>
              ) : null}

              {sessions.length ? (
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Unterrichtet
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {sessions.map((x) => (
                      <li key={`${x.day}-${x.time}`} className="flex items-baseline gap-3 text-sm">
                        <span className="min-w-[6.5rem] text-foreground">{x.day}</span>
                        <span
                          className="font-mono text-foreground-dim"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {x.time}
                        </span>
                        <span className="text-foreground-dim">{x.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center border border-border text-foreground-dim transition-colors hover:border-border-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

// ── Sektion ─────────────────────────────────────────────────────────────────

export function Coaches(): ReactNode {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  // Welcher Trainer auf welchem Platz liegt. Das aendert sich nur, wenn das
  // Karussell umbricht — also selten. Die POSITIONEN dagegen aendern sich in
  // jedem Bild und gehen deshalb direkt auf `style`, nie durch React.
  const [slotMap, setSlotMap] = useState<number[]>([]);
  const slotMapRef = useRef<number[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layoutRef = useRef<{ i: number; x: number }[]>([]);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  // Welche Karte unter dem Zeiger liegt — die Position im Streifen, nicht der
  // Trainer: bei Endlosbetrieb liegt derselbe Trainer mehrfach im Bild, und
  // aufleuchten soll nur die Karte, auf der man wirklich steht.
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = (): void => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const imageWidth = isMobile ? 240 : 380;
  const imageHeight = isMobile ? 300 : 520;

  const photos = useMemo(() => coaches.map((c) => c.image), []);
  // Mehr Plaetze als je gleichzeitig sichtbar: das Karussell wiederholt die
  // Bilder fuer den Endlosmodus, wie oft haengt von der Breite ab.
  const SLOTS = 24;

  const onLayout = useCallback(
    (items: { i: number; x: number }[]): void => {
      layoutRef.current = items;
      const stage = stageRef.current;
      if (!stage) return;
      const half = stage.clientWidth / 2;
      for (let k = 0; k < SLOTS; k++) {
        const el = slotRefs.current[k];
        if (!el) continue;
        const it = items[k];
        if (!it || Math.abs(it.x) > half + imageWidth) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        el.style.transform = `translateX(${half + it.x - imageWidth / 2}px)`;
      }

      const next = items.map((it) => it.i);
      const prev = slotMapRef.current;
      let same = prev.length === next.length;
      if (same) {
        for (let k = 0; k < next.length; k++) {
          if (prev[k] !== next[k]) { same = false; break; }
        }
      }
      if (!same) {
        slotMapRef.current = next;
        setSlotMap(next);
      }
    },
    [imageWidth],
  );

  const hit = useCallback(
    (clientX: number, clientY: number): number | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const rect = stage.getBoundingClientRect();
      const lx = clientX - rect.left - rect.width / 2;
      const ly = clientY - rect.top - rect.height / 2;
      if (Math.abs(ly) > imageHeight / 2) return null;
      const items = layoutRef.current;
      for (let k = 0; k < items.length; k++) {
        if (Math.abs(lx - items[k]!.x) <= imageWidth / 2) return k;
      }
      return null;
    },
    [imageWidth, imageHeight],
  );

  const onPointerDown = useCallback((e: React.PointerEvent): void => {
    downRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent): void => {
      if (e.pointerType !== "mouse") return;
      const k = hit(e.clientX, e.clientY);
      setHover((prev) => (prev === k ? prev : k));
    },
    [hit],
  );

  const onPointerLeave = useCallback((): void => setHover(null), []);

  const onClick = useCallback(
    (e: React.MouseEvent): void => {
      const start = downRef.current;
      // Eine Ziehbewegung endet auch mit einem Klick. Ueber sechs Pixel war es
      // Blaettern, nicht Auswaehlen.
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const k = hit(e.clientX, e.clientY);
      if (k === null) return;
      const it = layoutRef.current[k];
      if (it) setOpen(it.i);
    },
    [hit],
  );

  return (
    <section id="coaches" className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
        <KanjiLabel kanji="師範" furigana="しはん" gloss="Trainer" />
        <StaggeredText
          text="Trainer, die fürs BJJ leben"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="jjk-section-title max-w-3xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Jeder von ihnen bringt eigene Stärken auf die Matte und holt damit
          das Beste aus dir heraus. Klick auf einen Trainer, dann steht dort mehr.
        </p>
      </div>

      <div
        ref={stageRef}
        className="relative mt-12 h-[300px] cursor-pointer sm:h-[520px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      >
        <ParallaxCarousel
          images={photos}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          gap={20}
          parallaxIntensity={0.35}
          uvScale={0.2}
          borderRadius={16}
          loop
          autoplaySpeed={0}
          showProgress={false}
          onLayout={onLayout}
          hoverIndex={hover}
          className="h-full"
        />

        {/* Die Beschriftungen. Sie liegen ueber dem Canvas, nehmen aber keinen
            Zeiger an — sonst waere das Ziehen des Karussells hinueber. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: SLOTS }, (_, k) => (
            <div
              key={k}
              ref={(el) => { slotRefs.current[k] = el; }}
              className="absolute top-1/2 left-0"
              style={{
                width: imageWidth,
                height: imageHeight,
                marginTop: -imageHeight / 2,
                visibility: "hidden",
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pt-12 pb-4 transition-all duration-300"
                style={{
                  background:
                    hover === k
                      ? "linear-gradient(to top, rgba(3,3,4,.92), rgba(3,3,4,0))"
                      : "linear-gradient(to top, rgba(3,3,4,.8), rgba(3,3,4,0))",
                  transform: hover === k ? "translateY(-4px)" : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  className="mb-2 block h-px origin-left transition-transform duration-500"
                  style={{
                    background: "linear-gradient(90deg, var(--accent), var(--ember-hot))",
                    transform: hover === k ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
                <span
                  className="text-[1.05rem] font-semibold leading-tight text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {(coaches[slotMap[k] ?? 0] ?? coaches[0]!).name}
                </span>
                <span className="mt-1 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-foreground/60">
                  <span
                    aria-hidden="true"
                    className="block h-[4px] w-5 rounded-[1px]"
                    style={{
                      background: (coaches[slotMap[k] ?? 0] ?? coaches[0]!).beltHex,
                      boxShadow: "inset 0 0 0 1px rgba(243,239,233,.3)",
                    }}
                  />
                  {(coaches[slotMap[k] ?? 0] ?? coaches[0]!).belt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dieselben Schaltflaechen wie vorher, nur nicht mehr sichtbar.
          Ein Canvas ist nicht fokussierbar: ohne sie waere die Sektion mit der
          Tastatur gar nicht bedienbar und fuer einen Screenreader eine leere
          Flaeche. `sr-only` nimmt sie aus dem Bild, `focus-within:not-sr-only`
          holt sie zurueck, sobald jemand mit Tab hineingeht — dann muss man
          auch sehen, worauf man gerade steht. */}
      <div className="sr-only focus-within:not-sr-only focus-within:mx-auto focus-within:mt-6 focus-within:flex focus-within:w-full focus-within:max-w-[1400px] focus-within:flex-wrap focus-within:gap-2 focus-within:px-4 sm:focus-within:px-6 lg:focus-within:px-8">
        {coaches.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setOpen(i)}
            className="jjk-btn px-4 py-2 text-sm"
          >
            {c.name}
            {c.belt ? <span className="text-muted-foreground"> · {c.belt}</span> : null}
          </button>
        ))}
      </div>

      <CoachSheet coach={open === null ? null : (coaches[open] ?? null)} onClose={() => setOpen(null)} />
    </section>
  );
}

export default Coaches;
