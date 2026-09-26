"use client";

/**
 * Der Stundenplan — sechs Tage als Kartenstapel.
 *
 * WAS HIER NEU IST
 * ----------------
 * Rueckmeldung aus dem Review: "gerade bei Kursterminen nicht klar genug zum
 * Scrollen oder Tappen, das verwirrt". Der Stapel hatte als einzige Bedienung
 * den Klick auf sich selbst, dazu einen kurzen Ping-Punkt und eine Zeile in
 * 0,65 rem Mono auf halber Deckkraft. Das ist keine Bedienung, das ist ein
 * Hinweis auf eine Bedienung.
 *
 * Jetzt steht unter dem Stapel eine Leiste, die drei Dinge gleichzeitig tut:
 *
 *   - sie NENNT die sechs Tage, alle, immer. Wer wissen will, was am Freitag
 *     laeuft, sieht "Fr" und tippt darauf — er muss sich nicht durchblaettern
 *     und dabei merken, wo er war.
 *   - sie ZEIGT, wo man ist: der laufende Tag steht in Zinnober auf der
 *     Platte, mit der Marke darunter; daneben "3 von 6" in Ziffern.
 *   - sie BLAETTERT in beide Richtungen. Vorher ging es nur vorwaerts, und
 *     wer einen Tag zu weit war, musste fuenfmal weiter.
 *
 * Die Karten bleiben klickbar — sie sind die schnellste Geste, wenn man nur
 * weiterblaettern will. Sie sind aber nicht mehr die einzige.
 *
 * Der Stapel selbst ist absichtlich NICHT ersetzt worden. Er ist am Handy das
 * einzige, was sechs Tagesplaene auf eine Bildschirmhoehe bringt, ohne sie in
 * eine Tabelle zu pressen, die man seitlich schieben muss. Was ihm fehlte,
 * war die Steuerung — und die liegt jetzt daneben.
 */

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { programs, schedule, type ScheduleClass } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ClickStack, { type ClickStackHandle } from "@/components/click-stack";
import { useReducedMotion } from "@/lib/motion";

/**
 * Die Palette aus dem Aushang.
 *
 * Gefaerbt wird nach RICHTUNG, nicht nach Level — der Aushang sagt es selbst:
 * "die Farbgruppe zeigt die Richtung, das Label das empfohlene Level". Fuenf
 * Gruppen, innerhalb einer Gruppe abgestuft, alles aus der Tailwind-Rampe:
 *
 *   gruen  — Anfaenger & alle Level   (BJJ Basic, Gi/No-Gi Training, Open Mat)
 *   rot    — Fortgeschrittene         (Advanced Training)
 *   lila   — Ringen
 *   blau   — Sparring & Wettkampf
 *   orange — Boxen
 *
 * Eine 600er/700er-Stufe ist fuer helle Gruende gebaut, dieser Grund ist fast
 * schwarz. Das wird nicht ueber die Farbe geloest, sondern ueber ihren
 * Einsatz: sie traegt Flaechen (gefuelltes Chip mit weisser Schrift) und
 * Linien, nie Kleinschrift.
 */
const GROUPS = {
  gruen:  { label: "Anfänger & alle Level", tone: "#16a34a" }, // green-600
  rot:    { label: "Fortgeschrittene",      tone: "#b91c1c" }, // red-700
  lila:   { label: "Ringen",                tone: "#7e22ce" }, // purple-700
  blau:   { label: "Sparring & Wettkampf",  tone: "#1d4ed8" }, // blue-700
  orange: { label: "Boxen",                 tone: "#d97706" }, // amber-600
} as const;

/** Kursart → Gruppe (fuer die Legende) und eigener Ton innerhalb der Gruppe. */
const COURSE: Record<
  ScheduleClass["kind"],
  { tone: string; group: keyof typeof GROUPS }
