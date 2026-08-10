"use client";

/**
 * Ink-transition — Tusche-Seitenuebergang im App-Router.
 *
 * Ablauf: Klick -> progress 0->1 (Tusche deckt zu) -> router.push(href) ->
 * WARTEN, bis die neue Seite wirklich da ist -> progress 1->0.
 *
 * ── Warum gewartet wird und nicht einfach weitergezaehlt ────────────────────
 * `router.push` kehrt sofort zurueck; die Route ist damit angestossen, nicht
 * fertig. Wer direkt danach die Deckung zurueckfaehrt, deckt eine Seite auf,
 * die es noch nicht gibt — und zeigt in dieser Luecke die ALTE. Beim
 * Entwicklungsserver, der die Route erst uebersetzt, dauert das lange genug,
 * dass man es sieht: die Adresszeile steht schon auf der neuen Seite,
 * darunter liegt noch die alte.
 *
 * Deshalb ist der Wendepunkt nicht die Zeit, sondern ein Ereignis:
 * `usePathname()` meldet den Wechsel, und erst dann laeuft die Tusche zurueck.
 * Damit ein haengender Uebergang niemals die Seite blockiert, gibt es
 * zusaetzlich eine Notbremse — nach FALLBACK_MS wird so oder so aufgedeckt.
 *
 * WebGL fehlt oder Kontext verloren -> setWebGLAvailable(false), dann wird
 * sofort navigiert. prefers-reduced-motion ebenso.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "@/lib/motion";

/** Wie lange das Zudecken und das Aufdecken jeweils laufen. */
const DURATION_MS = 700;

/** Notbremse: laenger als das bleibt nie zugedeckt, egal was die Route macht. */
const FALLBACK_MS = 4000;

interface InkTransitionCtx {
  progress: number;
  startTransition: (href: string) => void;
  setWebGLAvailable: (v: boolean) => void;
}

const InkCtx = createContext<InkTransitionCtx>({
  progress: 0,
  startTransition: () => undefined,
  setWebGLAvailable: () => undefined,
});

export function useInkTransition(): InkTransitionCtx {
  return useContext(InkCtx);
}

export function InkTransitionProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);

  const webglOk = useRef(true);
  const phase = useRef<"idle" | "covering" | "waiting" | "revealing">("idle");
  const rafId = useRef(0);
  const timerId = useRef(0);
  const t0 = useRef(0);
  const pendingHref = useRef("");

  const setWebGLAvailable = useCallback((v: boolean) => {
    webglOk.current = v;
  }, []);

  /** Startet das Aufdecken. Wird von zwei Seiten gerufen: vom Routenwechsel
   *  und von der Notbremse — deshalb ist der Zustandswechsel hier drin und
   *  nicht bei den Aufrufern. */
  const reveal = useCallback(() => {
    if (phase.current !== "waiting") return;
    window.clearTimeout(timerId.current);
    phase.current = "revealing";
    t0.current = performance.now();
    rafId.current = requestAnimationFrame(function step() {
      const p = Math.min((performance.now() - t0.current) / DURATION_MS, 1);
      setProgress(1 - p);
      if (p < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        setProgress(0);
        phase.current = "idle";
      }
    });
  }, []);

  const tick = useCallback(() => {
    if (phase.current !== "covering") return;
    const p = Math.min((performance.now() - t0.current) / DURATION_MS, 1);
    setProgress(p);
    if (p < 1) {
      rafId.current = requestAnimationFrame(tick);
      return;
    }
    setProgress(1);
    phase.current = "waiting";
    router.push(pendingHref.current);
    // Falls der Routenwechsel nie ankommt: nach FALLBACK_MS trotzdem
    // aufdecken. Eine zugedeckte Seite, die zugedeckt bleibt, ist ein
    // kaputter Bildschirm — das darf ein Effekt nie verursachen.
    timerId.current = window.setTimeout(reveal, FALLBACK_MS);
  }, [reveal, router]);

  /** Der Wendepunkt: die Adresse hat sich geaendert, die neue Seite ist da. */
  useEffect(() => {
    if (phase.current !== "waiting") return;
    if (pathname !== pendingHref.current) return;
    // Ein Bild Luft, damit der erste Frame der neuen Seite wirklich steht,
    // bevor die Tusche ihn freigibt.
    const id = requestAnimationFrame(() => requestAnimationFrame(reveal));
    return () => cancelAnimationFrame(id);
  }, [pathname, reveal]);

  const startTransition = useCallback(
    (href: string) => {
      if (reduced || !webglOk.current) {
        router.push(href);
        return;
      }
      if (phase.current !== "idle") return;
      if (href === pathname) return;

      cancelAnimationFrame(rafId.current);
      pendingHref.current = href;
      phase.current = "covering";
      t0.current = performance.now();
      rafId.current = requestAnimationFrame(tick);
    },
    [pathname, reduced, router, tick],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(rafId.current);
      window.clearTimeout(timerId.current);
    },
    [],
  );

  return (
    <InkCtx.Provider value={{ progress, startTransition, setWebGLAvailable }}>
      {children}
    </InkCtx.Provider>
  );
}
