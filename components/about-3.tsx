"use client";

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion,
  // Used by ItemOverlay below, which is currently unreferenced — the import
  // was missing, so the moment anything renders it the page throws.
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from "motion/react";
import dynamic from "next/dynamic";
import { GLBoundary } from "@/components/gl-boundary";

/**
 * The ripple canvas, loaded when it is actually approached.
 *
 * It is a react-three-fiber scene with a post-processing composer, so a static
 * import puts three.js, r3f, drei and the composer — a bit over 400 KB gzipped
 * — into the page's FIRST chunk. Measured on the built app that is exactly what
 * was happening, and it was landing in the same instant as the opening's own
 * WebGL context and twenty-nine megapixels of plates. The hero visibly hung on
 * it, and this component is several screens below the fold at the time.
 *
 * `dynamic` alone would not have helped much, because About is in the tree from
 * the first render; the in-view gate below is the other half. Together, nothing
 * here is fetched, and no GL context is created, until the reader is within a
 * screen of it.
 */
const WaterRipple = dynamic(
  () => import("./water-ripple").then((m) => m.WaterRipple),
  { ssr: false }
);
import { KanjiLabel } from "@/components/kanji-label";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function BlobCursor({ isVisible }: { isVisible: boolean }) {
  const blobRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 30, stiffness: 400, mass: 0.2 });
  const smoothY = useSpring(mouseY, { damping: 30, stiffness: 400, mass: 0.2 });
  const velocityX = useVelocity(smoothX);
  const velocityY = useVelocity(smoothY);

  const speed = useTransform(() => Math.sqrt(velocityX.get() ** 2 + velocityY.get() ** 2));
  const scaleAlongMotion = useTransform(speed, [0, 800, 2000], [1, 1.3, 1.6]);
  const scalePerp = useTransform(speed, [0, 800, 2000], [1, 0.8, 0.65]);
  const rotate = useTransform(() => Math.atan2(velocityY.get(), velocityX.get()) * (180 / Math.PI));

  useEffect(() => {
    let rafId: number | null = null;
    let lastX = 0, lastY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          mouseX.set(lastX);
          mouseY.set(lastY);
          rafId = null;
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={blobRef}
      className="pointer-events-none fixed z-50 flex items-center justify-center"
      style={{ left: smoothX, top: smoothY, x: "-50%", y: "-50%" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.3, ease: "easeOut" }, scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } }}
    >
      <motion.div style={{ rotate }}>
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground"
          style={{ scaleX: scaleAlongMotion, scaleY: scalePerp }}
        >
          <motion.span
            className="text-sm font-medium uppercase tracking-wide text-background"
            style={{
              rotate: useTransform(rotate, (r) => -r),
              scaleX: useTransform(scaleAlongMotion, (s) => 1 / s),
              scaleY: useTransform(scalePerp, (s) => 1 / s),
            }}
          >
            Open
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const updateWidth = () => ref.current && setWidth(ref.current.offsetWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [ref]);
  return width;
}

function VelocityText({ children, baseVelocity = 100, className = "" }: { children: React.ReactNode; baseVelocity?: number; className?: string }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });
  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  const wrap = (min: number, max: number, v: number) => {
    const range = max - min;
    return ((((v - min) % range) + range) % range) + min;
  };

  const x = useTransform(baseX, (v) => (copyWidth === 0 ? "0px" : `${wrap(-copyWidth, 0, v)}px`));
  const directionFactor = useRef(1);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="relative overflow-hidden w-full">
      <motion.div className="flex whitespace-nowrap" style={{ x }}>
        {Array.from({ length: 6 }, (_, i) => (
          <span className={`shrink-0 ${className}`} key={i} ref={i === 0 ? copyRef : null}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
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

function ItemOverlay({ item, onClose }: { item: Item | null; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = item ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={`${item.titleUp} ${item.titleDown}`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>
          <motion.div
            className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6 md:left-12 md:top-12 lg:left-16 lg:top-16"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-[clamp(2rem,8vw,6rem)] font-medium leading-[0.95] tracking-tight text-foreground">
              <span className="block">{item.titleUp}</span>
              <span className="block font-serif italic">{item.titleDown}</span>
            </h2>
          </motion.div>
          <motion.div
            className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6 md:right-12 md:top-12 lg:right-16 lg:top-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-card/20 text-foreground backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110 active:scale-95 md:h-14 md:w-14"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProjectItem({ item, index, onHover }: { item: Item; index: number; onHover: (isHovering: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
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
        scrub: 1.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => setMaskRadius(self.progress * 1200),
        onLeaveBack: () => setMaskRadius(0),
      },
    });
    maskTl.to({}, { duration: 1 });

    const textTl = gsap.timeline({
      scrollTrigger: { trigger: containerRef.current, start: "top 50%", toggleActions: "play none none reverse" },
    });
    textTl.to(title, { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
      .to(desc, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");

    return () => { maskTl.kill(); textTl.kill(); };
  }, []);

  // ── When this card is allowed a WebGL context ──────────────────────────────
  // It used to be one-way: once near, mounted for good. The reasoning was that
  // tearing a context down and building it again is expensive — true, and
  // beside the point, because four cards meant four r3f canvases each with its
  // own effect composer, all alive at once and all but one off screen.
  //
  // A browser caps live contexts and silently kills the OLDEST to make room, so
  // that budget was being spent on cards nobody was looking at, and the thing
  // that got evicted was whichever one had been running longest. `postprocessing`
  // then read getContextAttributes() off the corpse, got null, and took the page
  // down with it.
  //
  // So: mounted within half a screen, dropped beyond a screen and a half. The
  // gap between the two is deliberate — a single threshold would thrash a
  // context on and off every time somebody scrolled a few pixels near the line.
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Mount only. Unmounting is the other observer's job, and letting this
        // one do it as well would collapse the hysteresis back to one line.
        for (const e of entries) if (e.isIntersecting) setNearby(true);
      },
      { rootMargin: "50% 0px" }
    );
    const far = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (!e.isIntersecting) setNearby(false);
      },
      { rootMargin: "150% 0px" }
    );
    io.observe(el);
    far.observe(el);
    return () => {
      io.disconnect();
      far.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="group py-16 md:py-24"
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
              {/* The ripple is decoration on a photograph. If its context is
                  refused or taken away, the photograph is still the point — see
                  components/gl-boundary.tsx. */}
              <GLBoundary
                label={`water-ripple ${index}`}
                fallback={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                }
              >
                {nearby && <WaterRipple src={item.image} maskRadius={maskRadius} />}
              </GLBoundary>
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
    <section className="relative py-24">
      <div className="mx-auto mb-4 max-w-[1400px] px-6 sm:px-12 lg:px-24">
        <KanjiLabel kanji="道場" furigana="どうじょう" gloss="The Academy" />
      </div>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <ProjectItem key={item.id} item={item} index={index} onHover={() => {}} />
        ))}
      </div>
    </section>
  );
}
