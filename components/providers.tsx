"use client";

import { SmoothScroll } from "@/components/smooth-scroll";
import { ReducedMotionProvider } from "@/lib/motion";
import { OverlayProvider } from "@/lib/overlay-context";
import CustomCursor from "@/components/custom-cursor";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ReducedMotionProvider>
      <OverlayProvider>
        <SmoothScroll>{children}</SmoothScroll>
        <CustomCursor />
      </OverlayProvider>
    </ReducedMotionProvider>
  );
}
