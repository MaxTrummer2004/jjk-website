"use client";

import { NavLogo } from "@/components/nav-logo";
import { MenuIcon } from "@/components/menu-icon";
import { MorphLabel } from "@/components/morph-label";
import { ScrollProgress } from "@/components/scroll-progress";
import { softEase, useReducedMotion } from "@/lib/motion";
import { isOpeningDone, isOpeningDoneOnServer, subscribeOpening } from "@/lib/opening";
import { nav, siteConfig } from "@/lib/config";
import { useSectionTransition } from "@/lib/section-transition";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// ---- JJK link sets -------------------------------------------------------

const PILL_LINKS = [
  { label: "Programs", href: "#programs" },
  { label: "Schedule", href: "#schedule" },
];

const PRIMARY_LINKS = nav.links;

const LEGAL_LINKS = [
  { label: "Impressum", href: "#contact" },
  { label: "Datenschutz", href: "#contact" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: siteConfig.social.instagram },
  { label: "YouTube", href: siteConfig.social.youtube },
  { label: "TikTok", href: siteConfig.social.tiktok },
  { label: "Facebook", href: siteConfig.social.facebook },
];

// ---- layout constants ----------------------------------------------------

const CLOSED_WIDTH_DESKTOP = 200;
const CLOSED_WIDTH_MOBILE = 128;
const OPEN_WIDTH = 296;
const CONTENT_WIDTH = OPEN_WIDTH - 16;

const ITEM_DELAY = 0.14;
const ITEM_STAGGER = 0.045;

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      opacity: {
        duration: 0.45,
        ease: softEase,
        delay: ITEM_DELAY + i * ITEM_STAGGER,
      },
      y: {
        type: "spring",
        stiffness: 420,
        damping: 42,
        mass: 0.9,
        restDelta: 0.01,
        delay: ITEM_DELAY + i * ITEM_STAGGER,
      },
    },
  }),
};

// ---- hooks ---------------------------------------------------------------

function useIntroDone(): boolean {
  return useSyncExternalStore(subscribeOpening, isOpeningDone, isOpeningDoneOnServer);
}

// ---- component -----------------------------------------------------------

