"use client";

import { coaches } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import ParallaxCarousel from "@/components/parallax-carousel";
import type { ReactNode } from "react";

/**
 * ── Coach-Avatare ────────────────────────────────────────────────────────
 * Statt echter Fotos (die es noch nicht gibt) oder tatsaechlicher
 * Jujutsu-Kaisen-Figuren (urheberrechtlich geschuetzt, nicht verwendbar):
 * pro Coach eine eigenstaendige, stilisierte Portrait-Illustration im
 * dunklen JJK-Look der Seite — Aura-Farbe nach Guertelfarbe, individuelle
 * Frisur-Silhouette. Reines SVG, keine Filter (feTurbulence/blur waren
 * genau die Mobile-Rendering-Falle, siehe atmosphere.tsx) — nur
 * Gradients/Formen, dadurch ueberall gleich sauber.
 */

type HairStyle =
  | "short-crop"
  | "high-ponytail"
  | "tousled-fringe"
  | "soft-bob"
  | "buzzcut"
  | "top-knot";

const AURA_COLOR: Record<string, string> = {
  black: "#d8341c",
  purple: "#8a5cd6",
  brown: "#c9862c",
};

const COACH_LOOKS: { hair: HairStyle; skin: string; hairColor: string }[] = [
  { hair: "short-crop", skin: "#caa07a", hairColor: "#18120d" }, // Rafael Mendes
  { hair: "high-ponytail", skin: "#e0b593", hairColor: "#241a13" }, // Marina Silva
  { hair: "tousled-fringe", skin: "#d9a876", hairColor: "#2b1c11" }, // Lucas Weber
  { hair: "soft-bob", skin: "#f0c9a8", hairColor: "#3b2a1c" }, // Ana König
  { hair: "buzzcut", skin: "#b98457", hairColor: "#171310" }, // Tomás Carvalho
  { hair: "top-knot", skin: "#e8c39c", hairColor: "#1e150f" }, // Yuki Nakamura
];

/** Kopfmitte (190,178) r=82 — alle Frisuren sind darum herum aufgebaut. */
function hairPath(style: HairStyle): string {
  switch (style) {
    case "short-crop":
      return "M106,172 C106,96 274,96 274,172 C274,138 250,108 190,105 C130,108 106,138 106,172 Z";
    case "high-ponytail":
      return "M106,172 C106,96 274,96 274,172 C274,138 250,108 190,105 C130,108 106,138 106,172 Z M252,122 C298,140 308,222 282,272 C273,230 262,158 252,122 Z";
    case "tousled-fringe":
      return "M104,170 C110,118 142,94 190,91 C238,94 270,118 276,170 C261,150 251,128 236,144 C221,124 211,146 196,120 C181,146 171,124 156,144 C141,128 131,150 104,170 Z";
    case "soft-bob":
      return "M100,176 C96,98 284,98 280,176 L277,232 C258,206 220,196 190,196 C160,196 122,206 103,232 Z";
    case "buzzcut":
      return "M120,120 C150,94 230,94 260,120 C249,104 210,92 190,92 C170,92 131,104 120,120 Z";
    case "top-knot":
      return "M106,172 C106,96 274,96 274,172 C274,138 250,108 190,105 C130,108 106,138 106,172 Z M175,84 C175,66 205,66 205,84 C205,98 175,98 175,84 Z M188,86 L192,86 L192,105 L188,105 Z";
  }
}

function coachAvatarDataUrl(
  coach: (typeof coaches)[number],
  index: number
): string {
  const look = COACH_LOOKS[index % COACH_LOOKS.length];
  const aura = AURA_COLOR[coach.beltColor] ?? "#d8341c";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 520" width="380" height="520">
  <defs>
    <radialGradient id="bg-${index}" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#221f1b" />
      <stop offset="100%" stop-color="#100f0d" />
    </radialGradient>
    <radialGradient id="aura-${index}" cx="50%" cy="34%" r="42%">
      <stop offset="0%" stop-color="${aura}" stop-opacity="0.45" />
      <stop offset="60%" stop-color="${aura}" stop-opacity="0.14" />
      <stop offset="100%" stop-color="${aura}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="body-${index}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#332c24" />
      <stop offset="100%" stop-color="#211c17" />
    </linearGradient>
  </defs>

  <rect width="380" height="520" fill="url(#bg-${index})" />
  <circle cx="190" cy="185" r="220" fill="url(#aura-${index})" />

  <ellipse cx="190" cy="560" rx="168" ry="148" fill="url(#body-${index})" />
  <path
    d="M92,470 L190,432 L288,470 L288,460 L192,412 L92,460 Z"
    fill="#e7ded2"
    opacity="0.9"
  />
  <rect x="150" y="452" width="80" height="10" rx="5" fill="${aura}" opacity="0.85" />

  <circle cx="190" cy="178" r="82" fill="${look.skin}" />
  <path d="${hairPath(look.hair)}" fill="${look.hairColor}" />
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const COACH_AVATARS = coaches.map((coach, index) => coachAvatarDataUrl(coach, index));

export function Coaches(): ReactNode {
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
          imageWidth={380}
          imageHeight={520}
          gap={20}
          parallaxIntensity={0.35}
          uvScale={0.2}
          borderRadius={16}
          loop
          autoplaySpeed={0}
          showProgress={false}
          className="h-[520px]"
        />
      </div>
    </section>
  );
}

export default Coaches;
