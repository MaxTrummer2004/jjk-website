"use client";

import { motion, useInView, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { stats } from "@/lib/config";

const ease = [0.16, 1, 0.3, 1] as const;

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }): ReactNode {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const spring = useSpring(0, { stiffness: 55, damping: 30, restDelta: 0.01 });
  const display = useTransform(spring, (c) => Math.floor(c).toString());

  useEffect(() => {
    if (isInView) spring.set(value);
  }, [isInView, spring, value]);

  useEffect(() => {
    const unsub = display.on("change", (latest) => {
      if (ref.current) ref.current.textContent = latest + suffix;
    });
    return () => unsub();
  }, [display, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export function Stats() {
  return (
    <section className="relative isolate overflow-hidden bg-neutral-950 py-24 lg:py-28">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/video/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-neutral-950/70 via-neutral-950/85 to-neutral-950" />

      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mb-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/60"
        >
          Fifteen years of building black belts
        </motion.p>

        <div className="grid grid-cols-2 gap-y-12 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className="text-center"
            >
              <div
                className={`font-display text-6xl tracking-tight md:text-7xl lg:text-8xl ${
                  i === 1 ? "text-gold" : "text-white"
                }`}
              >
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-3 text-sm text-white/60 md:text-base">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
