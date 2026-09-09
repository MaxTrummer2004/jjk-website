"use client";

import { useEffect, useState } from "react";

/** True once the viewport is at least 768 px wide (Tailwind `md` breakpoint).
 *  Starts false on both server and first client render so hydration is
 *  consistent — updates after mount via matchMedia. */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent): void => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}
