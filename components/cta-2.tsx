"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { motion } from "motion/react";

const trailImages = [
  "/video/hero-poster.jpg",
  "/img/about.jpg",
  "/video/hero-poster.jpg",
  "/img/about.jpg",
  "/video/hero-poster.jpg",
  "/img/about.jpg",
];

export default function CTA2() {
  const trailerRef = useRef<HTMLDivElement>(null);
  const currentImageIndex = useRef(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastImageTime = useRef(0);

  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const movementThreshold = 100;
    const delayBetween = 70;

    const createImageTrail = (e: MouseEvent) => {
      if (!trailerRef.current || !sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < movementThreshold) return;

      const now = Date.now();
      if (
        lastImageTime.current !== 0 &&
        now - lastImageTime.current < delayBetween
      )
        return;

      const img = document.createElement("img");
      img.src = trailImages[currentImageIndex.current];
      img.alt = "";
      img.className = "absolute pointer-events-none rounded-sm object-cover";
      img.style.width = "150px";
      img.style.height = "225px";
      img.style.left = `${relativeX - 75}px`;
      img.style.top = `${relativeY - 112.5}px`;

      trailerRef.current.appendChild(img);

      currentImageIndex.current =
        (currentImageIndex.current + 1) % trailImages.length;

      gsap.fromTo(
        img,
        {
          opacity: 1,
          scale: 0,
          rotation: gsap.utils.random(-20, 20),
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(2)",
        },
      );

      gsap.to(img, {
        opacity: 1,
        scale: 0,
        duration: 0.6,
        delay: 0.6,
        ease: "power2.in",
        onComplete: () => img.remove(),
      });

      lastMousePos.current = { x: e.clientX, y: e.clientY };
      lastImageTime.current = now;
    };

    const section = sectionRef.current;
    if (section) {
      section.addEventListener("mousemove", createImageTrail);
      return () => section.removeEventListener("mousemove", createImageTrail);
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-white dark:bg-neutral-950 overflow-hidden"
    >
      {/* Image Trail Container */}
      <div
        ref={trailerRef}
        className="absolute inset-0 pointer-events-none z-9999"
      />

      {/* Main Content - Centered */}
      <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 lg:px-8">
        <motion.h1
          className="text-4xl sm:text-5xl tracking-tight md:text-6xl lg:text-7xl font-medium text-neutral-900 dark:text-white text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Your first class is free.
          <br />
          Step on the mat.
        </motion.h1>

        <motion.button
          className="px-8 sm:px-10 py-4 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium text-base sm:text-lg hover:bg-neutral-800 dark:hover:bg-neutral-100"
          style={{ transition: "background-color 200ms, transform 200ms" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Book a free class
        </motion.button>
      </div>

      {/* Bottom Left - Beta Badge */}
      <motion.div
        className="absolute bottom-20 sm:bottom-8 left-6 sm:left-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          No experience needed
        </p>
      </motion.div>

      {/* Bottom Center - Navigation Bar */}
      <motion.div
        className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto flex items-center justify-between sm:justify-center gap-4 sm:gap-6 md:gap-32 bg-white dark:bg-neutral-950 pr-2 pl-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-800 shadow-lg"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
      >
        {/* Schedule button - left on mobile */}
        <button className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-200 font-medium sm:hidden">
          Schedule
        </button>

        {/* Logo - desktop only */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-base sm:text-lg font-medium text-neutral-900 dark:text-white">
            JJK
          </span>
        </div>

        {/* Buttons - desktop only */}
        <div className="hidden sm:flex items-center gap-3 sm:gap-4 whitespace-nowrap">
          <button className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-200 font-medium">
            Schedule
          </button>
          <button
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-[5px] bg-red-400 text-neutral-900 font-medium text-sm sm:text-base hover:bg-red-300 hover:scale-105"
            style={{ transition: "background-color 200ms, transform 200ms" }}
          >
            Book a free class
          </button>
        </div>

        {/* Book a free class Button - mobile only */}
        <button
          className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-[5px] bg-red-400 text-neutral-900 font-medium text-sm sm:text-base hover:bg-red-300 hover:scale-105 sm:hidden"
          style={{ transition: "background-color 200ms, transform 200ms" }}
        >
          Book a free class
        </button>
      </motion.div>
    </section>
  );
}
