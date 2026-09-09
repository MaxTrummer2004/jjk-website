"use client";

import { motion } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";

export function IntroLoader({ progress }: { progress: number }): ReactNode {
  const logoOpacity = progress / 100;
  const logoScale = 0.96 + 0.04 * (progress / 100);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}
        className="transition-none"
      >
        <Image
          src="/img/logo-seal.png"
          alt=""
          width={620}
          height={673}
          priority
          className="w-[clamp(280px,55vw,620px)] h-auto select-none"
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>

      <p className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 text-[clamp(56px,11vw,150px)] leading-none tracking-tighter tabular-nums text-black font-medium select-none">
        {progress}
      </p>
    </motion.div>
  );
}
