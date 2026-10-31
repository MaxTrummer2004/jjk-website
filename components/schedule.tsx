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
 * Die Palette — seit 29.10.2026 wieder nach KURSART, wie der neue Aushang.
 *
 * Bis dahin faerbte der Plan nach Stufe (Vorstand, 11.10.2026: Anfaenger und
 * jedes Level gruen, Intermediate orange, Advanced rot, Boxen blau). Mit dem
 * neuen Plan ist jeder Kurs "Jedes Level", also waere alles gruen ausser
 * Boxen gewesen: No-Gi, Gi, Open Mat und Matte frei gleich, die Farbe haette
 * nichts mehr unterschieden. Der Aushang faerbt nach Kursart mit Legende, und
 * genau das tut der Plan jetzt auch.
 *
 * Die Toene sind keine neuen, sondern die, die diese Datei schon getragen hat
 * (alles Tailwind-Rampe, 600er/700er):
 *
 *   No-Gi      green-600  — war Anfaenger & jedes Level; No-Gi ist der
 *                           haeufigste Kurs (3x) und bleibt, wie er war
 *   Gi         amber-600  — war bis 11.10. Boxen; der waermste Ton, also der
 *                           groesste Abstand zu Gruen, und Gi/No-Gi ist DIE
 *                           Unterscheidung ("brauche ich meinen Gi?")
 *   Boxen      blue-700   — bleibt seit 11.10. blau, niemand muss umlernen
 *   Open Mat   purple-700 — war Ringen; einmal pro Woche, steht allein am
 *                           Samstag und braucht daher keinen Nachbarabstand
 *   Matte frei neutral-500 — grau, wie am Aushang: das ist kein Kurs, sondern
 *                           offene Matte, und soll neben den Kursen zuruecktreten
 *
 * Nebeneinander stehen im Plan nur Blau/Gelb (Di), Blau/Gruen (Do) und je
 * Grau davor — alle Paare liegen weit auseinander. Rot ist absichtlich nicht
 * dabei: Zinnober gehoert der Seite selbst (Hover, Akzent), und eine rote
 * Kursfarbe saehe aus wie ein Zustand.
 *
 * Eine 600er/700er-Stufe ist fuer helle Gruende gebaut, dieser Grund ist fast
 * schwarz. Das wird nicht ueber die Farbe geloest, sondern ueber ihren
 * Einsatz: sie traegt Flaechen (das Farbfeld) und Linien, nie Kleinschrift.
 *
 * Die Reihenfolge der Schluessel ist die der Legende ("Pro Woche"), wie am
 * Aushang: No-Gi, Gi, Boxen, Open Mat, dann Matte frei.
 */
const KIND: Record<ScheduleClass["kind"], { label: string; tone: string }> = {
  nogi:    { label: "Jiu-Jitsu No-Gi", tone: "#16a34a" }, // green-600
  gi:      { label: "Jiu-Jitsu Gi",    tone: "#d97706" }, // amber-600
  boxen:   { label: "Boxen",           tone: "#1d4ed8" }, // blue-700
  openmat: { label: "Open Mat",        tone: "#7e22ce" }, // purple-700
  frei:    { label: "Matte frei",      tone: "#737373" }, // neutral-500
};

function toneOf(c: ScheduleClass): string {
  return KIND[c.kind].tone;
}

/**
 * Das Farbfeld vor der Zeit, und dasselbe Feld in der Legende. Bis
 * 29.10.2026 trug ein gefuelltes Level-Chip die Farbe; das Chip ist weg
 * (siehe `LevelChip`), und die Haarlinie allein steht am Desktop auf 55 %
 * Deckkraft — zu leise, um eine Legende zu tragen. Ein flaches Quadrat ist
 * die kleinste FLAECHE, auf der eine 700er-Farbe auf Schwarz noch sicher
 * erkennbar ist. Eckig, weil auf dieser Seite nichts abgerundet ist.
 */
function Swatch({ tone }: { tone: string }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 shrink-0"
      style={{ background: tone }}
    />
  );
}

/**
 * "18:00–19:15" ist eine Uhrzeit, "Nach Absprache" (Open Mat, seit
 * 29.10.2026) nicht. `time` ist in lib/config.ts reiner Anzeigetext; hier
 * entscheidet nur die Form ueber die Schrift.
 */
function isClock(time: string): boolean {
  return /^\d{1,2}:\d{2}/.test(time);
}

