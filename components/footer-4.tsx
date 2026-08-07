"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function Footer4() {
  const footerColumns = [
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
        { text: "Free trial", href: "#pricing" },
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <footer className="w-full bg-background">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Headline */}
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="py-12">
            <h2 className="text-3xl font-medium tracking-tight leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              Come train with us.
              <br />
              Your first class is free.
            </h2>
          </motion.div>
        </div>

        {/* Two Column Layout with Borders */}
        <div className="border-y border-border">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_1.5fr]"
            >
              {/* Left Column - Newsletter Signup */}
              <div className="border-b border-border py-8 lg:border-b-0 lg:border-r lg:py-8 lg:pr-8">
                <div>
                  <h3 className="mb-6 text-lg font-medium tracking-tight text-foreground sm:text-xl">
                    Get class updates &amp; seminar invites.
                  </h3>

                  {/* Email Input with Button */}
                  <div className="mb-6 flex">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      className="flex-1 border border-r-0 border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none sm:px-6 sm:py-4 sm:text-base"
                    />
                    <button
                      className="flex items-center justify-center border border-border bg-muted px-4 transition-colors hover:bg-muted bg-card-raised sm:px-6"
                      aria-label="Subscribe"
                    >
                      <ArrowRight className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground sm:text-sm">
                    *By completing this form you are signing up to receive our
                    emails and can unsubscribe at any time.
                  </p>
                </div>
              </div>

              {/* Right Column - 4 Column Links */}
              <div className="py-8 lg:py-8 lg:pl-8">
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                  {footerColumns.map((column) => (
                    <div key={column.title}>
                      <h4 className="mb-4 text-sm font-medium tracking-tight text-foreground sm:mb-6 sm:text-base">
                        {column.title}
                      </h4>
                      <ul className="space-y-3">
                        {column.links.map((link) => (
                          <li key={link.text}>
                            <a
                              href={link.href}
                              className="text-sm tracking-tight text-muted-foreground transition-colors hover:text-foreground sm:text-base"
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

        {/* Bottom Section */}
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="py-8">
            {/* Logo */}
            <div className="mb-4">
              <h2 className="text-5xl font-bold text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
                JJK
              </h2>
            </div>

            {/* Copyright and Links */}
            <div className="flex flex-col gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:text-sm">
              <p>©2026 Jiu-Jitsu Kaisen Academy</p>
              <span className="hidden sm:inline">•</span>
              <a
                href="#"
                className="transition-colors hover:text-foreground"
              >
                Privacy Policy
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="#"
                className="transition-colors hover:text-foreground"
              >
                Terms of Service
              </a>
              {/* Not optional. The hero backdrop is rendered from OpenStreetMap
                  road, rail and building data (scripts/gen-graz-map.py), and
                  ODbL requires the credit on anything derived from it. It is a
                  link rather than plain text because the licence asks for the
                  attribution to be discoverable, not merely present. */}
              <span className="hidden sm:inline">•</span>
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
