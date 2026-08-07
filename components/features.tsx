"use client";

import { motion } from "motion/react";
import { ShieldCheck, Award, Flame, Users, type LucideIcon } from "lucide-react";
import { features } from "@/lib/config";

const icons: LucideIcon[] = [ShieldCheck, Award, Flame, Users];
const ease = [0.22, 1, 0.36, 1] as const;

export function Features() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-3xl lg:mb-20">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Why Jiu-Jitsu
          </span>
          <h2 className="font-display mt-4 text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            The most fun you&apos;ll ever have
            <br />
            <span className="text-muted-foreground">getting in shape.</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = icons[i] ?? ShieldCheck;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="group relative bg-card p-8"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
                <span className="font-display text-sm text-muted-foreground">
                  0{i + 1}
                </span>
                <div className="mt-6 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.blurb}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
