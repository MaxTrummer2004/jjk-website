"use client";

/**
 * The colophon.
 *
 * A handscroll ends in a column of writing — the date, the hand, who it was
 * copied for. So the footer stands on `plate-sutra`: the last stretch of the
 * Sanjō scroll, which is exactly that, the text of the Heiji tale in ink on
 * bare silk. It is also the cheapest of the four panels by a distance, because
 * a page of writing on paper is almost nothing for a codec to store.
 *
 * Nothing here is new furniture. The square field and the arrow key are the
 * same hairline the whole lower half is built from, the links are the muted
 * token, and the JJK mark is set as an outline rather than a fill so it reads
 * as something cut into the paper rather than printed over it.
 */

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Training",
    links: [
      { text: "Training", href: "#schedule" },
      { text: "Trainer", href: "#coaches" },
      { text: "Preise", href: "#pricing" },
    ],
  },
  {
    title: "Academy",
    links: [
      { text: "Über uns", href: "#about" },
      { text: "Probetraining", href: "#pricing" },
      { text: "FAQ", href: "#faq" },
      { text: "Kontakt", href: "#contact" },
      { text: "Impressum", href: "/impressum" },
      { text: "Datenschutz", href: "/datenschutz" },
    ],
  },
  {
    title: "Besuchen",
    links: [
      { text: "Kasernstraße 4", href: "#" },
      { text: "8010 Graz", href: "#" },
      { text: "Mo bis Fr, 07 bis 22 Uhr", href: "#" },
    ],
  },
  {
    title: "Folgen",
    links: [
      { text: "Instagram", href: "https://instagram.com" },
      { text: "YouTube", href: "https://youtube.com" },
      { text: "TikTok", href: "https://tiktok.com" },
    ],
  },
];

const container = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Footer4() {
  return (
    <footer className="relative w-full" style={{ backgroundColor: "#0a0a0a", isolation: "isolate" }}>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="pt-16"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <motion.div variants={item} className="py-12">
              <h2 className="jjk-section-title">
                Komm zu uns trainieren.
                <br />
                Eine Mitgliedschaft, alles dabei.
              </h2>
            </motion.div>
          </div>

          <div className="border-y border-border">
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <motion.div
                variants={item}
                className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_1.5fr]"
              >
                <div className="border-b border-border py-10 lg:border-b-0 lg:border-r lg:pr-10">
                  <h3 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-accent">
                    Stundenplan &amp; Seminar-Einladungen
                  </h3>

                  <div className="mt-6 flex">
                    <input
                      type="email"
                      placeholder="du@beispiel.at"
                      aria-label="E-Mail-Adresse"
                      className="jjk-field"
                    />
                    <button
                      type="button"
                      className="jjk-btn px-5"
                      aria-label="Anmelden"
                    >
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="mt-5 max-w-sm text-sm text-muted-foreground">
                    Höchstens eine Mail im Monat. Abmelden geht aus jeder.
                  </p>
                </div>

                <div className="py-10 lg:pl-10">
                  <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {COLUMNS.map((column) => (
                      <div key={column.title}>
                        <h4 className="mb-5 font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          {column.title}
                        </h4>
                        <ul className="space-y-3">
                          {/* Anker (#schedule) bleiben ein <a> — sie sollen
                              den Router gar nicht erst anfassen. Alles, was
                              mit / beginnt, ist eine echte Route und laeuft
                              deshalb als <Link>, sonst laedt die Seite beim
                              Klick auf "Impressum" komplett neu. */}
                          {column.links.map((link) =>
                            link.href.startsWith("/") ? (
                              <li key={link.text}>
                                <Link
                                  href={link.href}
                                  className="text-base text-foreground-dim transition-colors hover:text-accent"
                                >
                                  {link.text}
                                </Link>
                              </li>
                            ) : (
                              <li key={link.text}>
                                <a
                                  href={link.href}
                                  className="text-base text-foreground-dim transition-colors hover:text-accent"
                                >
                                  {link.text}
                                </a>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <motion.div variants={item} className="py-10">
              <h2 className="jjk-mark">JJK</h2>

              <div className="mt-6 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
                <p>©2026 Jiu-Jitsu Kaisen Academy</p>
                <span className="hidden sm:inline">·</span>
                {/* Beide Links standen auf href="#" und liefen damit ins
                    Leere — der "Datenschutz"-Link war die auffaelligste
                    Luecke der Seite, weil eine oeffentliche Vereinswebsite
                    in Oesterreich beides braucht (ECG/MedienG bzw. DSGVO).
                    "AGB" ist ersatzlos weg: der Verein hat keine, und ein
                    Link auf ein Dokument, das es nicht gibt, ist schlechter
                    als kein Link. */}
                <Link href="/impressum" className="transition-colors hover:text-foreground">
                  Impressum
                </Link>
                <span className="hidden sm:inline">·</span>
                <Link href="/datenschutz" className="transition-colors hover:text-foreground">
                  Datenschutz
                </Link>
                {/* Not optional. The hero backdrop is rendered from
                    OpenStreetMap road, rail and building data
                    (scripts/gen-graz-map.py), and ODbL requires the credit on
                    anything derived from it. A link rather than plain text
                    because the licence asks for the attribution to be
                    discoverable, not merely present. */}
                <span className="hidden sm:inline">·</span>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Kartendaten © OpenStreetMap-Mitwirkende
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>
    </footer>
  );
}
