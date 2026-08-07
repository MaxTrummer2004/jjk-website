"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { KanjiLabel } from "@/components/kanji-label";

export default function FAQ1() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "I've never trained before — is that okay?",
      answer:
        "Absolutely, it's the norm. Our Fundamentals classes are built for total beginners. You'll be paired with patient training partners and never thrown into hard sparring on day one.",
    },
    {
      question: "What do I need for my first class?",
      answer:
        "Just shorts and a t-shirt, plus water. We'll lend you a gi if you want to try a kimono class. Come 15 minutes early and we'll show you around.",
    },
    {
      question: "Do I need to be fit or flexible to start?",
      answer:
        "No — Jiu-Jitsu gets you in shape, not the other way around. You set the pace, and every round is a workout that meets you where you are.",
    },
    {
      question: "Is there a long contract?",
      answer:
        "No lock-in. Memberships are month-to-month and you can pause or cancel any time. Start with a free trial class and see how it feels.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full flex items-start py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-16 xl:gap-20">
          {/* Left Column - Header */}
          <div className="flex flex-col space-y-2 lg:sticky lg:top-24 lg:self-start">
            <KanjiLabel kanji="問答" furigana="もんどう" gloss="FAQ" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-tight"
            >
              FAQs
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[25ch]"
            >
              Everything you need to know before your first class.
            </motion.p>
          </div>

          {/* Right Column - Accordion */}
          <div className="flex flex-col">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                className={`border-b border-border ${
                  index === 0 ? "border-t" : ""
                }`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full py-6 sm:py-8 flex items-start justify-between gap-4 text-left group"
                >
                  <span className="text-base sm:text-lg font-medium text-foreground group-hover:text-accent transition-colors duration-200">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="shrink-0 mt-1"
                  >
                    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2, ease: "easeInOut" },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 sm:pb-8 pr-8">
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
