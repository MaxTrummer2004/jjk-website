"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

const members = [
  { name: "Iris Kowalski", role: "Head of Product Design" },
  { name: "Marcus Tenga", role: "Head of Engineering" },
  { name: "Priya Natarajan", role: "Head of Brand" },
  { name: "Elliot Vance", role: "Head of Operations" },
  { name: "Sana Rahimi", role: "Head of Customer Success" },
  { name: "Theo Halliday", role: "Head of Partnerships" },
];

export default function About8() {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxScroll = useMotionValue(1);

  const progressScale = useTransform(x, (v) => {
    const max = maxScroll.get();
    if (max <= 0) return 1;
    return Math.min(1, Math.max(0, -v / max));
  });

  useEffect(() => {
    const update = () => {
      const track = trackRef.current;
      if (!track) return;
      const viewWidth = track.parentElement?.clientWidth ?? 0;
      maxScroll.set(Math.max(0, track.scrollWidth - viewWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    if (trackRef.current) {
      ro.observe(trackRef.current);
      if (trackRef.current.parentElement) ro.observe(trackRef.current.parentElement);
    }
    return () => ro.disconnect();
  }, [maxScroll]);

  const targetX = useRef(0);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const step = () => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    const gap = 16;
    return (first?.offsetWidth ?? 300) + gap;
  };

  const runTo = (value: number) => {
    targetX.current = value;
    animRef.current?.stop();
    animRef.current = animate(x, value, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
  };

  const prev = () => {
    runTo(Math.min(0, targetX.current + step()));
  };
  const next = () => {
    const trackWidth = trackRef.current?.scrollWidth ?? 0;
    const viewWidth = trackRef.current?.parentElement?.clientWidth ?? 0;
    const min = Math.min(0, viewWidth - trackWidth);
    runTo(Math.max(min, targetX.current - step()));
  };

  return (
    <section className="w-full min-h-screen flex items-start py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[0.4fr_2fr] gap-4 lg:gap-12 items-start">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 w-fit px-2 py-1 rounded bg-orange-200 dark:bg-orange-300/20 text-neutral-900 dark:text-orange-200 text-xs font-medium lg:mt-2"
          >
            <span className="h-2 w-2 bg-orange-500 rounded-sm" />
            TEAM
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-neutral-900 dark:text-white tracking-tight leading-tight max-w-4xl"
          >
            Our team builds with relentless craft, obsesses over the details most people skip, and ships the tools modern operators actually wanted.
          </motion.h2>
        </div>

        <div className="mt-12 relative">
          <div className="overflow-hidden">
            <motion.div
              ref={trackRef}
              style={{ x }}
              className="flex gap-4"
            >
              {members.map((m) => (
                <article
                  key={m.name}
                  className="shrink-0 w-[calc(100%-0px)] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] h-[280px] rounded-[20px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col"
                >
                  <div className="p-2">
                    <p className="text-lg font-medium text-neutral-900 dark:text-white">{m.name}</p>
                    <p className="mt-1 text-[11px] tracking-[0.15em] uppercase text-neutral-500 dark:text-neutral-500">
                      {m.role}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pl-2">
                    <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-neutral-500 dark:text-neutral-500">
                      LinkedIn
                    </span>
                    <a
                      href="#"
                      className="grid place-items-center h-9 w-9 rounded-lg bg-orange-300 hover:bg-orange-400 text-neutral-900 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </motion.div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 right-0 bg-neutral-900 dark:bg-white origin-left"
                style={{ scaleX: progressScale }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                className="grid place-items-center h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="grid place-items-center h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
