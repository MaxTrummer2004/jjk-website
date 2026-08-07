"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { nav, siteConfig } from "@/lib/config";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={scrolled ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6 sm:py-5"
      >
        <div
          className={`mx-auto flex max-w-[1500px] items-center justify-between gap-4 rounded-2xl border px-4 py-2.5 transition-colors duration-300 sm:px-5 ${
            scrolled
              ? "border-border bg-background/80 backdrop-blur-xl"
              : "border-white/10 bg-black/25 backdrop-blur-md"
          }`}
        >
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5" aria-label={siteConfig.fullName}>
            <span
              className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-jp text-lg text-accent-foreground"
              style={{ boxShadow: "0 0 18px -4px rgba(211,32,42,0.9)" }}
            >
              柔
            </span>
            <span
              className={`font-display text-xl tracking-wide ${
                scrolled ? "text-foreground" : "text-foreground"
              }`}
            >
              JJK
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  scrolled
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={nav.cta.href}
              className="hidden items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-transform active:scale-95 sm:inline-flex"
            >
              {nav.cta.label}
              <ArrowRight className="h-4 w-4" />
            </a>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen(true)}
              className={`grid h-10 w-10 place-items-center rounded-full lg:hidden ${
                scrolled ? "text-foreground hover:bg-muted" : "text-foreground hover:bg-white/10"
              }`}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-background lg:hidden"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <span className="font-display text-xl">JJK</span>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col px-5 pt-6">
              {nav.links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="border-b border-border py-5 font-display text-3xl uppercase tracking-wide text-foreground"
                >
                  {l.label}
                </motion.a>
              ))}
              <a
                href={nav.cta.href}
                onClick={() => setOpen(false)}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 text-base font-semibold text-accent-foreground"
              >
                {nav.cta.label}
                <ArrowRight className="h-5 w-5" />
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
