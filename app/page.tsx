/* Zwei ausgehaengte Eroeffnungen, beide erhalten, beide einen Import weit weg:

     components/scroll-opening.tsx   der brennende Sanjo-Palast mit Klick-Tor.
                                     Haelt den Scroll fest, bis der Leser einmal
                                     drueckt. Ersetzt, weil das Tor eine Bedienung
                                     war, die niemand verlangt hat.
     components/hero.tsx             der Kartenanflug auf Graz (mit fly-in,
                                     city-backdrop, zoom-streaks, cursed-energy).

     components/paper-opening.tsx    ein Blatt Papier mit vier eingeschnittenen
                                     Zeichen, die beim Scrollen gluehen. Ersetzt,
                                     weil die Qualitaet vollstaendig aus einer
                                     Formel kam und das Bild deshalb wie ein
                                     Filter aussah.

   Was jetzt oben steht, ist eine AUFNAHME im Nebel: ein Torbau bei Nacht, ein
   WebGL-Nebelfeld darueber, das gleichzeitig die Luft, die Schwaden und am
   Ende die Aufloesung ist. Es frisst das Bild in Zungen auf, und was danach
   dasteht, ist die Wand. Das ist der Uebergang, an dem fuenf Anlaeufe
   gescheitert sind — nicht, weil die Kurve jetzt besser waere, sondern weil es
   endlich einen Unterschied zu zeigen gibt. */
