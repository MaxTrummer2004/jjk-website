"use client";

/**
 * Room — the same room, further from the candle.
 *
 * ── What it is for ──────────────────────────────────────────────────────────
 * Everything above this is a place: Graz from four kilometres up, then a dark
 * room with a painted wall that you carry a light across. Everything below it
 * used to be a different website — eight stock template sections on flat
 * `bg-background`, not one of them carrying a single class from the rest of the
 * page. This is the piece that puts them in the same building.
 *
 * ── Why it is four lines ────────────────────────────────────────────────────
 * Because the first version was not, and that was the mistake. It painted its
 * own copy of the wall at its own brightness with its own glow opacity, and
 * every one of those numbers was a guess at what the sections above were
 * already doing. The result was a wall that was recognisably the same painting
 * at a visibly different exposure, with a hard line across the screen where one
 * became the other.
 *
 * So it is not a second lighting rig. It is the SAME one with the reveal
 * already over: `WallLight lit` pins `--unlit` to 0, which is the state the
 * sections above reach when the figures catch, and skips the pointer loop,
 * because `--torch` is `--lit × --unlit` and a pool multiplied by zero is not
 * worth tracking a pointer for. Every layer, every value, one implementation.
 * Two rigs that are meant to match will drift, and the seam between them is
 * precisely where the reader is looking.
 *
 * ── Why the torch does not come with it ─────────────────────────────────────
 * It stops being useful and starts being an obstacle. A pointer-held pool is
 * exactly right for four photographs and a paragraph; it is hopeless for a
 * six-column timetable or a price comparison, where reading the section becomes
 * a search. And on a touch screen there is no pointer at all, so there would be
 * no light at all.
 *
 * The hand-over is already built and already earned. `LitWall ignites` runs
 * `--unlit` to 0 as the gallery arrives — the figures come up, the torch fades
 * out. This is not a new mechanism replacing an old one. It is what the old one
 * was counting down to.
 *
 * ── lift ────────────────────────────────────────────────────────────────────
 * Always. Without it the veil falls over the content and the reader is meant to
 * uncover it with a light that, down here, does not exist.
 */

import type { ReactNode } from "react";
import { LitWall, WallLight } from "@/components/lit-wall";

export interface RoomProps {
  children: ReactNode;
  className?: string;
}

export function Room({ children, className = "" }: RoomProps): ReactNode {
  return (
    <WallLight lit>
      <LitWall lift className={className}>
        {children}
      </LitWall>
    </WallLight>
  );
}

export default Room;
