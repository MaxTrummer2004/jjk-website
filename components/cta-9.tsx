"use client";

import { motion } from "motion/react";
import { ArrowRight, Plus, Copy, Send, Shield, Trophy } from "lucide-react";
import { KanjiLabel } from "@/components/kanji-label";

export default function Cta9() {
  return (
    <section className="w-full flex items-center justify-center py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-[1400px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl p-10 sm:p-16 lg:p-20 overflow-hidden bg-card border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
        >
          <motion.div
            initial={{ opacity: 0, x: -40, rotate: -8 }}
            whileInView={{ opacity: 1, x: 0, rotate: -12 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[30%] w-44 lg:w-52 xl:w-56 rounded-2xl bg-card p-2 shadow-xl border border-border"
          >
            <div className="aspect-4/3 rounded-lg overflow-hidden bg-muted">
              <img
                src="/img/about.jpg"
                alt="Training at JJK"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-2 px-1 pb-1">
              <p className="text-xs font-semibold text-foreground">First class &middot; Free</p>
              <p className="text-xs text-muted-foreground">Beginners welcome</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 8 }}
            whileInView={{ opacity: 1, x: 0, rotate: 10 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden md:block absolute right-0 top-1/2 translate-x-[30%] w-56 lg:w-64 xl:w-72 rounded-2xl bg-card p-4 shadow-xl border border-border"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
              <span>Trial &middot; What to expect</span>
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                <Copy className="w-3.5 h-3.5" />
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Your first session</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Arrive 15 minutes early, borrow a gi, warm up with the group, drill a few techniques, and roll only if you feel like it. No pressure, all welcome&hellip;
            </p>
          </motion.div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-card shadow-sm flex items-center justify-center">
                <Shield className="w-5 h-5 text-foreground-dim" />
              </div>
              <ArrowRight className="w-4 h-4 text-foreground-dim" />
              <div className="w-12 h-12 rounded-lg bg-accent shadow-sm flex items-center justify-center">
                <Trophy className="w-5 h-5 text-accent-foreground" />
              </div>
            </div>

            <KanjiLabel kanji="一本" furigana="いっぽん" gloss="Step on the mat" align="center" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Ready to step on the mat?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-dim">
              Your first class is free. No experience, no gear, no ego &mdash; just come train.
            </p>
            <motion.a
              id="cursor-cta"
              href="#contact"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-6 inline-block px-6 py-3 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Book your free class
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
