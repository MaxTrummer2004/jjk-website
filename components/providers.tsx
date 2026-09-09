"use client";

import { SmoothScroll } from "@/components/smooth-scroll";
import { ReducedMotionProvider } from "@/lib/motion";
import { OverlayProvider } from "@/lib/overlay-context";
import { SectionTransitionProvider } from "@/lib/section-transition";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ReducedMotionProvider>
      <OverlayProvider>
        <SectionTransitionProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </SectionTransitionProvider>
      </OverlayProvider>
    </ReducedMotionProvider>
  );
}
