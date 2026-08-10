"use client";

/**
 * Features6 — the programme boards.
 *
 * ── What changed and why ────────────────────────────────────────────────────
 * This was a stock template section: four rounded cards on flat `bg-card`, each
 * with a red blob behind it, the description hidden until hover, and an arrow
 * button that animated to `rgb(229 229 229)` — a light-theme leftover on a page
 * whose background is #07070a. It shared nothing with the rest of the site.
 *
 * Three things are different now.
 *
 * It reads from `programs` in lib/config.ts instead of a private copy. The
 * config has six programmes with a level and a tag; this file had four of them,
 * retyped, with the levels dropped. Two of the six were simply not on the page.
 *
 * The description is always visible. Hiding the only sentence that says what a
 * class IS behind a hover state costs every reader on a touch screen the
 * content, and costs everyone else the ability to compare two programmes
 * without moving the pointer between them.
 *
 * And a panel is a BOARD on the wall rather than a card floating over it: cut
 * into the dark with a hairline, a hot rule along the top, and its own kanji
 * standing behind it at the size of a painted character. Hovering does not add a
 * coloured blob, it lights the board — the rule catches, the kanji warms, and an
 * ember rises off the bottom edge. That is the same vocabulary the wall above
 * uses, and it is why the section no longer looks borrowed.
 */

import { motion } from "motion/react";
import { Shield, Swords, Dumbbell, Trophy, Users, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import { programs } from "@/lib/config";

/**
 * One icon per programme, in the order the config lists them.
 *
 * Kept here rather than in the config because it is a drawing, not copy — the
 * config is the thing a person edits to change what the site says, and a lucide
 * import belongs on this side of that line.
 */
const ICONS: readonly LucideIcon[] = [Shield, Swords, Dumbbell, Trophy, Users, Heart];

export default function Features6(): ReactNode {
  return (
    <section className="w-full px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="稽古" furigana="けいこ" gloss="Programs" />
        <StaggeredText
          text="Programs for every stage"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Six rooms, one art. Start where you are — nobody has ever walked in
          knowing how to do this.
        </p>

        {/* One-pixel gaps over a border-coloured ground, so the six boards read
            as one panel that has been divided rather than as six things that
            happen to be near each other. */}
        <div className="mt-12 grid grid-cols-1 gap-px border border-border bg-border/60 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p, i) => (
            <Board key={p.title} program={p} index={i} Icon={ICONS[i] ?? Shield} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Board({
  program,
  index,
  Icon,
}: {
  program: (typeof programs)[number];
  index: number;
  Icon: LucideIcon;
}): ReactNode {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5, delay: 0.06 * index, ease: [0.22, 1, 0.36, 1] }}
      className="jjk-board group"
      data-cursor=""
    >
      {/* The painted character, standing behind its own board. Aria-hidden: it
          is the same word as the title in another alphabet, and a screen reader
          announcing both would be reading the heading twice. */}
      <span className="jjk-board-kanji font-jp" aria-hidden="true">
        {program.kanji}
      </span>

      <div className="jjk-board-top">
        <span className="font-mono text-[0.7rem] font-medium tracking-[0.26em] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="jjk-board-tag font-mono">{program.tag}</span>
      </div>

      <Icon className="jjk-board-icon" strokeWidth={1.4} aria-hidden="true" />

      <h3 className="font-display mt-auto text-4xl uppercase leading-none tracking-[0.05em] text-foreground">
        {program.title}
      </h3>
      <p className="jjk-board-level font-mono">{program.level}</p>
      <p className="jjk-board-blurb">{program.blurb}</p>
    </motion.article>
  );
}
