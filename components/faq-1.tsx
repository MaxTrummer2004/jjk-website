"use client";

/**
 * FAQ — the same six questions the config has always held.
 *
 * ── The bug this fixes on the way past ──────────────────────────────────────
 * This file carried its own array of four questions, retyped, while lib/config
 * held six. Two of them — how old the kids have to be, and how often you should
 * train — were simply not on the site, and one of the four that was here had
 * drifted a sentence away from its twin in the config. Exactly the fault the
 * programme boards had.
 *
 * ── The mark ────────────────────────────────────────────────────────────────
 * A plus turning into a cross, not a chevron flipping over. A chevron is a
 * direction and the answer does not come from anywhere; a cross is the same
 * mark as the plus, rotated, which is what opening and closing actually are.
 * It is also the one glyph in this row that needs no icon library.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { faqs } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";

export default function FAQ1() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="w-full px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.7fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <KanjiLabel kanji="問答" furigana="もんどう" gloss="Fragen" />
            <StaggeredText
              text="Bevor du kommst"
              as="h2"
              segmentBy="words"
              direction="bottom"
              delay={70}
              duration={0.7}
              blur
              className="jjk-section-title"
            />
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-foreground-dim">
              Alles, was vor der ersten Einheit gefragt wird. Wenn deine Frage
              fehlt, stell sie uns an der Tür.
            </p>
          </div>

          <div className="flex flex-col">
            {faqs.map((faq, i) => {
              const on = open === i;
              return (
                <div
                  key={faq.question}
                  className="jjk-qa"
                  {...(on ? { "data-on": "" } : {})}
                >
                  <button
                    type="button"
                    className="jjk-qa-q"
                    onClick={() => setOpen(on ? null : i)}
                    aria-expanded={on}
                  >
                    <span className="jjk-qa-rule" aria-hidden="true" />
                    <span>{faq.question}</span>
                    <span className="jjk-qa-mark" aria-hidden="true">
                      +
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.32, ease: "easeInOut" },
                          opacity: { duration: 0.2, ease: "easeInOut" },
                        }}
                        className="overflow-hidden"
                      >
                        <p className="jjk-qa-a">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