export function SiteNav(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const introDone = useIntroDone();
  const router = useRouter();
  const { goToSection } = useSectionTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closedWidth = isDesktop ? CLOSED_WIDTH_DESKTOP : CLOSED_WIDTH_MOBILE;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = (): void => setMenuOpen(false);

  return (
    <motion.header
      initial={false}
      animate={
        introDone
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: prefersReducedMotion ? 0 : -16 }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0.01 }
          : introDone
            ? { duration: 0.6, ease: softEase, delay: 0.3 }
            : { duration: 0 }
      }
      style={{ pointerEvents: introDone ? "auto" : "none" }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="relative flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
        {/* Left: logo + pill nav links */}
        <div className="flex items-center gap-3">
          <NavLogo />
          <nav
            className="bg-background border-border hidden h-13 items-center gap-1 rounded-full border p-1.5 md:flex"
            aria-label="Hauptnavigation"
          >
            {PILL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); goToSection(link.href); }}
                className="text-muted-foreground hover:text-foreground flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Center: expandable menu pill */}
        <div className="absolute top-1.5 right-5 z-50 md:right-auto md:left-1/2 md:-translate-x-1/2">
          <motion.div
            initial={false}
            animate={{
              width: menuOpen ? OPEN_WIDTH : closedWidth,
              boxShadow: menuOpen
                ? "0 30px 70px -24px rgba(0,0,0,0.45)"
                : "0 30px 70px -24px rgba(0,0,0,0)",
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.45, ease: softEase }
            }
            className="relative rounded-[28px] p-2"
          >
            <motion.div
              initial={false}
              animate={{ opacity: menuOpen ? 1 : 0 }}
              transition={{ duration: 0.35, ease: softEase }}
              className="bg-background border-border pointer-events-none absolute inset-0 rounded-[28px] border"
            />
            <div className="relative">
              <div
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
                className="flex h-13 w-full items-center justify-end gap-2 rounded-full pr-1.5 pl-1.5 md:justify-between md:pr-2"
              >
                <button
                  ref={toggleRef}
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
                  className="flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <MenuIcon open={menuOpen} />
                  <MorphLabel value={menuOpen ? "Schließen" : "Menü"} />
                </button>
                {isDesktop && <ScrollProgress />}
              </div>

              <AnimatePresence initial={false}>
                {menuOpen && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.01 }
                        : { duration: 0.45, ease: softEase }
                    }
                    className="overflow-hidden"
                  >
                    <div className="flex justify-center">
                      <motion.div
                        initial={prefersReducedMotion ? false : "hidden"}
                        animate={prefersReducedMotion ? false : "visible"}
                        style={{ width: CONTENT_WIDTH }}
                        className="shrink-0 px-4 pt-7 pb-3"
                      >
                        <div className="flex flex-col gap-2">
                          <motion.span
                            custom={0}
                            variants={ITEM_VARIANTS}
                            className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase"
                          >
                            Navigation
                          </motion.span>
                          {PRIMARY_LINKS.map((link, i) => (
                            <motion.a
                              key={link.href}
                              href={link.href}
                              onClick={(e) => { e.preventDefault(); closeMenu(); goToSection(link.href); }}
                              custom={1 + i}
                              variants={ITEM_VARIANTS}
                              className="text-foreground hover:text-foreground/55 w-fit text-[26px] leading-tight font-medium tracking-tight transition-colors focus-visible:outline-none"
                            >
                              {link.label}
                            </motion.a>
                          ))}
                        </div>

                        <motion.div
                          custom={6}
                          variants={ITEM_VARIANTS}
                          className="bg-border my-6 h-px w-full"
                        />

                        <div className="flex flex-col gap-3">
                          <motion.span
                            custom={7}
                            variants={ITEM_VARIANTS}
                            className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase"
                          >
                            Sonstiges
                          </motion.span>
                          {LEGAL_LINKS.map((link, i) => (
                            <motion.a
                              key={link.href + link.label}
                              href={link.href}
                              onClick={closeMenu}
                              custom={8 + i}
                              variants={ITEM_VARIANTS}
                              className="text-foreground/80 hover:text-foreground w-fit text-sm font-medium transition-colors focus-visible:outline-none"
                            >
                              {link.label}
                            </motion.a>
                          ))}
                        </div>

                        <div className="mt-7 flex flex-col gap-3">
                          <motion.span
                            custom={11}
                            variants={ITEM_VARIANTS}
                            className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase"
                          >
                            Social Media
                          </motion.span>
                          <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {SOCIAL_LINKS.map((link, i) => (
                              <motion.a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMenu}
                                custom={12 + i}
                                variants={ITEM_VARIANTS}
                                className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors focus-visible:outline-none"
                              >
                                {link.label}
                              </motion.a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right: Für Mitglieder */}
        <div className="flex items-center gap-2">
          <Link
            href="/mitglieder"
            onClick={(e) => {
              e.preventDefault();
              closeMenu();
              // DOM-Overlay: kein React-Overhead, dunkel sofort beim Klick
              const cover = document.createElement("div");
              cover.setAttribute("aria-hidden", "true");
              cover.style.cssText =
                "position:fixed;inset:0;z-index:9999;background:#030304;opacity:0;pointer-events:none;transition:opacity 0.3s ease-in;";
              document.body.appendChild(cover);
              requestAnimationFrame(() => { cover.style.opacity = "1"; });
              setTimeout(() => {
                router.push("/mitglieder");
                // Cover nach Content-Fade-in entfernen
                setTimeout(() => cover.remove(), 700);
              }, 320);
            }}
            className="hidden h-13 items-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-85 md:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            Für Mitglieder
          </Link>
        </div>
      </div>

      {/* Click-outside backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            aria-label="Menü schließen"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 -z-10 cursor-default"
          />
        )}
      </AnimatePresence>
    </motion.header>
  );
}
