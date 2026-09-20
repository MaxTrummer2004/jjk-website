"use client";

/**
 * Ein Stapel Karten, von dem immer die oberste ganz zu sehen ist.
 *
 * WAS SICH GEAENDERT HAT UND WARUM
 * --------------------------------
 * Der Stapel konnte urspruenglich genau eines: beim Klick irgendwo in seinen
 * Container die oberste Karte nach hinten schieben. Das war die EINZIGE
 * Bedienung, und die Rueckmeldung zum Stundenplan war entsprechend: "nicht
 * klar genug zum Scrollen oder Tappen, das verwirrt". Drei Dinge fehlten:
 *
 *   1. Es ging nur vorwaerts. Wer einen Tag zu weit war, musste fuenfmal
 *      weiterklicken.
 *   2. Es gab keine Anzeige, wo man ist — der Stapel sah bei Tag 1 und bei
 *      Tag 5 gleich aus.
 *   3. Die Trefferflaeche war der ganze Container, auf dem Handy 500 px hoch
 *      und zum grossen Teil leer. Wer danebentippte, loeste trotzdem aus;
 *      wer die Karte traf, wusste vorher nicht, dass sie das Ziel war.
 *
 * Diese Datei loest 1 und 3 und stellt fuer 2 die Information bereit; die
 * sichtbare Steuerung baut components/schedule.tsx daraus.
 *
 *   - `controllerRef` gibt next/prev/goTo nach aussen. Damit kann eine
 *     Bedienleiste den Stapel fahren, ohne dass der Stapel sie kennen muss.
 *   - `onIndexChange` meldet nach jedem Zug, welche Karte vorne liegt.
 *   - `hitArea="card"` legt den Klick auf die Karten statt auf den Container:
 *     eine Flaeche, die man sieht, statt einer, die man raet.
 *
 * ZUR GESTE AM HANDY
 * ------------------
 * Die Karten tragen `touch-action: pan-y`. Damit ist dem Browser gesagt: die
 * vertikale Wischgeste gehoert der Seite, nicht diesem Element. Ein Tap loest
 * aus, ein Wisch scrollt — und zwar ohne die 300-ms-Verzoegerung, die ein
 * Element ohne touch-action-Angabe braucht, bevor der Browser entscheidet, ob
 * daraus noch eine Geste wird. (Lenis ist auf Touch-Geraeten ohnehin nicht
 * aktiv, siehe components/smooth-scroll.tsx — es gibt dort also keinen
 * zweiten Mitspieler, der die Geste abfangen koennte.)
 */

