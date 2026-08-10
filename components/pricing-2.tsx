"use client";

/**
 * Membership — two things, side by side.
 *
 * ── What this replaced, twice ───────────────────────────────────────────────
 * First a bento grid: `rounded-3xl` cards with `backdrop-blur`, a yearly/monthly
 * segmented pill toggle, and `rounded-full` accent buttons. Then three tiers at
 * 89, 129 and 169 a month, in the boards' construction but still three.
 *
 * There are not three. There is one membership at €60 that contains everything,
 * and a single trial class at €20. The page had also been saying the first class
 * was free in five places, which was not true either.
 *
 * ── Why two boxes and not a table ───────────────────────────────────────────
 * A tiered table asks the reader to choose a plan before they know whether they
 * like the thing. These two are not two plans; they are two different moments —
 * *come and see* and *train here* — so they are set as two boxes of the same
 * size with the same weight, and the only comparison the reader is invited to
 * make is the one that is actually in front of them.
 *
 * The membership carries the lit top rule and the corner flag; the trial does
 * not. That is the whole marking. No scale transform, no drop shadow: this page
 * has no depth for a card to float in — every surface on it is paper lying flat
 * under a light — so a card that lifts off is a card from somewhere else.
 */

import { motion } from "motion/react";
import { pricing } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Pricing2() {
  return (
    <section className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="入門" furigana="にゅうもん" gloss="Membership" />
        <StaggeredText
          text="One membership, everything on the mat"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-3xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          No tiers, no joining fee, no lock-in. Come for a single trial class
          first if you would rather see the room before you decide.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px border border-border bg-border/60 sm:mt-16 lg:grid-cols-2">
          {pricing.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.07 * i, ease }}
              className="jjk-slab jjk-slab-hot jjk-tier"
              {...(tier.featured ? { "data-featured": "" } : {})}
            >
              {tier.featured && <span className="jjk-tier-flag">Everything</span>}

              <h3 className="jjk-tier-name">{tier.name}</h3>
              <p className="jjk-tier-line">{tier.tagline}</p>

              <p className="jjk-tier-price">
                <span>€{tier.price}</span>
                <span className="jjk-tier-per">{tier.period}</span>
              </p>

              <ul className="jjk-tier-list">
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <div className="flex-1" />

              <a
                href="#contact"
                data-cursor=""
                className={`jjk-btn mt-8 w-full ${tier.featured ? "" : "jjk-btn-quiet"}`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-base text-muted-foreground">
          Students and under-18s train at a reduced rate — ask at the desk.
        </p>
      </div>
    </section>
  );
}
