"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import Watercolor from "@/components/watercolor";
import { lenisRef } from "@/lib/lenis";
import { AuthForm } from "./auth-form";

export function AuthLogin() {
  // Auth-Seite: nie scrollbar, immer oben starten. Beim Client-Nav von der
  // (evtl. runtergescrollten) Startseite haelt Lenis die alte Scroll-Position
  // und animiert nach jedem window.scrollTo dorthin zurueck — deshalb ueber
  // Lenis auf 0 setzen UND Lenis stoppen. overflow:hidden sperrt zusaetzlich
  // (auch mobil, wo Lenis nicht laeuft). Beim Verlassen wieder freigeben.
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const lenis = lenisRef.current;
    window.scrollTo(0, 0);
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      lenis.stop();
    }
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevOverflow;
      lenisRef.current?.start();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex min-h-svh w-full items-center justify-center p-4 sm:p-6"
    >
      {/* Roter Watercolor-Hintergrund — ersetzt das Unsplash-Foto aus Auth 3 */}
      <div className="pointer-events-none absolute inset-0">
        <Watercolor
          className="absolute inset-0"
          color1="#030304"
          color2="#7a1a08"
          saturation={0.65}
          brightness={0.04}
          opacity={1}
          speed={0.3}
          scale={0.8}
          driftSpeed={0.025}
          warpSpeed={0.05}
        />
      </div>

      {/* Auth-3-Layout: Karte links, Brand-Text rechts */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-center gap-12">
        {/* Linke Spalte: Karte + Zurück-Link */}
        <div className="w-full max-w-md">
          <AuthForm />
        </div>

        {/* Rechte Spalte: Brand-Text — nur ab lg sichtbar */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden max-w-sm lg:block"
        >
          <h2 className="font-display mb-4 text-4xl font-medium tracking-tighter text-foreground">
            JJK Academy
          </h2>
          <p className="max-w-[25ch] text-lg leading-snug tracking-tight text-foreground/80">
            Jiu-Jitsu Kaisen — die Kunst, die sanft beginnt und hart macht.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
