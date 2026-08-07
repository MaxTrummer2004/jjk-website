"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { faqs } from "@/lib/config";

function FaqItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold text-foreground">{question}</span>
        <Plus
          className="h-5 w-5 shrink-0 text-accent transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="border-t border-border bg-background py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1500px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-12">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Questions
          </span>
          <h2 className="font-display mt-4 text-5xl leading-[0.95] text-foreground sm:text-6xl">
            Everything you
            <br />
            need to know
          </h2>
          <p className="mt-6 max-w-sm text-lg text-muted-foreground">
            Still curious? Message us on Instagram or just show up — we&apos;re a friendly
            bunch.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <FaqItem key={i} question={f.question} answer={f.answer} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
