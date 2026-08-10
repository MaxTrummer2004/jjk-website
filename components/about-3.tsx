"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CSSProperties } from "react";

import { KanjiLabel } from "@/components/kanji-label";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}




interface Item {
  id: string;
  titleUp: string;
  titleDown: string;
  image: string;
  description: string;
}

// Images are placeholders: the four kanji of 柔術廻戦 on a seal ring, standing in
// for the JJK hand-sign shots until the real ones land in public/img/.
const items: Item[] = [
  {
    id: "1",
    titleUp: "On The",
    titleDown: "Mats",
    image: "/img/hand-sign-1.jpg",
    description: "Built on the Gracie lineage since 2010. World-class technical coaching, open mats, seminars — everything you need to grow, whatever your level.",
  },
  {
    id: "2",
    titleUp: "Your",
    titleDown: "Team",
    image: "/img/hand-sign-2.jpg",
    description: "A room full of people who actually want you to succeed. No ego, no gatekeeping — just a tight-knit community that shows up for each other on and off the mats.",
  },
  {
    id: "3",
    titleUp: "Every",
    titleDown: "Belt",
    image: "/img/hand-sign-3.jpg",
    description: "One curriculum from white to black. You always know what you are working on, why it matters, and what the next rung looks like — no guesswork, no filler.",
  },
  {
    id: "4",
    titleUp: "Show",
    titleDown: "Up",
    image: "/img/hand-sign-4.jpg",
    description: "The only technique that never fails. Six nights a week, doors open, mat swept — the rest is just turning up often enough for it to become who you are.",
  },
];


function ProjectItem({ item, index, onHover }: { item: Item; index: number; onHover: (isHovering: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const [maskRadius, setMaskRadius] = useState(0);
  const isEven = index % 2 === 0;

  const xTo = useRef<gsap.QuickToFunc | null>(null);
  const yTo = useRef<gsap.QuickToFunc | null>(null);
  const scaleTo = useRef<gsap.QuickToFunc | null>(null);

  useEffect(() => {
    if (!canvasWrapperRef.current) return;
    xTo.current = gsap.quickTo(canvasWrapperRef.current, "x", { duration: 0.8, ease: "power3.out" });
    yTo.current = gsap.quickTo(canvasWrapperRef.current, "y", { duration: 0.8, ease: "power3.out" });
    scaleTo.current = gsap.quickTo(canvasWrapperRef.current, "scale", { duration: 0.6, ease: "power2.out" });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect || !xTo.current || !yTo.current) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    xTo.current(-x * 30);
    yTo.current(-y * 30);
  };

  const handleMouseEnter = () => { onHover(true); scaleTo.current?.(1.22); };
  const handleMouseLeave = () => { onHover(false); xTo.current?.(0); yTo.current?.(0); scaleTo.current?.(1.15); };

  useEffect(() => {
    if (!containerRef.current) return;
    const title = titleRef.current, desc = descRef.current;
    gsap.set(title, { y: 60, opacity: 0 });
    gsap.set(desc, { y: 40, opacity: 0 });

    const maskTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
        end: "top -20%",
        // 1.5 hiess: die Blende zieht dem Scrollen anderthalb Sekunden
        // hinterher. Zusammen damit, dass sich ohne Zeigerbewegung nichts
        // ruehrte, war das der zweite Teil des "ein paar Sekunden warten" —
        // man stand schon vor der Karte, und der Kreis war noch unterwegs.
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => setMaskRadius(self.progress * 1200),
        onLeaveBack: () => setMaskRadius(0),
      },
    });
    maskTl.to({}, { duration: 1 });

    const textTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        // "top 88%" und nicht "top 50%": der Text soll anlaufen, wenn die
        // Sektion von unten ins Bild kommt, nicht erst, wenn sie schon auf
        // halber Hoehe steht. Bei 50% stand er sichtbar da und ruehrte sich
        // nicht — man war laengst angekommen, und die Bewegung fing erst an.
        start: "top 88%",
        toggleActions: "play none none reverse",
        invalidateOnRefresh: true,
      },
    });
    textTl.to(title, { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
      .to(desc, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");

    return () => { maskTl.kill(); textTl.kill(); };
  }, []);


  return (
    <div
      ref={containerRef}
      className="group py-10 md:py-16"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="mx-auto max-w-[1400px] px-6 sm:px-12 lg:px-24">
        <div className={`flex flex-col gap-8 ${isEven ? "md:flex-row" : "md:flex-row-reverse"} md:items-center md:gap-16`}>
          <div
            ref={imageContainerRef}
            className="jjk-candle-edge relative aspect-4/3 w-full overflow-hidden rounded-full md:w-3/5"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={canvasWrapperRef}
              className="absolute inset-0 w-full h-full"
              style={{ willChange: "transform", transformStyle: "preserve-3d", backfaceVisibility: "hidden", transform: "scale(1.15)" }}
            >
              {/* ── Das Foto, und nichts darauf ────────────────────────────
                  Hier lag eine Wasserwelle: eine r3f-Leinwand, die dasselbe
                  Foto mit einer zeigergesteuerten Verdraengung und einem roten
                  Duoton darueber zeichnete. Sie ist raus, und zwar auf Ansage —
                  "in der Form, wo es noch nicht ready ist, ist es besser".

                  Das ist auch die ehrlichere Fassung. Der Duoton faerbte ein
                  Bild rot ein, das die Gradierung schon in genau diese Nacht
                  gesetzt hatte; zwei Ebenen taten dieselbe Arbeit, und die
                  zweite konnte nur noch saettigen. Und die Verdraengung war ein
                  Effekt, den man erst SUCHEN musste — Zeiger drauf, ein paar
                  Sekunden warten —, waehrend die Sektion daneben behauptet, man
                  lese sie mit einer Fackel.

                  Was bleibt, ist die Kreisblende: derselbe Radius, dieselbe
                  35-px-Kante, nur ohne Shader dahinter. Sie war nie Teil der
                  Welle, sie war immer das Aufziehen selbst.

                  components/water-ripple.tsx bleibt liegen, ausgehaengt statt
                  geloescht. Zurueckholen ist dieser Block. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className="jjk-card-photo"
                style={{ "--reveal": `${maskRadius}px` } as CSSProperties}
              />
            </div>
          </div>
          <div className={`flex flex-col md:w-2/5 ${isEven ? "" : "md:text-right"}`}>
            <span className="text-base font-medium uppercase tracking-widest text-muted-foreground mb-6">0{index + 1}</span>
            <h3 ref={titleRef} className="text-[clamp(2.5rem,6vw,6rem)] leading-[1.05] tracking-tight text-foreground mb-8">
              <span className="font-medium">{item.titleUp}</span><br />
              <span className="font-serif italic">{item.titleDown}</span>
            </h3>
            <p ref={descRef} className={`text-muted-foreground text-xl leading-relaxed ${isEven ? "max-w-lg" : "max-w-lg md:ml-auto"}`}>
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function About3() {
  return (
    <section className="relative pt-4 pb-24">
      <div className="mx-auto mb-4 max-w-[1400px] px-6 sm:px-12 lg:px-24">
        <KanjiLabel kanji="道場" furigana="どうじょう" gloss="The Academy" />
      </div>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <ProjectItem
            key={item.id}
            item={item}
            index={index}
            onHover={() => {}}
          />
        ))}
      </div>
    </section>
  );
}
