"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Users } from "lucide-react";
import { KanjiLabel } from "@/components/kanji-label";

export default function Pricing2() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section className="relative w-full bg-background py-12 px-4 sm:px-6 lg:px-16">
      <div className="mx-auto max-w-[1400px] w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <KanjiLabel kanji="入門" furigana="にゅうもん" gloss="Membership" align="center" />
          <h1 className="text-3xl font-medium text-foreground leading-tight mb-6">
            Membership that fits your life
          </h1>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-card-raised/60 backdrop-blur-sm border border-border">
            <span className="text-sm font-medium text-muted-foreground">
              First class free · no lock-in
            </span>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Free Card - 1/3 width */}
          <motion.div
            id="cursor-price-dropin"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-8 flex flex-col"
          >
            <h2 className="text-3xl font-medium text-foreground mb-4">
              Drop-In
            </h2>
            <p className="text-muted-foreground text-sm mb-12">
              Just visiting Graz or want to test the waters? Train a single
              class, no commitment.
            </p>

            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                SINGLE CLASS
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-medium text-foreground">
                  €20
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your very first class is always free — just show up.
              </p>
            </div>

            <div className="flex-1" />

            <button className="w-full px-6 py-3 rounded-full bg-accent text-accent-foreground font-medium text-sm hover:bg-card-raised hover:bg-muted transition-colors duration-200">
              Book a class
            </button>
          </motion.div>

          {/* Craft Plus Card - 2/3 width */}
          <motion.div
            id="cursor-price-membership"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-8 flex flex-col"
          >
            {/* Header with Logo and Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1 rounded-full bg-accent text-accent-foreground text-2xl font-medium">
                  Membership
                </span>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    isYearly
                      ? "bg-card bg-card-raised text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    !isYearly
                      ? "bg-card bg-card-raised text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-8">
              Month-to-month, cancel anytime. Choose how often you want to be on
              the mats — every membership starts with a free trial class.
            </p>

            {/* Two Pricing Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* Plus Plan */}
              <div className="flex flex-col">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  UNLIMITED
                </p>
                <div className="mb-1">
                  <span className="text-sm line-through text-muted-foreground">
                    €149
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isYearly ? "yearly-plus" : "monthly-plus"}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-medium text-foreground"
                    >
                      €{isYearly ? "99" : "129"}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground text-sm">
                    /month
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 max-w-[30ch]">
                  Train as often as you like — all Gi & No-Gi classes, open mat
                  and seminars included.
                </p>

                <div className="flex-1" />

                <button className="w-fit px-6 py-3 rounded-full bg-card shadow-md bg-card-raised text-foreground font-medium text-sm hover:bg-muted transition-colors duration-200 border border-border">
                  Go Unlimited
                </button>
              </div>

              {/* Family Plan */}
              <div className="flex flex-col">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  FOUNDATION
                </p>
                <div className="mb-1">
                  <span className="text-sm line-through text-muted-foreground">
                    €109
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isYearly ? "yearly-family" : "monthly-family"}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-medium text-foreground"
                    >
                      €{isYearly ? "69" : "89"}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground text-sm">
                    /month
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 max-w-[30ch]">
                  Two classes per week — perfect for building the habit and
                  learning the fundamentals.
                </p>

                <div className="flex-1" />

                <button className="w-fit px-6 py-3 rounded-full bg-card shadow-md bg-card-raised text-foreground font-medium text-sm hover:bg-muted transition-colors duration-200 border border-border">
                  Start Foundation
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          id="cursor-price-family"
          className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Users className="w-13 h-13 text-foreground" />
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                Training as a family?
              </h3>
              <p className="text-sm text-muted-foreground">
                Family &amp; student discounts available — kids from €59/mo.
              </p>
            </div>
          </div>
          <button className="w-full sm:w-auto px-6 py-3 rounded-full bg-card shadow-md bg-card-raised text-foreground font-medium text-sm hover:bg-muted transition-colors duration-200 border border-border">
            Contact Us
          </button>
        </motion.div>
      </div>
    </section>
  );
}
