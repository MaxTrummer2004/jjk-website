"use client";

/**
 * features-6.tsx — Programs section
 *
 * Hover:
 *   depth-card (installed) hat feste Pixel-Dimensionen und unterstützt kein
 *   fluid-sized children-Layout — Tilt-Logik daher als TiltCard hier
 *   nachgebaut (rAF lerp + rotateX/Y, identisches Prinzip).
 *   chroma-card nutzt WebGL/Canvas → NOT installed; Cursor-Glow stattdessen
 *   per CSS radial-gradient (colour-mix auf --accent, opacity-transition).
 *   Beide Effekte: Handy (coarse pointer) + prefers-reduced-motion → disabled.
 *
 * Idle:
 *   whileInView Stagger beim Einblenden, Kanji-Drift (y, repeat Infinity),
 *   diagonaler Sheen-Sweep (x, repeat Infinity). Alles transform/opacity only.
 *
 * Mobile (<sm):
 *   Horizontales scroll-snap Carousel. Karten 80vw breit, feste Höhe.
 *   Kanji-Parallax über direktes DOM-Transform im onScroll-Handler.
 *   Tap öffnet dasselbe Modal wie Desktop (ModalTop + description).
 */

import { useReducedMotion } from "@/lib/motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Swords, Dumbbell, Trophy, Users, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import { programs } from "@/lib/config";
import ModalCards, { type CardData } from "@/components/modal-cards";

const ICONS: readonly LucideIcon[] = [Shield, Swords, Dumbbell, Trophy, Users, Heart];

const CARDS: CardData[] = programs.map((p, i) => ({
  id: String(i),
  title: p.title,
  description: p.blurb,
  gradientColor: "#1a0505",
}));

// ── TiltCard ──────────────────────────────────────────────────────────────────
// Perspective tilt (depth-card mechanism, fluid sizing) + red cursor glow
// (chroma-card replacement, CSS only). Disabled on coarse pointer + reduced-motion.

function TiltCard({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion: boolean;
}): ReactNode {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ rx: 0, ry: 0 });
  const currentRef = useRef({ rx: 0, ry: 0 });
  const rafRef = useRef<number | undefined>(undefined);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const enabled = !reducedMotion && !coarse;

  useEffect(() => {
    if (!enabled) {
      if (innerRef.current) innerRef.current.style.transform = "";
      return;
    }
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      const t = targetRef.current;
      const c = currentRef.current;
      c.rx = lerp(c.rx, t.rx, 0.08);
      c.ry = lerp(c.ry, t.ry, 0.08);
      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      targetRef.current = { rx: ny * -7, ry: nx * 7 };
      if (glowRef.current) {
        const gx = e.clientX - rect.left;
        const gy = e.clientY - rect.top;
        glowRef.current.style.backgroundImage = `radial-gradient(180px circle at ${gx}px ${gy}px, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)`;
        glowRef.current.style.opacity = "1";
      }
    },
    [enabled],
  );

  const onMouseLeave = useCallback(() => {
    if (!enabled) return;
    targetRef.current = { rx: 0, ry: 0 };
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }, [enabled]);

  return (
    <div
      ref={cardRef}
      className="relative h-full w-full"
      style={enabled ? { perspective: "900px" } : undefined}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={innerRef}
        className="relative h-full w-full"
        style={enabled ? { transformStyle: "preserve-3d", willChange: "transform" } : undefined}
      >
        {children}
        {/* Cursor-following red glow — CSS replacement for chroma-card WebGL */}
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{ zIndex: 2, borderRadius: "inherit" }}
        />
      </div>
    </div>
  );
}

// ── CardFace ──────────────────────────────────────────────────────────────────

