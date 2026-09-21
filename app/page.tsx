import { SiteNav } from "@/components/site-nav";
import { JJKHero } from "@/components/jjk-hero";
import { Location } from "@/components/location";
import { Room } from "@/components/room";
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
  title: `${siteConfig.fullName} · Brazilian Jiu-Jitsu in Graz`,
  description: siteConfig.description,
  path: "/",
});

export default function HomePage(): ReactNode {
  return (
    <>
      <SiteNav />
      <main id="main-content" className="relative bg-background-deep">
        <JJKHero />

        <Location />

        <div className="relative">
          <Room>
            {/* Programme und Stundenplan waren zwei Sektionen und sagten
                dasselbe zweimal — einmal nach Programm sortiert, einmal nach
                Tag. Jetzt traegt `Schedule` beides: die Zeiten im Wochenpanel,
                den Programmtext im Detailfenster hinter einem Klick.
                `#programs` bleibt als Anker bestehen, damit bereits geteilte
                Links weiterhin irgendwo landen. components/features-6.tsx
                liegt unbenutzt auf der Platte. */}
            <div id="programs" className="scroll-mt-24">
              <div id="schedule" className="scroll-mt-24">
                <Schedule />
              </div>
            </div>

            <Coaches />

            <div id="pricing" className="scroll-mt-24">
              <Pricing2 />
            </div>

            <div id="faq" className="jjk-close-lead scroll-mt-24">
              <FAQ1 />
            </div>

            <Cta9 />
          </Room>
        </div>
      </main>
      <div id="contact">
        <Footer4 />
      </div>
    </>
  );
}
