import { Hero } from "@/components/hero";
import About3 from "@/components/about-3";
import { ImageReveal } from "@/components/image-reveal";
import { LitWall, WallLight } from "@/components/lit-wall";
import { Room } from "@/components/room";
import Features6 from "@/components/features-6";
import { Features3 } from "@/components/features-3";
import { Schedule } from "@/components/schedule";
import { Coaches } from "@/components/coaches";
import Pricing2 from "@/components/pricing-2";
import FAQ1 from "@/components/faq-1";
import Cta9 from "@/components/cta-9";
import Footer4 from "@/components/footer-4";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/config";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: `${siteConfig.fullName} — Brazilian Jiu-Jitsu in Graz`,
  description: siteConfig.description,
  path: "/",
});

export default function HomePage(): ReactNode {
  return (
    <>
      <main id="main-content" className="relative bg-background">
        <Hero />

        {/* Everything below the hero sits in the candle's light: a warm pool at
            the top of the stack, and a second one under the closing CTA. */}
        <div className="jjk-ember-glow-top relative">
          {/* One wall, two rooms, one set of lights — components/lit-wall.tsx.

              Both sections are the same component in the same state. What
              changes is a single inherited variable: the figures painted on the
              wall are cold at first and the pointer is the only light there is,
              and as the second section arrives they catch — everywhere at once,
              including the stretch you have already scrolled past.

              This replaced two separate lighting rigs stacked on each other.
              Four different patches had accumulated to make that boundary
              invisible (a shared tile origin, hand-matched darkness values, a
              spill layer, and a clipped pointer pool); all four were the same
              fact wearing different hats, and none of them is needed now.

              Note that the wrappers inside carry no transform and no z-index:
              anything that opens a stacking context in here traps the content
              under its own darkness. */}
          <WallLight radius={800}>
            <LitWall>
              <div id="about" className="scroll-mt-24">
                <About3 />
              </div>
            </LitWall>
            {/* `ignites` goes on the second one: its arrival is what lights the
                figures, and the value it computes is written to the shared
                parent so the wall ABOVE catches at the same moment. That is the
                whole trick — the second section is not a different kind of
                section, it is the same one after something happened, and there
                is nothing left at the boundary for the eye to find. */}
            <LitWall ignites lift>
              <ImageReveal />
            </LitWall>
          </WallLight>
          {/* The same room, with the light on — components/room.tsx. The wall
              carries on down the page on the same virtual tile plane, so there
              is no seam at the boundary and no second painting. The torch does
              not come with it: `LitWall ignites` has already run --unlit to 0 by
              the time anybody gets here, which is exactly what that countdown
              was for. */}
          <Room>
            <div id="programs" className="scroll-mt-24">
              <Features6 />
            </div>
            <Features3 />
          </Room>
          <Schedule />
          <Coaches />
          <div id="pricing" className="scroll-mt-24">
            <Pricing2 />
          </div>
          <div id="faq" className="scroll-mt-24">
            <FAQ1 />
          </div>
          <div className="jjk-ember-glow relative">
            <Cta9 />
          </div>
        </div>
      </main>
      <div id="contact">
        <Footer4 />
      </div>
    </>
  );
}
