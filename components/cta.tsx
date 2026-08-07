"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/config";

export function Cta() {
  return (
    <section className="bg-background px-3 pb-3 sm:px-4 lg:px-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-accent px-6 py-20 text-center sm:py-28">
        {/* Decorative rings */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Your first week is free
          </p>
          <h2 className="font-display mt-4 text-5xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">
            Step on the mat.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
            No experience, no gear, no pressure. Come train once and see why {siteConfig.name}{" "}
            becomes the best part of people&apos;s week.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition-transform active:scale-95"
            >
              Book your free class
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Call {siteConfig.phone}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
