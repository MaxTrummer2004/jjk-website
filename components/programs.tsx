"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { programs } from "@/lib/config";

const ease = [0.22, 1, 0.36, 1] as const;

export function Programs() {
  return (
    <section id="programs" className="border-t border-border bg-card py-24 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-6 lg:mb-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Train with us
            </span>
            <h2 className="font-display mt-4 max-w-2xl text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              Programs for every
              <br />
              stage of the journey
            </h2>
          </div>
          <p className="max-w-sm text-lg text-muted-foreground">
            From your very first day on the mat to the competition podium — there&apos;s a
            class with your name on it.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p, i) => (
            <motion.a
              key={p.title}
              href="#pricing"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-background p-7 transition-colors hover:border-accent/60"
            >
              {/* Glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/0 blur-2xl transition-colors duration-500 group-hover:bg-accent/20" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.tag}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <h3 className="font-display mt-6 text-3xl text-foreground">{p.title}</h3>
                <p className="mt-1 text-sm font-medium text-accent">{p.level}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {p.blurb}
                </p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
