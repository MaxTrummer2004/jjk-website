"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useReducedMotion } from "@/lib/motion";
import Watercolor from "@/components/watercolor";
import type { ReactNode } from "react";

/**
 * Intro-Overlay beim ersten Seitenaufruf.
 *
 * WebGL-Regel: Nur ein Canvas gleichzeitig. Dieser Canvas wird via
 * AnimatePresence.onExitComplete abgebaut, bevor der Hero-Canvas mountet.
 * Solange dieser Loader gemountet ist, bleibt showBackground im Hero false
 * (gesteuert über den introExited-State im JJKHero).
 *
 * prefers-reduced-motion: kein Watercolor, statischer heller Hintergrund,
 * sofort fertig (Exit-Duration 0.01s damit onExitComplete trotzdem feuert).
 */
export function IntroLoader({ progress }: { progress: number }): ReactNode {
  const prefersReducedMotion = useReducedMotion();

  // Watercolor kommt etwas frueher als das Logo: voll bei progress=60,
  // damit das Logo als letztes "gesetzt" wirkt.
  const bgOpacity = prefersReducedMotion ? 0 : Math.min(1, progress / 60);
  const logoOpacity = progress / 100;
  const logoScale = 0.96 + 0.04 * (progress / 100);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f5f3ef]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 1.2,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Watercolor-Hintergrund — Graustufen (saturation=0).
          Nicht bei prefers-reduced-motion: statischer Hintergrund reicht.
          Dieser Canvas wird in onExitComplete vollstaendig abgebaut,
          bevor der Hero-Canvas mountet — keine zwei WebGL-Layer gleichzeitig. */}
      {!prefersReducedMotion && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: bgOpacity }}
        >
          <Watercolor
            className="absolute inset-0"
            color1="#f5f3ef"
            color2="#2b2b2b"
            saturation={0}
            brightness={0.5}
            speed={0.25}
            scale={0.8}
            driftSpeed={0.02}
            warpSpeed={0.04}
            opacity={1}
          />
        </div>
      )}

      {/* Logo: Deckkraft und Scale haengen an progress */}
      <div
        className="relative z-10"
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <Image
          src="/img/logo-seal.png"
          alt=""
          width={620}
          height={673}
          priority
          className="w-[clamp(280px,55vw,620px)] h-auto select-none"
        />
      </div>

      {/* Zaehler */}
      <p className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 text-[clamp(56px,11vw,150px)] leading-none tracking-tighter tabular-nums text-black font-medium select-none">
        {progress}
      </p>
    </motion.div>
  );
}
