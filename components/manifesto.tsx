"use client";

import { useReducedMotion } from "@/lib/motion";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * 1:1 port of the reference template's manifesto.tsx — same word-by-word
 * scroll reveal, same offsets, same everything. Only the statement itself
 * is ours.
 */
const STATEMENT =
  "Almost easy is not easy. Jiu-Jitsu Kaisen was built for the last one percent: the grip that doesn't slip, the frame that holds, the escape you find under real pressure. Every class is live rolling. You only ever get better.";

const WORDS = STATEMENT.split(" ");

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}): ReactNode {
  const opacity = useTransform(progress, range, [0.12, 1]);

  return (
    <motion.span style={{ opacity }} className="inline">
      {children}{" "}
    </motion.span>
  );
}

export function Manifesto(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const textRef = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: textRef,
    offset: ["start 0.85", "start 0.3"],
  });

  return (
    <section
      aria-label="The JJK standard"
      className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 sm:py-40 lg:px-10"
    >
      <p
        ref={textRef}
        className="text-foreground max-w-4xl text-[clamp(26px,4.2vw,52px)] leading-[1.18] font-medium tracking-tight"
      >
        {prefersReducedMotion
          ? STATEMENT
          : WORDS.map((word, i) => {
              const start = i / WORDS.length;
              const end = start + 1 / WORDS.length;
              return (
                <Word
                  key={`${word}-${i}`}
                  progress={scrollYProgress}
                  range={[start, end]}
                >
                  {word}
                </Word>
              );
            })}
      </p>
    </section>
  );
}
