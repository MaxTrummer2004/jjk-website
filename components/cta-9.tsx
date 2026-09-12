"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { KanjiLabel } from "@/components/kanji-label";
import { useReducedMotion } from "@/lib/motion";

export default function Cta9() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const panelY = useTransform(scrollYProgress, [0, 1], [40, 0]);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10"
    >
      <motion.div
        style={{
          backgroundColor: "var(--card-plate)",
          ...(reduced ? {} : { scale, y: panelY }),
        }}
        className="flex flex-col items-center overflow-hidden rounded-[40px] px-6 pt-28 pb-16 text-center sm:pt-36 sm:pb-20"
      >
        <KanjiLabel
          kanji="一本"
          furigana="いっぽん"
          gloss="Step on the mat"
          align="center"
        />

        <h2 className="jjk-close-line">
          Come and take
          <br />
          a class
        </h2>

        <div className="jjk-rule mx-auto mt-8 w-40" aria-hidden="true" />

        <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-foreground-dim">
          One trial class is €20 — shorts, a t-shirt, and we lend you the
          rest. The membership is €60 a month and contains everything on the
          timetable.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a id="cursor-cta" href="#contact" className="jjk-btn">
            Book a trial class
          </a>
          <a href="#schedule" className="jjk-btn jjk-btn-quiet">
            See the timetable
          </a>
        </div>
      </motion.div>
    </section>
  );
}
