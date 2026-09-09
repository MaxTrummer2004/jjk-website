"use client";

import Preloader from "@/components/preloader";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Fixed header height in px (h-20). Subtracted from anchor target's y. */
const HEADER_OFFSET = 80;

const Ctx = createContext<{ goToSection: (hash: string) => void } | null>(null);

export function SectionTransitionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  // Holds the scroll+stabilize thunk that runs once the stairs are painted.
  const pendingScrollRef = useRef<(() => void) | null>(null);

  // Called by Preloader's onLoadingStart — stairs are scheduled to appear on
  // the next rAF. Chain 3 frames: frame 1 = preloader sets showPreloader=true,
  // frame 2 = React commits + browser paints stairs, frame 3 = safe to scroll.
  const onCovered = useCallback(() => {
    const fn = pendingScrollRef.current;
    if (!fn) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fn();
          pendingScrollRef.current = null;
        });
      });
    });
  }, []);

  const goToSection = useCallback((hash: string) => {
    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    const isTop = id === "top" || id === "";

    // prefers-reduced-motion: direct jump, no cover animation.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (isTop) {
        window.scrollTo({ top: 0, behavior: "auto" });
      } else {
        const el = document.getElementById(id);
        if (el) {
          const top =
            el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        }
      }
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;

    // Define the scroll thunk that runs under cover.
    pendingScrollRef.current = () => {
      if (isTop) {
        window.scrollTo({ top: 0, behavior: "auto" });
        setLoading(false);
        busyRef.current = false;
        return;
      }

      const el = document.getElementById(id);
      if (!el) {
        setLoading(false);
        busyRef.current = false;
        return;
      }

      const targetY =
        el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "auto" });

      // rAF stabilization: video-showcase switches pinPosition (fixed↔absolute)
      // the same frame as a hard scroll, which shifts layout height and lands
      // the scroll at the wrong offset. Re-measure and correct silently under
      // the cover for up to 3 frames, then uncover regardless.
      // Note: no explicit video pause needed — VideoShowcase's own
      // scrollProgress listener re-evaluates play/pause after the jump.
      let attempts = 0;
      const stabilize = (): void => {
        attempts++;
        const drift = Math.abs(el.getBoundingClientRect().top - HEADER_OFFSET);
        if (drift > 2 && attempts <= 3) {
          const correction =
            el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          window.scrollTo({ top: Math.max(0, correction), behavior: "auto" });
          requestAnimationFrame(stabilize);
        } else {
          setLoading(false);
          busyRef.current = false;
        }
      };
      requestAnimationFrame(stabilize);
    };

    // Activate preloader — onCovered fires via onLoadingStart once loading starts.
    setActive(true);
    setLoading(true);
  }, []);

  return (
    <Ctx.Provider value={{ goToSection }}>
      {children}
      {active && (
        <Preloader
          loading={loading}
          variant="stairs"
          position="fixed"
          bgColor="#030304"
          stairCount={7}
          stairsRevealFrom="left"
          stairsRevealDirection="up"
          loadingText=""
          zIndex={200}
          onLoadingStart={onCovered}
          onLoadingComplete={() => setActive(false)}
        />
      )}
    </Ctx.Provider>
  );
}

export function useSectionTransition(): { goToSection: (hash: string) => void } {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useSectionTransition must be used within SectionTransitionProvider",
    );
  return ctx;
}