> = {
  basic:     { tone: "#16a34a", group: "gruen"  }, // green-600
  gi:        { tone: "#0f766e", group: "gruen"  }, // teal-700
  nogi:      { tone: "#0d9488", group: "gruen"  }, // teal-600
  openmat:   { tone: "#4d7c0f", group: "gruen"  }, // lime-700
  advanced:  { tone: "#b91c1c", group: "rot"    }, // red-700
  ringen:    { tone: "#7e22ce", group: "lila"   }, // purple-700
  sparring:  { tone: "#1d4ed8", group: "blau"   }, // blue-700
  wettkampf: { tone: "#0369a1", group: "blau"   }, // sky-700
  boxen:     { tone: "#d97706", group: "orange" }, // amber-600
};

/** Was im Chip steht: das empfohlene Level, nicht die Kursart. */
const LEVEL_LABEL: Record<ScheduleClass["level"], string> = {
  anfaenger:    "Anfänger",
  jedes:        "Jedes Level",
  intermediate: "ab Intermediate",
  advanced:     "ab Advanced",
};

/* Die Schluessel hiessen frueher Mon/Tue/Wed — `schedule` liefert aber
   Mo/Di/Mi. Der Lookup lief also immer ins Leere und kein einziges Kanji
   wurde je gezeichnet. */
const DAY_JP: Record<string, string> = {
  Mo: "月",
  Di: "火",
  Mi: "水",
  Do: "木",
  Fr: "金",
  Sa: "土",
};

/** Fuer die Vorlesezeile und die Positionsangabe — "Mi" ist eine Abkuerzung,
 *  und eine Abkuerzung vorgelesen ergibt Buchstabensalat. */
const DAY_FULL: Record<string, string> = {
  Mo: "Montag",
  Di: "Dienstag",
  Mi: "Mittwoch",
  Do: "Donnerstag",
  Fr: "Freitag",
  Sa: "Samstag",
};

