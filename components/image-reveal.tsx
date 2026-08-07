"use client";

/**
 * ImageReveal — ported from the ai-saas template and re-graded for JJK.
 *
 * Three columns of stills. On scroll the outer columns come in stretched flat
 * from the left and right edges while the middle column pushes up from behind,
 * so everything converges on the grid at the same moment. In the original the
 * tint was a blue duotone; here it's the ember red, with the same film grain
 * and vignette the rest of the page runs under.
 */

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface RevealImage {
  src: string;
  alt: string;
}

/** Placeholders — swap for real stills in public/img/. */
const defaultImages: RevealImage[] = Array.from({ length: 12 }, (_, i) => ({
  src: `/img/mock-${i + 1}.jpg`,
  alt: `JJK training still ${i + 1}`,
}));

export interface ImageRevealProps {
  images?: RevealImage[];
  className?: string;
}

export function ImageReveal({
  images = defaultImages,
  className = "",
}: ImageRevealProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  const columns: RevealImage[][] = [[], [], []];
  images.forEach((image, index) => {
    columns[index % 3]?.push(image);
  });

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      root.querySelectorAll(".column").forEach((column, columnIndex) => {
        column.querySelectorAll(".column__item").forEach((item) => {
          const wrapper = item.querySelector(".column__item-imgwrap");
          if (!wrapper) return;

          // Outer columns arrive smeared in from the page edges; the middle
          // column simply scales up. That contrast is the whole effect.
          const outer = columnIndex !== 1;
          const from = {
            willChange: "filter, transform",
            xPercent: outer ? (columnIndex === 0 ? -400 : 400) : 0,
            opacity: 0,
            scaleX: outer ? 6 : 0.7,
            scaleY: outer ? 0.3 : 0.7,
            filter: outer ? "blur(10px)" : "blur(5px)",
          };

          gsap.fromTo(wrapper, from, {
            startAt: {
              transformOrigin:
                columnIndex === 0 ? "0% 50%" : columnIndex === 2 ? "100% 50%" : "50% 50%",
            },
            scrollTrigger: {
              trigger: item,
              start: "clamp(top bottom)",
              end: "clamp(bottom top)",
              scrub: true,
            },
            xPercent: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            filter: "blur(0px)",
          });
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="gallery"
      // No `jjk-ember-glow`. That was an ellipse anchored at 50% 100% — at its
      // brightest along this section's own bottom edge — on an element that is
      // `overflow-hidden` to hold the reveal columns in. So it was a warm blob
      // in the middle of the screen that stopped dead on one pixel row, with
      // nothing below it to explain where the light had gone. The wall carries
      // on past this point now (components/room.tsx), and it carries on as the
      // same wall; a pool of light sitting on the join is the one thing that
      // makes a join visible.
      className={`relative overflow-hidden py-24 lg:py-32 ${className}`}
    >
      <div className="mx-auto mb-14 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <KanjiLabel kanji="組手" furigana="くみて" gloss="Inside the room" />
        <StaggeredText
          text="Twelve nights, one room"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Everything that happens between the warm-up and the last slap-bump.
        </p>
      </div>

      <div
        ref={containerRef}
        className="columns mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 sm:px-6 md:gap-6 lg:gap-8 lg:px-8"
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="column flex flex-col gap-4 md:gap-6 lg:gap-8">
            {column.map((image, index) => (
              <figure key={`col${columnIndex}-${index}`} className="column__item m-0">
                <div className="column__item-imgwrap relative aspect-3/4 w-full overflow-hidden rounded-xl border border-border-hot">
                  <div
                    className="column__item-img h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${image.src})` }}
                    role="img"
                    aria-label={image.alt}
                  />
                  {/* Ember duotone — the blue gradient from the original template */}
                  <div
                    className="pointer-events-none absolute inset-0 mix-blend-color"
                    style={{
                      background: "linear-gradient(135deg, #7a0c14 0%, #ff6a1f 100%)",
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 mix-blend-screen"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(211,32,42,0.35) 0%, transparent 72%)",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default ImageReveal;