/**
 * Die Zeitzeile einer Einheit. Eine Uhrzeit steht in Mono mit
 * Tabellenziffern. "Nach Absprache" in derselben Mono sah aus wie eine
 * kaputte Uhrzeit — gleiche Schrift, gleiche Stelle, aber keine Ziffern. Es
 * steht deshalb als Mono-Etikett in Versalien und gedaempft: dieselbe Form
 * wie jede Augenbraue der Seite, also lesbar als "Hinweis zur Zeit", nicht
 * als Zeit.
 */
function SlotTime({ time, clockClass }: { time: string; clockClass: string }): ReactNode {
  if (isClock(time)) {
    return (
      // Farbe inline: `.jjk-slot-time` faerbt die Zeit in `--slot`, und die
      // soll weiss bleiben (siehe `Slot`).
      <span
        className={clockClass}
        style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}
      >
        {time}
      </span>
    );
  }
  return (
    <span className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {time}
    </span>
  );
}

/**
 * 🥋 Gi, 🤼 No-Gi, beides fuer die Open Mat, 🥊 Boxen. Nur dort, wo
 * `attire` gesetzt ist — Matte frei traegt keins.
 */
const ATTIRE: Record<NonNullable<ScheduleClass["attire"]>, { emoji: string; label: string }> = {
  gi:   { emoji: "🥋", label: "im Gi" },
  nogi: { emoji: "🤼", label: "No-Gi" },
  both: { emoji: "🥋🤼", label: "Gi und No-Gi" },
  box:  { emoji: "🥊", label: "Boxen" },
};

/* Hier stand `EitherOr` ("Entweder – oder", fuer den Mittwoch:
   Wettkampftraining ODER Special Wednesday). Seit 29.10.2026 benutzt kein
   Eintrag mehr `alt`, und das Feld ist aus `ScheduleClass` raus — ein Feld,
   das niemand darstellt, waere eine stille Falle. Zurueckholen: git log. */

function AttireMark({ attire }: { attire: ScheduleClass["attire"] }): ReactNode {
  if (!attire) return null;
  const a = ATTIRE[attire];
  return (
    <span role="img" aria-label={a.label} title={a.label} className="ml-1.5 align-[-0.05em]">
      {a.emoji}
    </span>
  );
}


const ALL_CLASSES = schedule.flatMap((d) => d.classes);

/** Was im Chip steht: das empfohlene Level, nicht die Kursart. */
const LEVEL_LABEL: Record<ScheduleClass["level"], string> = {
  anfaenger:    "Anfänger",
  jedes:        "Jedes Level",
  intermediate: "ab Intermediate",
  advanced:     "ab Advanced",
};

/**
 * Ob wirklich JEDE Einheit fuer jedes Level ist. Nur dann steht der Satz
 * des Aushangs ("alle Kurse fuer jedes Level") im Intro — gerechnet, damit er
 * nicht stehen bleibt, wenn der Verein wieder einen Kurs mit Stufe einfuehrt.
 */
const EVERY_LEVEL = ALL_CLASSES.every((c) => c.level === "jedes");

/**
 * Das Level-Chip, seit 29.10.2026 nur noch als AUSNAHME.
 *
 * Bis dahin trug jede Einheit ihr Chip. Mit dem neuen Plan stuende auf allen
 * dreizehn Karten "Jedes Level" — dreizehnmal dieselbe Aussage ist keine
 * Information, sondern Rauschen, und es kostete pro Einheit eine Zeile. Der
 * Satz steht jetzt EINMAL im Intro, wie am Aushang ueber dem Plan. Ein Chip
 * erscheint nur, wenn eine Einheit davon abweicht; dann ist es genau die
 * Stelle, die man sehen muss. Neutral umrandet statt in der Kursfarbe
 * gefuellt: die Farbe gehoert jetzt der Kursart.
 */
function LevelChip({ level }: { level: ScheduleClass["level"] }): ReactNode {
  if (level === "jedes") return null;
  return (
    <span className="mt-2 inline-flex w-fit items-center border border-border px-1.5 py-[3px] font-mono text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-foreground-dim">
      {LEVEL_LABEL[level]}
    </span>
  );
}

