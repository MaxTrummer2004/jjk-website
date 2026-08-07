"use client";

import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";
import { testimonials } from "@/lib/config";

const ease = [0.22, 1, 0.36, 1] as const;

export function Testimonials() {
  return (
    <section className="border-t border-border bg-card py-24 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 flex flex-col gap-6 lg:mb-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              From the mats
            </span>
            <h2 className="font-display mt-4 max-w-2xl text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              Real people. Real change.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">4.9</span> from 300+ reviews
            </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.08, ease }}
              className="flex flex-col justify-between rounded-3xl border border-border bg-background p-7"
            >
              <div>
                <Quote className="h-8 w-8 text-accent/30" />
                <blockquote className="mt-4 text-[15px] leading-relaxed text-foreground">
                  {t.quote}
                </blockquote>
              </div>
              <figcaption className="mt-6 border-t border-border pt-5">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.detail}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