function CardFace({
  card,
  reducedMotion,
}: {
  card: CardData;
  reducedMotion: boolean;
}): ReactNode {
  const i = Number(card.id);
  const program = programs[i]!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="h-full w-full"
    >
      <TiltCard reducedMotion={reducedMotion}>
        <div
          className="relative flex h-full w-full flex-col overflow-hidden px-5 pt-5 pb-6"
          style={{ backgroundColor: "#0f0e0d" }}
        >
          {/* Decorative kanji — slow idle drift (y-transform only) */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute right-[-0.08em] bottom-[0.4rem] select-none leading-none text-foreground/[0.055]"
            style={{ fontFamily: "var(--font-jp)", fontSize: "9rem" }}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 14 + i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.9,
            }}
          >
            {program.kanji}
          </motion.span>

          {/* Idle sheen — diagonal highlight sweeping across card (x-transform) */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            animate={{ x: ["-120%", "220%"] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
              delay: i * 2.4,
            }}
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.026) 50%, transparent 60%)",
              zIndex: 1,
            }}
          />

          {/* Top row: index + tag */}
          <div
            className="relative flex items-center justify-between pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", zIndex: 2 }}
          >
            <span className="font-mono text-[0.65rem] font-medium tracking-[0.26em] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent/60">
              {program.tag}
            </span>
          </div>

          {/* Bottom: level + title */}
          <div className="relative mt-auto" style={{ zIndex: 2 }}>
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
      </TiltCard>
    </motion.div>
  );
}

// ── ModalTop ──────────────────────────────────────────────────────────────────
// Tag removed — close button (absolute top-4 right-4) would overlap.
// Top row retains index number only; right side left clear.

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

      {/* Top row — index only, close button occupies top-right */}
      <div
        className="flex items-center pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="font-mono text-[0.65rem] font-medium tracking-[0.26em] text-muted-foreground">
          {String(i + 1).padStart(2, "0")}
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

// ── MobileCarousel ────────────────────────────────────────────────────────────
// Horizontal scroll-snap carousel for <sm. Cards are 80vw wide with 4vw gaps,
// padded 10vw on each side so first/last card snap to center. Kanji parallax
// via direct DOM transform in onScroll (no React state update per frame).
// prefers-reduced-motion: no parallax, snap scroll stays.

