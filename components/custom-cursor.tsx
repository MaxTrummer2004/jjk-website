"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useVelocity,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * CustomCursor - An interactive cursor component with smooth animations and target morphing.
 *
 * Features:
 * - Smooth spring-based cursor following
 * - Optional elastic stretch effect
 * - Morphs to wrap around target elements
 * - Optional image reveal on target hover
 * - Auto-detects target shapes (circle vs rounded rectangle)
 *
 * @example
 * ```tsx
 *
 * <CustomCursor />
 *
 *
 * <CustomCursor
 *   targets={["#button-1", ".card"]}
 *   targetPadding={10}
 * />
 *
 *
 * <CustomCursor
 *   targets={["#hero-button", "#profile-card"]}
 *   images={[
 *     "https://example.com/hero.jpg",
 *     "https://example.com/profile.jpg"
 *   ]}
 * />
 *
 *
 * <CustomCursor
 *   targets={["#with-image", "#no-image", "#another-no-image"]}
 *   images={[
 *     "https://example.com/image.jpg",
 *     undefined,
 *     undefined
 *   ]}
 *   targetPadding={8}
 * />
 * ```
 */
export interface CustomCursorProps {
  /**
   * Nach wie vielen Millisekunden ohne Mausbewegung der Zeiger verschwindet.
   * 0 schaltet das ab.
   *
   * Der Ring ist eine Anzeige dafuer, wo die Hand gerade ist. Liegt die Hand
   * still, zeigt er nichts mehr an und ist nur noch ein Objekt, das im Bild
   * steht — besonders auf einer Seite, die aus dunklen Flaechen besteht.
   * Sobald sich die Maus wieder bewegt, ist er sofort zurueck.
   */
  idleHideMs?: number;
  /** Size of the outer circle in pixels */
  circleSize?: number;

  /** Size of the inner dot in pixels */
  dotSize?: number;

  /** Color of the outer circle (any valid CSS color) */
  circleColor?: string;

  /** Color of the inner dot (any valid CSS color) */
  dotColor?: string;

  /** Spring stiffness for the outer circle (higher = faster) */
  circleStiffness?: number;

  /** Spring damping for the outer circle (higher = less bounce) */
  circleDamping?: number;

  /** Spring stiffness for the inner dot (higher = faster) */
  dotStiffness?: number;

  /** Spring damping for the inner dot (higher = less bounce) */
  dotDamping?: number;

  /** Border width of the outer circle in pixels */
  circleBorderWidth?: number;

  /** Additional class name for the container */
  className?: string;

  /** Additional class name for the circle */
  circleClassName?: string;

  /** Additional class name for the dot */
  dotClassName?: string;

  /** Whether to show the cursor on touch devices */
  showOnTouch?: boolean;

  /** Z-index of the cursor */
  zIndex?: number;

  /** Enable subtle elastic stretch in direction of movement */
  elastic?: boolean;

  /** CSS selectors for target elements to trigger effects on hover */
  targets?: string[];

  /** Image URLs corresponding to each target (optional - targets without images will still morph the cursor) */
  images?: (string | undefined)[];

  /** Scale amount for images when hovering targets (0-1) */
  imageScale?: number;

  /** Duration of image scale animation in seconds */
  imageAnimationDuration?: number;

  /** Additional class name for the image elements */
  imageClassName?: string;

  /** Padding between cursor and target in pixels */
  targetPadding?: number;

  /** Mix blend mode for the cursor elements */
  mixBlendMode?: React.CSSProperties["mixBlendMode"];

  /** Custom content to render inside the cursor */
  children?: React.ReactNode;
}

