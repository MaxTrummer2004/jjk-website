"use client";

/**
 * The closing call, standing on the fire.
 *
 * ── What this replaced ──────────────────────────────────────────────────────
 * A `rounded-3xl` card with two floating mock-ups rotated ten degrees out of
 * true on either side of it — a photograph in a polaroid frame and a fake
 * document window with a plus, a copy and a send icon along its top. Product
 * furniture, on a page about a room in Graz.
 *
 * ── And what it said ────────────────────────────────────────────────────────
 * "Your first class is free." It is not. A trial class is €20 and the
 * membership is €60 a month; the free-first-class claim had spread to five
 * places on the site from a template that was never about this academy. The
 * last thing a stranger reads before they decide to come in is the worst
 * possible place for a price the desk will have to correct.
 *
 * ── What it is now ──────────────────────────────────────────────────────────
 * Nothing but the line and the two ways to answer it, on the panel cut from the
 * burning Sanjō gate — the same fire the page opened on, framed tighter, so the
 * last thing the reader sees is the first thing they saw.
 *
 * That is the only reason the fire is used twice. The opening burns it out and
 * hands over to a dark room; forty screens later it comes back, once, under the
 * one sentence that asks for something. A picture used twice with thirty
 * screens between the two is not a repetition, it is a return.
 *
 * Both links carry `data-cursor` and neither carries `data-cursor-image`: the
 * ring frames them and shows nothing. It used to pull up a video still over
 * this button, from an index in a positional array that had drifted — see
 * components/custom-cursor.tsx for why that array is gone.
 */

import { motion } from "motion/react";
import { KanjiLabel } from "@/components/kanji-label";

export default function Cta9() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="jjk-close mx-auto max-w-3xl"
        >
          <KanjiLabel
            kanji="一本"
            furigana="いっぽん"
            gloss="Step on the mat"
            align="center"
          />

          <h2 className="jjk-close-line">
            Come and take
            <br />
            a class
          </h2>

          <div className="jjk-rule mx-auto mt-8 w-40" aria-hidden="true" />

          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-foreground-dim">
            One trial class is €20 — shorts, a t-shirt, and we lend you the
            rest. The membership is €60 a month and contains everything on the
            timetable.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              id="cursor-cta"
              data-cursor=""
              href="#contact"
              className="jjk-btn"
            >
              Book a trial class
            </a>
            <a href="#schedule" data-cursor="" className="jjk-btn jjk-btn-quiet">
              See the timetable
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
