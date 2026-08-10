"use client";

import dynamic from "next/dynamic";
import { SmoothScroll } from "@/components/smooth-scroll";
import CustomCursor from "@/components/custom-cursor";
import { ReducedMotionProvider, useReducedMotion } from "@/lib/motion";
import {
  isOpeningDone,
  isOpeningDoneOnServer,
  subscribeOpening,
} from "@/lib/opening";
import { OverlayProvider } from "@/lib/overlay-context";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The ember plume, loaded late and on purpose.
 *
 * It is a three.js scene with a bloom composer behind it, and a static import
 * put all of that — about 460 KB of JavaScript, a second WebGL context, and a
 * particle system's first frame — into the same instant as the page's own
 * first paint. Measured on the built app, three.js is in the initial chunks and
 * every plate of the opening is requested at 43 ms, so the browser was being
 * asked to parse half a megabyte of renderer, bring up two GL contexts and
 * decode twenty-nine megapixels at once. That is what the opening was hanging
 * on.
 *
 * `dynamic` means the chunk is not even FETCHED until this renders, and it does
 * not render until the camera has landed. Nothing is lost: the plume follows
 * the pointer, and during a six-second camera move there is nothing for a
 * pointer to do.
 */
const EmberSmoke = dynamic(() => import("@/components/ember-smoke"), { ssr: false });

function EmberLayer({ active }: { active: boolean }): ReactNode {
  const reduced = useReducedMotion();
  const opened = useOpeningDone();
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    if (!opened) return;
    // Under reduced motion there is no fly-in to stay out of the way of — and
    // EmberSmoke draws nothing anyway, so this only exists to keep the import
    // off the first paint.
    // Measured from the moment the opening ends, not from page load: the
    // opening is clicked through now, so it has no fixed length. Short, because
    // the ring cursor has just handed the pointer over and a gap between the two
    // is a moment with no pointer feedback at all.
    const delay = reduced ? 400 : 300;
    const t = window.setTimeout(() => setAwake(true), delay);
    return () => window.clearTimeout(t);
  }, [reduced, opened]);

  if (!awake) return null;
  return <EmberSmoke zIndex={40} active={active} radius={0.2} alpha={1} />;
}

/**
 * True once the given element has scrolled into the upper part of the viewport,
 * false again when you scroll back above it. Used to hold the custom cursor
 * back until the reader is past the title card.
 */
function useScrolledPast(selector: string, triggerRatio = 0.55): boolean {
  const [past, setPast] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const check = (): void => {
      frame.current = null;
      const el = document.querySelector(selector);
      if (!el) return;
      setPast(el.getBoundingClientRect().top <= window.innerHeight * triggerRatio);
    };
    const onScroll = (): void => {
      if (frame.current === null) frame.current = requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [selector, triggerRatio]);

  return past;
}

/** Whether the title card's opening has finished — see lib/opening.ts. */
function useOpeningDone(): boolean {
  return useSyncExternalStore(subscribeOpening, isOpeningDone, isOpeningDoneOnServer);
}

const FINE_POINTER = "(pointer: fine)";

function subscribeFinePointer(cb: () => void): () => void {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** React Bits custom cursor — morphs around key elements and reveals images on hover. */
function DesktopCursor({ show }: { show: boolean }): ReactNode {
  // Through the store rather than through an effect. A `setState` in a mount
  // effect is a second render for something that was knowable on the first, and
  // it is what `useSyncExternalStore` exists for — same shape as
  // `useReducedMotion` in lib/motion.tsx.
  const enabled = useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false
  );

  if (!enabled || !show) return null;
  return (
    <CustomCursor
      circleSize={34}
      dotSize={5}
      circleColor="rgba(255,47,54,0.9)"
      dotColor="rgba(255,177,74,0.95)"
      circleBorderWidth={2}
      circleStiffness={400}
      circleDamping={30}
      targetPadding={8}
      mixBlendMode="normal"
      /* Ein Selektor. Alles, was der Ring fassen soll, meldet sich dort an,
         wo es steht — `data-cursor` am Element —, statt hier als id in einer
         Liste zu stehen, die niemand aktuell haelt. Die Liste war auf dreissig
         Eintraege gewachsen, zwei davon zeigten auf nichts mehr, und die sechs
         Programm-Boards standen gar nicht drin.

         Ein Ziel, das beim Ueberfahren ein Bild zeigen soll, traegt es selbst
         als `data-cursor-image`. Das war vorher ein positionsgleiches Array
         hier unten, und es war zweimal verrutscht: der Schluss-Knopf zeigte ein
         Video-Standbild, das mit ihm nichts zu tun hatte. */
      targets={["[data-cursor]"]}
      /* Liegt die Hand zwei Sekunden still, verschwindet der Ring. Er
         zeigt an, wo der Zeiger ist; wenn sich nichts bewegt, gibt es dazu
         nichts anzuzeigen, und ein leuchtender Ring auf einer dunklen Flaeche
         ist dann nur noch ein Gegenstand im Bild. Bei der ersten Bewegung ist
         er sofort wieder da. */
      idleHideMs={2000}
    />
  );
}

/**
 * The site is dark-only, so there is no ThemeProvider any more — `dark` is set
 * statically on <html> in the layout. Dropping next-themes also removes the
 * first-paint flash it used to cause.
 */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  // The two pointer effects hand over at the Programs section: ember smoke owns
  // the title card and everything above Programs, the cursor ring owns
  // everything below. They never run at the same time.
  const pastPrograms = useScrolledPast("#programs");

  return (
    <ReducedMotionProvider>
      <OverlayProvider>
        {/* The ring owns the pointer in two places and they do not overlap:
            while the opening is running, where hovering the reticle turns it
            into that reticle, and everywhere below Programs. In between — the
            title card standing still — the ember plume has it. */}
        <DesktopCursor show={pastPrograms} />
        {/* The one WebGL layer on the site — see components/ember-smoke.tsx.
            Stays mounted when inactive so the GL context survives the handover. */}
        {/* One setting for the whole stretch above Programs, where there used to
            be two. The wall sections ran it wide and at a tenth opacity, on the
            reasoning that the plume was the light you read by and anything
            stronger would put bright smoke over the words it was uncovering.
            That reasoning is gone: the figures painted on the wall do the
            lighting now, so the plume goes back to being what it is in the hero
            — a small, bright trail of embers behind the pointer. */}
        <EmberLayer active={!pastPrograms} />
        <SmoothScroll>{children}</SmoothScroll>
      </OverlayProvider>
    </ReducedMotionProvider>
  );
}
