"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const stats = [
  {
    label: "Active members",
    value: "500+",
    highlight: false,
  },
  {
    label: "Champions produced",
    value: "12",
    highlight: true,
  },
  {
    label: "Years on the mats",
    value: "15",
    highlight: false,
  },
  {
    label: "Classes every week",
    value: "40+",
    highlight: false,
  },
];

export default function Stats4() {
  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-950">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="flex flex-col lg:justify-between lg:min-h-[400px]">
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-900 dark:text-white leading-normal sm:leading-[0.6]"
            >
              Built to make black belts
            </motion.h2>

            {/* Description and Button */}
            <div className="space-y-6 sm:space-y-8 mt-8 lg:mt-0">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-md"
              >
                Fifteen years of coaching beginners into blue, purple, brown and
                black belts — and a few onto competition podiums.
              </motion.p>

              <motion.a
                href="#pricing"
                id="cursor-stats-cta"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="cursor-pointer inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-medium text-sm sm:text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 w-fit"
              >
                Start your journey
                <ArrowRight className="w-5 h-5" />
              </motion.a>
            </div>
          </div>

          {/* Right Column - Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                id={`cursor-stat-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className="relative rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-md overflow-hidden p-6 min-h-[180px] sm:min-h-[200px] flex flex-col justify-between bg-white dark:bg-neutral-900"
              >
                {/* Dotted Background */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.1) 1px, transparent 0)",
                    backgroundSize: "14px 14px",
                  }}
                />
                {/* Dark mode dotted background */}
                <div
                  className="absolute inset-0 z-0 opacity-0 dark:opacity-100 transition-opacity"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)",
                    backgroundSize: "14px 14px",
                  }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm sm:text-base ${
                        stat.highlight
                          ? "text-gold"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {stat.label}
                    </p>
                    {stat.highlight && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-4xl sm:text-5xl md:text-6xl font-medium tracking-tighter ${
                      stat.highlight
                        ? "text-gold"
                        : "text-neutral-900 dark:text-white"
                    }`}
                  >
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
