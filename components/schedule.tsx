"use client";

import type { CSSProperties } from "react";
import { schedule, type ScheduleClass } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ClickStack from "@/components/click-stack";

const KIND: Record<ScheduleClass["kind"], { label: string; tone: string }> = {
  gi:   { label: "Gi",       tone: "var(--accent)" },
  nogi: { label: "No-Gi",    tone: "var(--ember)" },
  kids: { label: "Kids",     tone: "var(--gold)" },
  open: { label: "Open Mat", tone: "var(--muted-foreground)" },
};

const DAY_JP: Record<string, string> = {
  Mon: "月",
  Tue: "火",
  Wed: "水",
  Thu: "木",
  Fri: "金",
  Sat: "土",
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
              className="flex flex-col gap-0.5 px-4 py-2.5"
              style={{
                borderLeft: `2px solid ${k.tone}`,
                marginLeft: "1px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              } as CSSProperties}
            >
              <span
                className="text-[10px] font-medium tracking-widest uppercase"
                style={{ color: k.tone }}
              >
                {c.time}
              </span>
              <span className="text-foreground/80 text-xs leading-snug">
                {c.name}
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
  cardColor: "#0f0e0d",
  shadowOpacity: 0.55,
  visibleCount: 4,
  depthScale: 0.06,
  depthOpacity: 0.12,
  duration: 0.4,
  ease: "power3.out",
  // Der kurze weisse Ping-Punkt ueber der obersten Karte — derselbe Hinweis,
  // den der Programm-Stapel am Handy schon traegt (components/features-6.tsx).
  // Hier auf beiden Breakpoints, weil der Stundenplan die einzigen Klick-
  // Karten sind, die es auch am PC gibt.
  tapHint: true,
} as const;

export function Schedule() {
  const items = schedule.map((col, i) => <DayCard key={i} col={col} />);

  return (
    <section id="schedule" className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* Mobile: stacked layout */}
        <div className="md:hidden">
          <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Schedule" />
          <StaggeredText
            text="Find your mat time"
            as="h2"
            segmentBy="words"
            direction="bottom"
            delay={70}
            duration={0.7}
            blur
            className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl"
          />
          <p className="mt-5 text-lg leading-relaxed text-foreground-dim">
            Six days, twenty classes. Walk into any Fundamentals class — no booking, no notice.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {Object.entries(KIND).map(([key, k]) => (
              <span key={key} className="flex items-center gap-2.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-3.5 w-[2px]" style={{ background: k.tone }} aria-hidden="true" />
                {k.label}
              </span>
            ))}
          </div>
          <div className="mt-10 h-[500px]">
            <ClickStack items={items} cardWidth={240} cardHeight={360} spreadX={22} spreadY={-18} shadowBlur={40} {...STACK_SHARED} />
          </div>
          <p className="mt-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/50">
            Click to browse days
          </p>
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden md:flex md:items-center md:gap-12 lg:gap-20">

          {/* Left: text */}
          <div className="shrink-0 md:w-[42%]">
            <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Schedule" />
            <StaggeredText
              text="Find your mat time"
              as="h2"
              segmentBy="words"
              direction="bottom"
              delay={70}
              duration={0.7}
              blur
              className="font-display jjk-aberrate text-5xl leading-[0.95] text-foreground lg:text-6xl"
            />
            <p className="mt-5 text-lg leading-relaxed text-foreground-dim">
              Six days, twenty classes. Walk into any Fundamentals class — no booking, no notice.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
              {Object.entries(KIND).map(([key, k]) => (
                <span key={key} className="flex items-center gap-2.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="h-3.5 w-[2px]" style={{ background: k.tone }} aria-hidden="true" />
                  {k.label}
                </span>
              ))}
            </div>
            <p className="mt-10 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/50">
              Click to browse days
            </p>
          </div>

          {/* Right: cards */}
          <div className="h-[580px] flex-1">
            <ClickStack items={items} cardWidth={320} cardHeight={460} spreadX={26} spreadY={-22} shadowBlur={50} {...STACK_SHARED} />
          </div>

        </div>

      </div>
    </section>
  );
}

export default Schedule;
