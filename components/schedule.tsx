"use client";

/**
 * Schedule — the week, as one divided panel, under a light you carry.
 *
 * ── What this replaced ──────────────────────────────────────────────────────
 * Six cards on `bg-card`, each with a gradient border, a 15px inner radius, a
 * mouse-tracked 3D tilt and a red radial glow following the pointer, and inside
 * each class a coloured bar AND a coloured time AND a pill badge — three
 * elements saying the same one thing.
 *
 * The tilt was the tell. A timetable is the one thing on this page a reader
 * arrives at knowing exactly what they want from it: whether they can train on
 * Thursday. Anything that moves under the pointer while they scan it is working
 * against the only job the section has.
 *
 * ── What it is now ──────────────────────────────────────────────────────────
 * The programme boards' own construction — one panel with one-pixel gaps over a
 * border-coloured ground, so six days read as a week rather than as six things
 * that happen to be near each other — with `SpotlightGrid` behind it.
 *
 * The light is behind the columns, not over them, so what it lights is the grid
 * BETWEEN them: the day you are pointing at is framed in ember and not one
 * character in it changes contrast. See the long note in that file for why on
 * top was tried first and abandoned.
 *
 * The kind of class is carried ONCE, by the colour of a hairline down the left
 * edge of the row and the time in the same colour. Three warm tones, all of
 * them already in the palette — nothing new was invented to say Gi.
 */

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { schedule, type ScheduleClass } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import { SpotlightGrid } from "@/components/spotlight-grid";

const ease = [0.22, 1, 0.36, 1] as const;

/** The four kinds, and the one tone each is allowed. */
const KIND: Record<ScheduleClass["kind"], { label: string; tone: string }> = {
  gi: { label: "Gi", tone: "var(--accent)" },
  nogi: { label: "No-Gi", tone: "var(--ember)" },
  kids: { label: "Kids", tone: "var(--gold)" },
  open: { label: "Open Mat", tone: "var(--muted-foreground)" },
};

/** 月火水木金土 — the days as they are actually written, not as ornament. */
const DAY_JP: Record<string, string> = {
  Mon: "月",
  Tue: "火",
  Wed: "水",
  Thu: "木",
  Fri: "金",
  Sat: "土",
};

export function Schedule() {
  return (
    <section
      id="schedule"
      className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Schedule" />
        <StaggeredText
          text="Find your mat time"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Six days, twenty classes. Walk into any Fundamentals class — no
          booking, no notice.
        </p>

        {/* The key. Once, at the top, rather than a badge on every row. */}
        <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
          {Object.entries(KIND).map(([key, k]) => (
            <span
              key={key}
              className="flex items-center gap-2.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
              <span
                className="h-3.5 w-[2px]"
                style={{ background: k.tone }}
                aria-hidden="true"
              />
              {k.label}
            </span>
          ))}
        </div>

        <SpotlightGrid className="mt-10 sm:mt-14" radius={300}>
          <div className="jjk-week">
            {schedule.map((col, i) => (
              <motion.div
                key={col.day}
                id={`cursor-sched-${i}`}
                data-cursor=""
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
                className="jjk-slab jjk-slab-hot jjk-day"
              >
                <div className="jjk-day-head">
                  <span className="jjk-day-name">{col.day}</span>
                  <span className="jjk-day-jp" lang="ja" aria-hidden="true">
                    {DAY_JP[col.day] ?? ""}
                  </span>
                </div>

                <div className="flex flex-col">
                  {col.classes.map((c, j) => {
                    const k = KIND[c.kind];
                    return (
                      <div
                        key={`${c.time}-${j}`}
                        className="jjk-slot"
                        style={{ "--slot": k.tone } as CSSProperties}
                      >
                        <span className="jjk-slot-time">{c.time}</span>
                        <span className="jjk-slot-name">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </SpotlightGrid>

        <p className="mt-8 text-base text-muted-foreground">
          New to the mats? Turn up fifteen minutes early to any{" "}
          <span className="font-semibold text-foreground">Fundamentals</span>{" "}
          class and we will show you around.
        </p>
      </div>
    </section>
  );
}

export default Schedule;