/**
 * Wie oft es jede KURSART pro Woche gibt, mit ihrem Farbfeld — Zaehlung und
 * Legende in einem. Seit 29.10.2026 nach Kursart statt nach Stufe (alles ist
 * jetzt "Jedes Level", die Stufenzaehlung haette "Jedes Level 8x" gesagt).
 * Aus `schedule` gerechnet, nicht abgetippt: aendert sich der Plan, stimmen
 * Zahl und Legende von selbst, und eine Kursart, die nicht im Plan steht,
 * steht auch nicht in der Legende. Stand heute: No-Gi 3, Gi 2, Boxen 2 —
 * die "7 Kurse pro Woche" aus `pricing.benefits` — plus Open Mat 1 und
 * Matte frei 5.
 */
const WEEKLY: { kind: ScheduleClass["kind"]; label: string; tone: string; count: number }[] =
  (Object.keys(KIND) as ScheduleClass["kind"][])
    .map((kind) => ({
      kind,
      ...KIND[kind],
      count: ALL_CLASSES.filter((c) => c.kind === kind).length,
    }))
    .filter((r) => r.count > 0);

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

/** Wie viele Slots die laengste Spalte hat (Di und Do: drei). */
const MAX_SLOTS = schedule.reduce((m, c) => Math.max(m, c.classes.length), 0);

/**
 * Ob eine Einheit den Rest ihrer Spalte bzw. Karte fuellt.
 *
 * Seit 29.10.2026 sind die Tage ungleich lang: Di/Do drei Eintraege
 * (Matte frei, zwei Kurse zu 60 Minuten), Mo/Mi/Fr zwei (Matte frei, EIN
 * Kurs zu 75 Minuten ab 18:00), Sa einer. Vorher fuellte ein leeres Element
 * den Rest, und unter Mo/Mi/Fr stand ein Drittel der Spalte leer — das sah
 * aus wie ein vergessener Kurs. Jetzt reicht die LETZTE Einheit eines kurzen
 * Tages bis unten, wie am Aushang, wo der 75-Minuten-Kurs die Spalte fuellt.
 * Das stimmt auch zeitlich: 18:00–19:15 liegt quer ueber den beiden Schienen
 * 17:45 und 19:00 der langen Tage. Am Samstag fuellt die Open Mat die ganze
 * Spalte — sie hat keine feste Zeit, also auch kein festes Ende.
 */
