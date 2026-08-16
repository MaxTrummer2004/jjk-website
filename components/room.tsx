/**
 * Room — everything after the hero/video, on one flat background.
 *
 * ── What this replaced ──────────────────────────────────────────────────────
 * Used to wrap its children in `WallLight`/`LitWall`: a painted wall texture
 * (`wall.webp`) plus a pointer/scroll-driven "candlelight" veil that kept text
 * dark until a light source (mouse, or a scroll-following pool on touch)
 * passed over it. It was a lot of deliberate engineering for a real problem —
 * keeping one continuous painted wall lit consistently across several page
 * sections — but it created two new ones: text wasn't reliably legible
 * (whatever sat outside the current light pool stayed near-black), and the
 * hard cut where the hero/video ends and the textured wall begins was
 * exactly the seam a reader's eye lands on.
 *
 * ── What replaced it ────────────────────────────────────────────────────────
 * Nothing — on purpose. `app/page.tsx` sets one flat dark background
 * (`bg-background-deep`) on `<main>`, covering the hero, the video section,
 * and everything Room wraps, with no image texture and no per-section
 * darkness mask. Since it's the SAME color the whole way down, there is no
 * seam to smooth in the first place. `Room` is kept as a component (instead
 * of removing it and inlining its children in page.tsx) purely so callers
 * don't have to change, and so a `className` can still be passed through.
 */

import type { ReactNode } from "react";

export interface RoomProps {
  children: ReactNode;
  className?: string;
}

export function Room({ children, className = "" }: RoomProps): ReactNode {
  return <div className={className}>{children}</div>;
}

export default Room;