import { GateOpening } from "@/components/gate-opening";
import About3 from "@/components/about-3";
import { ImageReveal } from "@/components/image-reveal";
import { LitWall, WallLight } from "@/components/lit-wall";
import { Plate } from "@/components/plate";
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
        {/* The opening sits in a WallLight of its own — the SAME component
            the sections below use — and now the SAME INSTANCE, which is a
            stronger statement than the same component.

            It was one provider each at first, and that quietly reintroduced the
            exact fault LitWall was written to remove: the pointer's pool could
            not cross the boundary, because each provider drew only its own
            circle in its own coordinates. Under one provider both sides draw
            the same circle at the same document position and each shows its own
            half of it, so the torch spans the seam the way it spans the seam
            between the two wall sections.

            See the long note in components/lit-wall.tsx — this is the fourth
            patch on that list, arriving late and for the same reason as the
            first three. */}
        <WallLight radius={800}>
          <GateOpening />

          {/* This used to carry `jjk-ember-glow-top`: a warm ellipse anchored at
              `50% 0%`, i.e. brightest at exactly this edge and blooming down from
              it. It was lit by the OLD opening, which ended on a bright picture
              and needed its light carried into the stack.

              It is now the boundary itself. Measured, the veiled scroll above
              rests at 3.98 of 255 and the veiled wall below at 4.06 — the two
              surfaces already agree to a tenth of a level. The ellipse put
              rgb(52, 25, 14) over the second one, took it to 29.7, and drew the
              line the reader could see. It also contradicted the section it sat
              on: a room read by torchlight cannot have a second warm source with
              nothing casting it — the same objection already written out on
              `.jjk-veil`. */}
          <div className="relative">
            {/* One wall, two rooms, one set of lights — components/lit-wall.tsx.

                Both sections are the same component in the same state. What
                changes is a single inherited variable: the figures painted on the
                wall are cold at first and the pointer is the only light there is,
                and as the second section arrives they catch — everywhere at once,
                including the stretch you have already scrolled past.

                Note that the wrappers inside carry no transform and no z-index:
                anything that opens a stacking context in here traps the content
                under its own darkness. */}
            {/* Der kurze Halt auf dieser Sektion ist ausgebaut, und zwar aus
                einem strukturellen Grund und nicht aus Geschmack.

                Der Hero endet mit einem negativen Rand von -100svh: seine
                klebende Buehne schiebt sich ueber den Anfang von #about
                hinweg. Ein Pin, der bei "top top" von #about greift, feuert
                also mitten in diese Bewegung hinein — und ein Pin verschiebt
                alles unter sich um seine eigene Laenge. Genau daraus entstand
                die waagrechte Kante bei etwa siebzig Prozent der Hoehe.

                Wenn der Halt zurueck soll, dann nicht hier, sondern nach dem
                Hinausfahren: start "top top-=100svh" oder an der naechsten
                Sektion. components/hold.tsx bleibt dafuer im Repo. */}
            <LitWall>
              {/* `jjk-wall-lead` ist ein Vorlauf von genau einer
                  Bildschirmhoehe — so lang, wie die Hero-Buehne zum
                  Hinausfahren braucht.

                  Ohne ihn beginnt der Inhalt dieser Sektion unter der Buehne,
                  laeuft also hinter ihr am Fenster vorbei, waehrend niemand
                  ihn sehen kann. Wenn die Buehne weg ist, steht der Leser
                  schon mitten drin und hat "01 On The Mats" nie gesehen.
                  Der Vorlauf ist nicht leer: darueber faehrt die Buehne mit
                  dem Nebel, und dahinter liegt bereits die Wand. */}
              <div id="about" className="jjk-wall-lead scroll-mt-24">
                <About3 />
              </div>
            </LitWall>
            {/* `ignites` goes on the second one: its arrival is what lights the
                figures, and the value it computes is written to the shared
                parent so the wall ABOVE catches at the same moment. */}
            <LitWall ignites lift>
              <ImageReveal />
            </LitWall>

            {/* ── The whole lower half, on one wall ──────────────────────────
                Everything from the programme boards to the closing call used to
                sit on `bg-background` and `bg-card`: flat fills, rounded
                corners, backdrop blur, four different button shapes. The page
                changed buildings halfway down.

                It is now one `Room` — the same tiled emaki, the same veil, the
                same lighting rig as everything above — with four PANELS hung on
                it, each cut from the Sanjō scroll the opening burns
                (components/plate.tsx, scripts/gen-section-plates.py).

                The alternation is the point and it runs
                wall · wall · PANEL · wall · PANEL · wall · PANEL:

                  boards, claims   the wall
                  the timetable    carts — ox-carts across open silk, which is
                                   mostly bare paper, which is what six columns
                                   of small type need under them
                  the coaches      the wall again
                  the tiers        court — the palace interior, courtiers in
                                   rows behind blinds
                  the questions    the wall again
                  the closing call blaze — the fire itself, so the last thing
                                   the reader sees is the first thing they saw

                A wall that runs for six more sections is a wall nobody looks at
                any more; six panels in a row is a gallery rather than a
                building. The panels feather out at top and bottom, so each one
                is hung ON the wall rather than butted against it — the same
                lesson the hero boundary cost a day to learn.

                Both `Room` and `Plate` are direct-child-lifted: `[data-lift]`
                raises only DIRECT children above the veil, so every panel and
                every bare section has to sit at this level and not one deeper. */}
            <Room>
              <div id="programs" className="scroll-mt-24">
                <Features6 />
              </div>
              <Features3 />

              {/* Der Stundenplan ist ein eigener Ort, und man betritt und
                  verlässt ihn durch Feuer — siehe components/curtain.tsx.
                  Vorher lag hier eine Überblendung zwischen zwei Gründen, die
                  absichtlich gleich aussehen; die war nicht zu bemerken. */}
              {/* Der Stundenplan stand auf einer eigenen Tafel, betreten und
                  verlassen durch eine Feuerwand, die über den ganzen Bildschirm
                  zog. Beides ist raus — auf Ansage, und die Ansage war richtig.

                  Der Grund, warum es nicht funktionierte, steht ganz am Anfang:
                  Wand und Tafeln sind absichtlich AUFEINANDER EINGEMESSEN
                  (5,8–10,6 gegen 6,9–12,3 von 255), damit keine Tafel aus der
                  Nacht fällt. Genau das macht jeden Wechsel zwischen ihnen
                  unsichtbar. Fünf Anläufe — längere Kurve, kürzere Kurve,
                  klebender Raum, Kapitelblatt, Feuerwand — haben alle dasselbe
                  Problem umkreist, statt es zu lösen: es gibt nichts zu zeigen.

                  Die einfachste Antwort war die richtige. Kein Übergang, weil
                  es keinen Ortswechsel gibt: eine Wand, die durchläuft.
                  components/curtain.tsx und die Tafel `gate` liegen in _attic/,
                  falls jemand es anders sehen will. */}
              <Schedule />

              <Coaches />

              {/* Die Mitgliedschaft stand auf der Tafel "court" — dem
                  Palastinneren. Sie steht jetzt auf der Wand selbst, also auf
                  demselben Emaki wie die Sektionen davor und danach.

                  Der Grund ist der einfachste, den es gibt: zwischen zwei
                  gleichen Gruenden braucht es keinen Uebergang. Die Tafel
                  musste an beiden Enden ausgefedert werden, weil sie ein
                  anderes Bild war als das, worauf sie hing — und eine
                  Ausfederung, die man bemerkt, ist schlechter als gar kein
                  Wechsel. Dazu kam, dass die Tafel eine Mindesthoehe von
                  175svh mitbrachte und der Inhalt nur 1206 Pixel hoch war:
                  vierhundert Pixel Bild ohne Inhalt darauf.

                  components/plate.tsx bleibt, die Tafel "court" bleibt im
                  Bilderordner. */}
              <div id="pricing" className="scroll-mt-24">
                <Pricing2 />
              </div>

              <div id="faq" className="jjk-close-lead scroll-mt-24">
                <FAQ1 />
              </div>

              {/* This carried `jjk-ember-glow`: a warm ellipse under the closing
                  card, standing in for a light with nothing casting it. There is
                  now something casting it. */}
              {/* `jjk-plate-close`: die letzte Tafel vor dem Footer, und sie
                  hoert dort auf, wo ihr Inhalt aufhoert.

                  Ohne das brachte sie ihre Mindesthoehe von 175svh mit,
                  waehrend der Aufruf darauf nur 712 Pixel hoch ist — neunhundert
                  Pixel Feuer, auf dem nichts steht, zwischen dem letzten Satz
                  der Seite und dem Footer. Dafuer bekommt sie eine laengere
                  Ausfederung, damit der kuerzere Weg nicht als Kante ankommt. */}
              {/* Der Schlussaufruf steht wieder auf der Tafel "blaze" — dem
                  Feuer —, und der Uebergang dorthin ist trotzdem weg.

                  Der Unterschied zu vorher ist nicht die Tafel, sondern das,
                  worauf sie liegt. Frueher stiess sie an eine beleuchtete Wand
                  voller Figuren, und zwei Bilder, die aneinanderstossen, haben
                  eine Naht — die laesst sich abschwaechen, aber nicht
                  wegdiskutieren. Jetzt ist der Grund unter ihr schwarz: die
                  Verdunklung beginnt schon unter den letzten Fragen
                  (.jjk-close-lead) und laeuft hinter der Tafel weiter
                  (.jjk-plate-close::before). Das Feuer stoesst also an nichts
                  mehr an, es taucht aus dem Dunkeln auf und geht darin wieder
                  unter. */}
              {/* Hier stand eine Nebelschwelle — dieselbe Ebene wie am Ende
                  des Heros, die den Grund zudeckt und wieder aufgehen laesst.
                  Sie ist ausgehaengt, auf Ansage. components/veil-break.tsx
                  bleibt im Repo; eine Zeile hier bringt sie zurueck.

                  Was bleibt, ist der ruhige Weg: der Grund wird unter den
                  letzten Fragen dunkler (.jjk-close-lead), bleibt hinter der
                  Tafel dunkel (.jjk-plate-close::before), und die Tafel blendet
                  mit ihrer eigenen Ausfederung darauf ein. Kein Effekt, nur
                  Licht. */}
              <Plate
                name="blaze"
                focus="50% 42%"
                className="jjk-plate-close"
                dark={0.885}
                glow={0.27}
              >
                <Cta9 />
              </Plate>
            </Room>
          </div>
        </WallLight>
      </main>
      <div id="contact">
        <Footer4 />
      </div>
    </>
  );
}