function grows(col: (typeof schedule)[number], j: number): boolean {
  return col.classes.length < MAX_SLOTS && j === col.classes.length - 1;
}

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

      {/* class list. `flex-1`, damit die letzte Einheit eines kurzen Tages
          bis zum Kartenboden reichen kann (siehe `grow`). */}
      <div className="flex flex-1 flex-col gap-0 overflow-hidden">
        {col.classes.map((c, j) => {
          const tone = toneOf(c);
          return (
            <div
              key={`${c.time}-${j}`}
              className="flex flex-col gap-0.5 px-4 py-3.5"
              style={{
                borderLeft: `2px solid ${tone}`,
                marginLeft: "1px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                flexGrow: grows(col, j) ? 1 : 0,
              } as CSSProperties}
            >
              {/* Zeit: weiss, groesser, tabellarische Ziffern und nur leicht
                  gesperrt. Uppercase entfaellt — bei Ziffern tut es nichts
                  ausser die Zeichen auseinanderzuziehen. Davor das Farbfeld
                  der Kursart, dasselbe wie in der Legende am Desktop. */}
              <span className="flex items-center gap-2">
                <Swatch tone={tone} />
                <SlotTime
                  time={c.time}
                  clockClass="font-mono text-[0.78rem] font-medium tracking-[0.04em] text-foreground"
                />
              </span>
              <span className="text-foreground text-[0.95rem] leading-snug font-semibold">
                {c.name}
                <AttireMark attire={c.attire} />
              </span>
              {c.note ? (
                <span className="text-foreground-dim text-[0.72rem] leading-snug">
                  {c.note}
                </span>
              ): null}
              <LevelChip level={c.level} />
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
      className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-foreground-dim transition-colors hover:border-border-hot hover:bg-card-plate-hot hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span aria-hidden="true" className="text-base leading-none">
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

      {/* Die Tagesleiste (Mo bis Sa als eigene Knoepfe) ist seit 15.10.2026
          weg: blaettern soll man vor allem per Klick auf die Karten. Uebrig
          bleibt eine kleine Zeile mit zwei Pfeilen, naeher am Stapel. */}
      {/* Position in Worten, zwischen den beiden Pfeilen. `aria-live`, damit
          ein Screenreader den Wechsel mitbekommt — die Karten selbst tauschen
          nur ihre Z-Reihenfolge, und davon erfaehrt er nichts. */}
      {/* `relative z-10` seit 31.10.2026: die Zeile zieht sich mit -mt-5 um
          20 px unter den Stapel, und der Stapel (relative, spaeter gemalt
          als die statische Zeile) lag darueber. elementFromPoint in der
          Knopfmitte lieferte das div[role=group] des Stapels, nicht den
          Knopf; am Handy reagierten die Pfeile nur in ihren unteren 16 von
          36 px. Mit z-10 liegt die Zeile oben. Am Stapel geht dabei nichts
          verloren: hitArea ist "card", der leere Containerrand unter den
          Karten nahm ohnehin keinen Klick an. Optisch aendert sich nichts. */}
      <div className="relative z-10 -mt-5 flex items-center justify-center gap-2">
        <Arrow direction="prev" onClick={prev} label="Vorheriger Tag" />
        <p
          id={liveId}
          aria-live="polite"
          className="min-w-[9rem] text-center text-xs text-foreground-dim"
        >
          <span className="text-foreground">{dayLong}</span>
          <span className="text-muted-foreground"> · {index + 1} von {schedule.length}</span>
        </p>
        <Arrow direction="next" onClick={next} label="Nächster Tag" />
      </div>

    </div>
  );
}

/* Hier stand MatFootnote: "Matte frei ab 16:30 … Dehnen 17:15 … 60 Minuten".
   Auf Wunsch des Vorstands (10.10.2026) ersatzlos weg. Die offene Matte
   steht seit 29.10.2026 als "Matte frei" 17:00–17:45 Mo–Fr im Plan, als
   eigene Einheit in Grau (vorher "Freies Training"). */

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
 * Der Kommentar an `.jjk-slot` in globals.css ist eindeutig: die Kursart
 * traegt die Haarlinie am linken Rand, nicht zusaetzlich noch ein Chip und
 * ein Balken, die alle dasselbe sagen. Seit 29.10.2026 sagen es genau zwei
 * Dinge: die Haarlinie und das Farbfeld vor der Zeit, das die Legende ueber
 * dem Plan aufloest. Das Level-Chip, das bis dahin die Farbe trug, steht nur
 * noch bei Ausnahmen (`LevelChip`).
 *
 * Die Zeit steht in Vordergrundweiss, nicht in der Kursfarbe. Das war die
 * Lehre aus einer frueheren Runde: Farbe auf #07070a ist als Kleinschrift
 * unlesbar.
 *
 * Flex-Spalte statt Fliesstext, weil ein <button> seinen Inhalt sonst
 * senkrecht MITTIG setzt — sobald die Einheit ueber `grow` hoeher wird als
 * ihr Inhalt, rutschte die Zeit von der Oberkante weg und die Zeilen der
 * Nachbarspalten stuenden nicht mehr auf einer Linie.
 */
function Slot({
  c,
  grow,
  onOpen,
}: {
  c: ScheduleClass;
  grow: boolean;
  onOpen: (programTitle: string) => void;
}): ReactNode {
  const tone = toneOf(c);
  const openable = Boolean(c.program);
  const level = c.level === "jedes" ? "" : `, ${LEVEL_LABEL[c.level]}`;

  const body = (
    <>
      <span className="flex items-center gap-2">
        <Swatch tone={tone} />
        <SlotTime time={c.time} clockClass="jjk-slot-time" />
      </span>
      <span className="jjk-slot-name" style={{ fontWeight: 600, fontSize: "0.95rem" }}>
        {c.name}
        <AttireMark attire={c.attire} />
      </span>
      {c.note ? (
        <span className="mt-0.5 block text-[0.72rem] leading-snug text-muted-foreground">
          {c.note}
        </span>
      ): null}
      <LevelChip level={c.level} />
    </>
  );

  const style = { "--slot": tone, flexGrow: grow ? 1 : 0 } as CSSProperties;
  const layout = "jjk-slot flex flex-col items-stretch justify-start";

  if (!openable) {
    return (
      <div className={layout} style={style}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(c.program!)}
      className={`${layout} w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70`}
      style={style}
      aria-label={`${c.name}, ${c.time}${level}: Details anzeigen`}
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
                    {/* "Samstag · Nach Absprache" liest sich als Satz, nicht
                        als Uhrzeit — also Grundschrift statt Mono, wenn die
                        Zeit keine ist (29.10.2026, Open Mat). */}
                    <span
                      className={isClock(w.time) ? "font-mono text-foreground-dim": "text-foreground-dim"}
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
                {/* Kein Fuellraum mehr unter kurzen Tagen: die letzte Einheit
                    fuellt die Spalte selbst (`grows`, 29.10.2026). */}
                {col.classes.map((c, j) => (
                  <Slot key={`${c.time}-${j}`} c={c} grow={grows(col, j)} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </div>
      </TiltPlate>

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
      {/* Die Kopfzeile des Aushangs (29.10.2026), einmal fuer alle Kurse
          statt "Jedes Level" auf jeder Karte. Heller als die Feiertagszeile:
          das ist die Aussage, die Feiertage sind das Kleingedruckte. Der
          Teil mit dem Level steht nur, solange er fuer JEDE Einheit stimmt
          (`EVERY_LEVEL`). Halbgeviertstrich statt Geviertstrich: der ist im
          Deutschen der Gedankenstrich, und er ist in der Schrift-Teilmenge
          (scripts/gen-fonts.py). */}
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground">
        Brazilian Jiu-Jitsu & Boxen –{" "}
        {EVERY_LEVEL ? "alle Kurse für jedes Level, Einstieg jederzeit möglich.": "Einstieg jederzeit möglich."}
      </p>
      {/* Feiertage (Vorstand, 15.10.2026): direkt unter der Ueberschrift,
          damit man es vor dem Plan liest, am Handy wie am PC. */}
      <p className="mt-1.5 text-sm text-foreground-dim">
        An gesetzlichen Feiertagen bleibt das Gym geschlossen.
      </p>

      {/* Wie oft es jede Kursart pro Woche gibt — und seit 29.10.2026
          zugleich die Farblegende. Die Legende war am 11.10.2026 rausgeflogen,
          weil das Level-Chip jeder Einheit dieselbe Information trug. Seit die
          Farbe die Kursart zeigt und das Chip weg ist, braucht sie wieder
          einen Schluessel; als eigene Zeile neben "Pro Woche" haette sie
          dieselben fuenf Namen ein zweites Mal aufgezaehlt. Also ein Feld vor
          jedem Eintrag, und die Zeile ist beides.
          Nur ab md: am Handy nahm die Liste zu viel Platz vor dem eigentlichen
          Plan (Vorstand, 11.10.2026). Dort steht die Farbe auf jeder Karte
          direkt neben dem Kursnamen, ein Schluessel ist da nicht noetig. */}
      <div className="mt-8 hidden md:block">
        <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Pro Woche
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {WEEKLY.map((w) => (
            <li
              key={w.kind}
              className="flex items-center gap-2 border border-border bg-card-plate px-3 py-1.5 text-sm text-foreground"
            >
              <Swatch tone={w.tone} />
              {w.label}
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground-dim">
                {w.count}×
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function Schedule() {
  // Am Handy unten weniger Luft: zusammen mit dem Abstand oben bei den
  // Trainern waren es 14 rem leerer Raum (Vorstand, 11.10.2026).
  return (
    <section id="schedule" className="w-full px-4 pt-28 pb-6 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* Mobile: stacked layout.
            Kartenhoehe 510 -> 400 (29.10.2026). Die 510 waren fuer drei
            Einheiten MIT Level-Chip und das Mittwoch-"Entweder – oder"
            gemessen; beides ist weg. Gemessen bei 390 px: der laengste Tag
            (Di/Do, drei Einheiten, Boxen-Notiz zweizeilig) braucht 345 px,
            in 510 standen darunter 165 px leer. 400 laesst ~55 px Luft,
            genug fuer ein Level-Chip, falls je wieder eines kommt. Der
            Bereich drumherum behaelt seine 80 px fuer den Faecher (590 -> 480),
            und die Seite wird am Handy 110 px kuerzer. */}
        <div className="md:hidden">
          <Intro headingClass="jjk-section-title max-w-2xl" />
          <div className="mt-10">
            <ScheduleStack
              cardWidth={240}
              cardHeight={400}
              spreadX={22}
              spreadY={-18}
              shadowBlur={40}
              stackClassName="h-[480px]"
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
