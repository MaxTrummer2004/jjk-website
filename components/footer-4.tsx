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
import { Plate } from "@/components/plate";

const COLUMNS = [
  {
    title: "Train",
    links: [
      { text: "Programs", href: "#programs" },
      { text: "Schedule", href: "#schedule" },
      { text: "Coaches", href: "#coaches" },
      { text: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Academy",
    links: [
      { text: "About", href: "#about" },
      { text: "Trial class", href: "#pricing" },
      { text: "FAQ", href: "#faq" },
      { text: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Visit",
    links: [
      { text: "Kasernenstraße", href: "#" },
      { text: "Graz, Austria", href: "#" },
      { text: "Mon–Fri 07–22h", href: "#" },
    ],
  },
  {
    title: "Follow",
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
    <footer className="w-full bg-background">
      <Plate name="sutra" focus="50% 40%" className="jjk-plate-footer">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="pt-16"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <motion.div variants={item} className="py-12">
              <h2 className="font-display text-3xl uppercase leading-[1.02] tracking-[0.02em] text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                Come train with us.
                <br />
                One membership, everything on the mat.
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
                    Class updates &amp; seminar invites
                  </h3>

                  <div className="mt-6 flex">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      aria-label="Email address"
                      className="jjk-field"
                    />
                    <button
                      type="button"
                      className="jjk-btn px-5"
                      data-cursor=""
                      aria-label="Subscribe"
                    >
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="mt-5 max-w-sm text-sm text-muted-foreground">
                    One mail a month at most. Unsubscribe from any of them.
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
                          {column.links.map((link) => (
                            <li key={link.text}>
                              <a
                                href={link.href}
                                className="text-base text-foreground-dim transition-colors hover:text-accent"
                              >
                                {link.text}
                              </a>
                            </li>
                          ))}
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
                <a href="#" className="transition-colors hover:text-foreground">
                  Privacy Policy
                </a>
                <span className="hidden sm:inline">·</span>
                <a href="#" className="transition-colors hover:text-foreground">
                  Terms of Service
                </a>
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
      </Plate>
    </footer>
  );
}
