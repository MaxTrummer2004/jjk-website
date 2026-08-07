"use client";

/**
 * KanjiLabel — the small Japanese stamp that sits above each section title.
 *
 * Furigana on top, kanji underneath, then a Latin gloss. Deliberately tiny:
 * it should read as a title-card annotation, not as a second headline.
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";
import StaggeredText from "@/components/staggered-text";
import { cn } from "@/lib/utils";

export interface KanjiLabelProps {
  /** e.g. 稽古 */
  kanji: string;
  /** Reading shown above the kanji, e.g. けいこ */
  furigana?: string;
  /** Latin gloss shown to the right, e.g. "TRAINING" */
  gloss?: string;
  align?: "left" | "center";
  className?: string;
}

export function KanjiLabel({
  kanji,
  furigana,
  gloss,
  align = "left",
  className,
}: KanjiLabelProps): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mb-5 flex items-end gap-3.5",
        align === "center" && "justify-center",
        className
      )}
    >
      <span className="flex flex-col leading-none">
        {furigana && (
          <span
            className="font-jp text-[0.55rem] tracking-[0.38em] text-accent/75"
            aria-hidden="true"
          >
            {furigana}
          </span>
        )}
        <span className="jjk-kanji-soft mt-1 text-xl sm:text-2xl" aria-hidden="true">
          {kanji}
        </span>
      </span>

      <span className="mb-0.5 h-px w-8 bg-accent/40" aria-hidden="true" />

      {gloss && (
        <StaggeredText
          text={gloss.toUpperCase()}
          as="span"
          segmentBy="chars"
          direction="bottom"
          delay={22}
          duration={0.45}
          blur
          className="mb-0.5 block text-[0.65rem] font-semibold tracking-[0.34em] text-muted-foreground"
        />
      )}
    </motion.div>
  );
}

export default KanjiLabel;
