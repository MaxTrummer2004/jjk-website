"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { TransitionLink } from "@/components/transition-link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { KanjiLabel } from "@/components/kanji-label";
import { useReducedMotion } from "@/lib/motion";

// Derselbe Tusche-Hintergrund wie im Hero (dessen Endzustand: dunkel, rot).
// Nur im Browser, und erst geladen, wenn die Box in die Naehe kommt — sonst
// haengt schon beim Seitenaufbau ein zweiter WebGL-Canvas mit dran.
const loadWatercolor = () => import("@/components/watercolor");
const Watercolor = dynamic(loadWatercolor, { ssr: false });

export default function Cta9() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [nearby, setNearby] = useState(false);
  const [ready, setReady] = useState(false);

  // Den Code schon im Leerlauf nach dem Seitenaufbau holen, damit beim
  // Reinscrollen nicht erst geladen werden muss.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void loadWatercolor());
    else setTimeout(() => void loadWatercolor(), 2000);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearby(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setNearby(true);
          io.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const panelY = useTransform(scrollYProgress, [0, 1], [40, 0]);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-8 sm:px-8 sm:pb-10 lg:px-10"
    >
      <motion.div
        style={{
          // Ersatz-Hintergrund in den Watercolor-Farben, bis der Canvas steht —
          // sonst sieht man erst die leere Box und dann einen Sprung.
          backgroundColor: "#0b0405",
          backgroundImage:
            "radial-gradient(ellipse at 30% 35%, rgba(122,26,8,.55), transparent 60%), radial-gradient(ellipse at 75% 70%, rgba(122,26,8,.45), transparent 55%)",
          ...(reduced ? {} : { scale, y: panelY }),
        }}
        className="relative isolate flex flex-col items-center overflow-hidden rounded-[40px] px-6 pt-28 pb-16 text-center sm:pt-36 sm:pb-20"
      >
        {nearby ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
          >
          <Watercolor
            className="absolute inset-0"
            onReady={() => setReady(true)}
            color1="#030304"
            color2="#7a1a08"
            saturation={0.65}
            brightness={0.04}
            opacity={1}
            speed={0.3}
            scale={0.8}
            driftSpeed={0.025}
            warpSpeed={0.05}
          />
          </div>
        ) : null}

        <KanjiLabel
          kanji="一本"
          furigana="いっぽん"
          gloss="Auf die Matte"
          align="center"
        />

        <h2 className="jjk-section-title jjk-close-line">
          Komm zu einem
          <br />
          Training
        </h2>

        <div className="jjk-rule mx-auto mt-8 w-40" aria-hidden="true" />

        <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-foreground-dim">
          Das Probetraining ist gratis. Kurze Hose, T-Shirt, Wasser &mdash;
          mehr brauchst du nicht. Was eine Mitgliedschaft kostet, steht oben
          bei den Preisen.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {/* Hier stand "Probetraining buchen" auf #contact — ein Formular, das
              nichts abschickt. Ein Probetraining braucht keine Buchung, man
              kommt einfach. Der Knopf fuehrt jetzt zum Beitritt; sobald online
              bezahlt werden kann, geht es von dort direkt weiter zur Zahlung. */}
          {/* "Mitglied werden" ist ganz nach unten gewandert, neben "Komm zu
              uns trainieren" im Footer (Vorstand, 11.10.2026). */}
          <TransitionLink href="/probetraining" className="jjk-btn">
            Probetraining
          </TransitionLink>
        </div>
      </motion.div>
    </section>
  );
}
