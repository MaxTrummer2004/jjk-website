"use client";

import { motion } from "motion/react";
import { Check, ArrowRight } from "lucide-react";
import { pricing } from "@/lib/config";

const ease = [0.16, 1, 0.3, 1] as const;

export function Pricing() {
  return (
    <section id="pricing" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-14 text-center lg:mb-20">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Membership
          </span>
          <h2 className="font-display mx-auto mt-4 max-w-3xl text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            Simple pricing.
            <br />
            No lock-in.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Every membership starts with a free trial class. Month-to-month — pause or
            cancel any time.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {pricing.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                plan.featured
                  ? "border-accent bg-card shadow-2xl shadow-accent/10 lg:-mt-4 lg:mb-4"
                  : "border-border bg-card"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Most popular
                </span>
              )}

              <h3 className="font-display text-3xl text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">€</span>
                <span className="font-display text-6xl text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <a
                href="#contact"
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-transform active:scale-[0.97] ${
                  plan.featured
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-transparent text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </a>

              <ul className="mt-8 flex flex-col gap-3 border-t border-border pt-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        plan.featured ? "bg-accent text-accent-foreground" : "bg-muted text-accent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Kids memberships from{" "}
          <span className="font-semibold text-foreground">€59/mo</span> · Students & family
          discounts available.
        </p>
      </div>
    </section>
  );
}