function MobileCarousel({
  cards,
  reducedMotion,
  onSelect,
}: {
  cards: CardData[];
  reducedMotion: boolean;
  onSelect: (card: CardData) => void;
}): ReactNode {
  const scrollRef = useRef<HTMLDivElement>(null);
  const kanjiRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRafRef = useRef<number | undefined>(undefined);

  const handleScroll = useCallback(() => {
    // rAF throttle: one DOM read/write batch per frame, not per scroll event.
    if (scrollRafRef.current !== undefined) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = undefined;
      const el = scrollRef.current;
      if (!el) return;
      // el.clientWidth ≈ viewport width since container is full-width (-mx-4 cancels section padding)
      const vw = el.clientWidth;
      const cardW = vw * 0.8;   // 80vw
      const gap = vw * 0.04;    // 4vw gap
      const stride = cardW + gap;

      const idx = Math.round(el.scrollLeft / stride);
      setActiveIndex(Math.max(0, Math.min(idx, cards.length - 1)));

      if (!reducedMotion) {
        const padLeft = vw * 0.1; // 10vw padding-left
        const viewCenter = el.scrollLeft + vw / 2;
        kanjiRefs.current.forEach((span, i) => {
          if (!span) return;
          const cardCenter = padLeft + i * stride + cardW / 2;
          // offset: 0 when card is centered, ±1 when one card away
          const offset = (cardCenter - viewCenter) / stride;
          span.style.transform = `translateX(${offset * 40}px)`;
        });
      }
    });
  }, [cards.length, reducedMotion]);

  useEffect(() => {
    handleScroll();
    return () => {
      if (scrollRafRef.current !== undefined) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [handleScroll]);

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // -mx-4 cancels the section's px-4 so the container is full viewport width
        className="-mx-4 flex overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          overscrollBehaviorX: "contain",
          overscrollBehaviorY: "auto",
          touchAction: "pan-x pan-y",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          gap: "4vw",
          paddingLeft: "10vw",
          paddingRight: "10vw",
        }}
        role="region"
        aria-label="Programme"
      >
        {cards.map((card, i) => {
          const program = programs[Number(card.id)]!;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className="relative flex flex-none flex-col overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{
                width: "80vw",
                aspectRatio: "4/3",
                scrollSnapAlign: "center",
                backgroundColor: "#0f0e0d",
              }}
              aria-label={`${program.title} – Details anzeigen`}
            >
              {/* Decorative kanji — parallax target; plain span so scroll can override transform */}
              <span
                ref={(el) => { kanjiRefs.current[i] = el; }}
                aria-hidden="true"
                className="pointer-events-none absolute right-[-0.08em] bottom-[0.4rem] select-none leading-none text-foreground/[0.055]"
                style={{ fontFamily: "var(--font-jp)", fontSize: "9rem" }}
              >
                {program.kanji}
              </span>

              {/* Top row: index + tag */}
              <div
                className="relative z-[2] mx-5 mt-5 flex items-center justify-between pb-3"
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
              <div className="relative z-[2] mx-5 mb-6 mt-auto text-left">
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
            </button>
          );
        })}
      </div>

      {/* Pill/dot position indicator */}
      <div
        className="mt-5 flex items-center justify-center gap-2"
        aria-hidden="true"
      >
        {cards.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? "1.25rem" : "0.375rem",
              height: "0.375rem",
              backgroundColor:
                i === activeIndex
                  ? "var(--accent)"
                  : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function Features6(): ReactNode {
  const reducedMotion = useReducedMotion();
  const [mobileSelected, setMobileSelected] = useState<CardData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Body scroll lock while mobile modal is open
  useEffect(() => {
    if (mobileSelected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSelected]);

  // Escape key closes mobile modal
  useEffect(() => {
    if (!mobileSelected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileSelected]);

  return (
    // overflow-x-hidden prevents the -mx-4 carousel bleed from causing page-level horizontal scroll
    <section className="w-full overflow-x-hidden px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:px-8 lg:pt-44">
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

        {/* Mobile: horizontal scroll-snap carousel (below sm) */}
        <div className="mt-12 sm:hidden">
          <MobileCarousel
            cards={CARDS}
            reducedMotion={reducedMotion}
            onSelect={setMobileSelected}
          />
        </div>

        {/* Desktop: modal cards grid (sm+) */}
        <div className="mt-12 hidden sm:mt-16 sm:block">
          <ModalCards
            cards={CARDS}
            renderCardFace={(card) => (
              <CardFace card={card} reducedMotion={reducedMotion} />
            )}
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

      {/* Mobile modal portal — uses same ModalTop as desktop for visual consistency */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileSelected && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="mobile-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => setMobileSelected(null)}
                  className="fixed inset-0 z-[999999] cursor-pointer"
                  style={{
                    background:
                      "radial-gradient(125% 125% at 50% 0%, #0a0a0a 40%, #5a0a0a 100%)",
                    backdropFilter: "blur(8px)",
                  }}
                  role="button"
                  aria-label="Schließen"
                  tabIndex={0}
                />

                {/* Dialog */}
                <div
                  key="mobile-modal-dialog"
                  className="pointer-events-none fixed inset-0 z-[1000000] flex items-center justify-center p-6"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Programm-Details"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="pointer-events-auto relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl"
                    style={{ backgroundColor: "#0f0e0d" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <ModalTop card={mobileSelected} />
                      <button
                        onClick={() => setMobileSelected(null)}
                        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                        aria-label="Schließen"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 4L4 12M4 4L12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="overflow-y-auto p-8">
                      <p className="text-lg leading-relaxed text-foreground/70">
                        {mobileSelected.description}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}
