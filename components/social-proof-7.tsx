"use client";

import { useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from "motion/react";
import { Play } from "lucide-react";

type Logo = {
  name: string;
  src: string;
};

const logos: Logo[] = [
  { name: "IBJJF", src: "" },
  { name: "ADCC", src: "" },
  { name: "CBJJ", src: "" },
  { name: "GRACIE BARRA", src: "" },
  { name: "AJP TOUR", src: "" },
  { name: "JJIF", src: "" },
  { name: "UAEJJF", src: "" },
  { name: "CBJJE", src: "" },
];

const LogoMarquee = ({ logos }: { logos: Logo[] }) => {
  const xPercent = useMotionValue(0);
  const x = useTransform(xPercent, (v) => `${v}%`);
  const containerRef = useRef<HTMLDivElement>(null);

  useAnimationFrame((time, delta) => {
    const speed = 1;
    const moveBy = (speed * delta) / 1000;
    const newX = xPercent.get() - moveBy;

    if (newX <= -50) {
      xPercent.set(0);
    } else {
      xPercent.set(newX);
    }
  });

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
      <div
        className="flex overflow-hidden p-2 [--gap:2rem] gap-(--gap) flex-row w-full max-w-5xl"
        ref={containerRef}
      >
        <motion.div
          className="flex shrink-0 justify-around gap-(--gap) flex-row min-w-full"
          style={{ x }}
        >
          {[...logos, ...logos].map((logo, idx) => (
            <div
              key={`logo-1-${idx}`}
              className="flex items-center justify-center h-12 w-32 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <span className="whitespace-nowrap text-xl font-semibold uppercase tracking-wider text-foreground">
                {logo.name}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="flex shrink-0 justify-around gap-(--gap) flex-row min-w-full"
          style={{ x }}
          aria-hidden="true"
        >
          {[...logos, ...logos].map((logo, idx) => (
            <div
              key={`logo-2-${idx}`}
              className="flex items-center justify-center h-12 w-32 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <span className="whitespace-nowrap text-xl font-semibold uppercase tracking-wider text-foreground">
                {logo.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-white dark:from-neutral-950 to-transparent"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-white dark:from-neutral-950 to-transparent"></div>
    </div>
  );
};

export function SocialProof7() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-24 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="relative w-full max-w-5xl mx-auto mb-20">
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 aspect-video flex items-center justify-center group cursor-pointer"
            onClick={() => setIsPlaying(true)}
          >
            {isPlaying ? (
              <video
                width="100%"
                height="100%"
                autoPlay
                muted
                controls
                className="w-full h-full object-cover"
              >
                <source src="/video/hero-bjj.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/video/hero-poster.jpg"
                  alt="A class at JJK"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 opacity-50 dark:opacity-20 pointer-events-none">
                  <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>
                </div>

                <div className="relative z-10 w-20 h-20 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="w-8 h-8 text-neutral-900 dark:text-white fill-current ml-1" />
                </div>

                <div className="absolute inset-0 bg-linear-to-t from-black/5 to-transparent pointer-events-none" />
              </>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center mb-8">
          <p className="text-lg font-medium text-neutral-500 dark:text-neutral-400">
            Training and competing under the sport&apos;s biggest federations
          </p>
        </div>

        <LogoMarquee logos={logos} />
      </div>
    </section>
  );
}
