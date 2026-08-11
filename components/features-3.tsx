"use client";

/**
 * Features3 — four reasons, and the picture that answers each one.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * Two columns of photographs scrolling past each other on a timer, beside four
 * claims that had nothing to do with them. Three things were wrong with it and
 * only one was the animation.
 *
 * There were six slots and two pictures. `about.jpg` and `hero-poster.jpg`
 * alternating, so every photograph appeared three times in its own column and
 * six times across the pair. That is what anybody actually saw.
 *
 * They were `grayscale` on a page whose entire colour idea is ember, inside
 * `rounded-2xl bg-card border` — the floating-card language — and the rail
 * faded top and bottom to flat `--background`, which now paints an opaque band
 * over the painted wall behind it.
 *
 * And it moved on a TIMER. Nothing else on this page does. The wall catches
 * when you arrive at it, the boards light when you point at them, the city
 * burns when you click it — every motion here has a cause, and a loop running
 * by itself was the one thing on the page happening for no reason.
 *
 * ── What it is now ──────────────────────────────────────────────────────────
 * The claims are the control and the picture is the answer. Point at "real
 * self-defense" and the frame shows what that looks like. Two halves that used
 * to sit next to each other are now one thing, and the cause of the motion is
 * the reader, like everywhere else.
 *
 * It is a list of buttons rather than a hover area, which is not decoration:
 * focus moves through them on a keyboard and does exactly what the pointer
 * does, and on a touch screen — where there is no hover at all — a tap works.
 * The old rail simply had no state a keyboard could reach.
 *
 * The photographs get the gallery's treatment, to the value: a `mix-blend-color`
 * ember ramp over a `mix-blend-screen` pool from below (see
 * components/image-reveal.tsx). Those are the same kind of object and they are
 * made of the same material. The programme boards are not photographs, which is
 * why they are cut square into the dark and these are framed.
 */

import { useState, type ReactNode } from "react";
import { useIsTouch } from "@/lib/pointer";
import { motion } from "motion/react";
import { Shield, Award, Dumbbell, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import { reasons } from "@/lib/config";

/** One per reason, in the order the config lists them. A drawing, not copy. */
const ICONS: readonly LucideIcon[] = [Shield, Award, Dumbbell, Users];

/**
 * Der Rahmen mit dem Bild.
 *
 * Steht am Rechner rechts neben der Liste und auf dem Handy DARUEBER. Der
 * Grund ist die Bedienung: die Liste ist eine Reihe von Knoepfen, und jeder
 * wechselt das Bild. Am Rechner sieht man beides gleichzeitig. Auf dem Handy
 * stapelt das Raster untereinander — und weil der Rahmen im Aufbau NACH der
 * Liste kommt, lag er ausserhalb des Sichtfelds: man tippt einen Punkt an, das
 * Bild wechselt, und niemand sieht es. Genau das war die Meldung.
 *
 * Deshalb wird er je nach Eingabeart an der einen ODER der anderen Stelle
 * gerendert, nie an beiden. Am Rechner aendert sich dadurch nichts.
 */
function Shot({ active }: { active: number }): ReactNode {
  // Ein Bild nach dem anderen, ueberblendet unter EINEM Satz Blendebenen. Die
  // Glutrampe auf jede Aufnahme einzeln zu legen wuerde die beiden waehrend
  // der Blende miteinander vermischen, und der Uebergang blitzte in einer
  // dritten Farbe auf.
  return (
    <motion.figure
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="jjk-shot m-0"
    >
      <div className="jjk-shot-stack">
        {reasons.map((r, i) => (
          <div
            key={r.label}
            className="jjk-shot-img"
            style={{ backgroundImage: `url(${r.image})` }}
            {...(active === i ? { "data-on": "" } : {})}
            role="img"
            aria-label={r.label}
          />
        ))}
        <div className="jjk-shot-ember" aria-hidden="true" />
        <div className="jjk-shot-pool" aria-hidden="true" />
      </div>

      <figcaption className="jjk-shot-cap font-mono">
        <span>{String(active + 1).padStart(2, "0")}</span>
        <span className="jjk-shot-cap-rule" aria-hidden="true" />
        <span>{reasons[active]?.label}</span>
      </figcaption>
    </motion.figure>
  );
}

export function Features3(): ReactNode {
  // Which claim the reader is on. Never null: a frame with nothing in it is a
  // hole in the layout, and on a touch screen it would be the permanent state.
  const [active, setActive] = useState(0);
  const isTouch = useIsTouch();

  return (
    <section className="w-full px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-20">
        <div>
          <KanjiLabel kanji="極意" furigana="ごくい" gloss="Why Jiu-Jitsu" />
          <StaggeredText
            text="The most fun you'll ever have getting fit"
            as="h2"
            segmentBy="words"
            direction="bottom"
            delay={70}
            duration={0.7}
            blur
            className="font-display jjk-aberrate max-w-2xl text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl"
          />
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-dim">
            Jiu-Jitsu is problem-solving with your whole body. Every round builds
            strength, calm and confidence — and you leave each class better than
            you walked in.
          </p>

          {/* Auf dem Handy steht das Bild ueber der Liste, die es steuert. */}
          {isTouch ? <Shot active={active} /> : null}

          <ul className="jjk-claims mt-10">
            {reasons.map((r, i) => {
              const Icon = ICONS[i] ?? Shield;
              return (
                <li key={r.label}>
                  <button
                    type="button"
                    className="jjk-claim"
                    data-cursor=""
                    {...(active === i ? { "data-on": "" } : {})}
                    // Pointer, focus and tap all do the same thing. The frame is
                    // the answer to whichever claim the reader is on, however
                    // they got there.
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={active === i}
                  >
                    <span className="jjk-claim-num font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="jjk-claim-icon" strokeWidth={1.4} aria-hidden="true" />
                    <span className="jjk-claim-text">{r.claim}</span>
                    <span className="jjk-claim-rule" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {!isTouch ? <Shot active={active} /> : null}
      </div>
    </section>
  );
}

export default Features3;
