"use client";

import { motion } from "motion/react";
import Watercolor from "@/components/watercolor";
import { AuthForm } from "./auth-form";

export function AuthLogin() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex min-h-svh w-full items-start sm:items-center justify-center p-4 pt-6 sm:p-6"
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