const CustomCursor: React.FC<CustomCursorProps> = ({
  idleHideMs = 0,
  circleSize = 40,
  dotSize = 6,
  circleColor = "rgb(0, 0, 0)",
  dotColor = "rgb(0, 0, 0)",
  circleStiffness = 150,
  circleDamping = 20,
  dotStiffness = 300,
  dotDamping = 30,
  circleBorderWidth = 2,
  className,
  circleClassName,
  dotClassName,
  showOnTouch = false,
  zIndex = 9999,
  elastic = false,
  targets = [],
  images = [],
  imageScale = 0.9,
  imageAnimationDuration = 0.6,
  imageClassName,
  targetPadding = 0,
  mixBlendMode,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoveredTargets, setHoveredTargets] = useState<Set<number>>(new Set());
  const [targetRects, setTargetRects] = useState<Map<number, DOMRect>>(
    new Map(),
  );
  const [activeTarget, setActiveTarget] = useState<number | null>(null);
  /**
   * Die aufgeloesten Ziele — als ELEMENTE, nicht als Selektor-Strings.
   *
   * Vorher hielt die Komponente eine Liste von Selektoren und nahm zu jedem
   * GENAU EIN Element, mit einem positionsgleichen `images`-Array daneben. Jede
   * neue anklickbare Sache auf der Seite hiess: eine neue id, eine neue Zeile in
   * der Liste und ein neues `undefined` an exakt der richtigen Stelle im
   * Bild-Array. Bei dreissig Eintraegen waren zwei verrutscht und eine ganze
   * Sektion hatte gar keine Ziele.
   *
   * Jetzt darf ein Selektor beliebig viele Elemente treffen, die Seite meldet
   * sich mit `data-cursor` dort an, wo die Sache steht, und wer ein Bild will,
   * traegt es als `data-cursor-image` selbst — statt dazu abgezaehlt zu werden.
   */
  const [elements, setElements] = useState<HTMLElement[]>([]);

  // 0 on both server and the client's first render pass — window.innerWidth
  // read directly here would differ between the two (server always sees
  // `undefined`), which is exactly the hydration-mismatch pattern Next.js
  // warns about. Set to the real center only after mount, client-only.
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  const circleWidthMV = useMotionValue(circleSize);
  const circleHeightMV = useMotionValue(circleSize);
  const circleBorderRadiusMV = useMotionValue(circleSize / 2);
  const circleXMV = useMotionValue(0);
  const circleYMV = useMotionValue(0);

  useEffect(() => {
    cursorX.set(window.innerWidth / 2);
    cursorY.set(window.innerHeight / 2);
    circleXMV.set(window.innerWidth / 2);
    circleYMV.set(window.innerHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const springConfig = {
    stiffness: 350,
    damping: 30,
    mass: 0.5,
  };

  const circleWidth = useSpring(circleWidthMV, springConfig);
  const circleHeight = useSpring(circleHeightMV, springConfig);
  const circleBorderRadius = useSpring(circleBorderRadiusMV, springConfig);
  const circleXSpring = useSpring(circleXMV, springConfig);
  const circleYSpring = useSpring(circleYMV, springConfig);

  const cursorFollowX = useSpring(cursorX, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.5,
  });
  const cursorFollowY = useSpring(cursorY, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.5,
  });

  const dotX = useSpring(cursorX, {
    stiffness: dotStiffness,
    damping: dotDamping,
    mass: 0.2,
  });
  const dotY = useSpring(cursorY, {
    stiffness: dotStiffness,
    damping: dotDamping,
    mass: 0.2,
  });

  const velocityX = useVelocity(cursorX);
  const velocityY = useVelocity(cursorY);

  const scaleX = useTransform(velocityX, [-1000, 0, 1000], [0.85, 1, 1.15]);
  const scaleY = useTransform(velocityY, [-1000, 0, 1000], [0.85, 1, 1.15]);

  const currentTargetData = useMemo(() => {
    if (activeTarget === null) return null;

    const rect = targetRects.get(activeTarget);
    const element = elements[activeTarget];

    if (!rect || !element) return null;

    // `|| 16` was here, and it is the reason a square target was never framed
    // square. `parseFloat("0px")` is 0, 0 is falsy, so every element with no
    // radius at all — which is every button on this site — was given a 16px
    // one and the ring closed round it with soft corners. The fallback is only
    // meant for the case where the computed value cannot be parsed (`50%`, a
    // multi-value shorthand), so that is the only case it should fire in.
    const parsedRadius = parseFloat(window.getComputedStyle(element).borderRadius);
    const borderRadiusValue = Number.isFinite(parsedRadius) ? parsedRadius : 16;

    return { rect, borderRadiusValue, element };
  }, [activeTarget, targetRects, elements]);

  /**
   * True while locked onto a target that wants to be a SEAL rather than a ring.
   * Read off the element rather than passed in as a prop: the target list is a
   * flat array of selectors and only one of them wants this.
   *
   * It used to be corner brackets. The opening dropped them — see the note on
   * the ensō in app/globals.css — and what the pointer becomes over the answer
   * is now the same hanko the search pressed onto the map, one held by the
   * reader instead.
   */
  const sealMode =
    currentTargetData?.element?.hasAttribute("data-cursor-seal") ?? false;

  const isCircle = useMemo(() => {
    if (!currentTargetData) return false;
    const { rect, borderRadiusValue } = currentTargetData;
    return (
      Math.abs(rect.width - rect.height) < 1 &&
      borderRadiusValue >= rect.width / 2 - 1
    );
  }, [currentTargetData]);

  // `undefined` on the branch that has nothing to clean up, explicitly. The
  // other branch subscribes two motion values and must unsubscribe them, and an
  // effect that returns a function on one path and falls off the end on another
  // is the shape React cannot tell apart from a forgotten cleanup.
  useEffect(() => {
    if (activeTarget !== null && currentTargetData) {
      const { rect, borderRadiusValue } = currentTargetData;

      // No padding in seal mode. The padding exists so the ring FRAMES what it
      // has locked onto, standing off it by a margin; the seal is not framing
      // the target, it is replacing it, and a shape that becomes another shape
      // has to be the same size or the two read as two.
      const pad = sealMode ? 0 : targetPadding;
      const newWidth = rect.width + pad * 2;
      const newHeight = rect.height + pad * 2;

      circleWidthMV.set(newWidth);
      circleHeightMV.set(newHeight);

      if (isCircle) {
        circleBorderRadiusMV.set(newWidth / 2);
      } else {
        // A rounded rectangle offset outwards by `pad` gains `pad` of radius —
        // that is just the geometry. A SQUARE one offset outwards is still a
        // square, so a target with no radius has to get none, or every button
        // on this site ends up framed with soft corners it does not have.
        circleBorderRadiusMV.set(borderRadiusValue > 0 ? borderRadiusValue + pad : 0);
      }

      circleXMV.set(rect.left + rect.width / 2);
      circleYMV.set(rect.top + rect.height / 2);
      return undefined;
    }
    if (activeTarget === null) {
      circleWidthMV.set(circleSize);
      circleHeightMV.set(circleSize);
      circleBorderRadiusMV.set(circleSize / 2);

      const unsubX = cursorFollowX.on("change", (v) => circleXMV.set(v));
      const unsubY = cursorFollowY.on("change", (v) => circleYMV.set(v));

      return () => {
        unsubX();
        unsubY();
      };
    }
    return undefined;
  }, [
    activeTarget,
    currentTargetData,
    circleSize,
    circleWidthMV,
    circleHeightMV,
    circleBorderRadiusMV,
    circleXMV,
    circleYMV,
    cursorFollowX,
    cursorFollowY,
    targetPadding,
    sealMode,
    isCircle,
  ]);

  const updateTargetRects = useCallback(() => {
    const newRects = new Map<number, DOMRect>();
    elements.forEach((element, index) => {
      newRects.set(index, element.getBoundingClientRect());
    });
    setTargetRects(newRects);
  }, [elements]);

  // ── Die Ziele einsammeln ─────────────────────────────────────────────────
  // `querySelectorAll` statt `querySelector`, und das ist die ganze Aenderung.
  const selectorKey = targets.join("|");
  useEffect(() => {
    if (!selectorKey) return;

    const resolve = (): void => {
      const found: HTMLElement[] = [];
      for (const selector of selectorKey.split("|")) {
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          if (!found.includes(el)) found.push(el);
        });
      }
      // Gleiche Menge, gleiche Reihenfolge: dann nichts setzen. Sonst haengt
      // jeder Beobachtungslauf eine neue Array-Identitaet an `elements`, und
      // alles, was davon abhaengt, laeuft neu — zehnmal pro Sekunde.
      setElements((prev) =>
        prev.length === found.length && prev.every((el, i) => el === found[i])
          ? prev
          : found,
      );
    };

    resolve();

    // Die Sektionen kommen nach und nach in den Baum, die Menge steht beim
    // Mounten also nicht fest. Entprellt, weil ein MutationObserver auf dem
    // ganzen Body bei diesen Bibliotheken in jedem Frame etwas zu melden hat.
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(resolve, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [selectorKey]);

  useEffect(() => {
    if (elements.length === 0) return;
    const frame = requestAnimationFrame(updateTargetRects);
    return () => cancelAnimationFrame(frame);
  }, [elements, updateTargetRects]);

  useEffect(() => {
    if (elements.length === 0) return;

    const cleanups: (() => void)[] = [];
    elements.forEach((element, index) => {
      const enter = (): void => {
        setHoveredTargets((prev) => new Set(prev).add(index));
        updateTargetRects();
        setActiveTarget(index);
      };
      const leave = (): void => {
        setHoveredTargets((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        // Nur loeschen, wenn dieses Ziel auch das aktive ist. Ziele duerfen
        // ineinander liegen — ein Knopf in einem Kasten —, und das Verlassen des
        // aeusseren darf den inneren nicht mitnehmen.
        setActiveTarget((current) => (current === index ? null : current));
      };
      element.addEventListener("mouseenter", enter);
      element.addEventListener("mouseleave", leave);
      cleanups.push(() => {
        element.removeEventListener("mouseenter", enter);
        element.removeEventListener("mouseleave", leave);
      });
    });

    window.addEventListener("scroll", updateTargetRects, true);
    window.addEventListener("resize", updateTargetRects);

    return () => {
      cleanups.forEach((c) => c());
      window.removeEventListener("scroll", updateTargetRects, true);
      window.removeEventListener("resize", updateTargetRects);
    };
  }, [elements, updateTargetRects]);

  useEffect(() => {
    if (!targets || targets.length === 0) return;

    const handleMouseEnter = (index: number) => () => {
      setHoveredTargets((prev) => new Set(prev).add(index));
      updateTargetRects();
      setActiveTarget(index);
    };

    const handleMouseLeave = (index: number) => () => {
      setHoveredTargets((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      setActiveTarget(null);
    };

    const cleanupFunctions: (() => void)[] = [];

    const attachListeners = () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;

      targets.forEach((selector, index) => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          const enterHandler = handleMouseEnter(index);
          const leaveHandler = handleMouseLeave(index);

          element.addEventListener("mouseenter", enterHandler);
          element.addEventListener("mouseleave", leaveHandler);

          cleanupFunctions.push(() => {
            element.removeEventListener("mouseenter", enterHandler);
            element.removeEventListener("mouseleave", leaveHandler);
          });
        }
      });
    };

    attachListeners();

    let debounceTimer: NodeJS.Timeout;
    const debouncedAttach = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        attachListeners();
        updateTargetRects();
      }, 200);
    };

    const observer = new MutationObserver(() => {
      debouncedAttach();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("scroll", updateTargetRects, true);
    window.addEventListener("resize", updateTargetRects);

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
      cleanupFunctions.forEach((cleanup) => cleanup());
      window.removeEventListener("scroll", updateTargetRects, true);
      window.removeEventListener("resize", updateTargetRects);
    };
  }, [targets, updateTargetRects]);

  // ── Ruhe ────────────────────────────────────────────────────────────────
  // Ein eigener Effekt und nicht in handleMouseMove hinein: der Effekt dort
  // haengt an `isVisible` und wird bei jedem Wechsel neu aufgesetzt, was den
  // Zeitgeber jedes Mal mit abraeumen wuerde. Hier haengt nichts daran ausser
  // der Zahl selbst.
  const idleTimer = useRef<number>(0);
  useEffect(() => {
    if (idleHideMs <= 0) return;
    const onMove = (): void => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(
        () => setIsVisible(false),
        idleHideMs,
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.clearTimeout(idleTimer.current);
    };
  }, [idleHideMs]);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as Navigator & { msMaxTouchPoints?: number })
          .msMaxTouchPoints !== undefined &&
          (navigator as Navigator & { msMaxTouchPoints?: number })
            .msMaxTouchPoints! > 0);
      setIsTouchDevice(hasTouch);
    };

    checkTouch();

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      if (!isVisible) {
        setIsVisible(true);
      }
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    if (!isTouchDevice || showOnTouch) {
      window.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseenter", handleMouseEnter);
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [cursorX, cursorY, isVisible, isTouchDevice, showOnTouch]);

  if (isTouchDevice && !showOnTouch) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none fixed inset-0", className)}
      style={{ zIndex }}
    >
      {/* Outer Circle */}
      {/* …or a seal, when the target it has locked onto asks for one with
          `data-cursor-seal`. The ring morphs to a target's box either way; this
          only changes what is drawn on that box, from a closed outline to a
          stamp. The opening's answer uses it: the search has just pressed its
          own seal onto the map, and the thing the reader is holding over the
          click is the counterpart. `.jjk-cursor-seal` is in app/globals.css and
          shares the seal's bitten edge with it through --seal-edge. */}
      <motion.div
        className={cn(
          "absolute flex items-center justify-center",
          sealMode && "jjk-cursor-seal",
          circleClassName,
        )}
        style={{
          width: circleWidth,
          height: circleHeight,
          borderRadius: sealMode ? 0 : circleBorderRadius,
          left: circleXSpring,
          top: circleYSpring,
          x: "-50%",
          y: "-50%",
          border: sealMode ? "none" : `${circleBorderWidth}px solid ${circleColor}`,
          opacity: isVisible ? 1 : 0,
          scaleX: elastic && activeTarget === null ? scaleX : 1,
          scaleY: elastic && activeTarget === null ? scaleY : 1,
          mixBlendMode: mixBlendMode,
          willChange: "transform, width, height, border-radius",
        }}
      >
        {children}
      </motion.div>

      {/* Inner Dot */}
      <motion.div
        className={cn("absolute rounded-full", dotClassName)}
        animate={
          activeTarget !== null
            ? {
                opacity: 0,
                scale: 0,
              }
            : {
                opacity: isVisible ? 1 : 0,
                scale: 1,
              }
        }
        transition={{
          duration: 0.15,
        }}
        style={{
          width: dotSize,
          height: dotSize,
          left: dotX,
          top: dotY,
          x: "-50%",
          y: "-50%",
          backgroundColor: dotColor,
          mixBlendMode: mixBlendMode,
          willChange: "transform, opacity",
        }}
      />

      {/* Target image overlays */}
      {elements.map((element, index) => {
        const isHovered = hoveredTargets.has(index);
        // Das Bild steht am Element. Ein Ziel ohne `data-cursor-image` bekommt
        // keins — der Ring rahmt dann einfach, was er gefasst hat, und genau
        // das ist bei einem Knopf richtig.
        const imageUrl = element.dataset.cursorImage ?? images?.[index];
        const rect = targetRects.get(index);

        if (!isHovered || !rect || !imageUrl) return null;

        const targetBorderRadius = window.getComputedStyle(element).borderRadius;
        const borderRadiusValue = parseFloat(targetBorderRadius) || 0;
        const isTargetCircle =
          Math.abs(rect.width - rect.height) < 1 &&
          borderRadiusValue >= rect.width / 2 - 1;

        const newWidth = rect.width + targetPadding * 2;
        const cursorBorderRadius = isTargetCircle
          ? newWidth / 2
          : borderRadiusValue + targetPadding;

        const imageBorderRadius = isTargetCircle
          ? (rect.width / 2) * imageScale
          : borderRadiusValue * imageScale;

        return (
          <AnimatePresence key={index}>
            {isHovered && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: imageScale, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  duration: imageAnimationDuration,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: "fixed",
                  left: rect.left + rect.width / 2,
                  top: rect.top + rect.height / 2,
                  width: rect.width,
                  height: rect.height,
                  x: "-50%",
                  y: "-50%",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                  borderRadius: `${cursorBorderRadius}px`,
                }}
              >
                <div
                  className={cn(
                    "w-full h-full bg-center bg-cover",
                    imageClassName,
                  )}
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    borderRadius: `${imageBorderRadius}px`,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
};

export default CustomCursor;