function DayCard({ col }: { col: (typeof schedule)[number] }) {
  return (
    <div className="flex h-full flex-col" style={{ fontFamily: "var(--font-display)" }}>
      {/* header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-foreground text-lg font-semibold tracking-tight">
          {col.day}
        </span>
        <span
          className="text-foreground/30 text-2xl font-light"
          lang="ja"
          aria-hidden="true"
          style={{ fontFamily: "var(--font-jp)" }}
        >
          {DAY_JP[col.day] ?? ""}
        </span>
      </div>

      {/* class list */}
      <div className="flex flex-col gap-0 overflow-hidden">
        {col.classes.map((c, j) => {
          const tone = COURSE[c.kind].tone;
          return (
            <div
              key={`${c.time}-${j}`}
              className="flex flex-col gap-0.5 px-4 py-3.5"
              style={{
                borderLeft: `2px solid ${tone}`,
                marginLeft: "1px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              } as CSSProperties}
            >
              {/* Zeit: weiss, groesser, tabellarische Ziffern und nur leicht
                  gesperrt. Uppercase entfaellt — bei Ziffern tut es nichts
                  ausser die Zeichen auseinanderzuziehen. */}
              <span
                className="font-mono text-[0.78rem] font-medium tracking-[0.04em] text-foreground"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {c.time}
              </span>
              <span className="text-foreground text-[0.95rem] leading-snug font-semibold">
                {c.name}
              </span>
              {c.note ? (
                <span className="text-foreground-dim text-[0.72rem] leading-snug">
                  {c.note}
                </span>
              ): null}
              <span
                className="mt-2 inline-flex w-fit items-center px-1.5 py-[3px] text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white"
                style={{ background: tone, borderRadius: 3 }}
              >
                {LEVEL_LABEL[c.level]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STACK_SHARED = {
  borderRadius: 10,
  cardColor: "var(--card-plate)",
  shadowOpacity: 0.55,
  visibleCount: 4,
  depthScale: 0.06,
  depthOpacity: 0.12,
  duration: 0.4,
  ease: "power3.out",
  // Der kurze weisse Ping-Punkt ueber der obersten Karte. Er bleibt, obwohl
  // es jetzt eine sichtbare Leiste gibt: er sagt "diese Flaeche ist auch
  // anfassbar", was die Leiste nicht sagen kann. Nach 4,2 s ist er weg.
  tapHint: true,
  // Der Klick liegt auf den Karten, nicht auf dem 500 px hohen Container
  // ringsherum — siehe den Kopfkommentar in click-stack.tsx.
  hitArea: "card" as const,
} as const;

// ---- Bedienleiste --------------------------------------------------------

interface ArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
}

function Arrow({ direction, onClick, label }: ArrowProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // 44 px im Quadrat: das kleinste Fingerziel, das zuverlaessig getroffen
      // wird (WCAG 2.5.5). Rand statt Flaeche, weil eine gefuellte Schaltflaeche
      // hier mit den Karten um dieselbe Helligkeit konkurrieren wuerde.
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-border text-foreground-dim transition-colors hover:border-border-hot hover:bg-card-plate-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {direction === "prev" ? "‹" : "›"}
      </span>
    </button>
  );
}

interface StackProps {
  cardWidth: number;
  cardHeight: number;
  spreadX: number;
  spreadY: number;
  shadowBlur: number;
  /** Hoehe des Bereichs, in dem der Stapel liegt */
  stackClassName: string;
}

function ScheduleStack({
  cardWidth,
  cardHeight,
  spreadX,
  spreadY,
  shadowBlur,
  stackClassName,
}: StackProps): ReactNode {
  const [index, setIndex] = useState(0);
  const controller = useRef<ClickStackHandle | null>(null);
  const liveId = useId();

  const items = schedule.map((col, i) => <DayCard key={i} col={col} />);
  const current = schedule[index];
  const dayShort = current?.day ?? "";
  const dayLong = DAY_FULL[dayShort] ?? dayShort;

  const prev = useCallback(() => controller.current?.prev(), []);
  const next = useCallback(() => controller.current?.next(), []);

  return (
    <div>
      <div className={stackClassName}>
        <ClickStack
          items={items}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          spreadX={spreadX}
          spreadY={spreadY}
          shadowBlur={shadowBlur}
          controllerRef={controller}
          onIndexChange={setIndex}
          ariaLabel={`Stundenplan, ${dayLong}. Mit den Pfeiltasten links und rechts durch die Tage blättern.`}
          {...STACK_SHARED}
        />
      </div>

      {/* Die Leiste, zweizeilig.
          Einzeilig ginge sie nicht auf: sechs Tagesziele zu 44 px plus zwei
          Pfeile zu 44 px sind 352 px, und ein 320-px-Geraet hat nach dem
          Seitenpolster 288 px. Also oben die sechs Tage (direkter Zugriff,
          volle Breite), darunter die beiden Pfeile mit der Positionszeile
          dazwischen (sequentiell). 6 x 44 + 5 x 2 = 274 px — das passt. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-0.5 sm:gap-1.5">
        {schedule.map((col, i) => {
          const active = i === index;
          return (
            <button
              key={col.day}
              type="button"
              onClick={() => controller.current?.goTo(i)}
              aria-current={active ? "true": undefined}
              aria-label={DAY_FULL[col.day] ?? col.day}
              className={[
                "relative flex h-11 min-w-11 items-center justify-center px-1.5 font-mono text-[0.78rem] font-medium tracking-[0.08em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:px-3",
                active ? "text-accent" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {col.day}
              {/* Die Marke unter dem laufenden Tag. Ein Strich, kein Punkt
                  und kein Kasten — dieselbe Haarlinie, aus der die ganze
                  untere Seitenhaelfte gebaut ist. */}
              <span
                aria-hidden="true"
                className="absolute bottom-1.5 left-1/2 h-px w-5 -translate-x-1/2 transition-opacity"
                style={{ background: "var(--accent)", opacity: active ? 1: 0 }}
              />
            </button>
          );
        })}
      </div>

      {/* Position in Worten, zwischen den beiden Pfeilen. `aria-live`, damit
          ein Screenreader den Wechsel mitbekommt — die Karten selbst tauschen
          nur ihre Z-Reihenfolge, und davon erfaehrt er nichts. */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <Arrow direction="prev" onClick={prev} label="Vorheriger Tag" />
        <p
          id={liveId}
          aria-live="polite"
          className="min-w-[10.5rem] text-center text-sm text-foreground-dim"
        >
          <span className="text-foreground">{dayLong}</span>
          <span className="text-muted-foreground"> · {index + 1} von {schedule.length}</span>
        </p>
        <Arrow direction="next" onClick={next} label="Nächster Tag" />
      </div>


      <MatFootnote className="mx-auto mt-6 max-w-md text-center" />
    </div>
  );
}

/**
 * Matte frei und Dehnen stehen absichtlich nicht als eigene Zeilen im Plan:
 * es sind keine Kurse, und als Zeitschienen wuerden sie jede Tageskarte um
 * die Haelfte verlaengern, um zweimal dasselbe zu sagen. Als Fussnote sind
 * sie einmal da und gelten fuer die ganze Woche — in beiden Layouts.
 */
function MatFootnote({ className = "" }: { className?: string }): ReactNode {
  return (
    <div
      className={`border-t border-border pt-4 text-sm leading-relaxed text-foreground-dim ${className}`}
    >
      {/* Am Handy standen hier drei Zeilen Fliesstext unter einem
          Kartenstapel, und Fliesstext ist die falsche Form fuer zwei Uhrzeiten
          und drei Wochentage: man liest ihn wie einen Satz, obwohl man ihn wie
          eine Tabelle benutzt. Dieselbe Auskunft, als zwei Angaben gesetzt.
          Am Desktop ist im Textblock Platz, dort bleibt der Satz. */}
      <dl className="flex flex-col gap-1 sm:hidden">
        <div className="flex flex-wrap justify-center gap-x-2">
          <dt className="text-foreground">Matte frei:</dt>
          <dd>ab 16:30, Di + Do ab 16:45</dd>
        </div>
        <div className="flex flex-wrap justify-center gap-x-2">
          <dt className="text-foreground">Dehnen:</dt>
          <dd>Mo, Mi, Fr um 17:15</dd>
        </div>
      </dl>
      <p className="hidden sm:block">
        Vor jedem Training ist die Matte frei zum Drillen: ab 16:30, dienstags
        und donnerstags ab 16:45. Montag, Mittwoch und Freitag um 17:15
        gemeinsames Dehnen für BJJ.
      </p>
    </div>
  );
}

// ---- Wochenpanel (nur ab md) ---------------------------------------------

/**
 * Am Desktop ist der Kartenstapel die falsche Form.
 *
 * Die Kernfrage eines Stundenplans ist ein VERGLEICH — "wann kann ich?" heisst,
 * die Tage gegeneinander zu halten. Ein Stapel zeigt einen Tag und verbirgt
 * fuenf. Auf 1400 px passen alle sechs muehelos nebeneinander.
 *
 * Gebaut ist das Panel aus dem `jjk-week`-Vokabular, das seit dem Umbau in
 * app/globals.css liegt und bis jetzt nie verwendet wurde: EIN geteiltes Panel
 * statt sechs nebeneinandergelegter Karten — Ein-Pixel-Fugen ueber einem Grund
 * in Rahmenfarbe. Sechs Dinge nebeneinander sind sechs Dinge; sechs Dinge, die
 * sich ein Raster teilen, sind ein Stundenplan. Dort steht auch schon die
 * Ein cursorgefuehrtes Licht lag kurz darueber und ist wieder raus: ueber
 * einer Tabelle hebt ein Lichtkegel immer die Stelle hervor, an der der Zeiger
 * steht, und das ist beim Suchen nie die Stelle, die man sucht.
 *
 * Diese Sektion hat ausserdem die frueheren Programm-Karten aufgesogen. Die
 * sagten dasselbe ein zweites Mal — einmal nach Programm sortiert, einmal nach
 * Tag. Jetzt traegt der Plan beides: die Zeiten im Panel, den laengeren Text
 * im Detailfenster hinter einem Klick.
 */


/** Wie viele Slots die laengste Spalte hat — kuerzere Tage bekommen unten
 *  Fuellraum, damit alle Spalten gleich hoch schliessen. */
const MAX_SLOTS = schedule.reduce((m, c) => Math.max(m, c.classes.length), 0);

interface Detail {
  title: string;
  kanji: string;
  level: string;
  blurb: string;
  tag: string;
  /** Alle Termine dieses Programms in der Woche. */
  when: { day: string; time: string }[];
}

function buildDetail(programTitle: string): Detail | null {
  const i = programs.findIndex((p) => p.title === programTitle);
  if (i < 0) return null;
  const p = programs[i]!;
  const when: Detail["when"] = [];
  for (const col of schedule) {
    for (const c of col.classes) {
      if (c.program === programTitle) {
        when.push({ day: DAY_FULL[col.day] ?? col.day, time: c.time });
      }
    }
  }
  return {
    title: p.title,
    kanji: p.kanji,
    level: p.level,
    blurb: p.blurb,
    tag: p.tag,
    when,
  };
}

// ---- Eine Einheit --------------------------------------------------------

/**
 * Der Kommentar an `.jjk-slot` in globals.css ist eindeutig: die Stufe traegt
 * die Haarlinie am linken Rand, nicht zusaetzlich noch ein Chip und ein Balken,
 * die alle dasselbe sagen. Daran halte ich mich — das gefuellte Chip bleibt
 * dem Handy-Stapel, wo es keine Legende ueber sich hat.
 *
 * Die Zeit steht in Vordergrundweiss, nicht in der Stufenfarbe. Das war die
 * Lehre aus der letzten Runde: Zinnober auf #07070a ist als Kleinschrift
 * unlesbar. Die Stufe steht als eigene Mono-Zeile darunter, im aufgehellten
 * Ton (`text`), und ist damit lesbar, ohne die Zeit zu verdraengen.
 */
function Slot({
  c,
  onOpen,
}: {
  c: ScheduleClass;
  onOpen: (programTitle: string) => void;
}): ReactNode {
  const tone = COURSE[c.kind].tone;
  const label = LEVEL_LABEL[c.level];
  const openable = Boolean(c.program);

  const body = (
    <>
      <span
        className="jjk-slot-time"
        style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}
      >
        {c.time}
      </span>
      <span className="jjk-slot-name" style={{ fontWeight: 600, fontSize: "0.95rem" }}>
        {c.name}
      </span>
      {c.note ? (
        <span className="mt-0.5 block text-[0.72rem] leading-snug text-muted-foreground">
          {c.note}
        </span>
      ): null}
      {/* Gefuelltes Chip, weisse Schrift — so steht es auch im Aushang, und
          eine Flaeche traegt eine 700er-Farbe auf Schwarz zuverlaessig,
          waehrend dieselbe Farbe als Schrift durchfaellt. */}
      <span
        className="mt-2 inline-flex w-fit items-center px-1.5 py-[3px] text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white"
        style={{ background: tone, borderRadius: 3 }}
      >
        {label}
      </span>
    </>
  );

  const style = { "--slot": tone } as CSSProperties;

  if (!openable) {
    return (
      <div className="jjk-slot" style={style}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(c.program!)}
      className="jjk-slot w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
      style={style}
      aria-label={`${c.name}, ${c.time}, ${label}: Details anzeigen`}
    >
      {body}
    </button>
  );
}

// ---- Detailfenster -------------------------------------------------------

function ProgramSheet({
  detail,
  onClose,
}: {
  detail: Detail | null;
  onClose: () => void;
}): ReactNode {
  // Kein `mounted`-Flag noetig: das Fenster entsteht erst durch einen Klick,
  // also immer im Browser. Serverseitig ist `detail` null und der Portalaufruf
  // findet nie statt — der Guard unten deckt nur den Fall ab, dass React die
  // Komponente ohne document auswertet.

  // Escape schliesst, und solange offen ist, scrollt die Seite darunter nicht
  // weg — sonst steht das Fenster nach dem Schliessen woanders als der Slot,
  // von dem es kam.
  useEffect(() => {
    if (!detail) return;
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
  }, [detail, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {detail ? (
        <motion.div
          key="sheet"
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
            aria-label={detail.title}
            className="relative w-full max-w-xl overflow-hidden border border-border"
            style={{ background: "var(--card-plate)" }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {/* Kopf — dasselbe Bild wie die frueheren Programm-Karten:
                Kanji als Wasserzeichen, Stufe klein darueber, Symbol rechts. */}
            <div className="relative overflow-hidden px-8 pt-7 pb-6">
              <span
                aria-hidden="true"
                lang="ja"
                className="pointer-events-none absolute -right-[0.05em] -bottom-[0.28em] select-none leading-none"
                style={{
                  fontFamily: "var(--font-jp)",
                  fontSize: "11rem",
                  color: "rgba(255,106,31,0.075)",
                }}
              >
                {detail.kanji}
              </span>
              {/* Rechts oben sass hier ein Programmsymbol — genau dort, wo auch
                  das Schliessen-Kreuz sitzt. Zwei Dinge auf derselben Flaeche,
                  von denen eines anklickbar ist: raus damit. */}
              <div className="relative">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-accent">
                    {detail.tag}
                  </p>
                  <h3
                    className="mt-2.5 text-3xl font-semibold leading-tight text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {detail.title}
                  </h3>
                  <p className="mt-1.5 font-mono text-[0.64rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {detail.level}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-8 py-6">
              <p className="text-[0.95rem] leading-relaxed text-foreground-dim">
                {detail.blurb}
              </p>

              <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                Termine
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {detail.when.map((w) => (
                  <li
                    key={`${w.day}-${w.time}`}
                    className="flex items-baseline gap-4 text-sm"
                  >
                    <span className="min-w-[6.5rem] text-foreground">{w.day}</span>
                    <span
                      className="font-mono text-foreground-dim"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {w.time}
                    </span>
                  </li>
                ))}
              </ul>
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
      ): null}
    </AnimatePresence>,
    document.body,
  );
}

// ---- Das Panel -----------------------------------------------------------

/**
 * Die Neigung liegt auf dem GANZEN Panel, nicht auf den einzelnen Feldern.
 *
 * Eine Kippung pro Feld wuerde genau die Fuge zerreissen, aus der das Panel
 * besteht — sechs kippende Kacheln sind wieder sechs Dinge. Eine Platte, die
 * sich als Ganzes zum Zeiger neigt, bleibt eine Platte. Entsprechend klein ist
 * der Ausschlag: 1,6 Grad, gerade genug, dass die Oberflaeche nicht flach
 * wirkt. Aus wie ueberall auf grobem Zeiger und bei reduzierter Bewegung.
 */
function TiltPlate({ children }: { children: ReactNode }): ReactNode {
  const wrap = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const to = useRef({ rx: 0, ry: 0 });
  const at = useRef({ rx: 0, ry: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = wrap.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const MAX = 1.6;
    const tick = (): void => {
      at.current.rx += (to.current.rx - at.current.rx) * 0.09;
      at.current.ry += (to.current.ry - at.current.ry) * 0.09;
      if (plate.current) {
        plate.current.style.transform =
          `perspective(1800px) rotateX(${at.current.rx.toFixed(3)}deg) rotateY(${at.current.ry.toFixed(3)}deg)`;
      }
      const done =
        Math.abs(to.current.rx - at.current.rx) < 0.002 &&
        Math.abs(to.current.ry - at.current.ry) < 0.002;
      raf.current = done ? null: requestAnimationFrame(tick);
    };
    const kick = (): void => {
      if (raf.current === null) raf.current = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      to.current = {
        rx: -((e.clientY - r.top) / r.height - 0.5) * 2 * MAX,
        ry: ((e.clientX - r.left) / r.width - 0.5) * 2 * MAX,
      };
      kick();
    };
    const onLeave = (): void => {
      to.current = { rx: 0, ry: 0 };
      kick();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div ref={wrap}>
      <div ref={plate} style={{ transformStyle: "preserve-3d", willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

/** Reihenfolge von `Date.getDay()`: 0 ist Sonntag. */
const WEEKDAY_KEYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function WeekPanel(): ReactNode {
  // Welcher Tag heute ist, darf NICHT beim Serverrendern entschieden werden:
  // der Server steht in UTC, der Besucher in Europe/Vienna, und um 23:30 Uhr
  // waeren das zwei verschiedene Tage — Hydration-Mismatch. Also erst im
  // Browser, und ueber einen Timeout statt direkt im Effect, damit daraus
  // keine Kaskadenrenderung wird.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(
      () => setToday(WEEKDAY_KEYS[new Date().getDay()] ?? null),
      0,
    );
    return () => window.clearTimeout(t);
  }, []);

  const [open, setOpen] = useState<string | null>(null);
  const onOpen = useCallback((t: string) => setOpen(t), []);
  const onClose = useCallback(() => setOpen(null), []);
  const detail = open ? buildDetail(open): null;

  return (
    <div className="mt-12">
      {/* Das cursorgefuehrte Licht (SpotlightGrid) lag hier und ist wieder
          raus. Ueber einer Bildwand funktioniert ein Lichtkegel, ueber einer
          Tabelle nicht: er hebt hervor, wo der Zeiger gerade steht, und das
          ist beim Suchen nie die Stelle, die man sucht. Die Unterteilung der
          Tage traegt jetzt die Flaeche selbst — Zebra als Grundton, Spalte
          unter dem Zeiger hebt sich, Kanji leuchtet auf. */}
      <TiltPlate>
          <div className="jjk-week">
            {schedule.map((col) => (
              <div
                key={col.day}
                className="jjk-day"
                data-today={col.day === today ? "true": undefined}
              >
                {/* Das Wochentag-Kanji stand frueher als 0,68-rem-Zeile unter
                    dem Namen. Als Wasserzeichen hinter der ganzen Spalte tut es
                    mehr: es gibt jeder Spalte ein eigenes Zeichen, ohne eine
                    Zeile zu kosten, und es ist dieselbe Geste wie bei den
                    Namenstafeln (.jjk-name-glyph). */}
                <span className="jjk-day-glyph" lang="ja" aria-hidden="true">
                  {DAY_JP[col.day] ?? ""}
                </span>
                <div className="jjk-day-head">
                  <span className="jjk-day-name">{DAY_FULL[col.day] ?? col.day}</span>
                  {col.day === today ? (
                    <span className="jjk-day-today">Heute</span>
                  ): null}
                </div>
                {col.classes.map((c, j) => (
                  <Slot key={`${c.time}-${j}`} c={c} onOpen={onOpen} />
                ))}
                {/* Fuellraum: der Samstag hat eine Einheit, die Werktage zwei.
                    Ohne ihn zieht die Grid-Zeile alle Spalten auf dieselbe
                    Hoehe, aber die kurze Spalte streckt ihre Slots dabei mit. */}
                {col.classes.length < MAX_SLOTS ? (
                  <div className="flex-grow" aria-hidden="true" />
                ): null}
              </div>
            ))}
          </div>
      </TiltPlate>

      <MatFootnote className="mt-8" />
      <ProgramSheet detail={detail} onClose={onClose} />
    </div>
  );
}

// ---- Sektion -------------------------------------------------------------

function Intro({ headingClass }: { headingClass: string }): ReactNode {
  return (
    <>
      <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Stundenplan" />
      <StaggeredText
        text="Jede Einheit der Woche"
        as="h2"
        segmentBy="words"
        direction="bottom"
        delay={70}
        duration={0.7}
        blur
        className={headingClass}
      />
      {/* Die Legende nennt die fuenf GRUPPEN, nicht die neun Kursarten.
          Eine Liste aller Kursarten waere ueberfluessig — ihr Name steht auf
          jeder Karte. Die Gruppe steht nirgends sonst, und sie ist die
          Information: sie sagt, in welche Richtung eine Einheit geht. */}
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
        {Object.entries(GROUPS).map(([key, g]) => (
          <span
            key={key}
            className="flex items-center gap-2.5 font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5"
              style={{ background: g.tone, borderRadius: 2 }}
            />
            {g.label}
          </span>
        ))}
      </div>
    </>
  );
}

export function Schedule() {
  return (
    <section id="schedule" className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* Mobile: stacked layout */}
        <div className="md:hidden">
          <Intro headingClass="jjk-section-title max-w-2xl" />
          <div className="mt-10">
            <ScheduleStack
              cardWidth={240}
              cardHeight={360}
              spreadX={22}
              spreadY={-18}
              shadowBlur={40}
              stackClassName="h-[440px]"
            />
          </div>
        </div>

        {/* Desktop: Intro oben, darunter das volle Wochenraster.
            Das Nebeneinander aus Text und Kartenstapel ist weg — es gab dem
            Stapel 58 % der Breite fuer genau einen sichtbaren Tag. */}
        <div className="hidden md:block">
          <Intro headingClass="jjk-section-title max-w-3xl" />
          <WeekPanel />
        </div>

      </div>
    </section>
  );
}

export default Schedule;
