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
          gloss="Auf die Matte"
          align="center"
        />

        <h2 className="jjk-close-line">
          Komm auf ein
          <br />
          Training vorbei
        </h2>

        <div className="jjk-rule mx-auto mt-8 w-40" aria-hidden="true" />

        <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-foreground-dim">
          Ein Probetraining kostet 20 € — kurze Hose, T-Shirt, den Rest leihen
          wir dir. Die Mitgliedschaft kostet 60 € im Monat und enthält alles
          aus dem Stundenplan.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a id="cursor-cta" href="#contact" className="jjk-btn">
            Probetraining buchen
          </a>
          <a href="#schedule" className="jjk-btn jjk-btn-quiet">
            Stundenplan
          </a>
        </div>
      </motion.div>
    </section>
  );
}
