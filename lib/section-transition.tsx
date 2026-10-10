"use client";

import Preloader from "@/components/preloader";
import { lenisRef } from "@/lib/lenis";
import { navigateWithTransition, triggerPageTransition } from "@/lib/page-transition";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Lenis owns the scroll — window.scrollTo bypasses it and gets animated back.
// Always route hard jumps through Lenis with immediate:true.
function hardScrollTo(top: number): void {
  const lenis = lenisRef.current;
  if (lenis) {
    lenis.scrollTo(top, { immediate: true });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }
}

/** Fixed header height in px (h-20). Subtracted from anchor target's y. */
const HEADER_OFFSET = 80;

/**
 * EIN Uebergang fuer alles (Wunsch des Vorstands, 10.10.2026): derselbe wie
 * bei "Für Mitglieder" — erst blendet die Seite in 0,3 s ins Dunkle, dann
 * laufen die Treppen, und sie bleiben mindestens 0,7 s stehen. Vorher gingen
 * Abschnittssprünge direkt in die Treppen und waren nach ein paar Frames
 * wieder weg; das sah wie ein anderer, hastigerer Effekt aus.
 */
const COVER_FADE_MS = 320;
const MIN_DISPLAY_MS = 700;

function fadeCover(then: () => void): void {
  const cover = document.createElement("div");
  cover.setAttribute("aria-hidden", "true");
  cover.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#030304;opacity:0;pointer-events:none;transition:opacity 0.3s ease-in;";
  document.body.appendChild(cover);
  requestAnimationFrame(() => { cover.style.opacity = "1"; });
  setTimeout(() => {
    then();
    // Die Treppen sind dieselbe Farbe; das Cover darf weg, sobald sie
    // gemalt sind (zwei Frames).
    requestAnimationFrame(() => requestAnimationFrame(() => cover.remove()));
  }, COVER_FADE_MS);
}

interface TransitionApi {
  /** Sprung zu einem Abschnitt auf derselben Seite ("#pricing"). */
  goToSection: (hash: string) => void;
  /**
   * Fuer jeden internen Link: "#abschnitt", "/seite" oder "/seite#abschnitt".
   * Gleiche Seite → Abschnittssprung, andere Seite → Seitenwechsel, beides
   * mit demselben Uebergang.
   */
  navigate: (href: string) => void;
}

const Ctx = createContext<TransitionApi | null>(null);

export function SectionTransitionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);
  const coveredAtRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  // Treppen frühestens nach MIN_DISPLAY_MS wieder öffnen.
  const uncover = useCallback(() => {
    const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - coveredAtRef.current));
    window.setTimeout(() => {
      setLoading(false);
      busyRef.current = false;
    }, wait);
  }, []);

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
        hardScrollTo(0);
      } else {
        const el = document.getElementById(id);
        if (el) {
          const top =
            el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          hardScrollTo(Math.max(0, top));
        }
      }
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;

    // Define the scroll thunk that runs under cover.
    pendingScrollRef.current = () => {
      if (isTop) {
        hardScrollTo(0);
        uncover();
        return;
      }

      const el = document.getElementById(id);
      if (!el) {
        uncover();
        return;
      }

      const targetY =
        el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      hardScrollTo(Math.max(0, targetY));

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
          hardScrollTo(Math.max(0, correction));
          requestAnimationFrame(stabilize);
        } else {
          uncover();
        }
      };
      requestAnimationFrame(stabilize);
    };

    // Erst ins Dunkle blenden, dann die Treppen. onCovered feuert ueber
    // onLoadingStart, sobald sie laufen.
    fadeCover(() => {
      coveredAtRef.current = Date.now();
      setActive(true);
      setLoading(true);
    });
  }, [uncover]);

  const navigate = useCallback(
    (href: string) => {
      const hashAt = href.indexOf("#");
      const path = hashAt === -1 ? href : href.slice(0, hashAt);
      const hash = hashAt === -1 ? "" : href.slice(hashAt);
      if (path === "" || path === pathname) {
        goToSection(hash || "#top");
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      navigateWithTransition(
        (h) => router.push(h),
        href,
        () => flushSync(() => { triggerPageTransition(); }),
      );
    },
    [goToSection, pathname, router],
  );

  return (
    <Ctx.Provider value={{ goToSection, navigate }}>
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

export function useSectionTransition(): TransitionApi {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useSectionTransition must be used within SectionTransitionProvider",
    );
  return ctx;
}
