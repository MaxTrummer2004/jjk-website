"use client";

import { coaches } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ParallaxCarousel from "@/components/parallax-carousel";
import { useEffect, useState, type ReactNode } from "react";

/** ParallaxCarousel bekommt die Plane-Groesse als feste Pixelzahlen (kein
 *  CSS, direkt die WebGL-Planengroesse) — dafuer hier per matchMedia
 *  (Tailwind-`sm`-Breakpoint, 640px) selbst reagieren, damit die Boxen am
 *  Handy weniger hoch sind statt am Desktop-Mass festzukleben. */
const MOBILE_QUERY = "(max-width: 639px)";

/**
 * ── Coach-Avatare ────────────────────────────────────────────────────────
 * Neutraler Platzhalter (Kopf + Schultern als Silhouette), bis es echte
 * Fotos gibt — keine echten Fotos, und keine tatsaechlichen Jujutsu-Kaisen-
 * Figuren (urheberrechtlich geschuetzt). Gegenueber der urspruenglichen
 * Version (#2e2b27 auf #1c1a17 — auf dunklen Screens kaum zu erkennen)
 * jetzt deutlich hellerer Kontrast, damit die Form klar sichtbar bleibt.
 */
function avatarDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 520" width="380" height="520">
  <rect width="380" height="520" fill="#2a2723"/>
  <circle cx="190" cy="185" r="78" fill="#5a5349"/>
  <ellipse cx="190" cy="560" rx="155" ry="135" fill="#5a5349"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const COACH_AVATARS = coaches.map(() => avatarDataUrl());

export function Coaches(): ReactNode {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = (): void => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Am Handy etwas weniger hoch (390 statt 520) — Breite etwas mitreduziert,
  // damit das Seitenverhaeltnis nicht zu sehr von den 380x520 der Platzhalter
  // abweicht und der Crop nicht unnoetig viel wegschneidet.
  const imageWidth = isMobile ? 300 : 380;
  const imageHeight = isMobile ? 390 : 520;

  return (
    <section id="coaches" className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
        <KanjiLabel kanji="師範" furigana="しはん" gloss="Coaches" />
        <StaggeredText
          text="Black belts who love to teach"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-3xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Six people, one standard. Every class on the timetable is led by one
          of them — never by whoever happened to be free.
        </p>
      </div>

      <div className="mt-12">
        <ParallaxCarousel
          images={COACH_AVATARS}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          gap={20}
          parallaxIntensity={0.35}
          uvScale={0.2}
          borderRadius={16}
          loop
          autoplaySpeed={0}
          showProgress={false}
          className="h-[390px] sm:h-[520px]"
        />
      </div>
    </section>
  );
}

export default Coaches;
