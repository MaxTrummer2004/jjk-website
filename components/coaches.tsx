"use client";

/**
 * Coaches — four name-boards, and each one wears its own belt.
 *
 * ── Why there are no photographs ────────────────────────────────────────────
 * There were two, and both came off a stock library: a woman in a gym and a man
 * in a gi, neither of them anybody who teaches here. The other two coaches had
 * no image at all, so the row was half faces and half empty holograms.
 *
 * A face nobody at the academy recognises is worse than no face — it is a claim
 * the page cannot back. And the holographic card those faces sat in carried a
 * purple and a blue gradient with a coloured bloom behind it, which was the only
 * cold colour that ever appeared on this site.
 *
 * ── What makes the four boards different from each other ────────────────────
 * The belt. Drawn, not described — the band, the black tab across it, and the
 * degree bars on the tab, which is exactly how the object works and is a
 * different picture for every rank without anything being invented per card:
 *
 *   3rd degree black   near-black band · vermilion tab · three gold bars
 *   black              near-black band · vermilion tab · no bars
 *   brown              warm brown band · near-black tab
 *   purple             see below
 *
 * That also settles the colour problem honestly. A belt colour is INFORMATION,
 * not decoration, so it has to survive; but this page's whole argument is that
 * vermilion is the only colour on it, and dropping a #6d28d9 rectangle into that
 * breaks the argument in one element. So the two colours that are not in the
 * night are brought INTO it rather than either printed raw or thrown away:
 * brown is the ember at a fifth of its saturation, and purple is the deep
 * accent — the site's own darkest red, #7a0c14 — mixed a third of the way
 * towards the night sky. Both read unmistakably as brown and as purple; neither
 * is a colour the page does not otherwise own.
 *
 * The rank is also still set as text above the name, so nothing here depends on
 * the reader knowing how to read a belt.
 */

import { motion, type MotionStyle } from "motion/react";
import { coaches } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * One entry per rank the config can hold.
 *
 * `bars` is the number of degrees on the tab; `tab` is the tab's colour, which
 * is vermilion on a black belt and near-black on every coloured one — that is
 * the object, not a preference.
 */
const BELT: Record<
  string,
  { band: string; tab: string; bar: string; bars: number; glyph: string }
> = {
  black: {
    band: "linear-gradient(180deg, #16161a 0%, #0a0a0c 55%, #050506 100%)",
    tab: "var(--accent)",
    bar: "var(--gold)",
    bars: 0,
    glyph: "技",
  },
  brown: {
    // The ember, taken most of the way down to the night. Brown is what a warm
    // red looks like at a fifth of its saturation, so this is arrived at rather
    // than picked.
    band: "linear-gradient(180deg, #55351f 0%, #3a2313 55%, #241509 100%)",
    tab: "#0a0a0c",
    bar: "var(--gold)",
    bars: 0,
    glyph: "育",
  },
  purple: {
    // --accent-deep mixed a third of the way to --night-sky. Reads as purple,
    // belongs to this page.
    band: "linear-gradient(180deg, #3d1533 0%, #2b0e25 55%, #1a0717 100%)",
    tab: "#0a0a0c",
    bar: "var(--gold)",
    bars: 0,
    glyph: "道",
  },
};

/** How many degrees the rank names, read off the text the config already has. */
function degrees(belt: string): number {
  const m = /^(\d)/.exec(belt.trim());
  return m?.[1] ? Number(m[1]) : 0;
}

export function Coaches() {
  return (
    <section id="coaches" className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="師範" furigana="しはん" gloss="Coaches" />
        <StaggeredText
          text="Black belts who love to teach"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-3xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Four people, one standard. Every class on the timetable is led by one
          of them — never by whoever happened to be free.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px border border-border bg-border/60 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.map((c, i) => {
            const belt = BELT[c.beltColor] ?? BELT.black!;
            const bars = degrees(c.belt) || belt.bars;
            return (
              <motion.article
                key={c.name}
                id={`cursor-coach-${i}`}
                data-cursor=""
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.06 * i, ease }}
                className="jjk-slab jjk-slab-hot jjk-name-board"
                style={
                  {
                    "--band": belt.band,
                    "--tab": belt.tab,
                    "--bar": belt.bar,
                  } as MotionStyle
                }
              >
                <span className="jjk-name-glyph" lang="ja" aria-hidden="true">
                  {belt.glyph}
                </span>

                {/* The belt itself. Aria-hidden: the rank is written out in
                    words directly underneath, and a screen reader announcing a
                    band and three bars would be reading a picture of the
                    sentence it is about to read. */}
                <span className="jjk-belt" aria-hidden="true">
                  <span className="jjk-belt-tab">
                    {Array.from({ length: bars }, (_, d) => (
                      <i key={d} className="jjk-belt-bar" />
                    ))}
                  </span>
                </span>

                <span className="jjk-name-rank">{c.belt}</span>

                <h3 className="jjk-name-name">
                  {c.name.replace(/\s*["'"'][^"'"']*["'"']/g, "").trim()}
                </h3>
                <p className="jjk-name-role">{c.role}</p>
                <p className="jjk-name-bio">{c.bio}</p>
                <div className="flex-1" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Coaches;