import React, { useRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

/** Was eine aeussere Bedienleiste mit dem Stapel machen darf. */
export interface ClickStackHandle {
  /** Die oberste Karte nach hinten — der naechste Eintrag kommt nach vorn. */
  next: () => void;
  /** Die hinterste Karte nach vorn — einen Eintrag zurueck. */
  prev: () => void;
  /** Direkt zu einem Eintrag springen (Index in `items`). */
  goTo: (index: number) => void;
}

export interface ClickStackProps {
  /** Renderable content for each card — images, text, JSX, or any React node */
  items?: React.ReactNode[];
  /** Width of each card in pixels */
  cardWidth?: number;
  /** Height of each card in pixels */
  cardHeight?: number;
  /** Horizontal offset between stacked depth levels */
  spreadX?: number;
  /** Vertical offset between stacked depth levels */
  spreadY?: number;
  /** Transition duration in seconds */
  duration?: number;
  /** GSAP easing string for card repositioning */
  ease?: string;
  /** Card corner radius in pixels */
  borderRadius?: number;
  /** Card shadow blur radius */
  shadowBlur?: number;
  /** Card shadow opacity (0–1) */
  shadowOpacity?: number;
  /** Fallback background color for card surfaces */
  cardColor?: string;
  /** Maximum number of cards shown in the stack */
  visibleCount?: number;
  /** Scale reduction per depth level (0–1) */
  depthScale?: number;
  /** Opacity reduction per depth level (0–1) */
  depthOpacity?: number;
  /** CSS class for the outer container */
  className?: string;
  /** CSS class applied to each card wrapper */
  cardClassName?: string;
  /** Overall container opacity */
  opacity?: number;
  /**
   * Briefly show a centered pulsing "tap here" dot over the top card — the
   * classic ping-ring affordance (a solid dot with an expanding, fading ring
   * around it; Tailwind ships the ring's `animate-ping` keyframes by
   * default, this just arranges it as a hint). No text, so it doesn't
   * compete with the card's own content. Disappears on first tap, or after
   * a few seconds regardless. Skipped entirely for prefers-reduced-motion.
   */
  tapHint?: boolean;
  /**
   * Wo der Klick zaehlt. `"container"` ist das alte Verhalten (die ganze
   * Flaeche, auch dort, wo keine Karte liegt), `"card"` legt ihn auf die
   * Karten selbst — sichtbares Ziel, siehe Kopfkommentar.
   */
  hitArea?: "container" | "card";
  /** Wird nach jedem Zug mit dem Index der vorne liegenden Karte gerufen. */
  onIndexChange?: (index: number) => void;
  /** Griff fuer eine aeussere Bedienleiste. */
  controllerRef?: React.RefObject<ClickStackHandle | null>;
  /** Vorgelesen, wenn der Stapel selbst den Fokus bekommt. */
  ariaLabel?: string;
}

const SWATCHES = ["01", "02", "03", "04", "05", "06"];

const BUILTIN_CARDS = SWATCHES.map((id) => (
  <div
    key={id}
    style={{
      background: "#ffffff",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#000000",
      fontSize: 56,
      fontWeight: 700,
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
    }}
  >
    {id}
  </div>
));

const ClickStack: React.FC<ClickStackProps> = ({
  items,
  cardWidth = 250,
  cardHeight = 300,
  spreadX = 20,
  spreadY = -20,
  duration = 0.35,
  ease = "power3.out",
  borderRadius = 24,
  shadowBlur = 30,
  shadowOpacity = 0.3,
  cardColor = "#ffffff",
  visibleCount = 5,
  depthScale = 0.08,
  depthOpacity = 0,
  className,
  cardClassName,
  opacity = 1,
  tapHint = false,
  hitArea = "container",
  onIndexChange,
  controllerRef,
  ariaLabel,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const cards = items ?? BUILTIN_CARDS;
  const total = cards.length;
  const vis = Math.min(visibleCount, total);

  const [showTapHint, setShowTapHint] = useState(false);

  const seq = useRef<number[]>([]);
  const busy = useRef(false);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const cfg = useRef({
    spreadX,
    spreadY,
    depthScale,
    depthOpacity,
    vis,
    duration,
    ease,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // In einem Ref, nicht in der Abhaengigkeitsliste: sonst bekaeme jeder Zug
  // beim kleinsten Rerender der Elternkomponente neue Callback-Identitaeten,
  // und `busy` liefe in einem frisch erzeugten Closure ins Leere.
  const notifyRef = useRef(onIndexChange);
  useEffect(() => {
    notifyRef.current = onIndexChange;
  });

  const notify = useCallback(() => {
    const front = seq.current[0];
    if (front !== undefined) notifyRef.current?.(front);
  }, []);

  // Only starts once the stack has actually scrolled into view — not the
  // instant it mounts, which on this page can be well before the user ever
  // sees it (it's further down than the hero). Fires once, then the hint
  // hides itself again after a few seconds regardless of whether it was
  // tapped.
  useEffect(() => {
    if (!tapHint || prefersReducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    let hideId: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setShowTapHint(true);
        hideId = window.setTimeout(() => setShowTapHint(false), 4200);
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (hideId !== null) window.clearTimeout(hideId);
    };
  }, [tapHint, prefersReducedMotion]);

  useEffect(() => {
    cfg.current = {
      spreadX,
      spreadY,
      depthScale,
      depthOpacity,
      vis,
      duration,
      ease,
    };
  });

  const arrange = useCallback((animate: boolean) => {
    const c = cfg.current;
    seq.current.forEach((itemIdx, rank) => {
      const el = nodes.current[itemIdx];
      if (!el) return;

      if (rank >= c.vis) {
        gsap.set(el, { opacity: 0, visibility: "hidden", zIndex: -1 });
        return;
      }

      const target = {
        x: rank * c.spreadX,
        y: rank * c.spreadY,
        scale: 1 - rank * c.depthScale,
        opacity: Math.max(0, 1 - rank * c.depthOpacity),
        visibility: "visible" as const,
        zIndex: c.vis - rank,
        rotation: 0,
      };

      if (animate) {
        gsap.to(el, { ...target, duration: c.duration, ease: c.ease });
      } else {
        gsap.set(el, target);
      }
    });
  }, []);

  /**
   * Alle Karten auf die Position fahren, die ihr Platz in `seq` vorgibt.
   *
   * Unterschied zu `arrange(true)`: was aus der Sichtbarkeit faellt, wird
   * ausgeblendet statt hart versteckt. Das ist der Unterschied zwischen
   * "eine Karte verschwindet" und "eine Karte ist ploetzlich weg" — und der
   * Grund, warum Zurueck und Direktsprung nicht einfach `arrange` rufen.
   */
  const settle = useCallback((exclude: number | null) => {
    const c = cfg.current;
    seq.current.forEach((idx, rank) => {
      if (idx === exclude) return;
      const el = nodes.current[idx];
      if (!el) return;

      if (rank >= c.vis) {
        gsap.to(el, {
          opacity: 0,
          duration: c.duration * 0.4,
          ease: "power2.in",
          onComplete: () => {
            gsap.set(el, { visibility: "hidden", zIndex: -1 });
          },
        });
        return;
      }

      gsap.to(el, {
        x: rank * c.spreadX,
        y: rank * c.spreadY,
        scale: 1 - rank * c.depthScale,
        opacity: Math.max(0, 1 - rank * c.depthOpacity),
        visibility: "visible",
        zIndex: c.vis - rank,
        rotation: 0,
        duration: c.duration * 0.7,
        ease: "power2.out",
      });
    });
  }, []);

  useEffect(() => {
    seq.current = Array.from({ length: total }, (_, i) => i);
    busy.current = false;
    arrange(false);
    if (containerRef.current) {
      containerRef.current.style.visibility = "visible";
    }
    notify();
  }, [total, arrange, notify]);

  useEffect(() => {
    if (seq.current.length > 0) arrange(false);
  }, [spreadX, spreadY, depthScale, depthOpacity, vis, arrange]);

  useEffect(() => {
    const refs = nodes.current;
    return () => {
      refs.forEach((el) => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, []);

  const cycle = useCallback(() => {
    if (busy.current || total < 2) return;
    busy.current = true;
    setShowTapHint(false);

    const c = cfg.current;
    const frontIdx = seq.current[0] ?? 0;
    const frontEl = nodes.current[frontIdx];

    if (!frontEl) {
      busy.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });

    tl.to(frontEl, {
      scale: 1.04,
      opacity: 0,
      duration: c.duration * 0.55,
      ease: "power2.in",
      onComplete: () => {
        const moved = seq.current.shift()!;
        seq.current.push(moved);

        const c2 = cfg.current;

        gsap.set(nodes.current[moved]!, {
          opacity: 0,
          visibility: "hidden",
          zIndex: -1,
        });

        seq.current.forEach((idx, rank) => {
          if (idx === moved) return;
          const el = nodes.current[idx];
          if (!el) return;

          if (rank >= c2.vis) {
            gsap.set(el, { opacity: 0, visibility: "hidden", zIndex: -1 });
            return;
          }

          gsap.to(el, {
            x: rank * c2.spreadX,
            y: rank * c2.spreadY,
            scale: 1 - rank * c2.depthScale,
            opacity: Math.max(0, 1 - rank * c2.depthOpacity),
            visibility: "visible",
            zIndex: c2.vis - rank,
            duration: c2.duration * 0.65,
            ease: "power2.out",
          });
        });

        const movedRank = seq.current.indexOf(moved);
        const movedEl = nodes.current[moved];

        if (movedRank < c2.vis && movedEl) {
          gsap.set(movedEl, {
            x: movedRank * c2.spreadX,
            y: movedRank * c2.spreadY,
            scale: 1 - movedRank * c2.depthScale,
            opacity: 0,
            visibility: "visible",
            zIndex: c2.vis - movedRank,
          });
          gsap.to(movedEl, {
            opacity: Math.max(0, 1 - movedRank * c2.depthOpacity),
            duration: c2.duration * 0.5,
            delay: c2.duration * 0.2,
            ease: "power1.out",
          });
        }

        notify();
      },
    });
  }, [total, notify]);

  /**
   * Einen Eintrag zurueck: die hinterste Karte kommt nach vorn.
   *
   * Nicht die Umkehrung von `cycle` als Timeline, sondern der kuerzere Weg —
   * die ankommende Karte wird an Rang 0 gesetzt und eingeblendet, alle
   * anderen ruecken eine Stufe nach hinten. Vorwaerts muss die oberste Karte
   * erst weg, bevor man sieht, was darunter liegt; rueckwaerts liegt das
   * Ziel oben auf, sobald es da ist.
   */
  const stepBack = useCallback(() => {
    if (busy.current || total < 2) return;
    busy.current = true;
    setShowTapHint(false);

    const c = cfg.current;
    const moved = seq.current.pop();
    if (moved === undefined) {
      busy.current = false;
      return;
    }
    seq.current.unshift(moved);

    const movedEl = nodes.current[moved];
    if (movedEl) {
      gsap.killTweensOf(movedEl);
      gsap.set(movedEl, {
        x: 0,
        y: 0,
        scale: 1.04,
        opacity: 0,
        rotation: 0,
        visibility: "visible",
        zIndex: c.vis + 1,
      });
      gsap.to(movedEl, {
        scale: 1,
        opacity: 1,
        duration: c.duration * 0.6,
        ease: "power2.out",
      });
    }

    settle(moved);

    gsap.delayedCall(c.duration * 0.7, () => {
      busy.current = false;
      if (movedEl) gsap.set(movedEl, { zIndex: cfg.current.vis });
    });

    notify();
  }, [total, settle, notify]);

  /** Direkt zu einem Eintrag — die Punkte der Bedienleiste haengen hier. */
  const goTo = useCallback(
    (index: number) => {
      if (busy.current || total < 2) return;
      const at = seq.current.indexOf(index);
      if (at <= 0) return; // unbekannt, oder liegt schon vorne
      busy.current = true;
      setShowTapHint(false);

      seq.current = [...seq.current.slice(at), ...seq.current.slice(0, at)];

      const c = cfg.current;
      const movedEl = nodes.current[index];
      if (movedEl) {
        gsap.killTweensOf(movedEl);
        gsap.set(movedEl, {
          x: 0,
          y: 0,
          scale: 1.04,
          opacity: 0,
          rotation: 0,
          visibility: "visible",
          zIndex: c.vis + 1,
        });
        gsap.to(movedEl, {
          scale: 1,
          opacity: 1,
          duration: c.duration * 0.6,
          ease: "power2.out",
        });
      }

      settle(index);

      gsap.delayedCall(c.duration * 0.7, () => {
        busy.current = false;
        if (movedEl) gsap.set(movedEl, { zIndex: cfg.current.vis });
      });

      notify();
    },
    [total, settle, notify]
  );

  useImperativeHandle(
    controllerRef,
    () => ({ next: cycle, prev: stepBack, goTo }),
    [cycle, stepBack, goTo]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        cycle();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        stepBack();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycle();
      }
    },
    [cycle, stepBack]
  );

  const clickOnContainer = hitArea === "container";

  return (
    <div
      ref={containerRef}
      {...(clickOnContainer ? { onClick: cycle } : {})}
      onKeyDown={onKeyDown}
      role="group"
      tabIndex={0}
      aria-label={ariaLabel ?? "Kartenstapel: mit den Pfeiltasten blättern"}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        clickOnContainer && "cursor-pointer",
        className,
      )}
      style={{ opacity, visibility: "hidden" }}
    >
      {cards.map((content, idx) => (
        <div
          key={idx}
          ref={(el) => {
            nodes.current[idx] = el;
          }}
          {...(clickOnContainer ? {} : { onClick: cycle })}
          className={cn("absolute overflow-hidden", !clickOnContainer && "cursor-pointer", cardClassName)}
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius,
            background: cardColor,
            boxShadow: `0 ${Math.round(shadowBlur * 0.15)}px ${Math.round(
              shadowBlur * 0.5,
            )}px rgba(0,0,0,${(shadowOpacity * 0.5).toFixed(
              2,
            )}), 0 ${Math.round(shadowBlur * 0.4)}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
            willChange: "transform, opacity",
            // Siehe Kopfkommentar: die senkrechte Wischgeste gehoert der
            // Seite, der Tap gehoert der Karte.
            touchAction: "pan-y",
          }}
        >
          {content}
        </div>
      ))}

      {showTapHint ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center"
        >
          <span className="relative flex h-7 w-7">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
            <span className="relative inline-flex h-7 w-7 rounded-full bg-white/90 shadow-[0_0_18px_4px_rgba(255,255,255,0.5)]" />
          </span>
        </div>
      ) : null}
    </div>
  );
};

ClickStack.displayName = "ClickStack";

export default ClickStack;
