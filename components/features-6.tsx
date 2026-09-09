"use client";

import { Shield, Swords, Dumbbell, Trophy, Users, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import { programs } from "@/lib/config";
import ModalCards, { type CardData } from "@/components/modal-cards";

const ICONS: readonly LucideIcon[] = [Shield, Swords, Dumbbell, Trophy, Users, Heart];

// Map programs to CardData — no imageUrl, custom render props handle visuals.
const CARDS: CardData[] = programs.map((p, i) => ({
  id: String(i),
  title: p.title,
  description: p.blurb,
  gradientColor: "#1a0505",
}));

function CardFace({ card }: { card: CardData }): ReactNode {
  const i = Number(card.id);
  const program = programs[i]!;
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-5 pt-5 pb-6"
      style={{ backgroundColor: "#0f0e0d" }}
    >
      {/* Decorative kanji behind content */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-0.08em] bottom-[0.4rem] select-none leading-none text-foreground/[0.055]"
        style={{ fontFamily: "var(--font-jp)", fontSize: "9rem" }}
      >
        {program.kanji}
      </span>

      {/* Top row: index + tag */}
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="font-mono text-[0.65rem] font-medium tracking-[0.26em] text-muted-foreground">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent/60">
          {program.tag}
        </span>
      </div>

      {/* Bottom: level + title */}
      <div className="relative mt-auto">
        <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/70">
          {program.level}
        </p>
        <h3
          className="text-xl font-medium leading-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {program.title}
        </h3>
      </div>
    </div>
  );
}

function ModalTop({ card }: { card: CardData }): ReactNode {
  const i = Number(card.id);
  const program = programs[i]!;
  const Icon = ICONS[i] ?? Shield;
  return (
    <div
      className="relative flex min-h-52 flex-col overflow-hidden px-8 pt-8 pb-7"
      style={{ backgroundColor: "#0f0e0d" }}
    >
      {/* Large kanji */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-0.05em] bottom-[-0.25em] select-none leading-none text-foreground/[0.045]"
        style={{ fontFamily: "var(--font-jp)", fontSize: "15rem" }}
      >
        {program.kanji}
      </span>

      {/* Top row */}
      <div
        className="flex items-center justify-between pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="font-mono text-[0.65rem] font-medium tracking-[0.26em] text-muted-foreground">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent/60">
          {program.tag}
        </span>
      </div>

      {/* Title + icon */}
      <div className="relative mt-auto flex items-end gap-4 pt-6">
        <div>
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/70">
            {program.level}
          </p>
          <h3
            className="text-3xl font-medium leading-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {program.title}
          </h3>
        </div>
        <Icon
          className="ml-auto shrink-0 text-accent/35"
          size={36}
          strokeWidth={1.2}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function Features6(): ReactNode {
  return (
    <section className="w-full px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="稽古" furigana="けいこ" gloss="Programs" />
        <StaggeredText
          text="Programs for every stage"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
          Six rooms, one art. Start where you are — nobody has ever walked in
          knowing how to do this.
        </p>

        <div className="mt-12 sm:mt-16">
          <ModalCards
            cards={CARDS}
            renderCardFace={(card) => <CardFace card={card} />}
            renderModalTop={(card) => <ModalTop card={card} />}
            modalBgColor="#0f0e0d"
            gradientColor="#5a0a0a"
            backdropGradientPosition="50% 0%"
            animationSpeed="normal"
            animationVariant="scale"
            closeOnEscape
            closeOnBackdropClick
            showCloseButton
            ariaLabel="Programm-Details"
            className="[&_.border]:border-border"
          />
        </div>
      </div>
    </section>
  );
}
