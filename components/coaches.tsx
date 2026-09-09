"use client";

import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ParallaxCarousel from "@/components/parallax-carousel";
import { useEffect, useState, type ReactNode } from "react";

/** ParallaxCarousel bekommt die Plane-Groesse als feste Pixelzahlen (kein
 *  CSS, direkt die WebGL-Planengroesse) — dafuer hier per matchMedia
 *  (Tailwind-`sm`-Breakpoint, 640px) selbst reagieren, damit die Boxen am
 *  Handy weniger hoch sind statt am Desktop-Mass festzukleben. */
const MOBILE_QUERY = "(max-width: 639px)";

const COACH_PHOTOS = [
  "/img/coaches/liri.jpeg",
  "/img/coaches/ervin.jpeg",
  "/img/coaches/wolfi.jpeg",
  "/img/coaches/matthias.jpeg",
];

export function Coaches(): ReactNode {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = (): void => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Am Handy deutlich kleiner (240x300 statt 380x520) — Breite anteilig
  // mitreduziert, damit das Seitenverhaeltnis nicht zu sehr abweicht und
  // der Crop nicht unnoetig viel wegschneidet.
  const imageWidth = isMobile ? 240 : 380;
  const imageHeight = isMobile ? 300 : 520;

  return (
    <section id="coaches" className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
        <KanjiLabel kanji="師範" furigana="しはん" gloss="Coaches" />
        <StaggeredText
          text="Trainers who love to teach"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-3xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Four people, one standard. Every class on the timetable is led by one
          of them — never by whoever happened to be free.
        </p>
      </div>

      <div className="mt-12">
        <ParallaxCarousel
          images={COACH_PHOTOS}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          gap={20}
          parallaxIntensity={0.35}
          uvScale={0.2}
          borderRadius={16}
          loop
          autoplaySpeed={0}
          showProgress={false}
          className="h-[300px] sm:h-[520px]"
        />
      </div>
    </section>
  );
}

export default Coaches;
