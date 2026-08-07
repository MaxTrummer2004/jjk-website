"use client";

import { motion } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";

const facts = [
  { k: "Est.", v: "2010" },
  { k: "Lineage", v: "Gracie" },
  { k: "Location", v: "Kreuzberg" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function About() {
  return (
    <section id="about" className="bg-background py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease }}
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            The Academy
          </span>
          <h2 className="font-display mt-4 text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            More than a gym.
            <br />
            <span className="text-accent">It&apos;s your team.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            JJK was built on a simple idea: that anyone — regardless of age, size or
            athleticism — can learn to defend themselves and grow through the gentle
            art. We pair world-class technical coaching with a room full of people
            who actually want you to succeed.
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Whether you&apos;re here to compete, get in shape, or just find something that
            feels like home — the mat is waiting.
          </p>

          <div className="mt-8 flex flex-wrap gap-8">
            {facts.map((f) => (
              <div key={f.k}>
                <p className="text-sm uppercase tracking-widest text-muted-foreground">
                  {f.k}
                </p>
                <p className="font-display mt-1 text-3xl text-foreground">{f.v}</p>
              </div>
            ))}
          </div>

          <a
            href="#programs"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform active:scale-95"
          >
            See our programs
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted sm:aspect-square lg:aspect-[4/5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/about.jpg"
              alt="Members laughing during an open-mat roll at JJK"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:-left-6">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-2xl leading-none text-foreground">100%</p>
              <p className="text-xs text-muted-foreground">Beginner friendly</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
