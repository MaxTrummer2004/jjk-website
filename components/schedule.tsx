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
import { useCallback, useId, useRef, useState } from "react";
import { schedule, type ScheduleClass } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ClickStack, { type ClickStackHandle } from "@/components/click-stack";

/**
 * Die Legende sagt jetzt die EINSTIEGSSTUFE, nicht das Format.
 *
 * Vorher standen hier Gi / No-Gi / Kids / Open Mat. Das beantwortet die
 * zweite Frage ("was ziehe ich an") und nicht die erste ("darf ich da
 * überhaupt hin"). Der Trainerplan ist nach Stufen gebaut, also ist die
 * Seite es jetzt auch: die Farbe am linken Rand einer Einheit sagt, ab
 * welchem Level sie offen ist. Gi oder No-Gi steht als Notiz in der Zeile.
 *
 * Die drei BJJ-Stufen steigen in der Hitze der Palette an (Gold → Ember →
 * Zinnober). Fitness und Fitnessboxen sind kein BJJ und bekommen deshalb
 * bewusst kühle, entsättigte Töne — sie sollen sich aus der Stufenleiter
 * herausheben, nicht in ihr einsortiert wirken.
 */
/**
 * `tone` ist die Farbe der Stufe. Sie traegt den linken Rand und das Chip —
 * aber NICHT mehr die Uhrzeit: Zinnober (#d3202a) auf #07070a liegt bei rund
 * 3:1, und das in 10 px gesperrtem Mono war praktisch unlesbar. Die Zeit ist
 * die wichtigste Angabe der Zeile und steht deshalb jetzt in Vordergrundweiss.
 *
 * `ink` ist die Schrift AUF dem farbigen Chip: dunkel auf den hellen Toenen
 * (Gold, Ember), weiss auf den dunklen (Zinnober, Stahl). Ein gefuelltes Chip
 * traegt die Farbe zuverlaessiger als farbiger Text auf Schwarz — genau so
 * macht es auch der Plan des Trainers.
 */
const KIND: Record<
  ScheduleClass["kind"],
  { label: string; tone: string; ink: string }
> = {
  anfaenger:    { label: "ab Anfänger",     tone: "var(--gold)",   ink: "#0b0b0e" },
  intermediate: { label: "ab Intermediate", tone: "var(--ember)",  ink: "#0b0b0e" },
  advanced:     { label: "ab Advanced",     tone: "var(--accent)", ink: "#ffffff" },
  fitness:      { label: "Fitness",         tone: "#8fb3ad",       ink: "#0b0b0e" },
  boxen:        { label: "Fitnessboxen",    tone: "#93a6bd",       ink: "#0b0b0e" },
};

const DAY_JP: Record<string, string> = {
  Mon: "月",
  Tue: "火",
  Wed: "水",
  Thu: "木",
  Fri: "金",
  Sat: "土",
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
          const k = KIND[c.kind];
          return (
            <div
              key={`${c.time}-${j}`}
              className="flex flex-col gap-0.5 px-4 py-3.5"
              style={{
                borderLeft: `2px solid ${k.tone}`,
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
              ) : null}
              <span
                className="mt-2 inline-flex w-fit items-center px-1.5 py-[3px] text-[0.6rem] font-semibold uppercase tracking-[0.12em]"
                style={{ background: k.tone, color: k.ink, borderRadius: 3 }}
              >
                {k.label}
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
  /**
   * "Tippen" oder "Klicken". Breitenabhaengig, nicht geraeteabhaengig: die
   * Komponente wird einmal unter `md:hidden` und einmal unter `hidden md:flex`
   * gerendert, also entscheidet dieselbe Medienabfrage, die auch das Layout
   * entscheidet. "Klicken" auf einem Handy ist schlicht das falsche Wort.
   */
  verb: "Tippen" | "Klicken";
}

function ScheduleStack({
  cardWidth,
  cardHeight,
  spreadX,
  spreadY,
  shadowBlur,
  stackClassName,
  verb,
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
              aria-current={active ? "true" : undefined}
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
                style={{ background: "var(--accent)", opacity: active ? 1 : 0 }}
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

      {/* Der Hinweis. Vorher stand hier 0,65 rem Mono, weit gesperrt, auf
          halber Deckkraft — lesbar nur, wenn man ihn schon kennt. */}
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {verb} Sie eine Karte oder einen Tag, um zu blättern.
      </p>

      {/* Matte frei und Dehnen stehen absichtlich nicht als eigene Zeilen im
          Plan: es sind keine Kurse, und als Zeitschienen wuerden sie jede
          Tageskarte um die Haelfte verlaengern, um zweimal dasselbe zu sagen.
          Als Fussnote sind sie einmal da und gelten fuer die ganze Woche. */}
      <p className="mx-auto mt-6 max-w-md border-t border-border pt-4 text-center text-sm leading-relaxed text-foreground-dim">
        Vor jedem Training ist die Matte frei zum Drillen — ab 16:30, dienstags
        und donnerstags ab 16:45. Montag, Mittwoch und Freitag um 17:15
        gemeinsames Dehnen für BJJ.
      </p>
    </div>
  );
}

// ---- Sektion -------------------------------------------------------------

function Intro({ headingClass }: { headingClass: string }): ReactNode {
  return (
    <>
      <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Stundenplan" />
      <StaggeredText
        text="Finde deine Mattenzeit"
        as="h2"
        segmentBy="words"
        direction="bottom"
        delay={70}
        duration={0.7}
        blur
        className={headingClass}
      />
      <p className="mt-5 text-lg leading-relaxed text-foreground-dim">
        Zwei Kurse an jedem Werktag, dazu Open Mat am Samstag. Die Farbe sagt,
        ab welchem Level eine Einheit offen ist — in den Anfängerkurs am
        Dienstag kannst du ohne alles hereinkommen.
      </p>
      <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
        {Object.entries(KIND).map(([key, k]) => (
          <span key={key} className="flex items-center gap-2.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-3.5 w-[2px]" style={{ background: k.tone }} aria-hidden="true" />
            {k.label}
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
              verb="Tippen"
            />
          </div>
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden md:flex md:items-center md:gap-12 lg:gap-20">

          {/* Left: text */}
          <div className="shrink-0 md:w-[42%]">
            <Intro headingClass="jjk-section-title" />
          </div>

          {/* Right: cards */}
          <div className="flex-1">
            <ScheduleStack
              cardWidth={320}
              cardHeight={460}
              spreadX={26}
              spreadY={-22}
              shadowBlur={50}
              stackClassName="h-[540px]"
              verb="Klicken"
            />
          </div>

        </div>

      </div>
    </section>
  );
}

export default Schedule;
