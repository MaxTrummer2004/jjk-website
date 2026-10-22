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
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// ---- JJK link sets -------------------------------------------------------

// "Wo wir sind" ist hier raus und steht nur noch im Menue. Der Platz gehoert
// jetzt der Anmeldung: eine Wegbeschreibung ist etwas, das man sucht, wenn man
// sie braucht; die Anmeldung ist das, weswegen die Seite existiert.
const PILL_LINKS = [{ label: "Training", href: "#schedule" }];

const PRIMARY_LINKS = nav.links;

// Beide zeigten auf #contact — also auf den Fuss der Startseite, der weder
// ein Impressum noch eine Datenschutzerklaerung enthaelt. Jetzt auf die
// echten Seiten, und als <Link>, damit sie ueber den Router laufen wie
// "Fuer Mitglieder" und nicht als voller Neuladevorgang.
const LEGAL_LINKS = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
];

// YouTube, TikTok und Facebook standen hier mit den nackten Startseiten der
// Plattformen — Links ins Leere. Zurueck, sobald es echte Kanaele gibt.
const SOCIAL_LINKS = [{ label: "Instagram", href: siteConfig.social.instagram }];

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

/**
 * Ist hier jemand eingeloggt? Gelesen aus jjk_member, dem einen Cookie, das
 * absichtlich nicht httpOnly ist (siehe lib/auth.ts). Es entscheidet nur, wie
 * der Knopf heisst — wer es faelscht, bekommt einen Knopf, der auf eine Seite
 * fuehrt, die ihn ohne gueltige Session nach Hause schickt.
 *
 * useSyncExternalStore und nicht useEffect: die Startseite wird statisch
 * ausgeliefert, im HTML steht also immer "Mitglied werden". Der Hook liefert
 * beim Hydrieren genau diesen Wert und wechselt erst danach — mit einem
 * Effekt gaebe es entweder eine Hydrierungs-Warnung oder ein sichtbares
 * Umspringen der Beschriftung.
 *
 * Das Abonnement bleibt leer: ein Cookie meldet keine Aenderungen, und
 * innerhalb eines Seitenaufrufs loggt sich niemand in einem anderen Tab ein
 * und erwartet, dass dieser Knopf davon erfaehrt.
 */
const noopSubscribe = (): (() => void) => () => undefined;

function useLoggedIn(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => document.cookie.includes("jjk_member="),
    () => false,
  );
}

// ---- component -----------------------------------------------------------

export function SiteNav(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const introDone = useIntroDone();
  const loggedIn = useLoggedIn();
  // Eine Quelle fuer beide Knoepfe, oben und im Menue: zwei Stellen, die
  // dasselbe entscheiden, laufen frueher oder spaeter auseinander.
  // Rot (laut) = der Weg in den Mitgliederbereich; Platte = Mitglied werden.
  // Farbzuordnung so seit 11.10.2026 auf Wunsch des Vorstands.
  const action = loggedIn
    ? { label: "Mein Bereich", href: "/mitglieder" }
    : { label: "Für Mitglieder", href: "/mitglieder" };
  // Das Paar "einloggen + beitreten", in dieser Reihenfolge, oben wie im
  // Menue. Seit 22.10.2026 stehen beide direkt nebeneinander; vorher lag der
  // rote Knopf links beim Logo und "Mitglied werden" allein am rechten Rand,
  // dazwischen die Menue-Pille. Auftraggeber am 22.10.: die Leute finden die
  // Anmeldung so nicht. Getrennt liest sich der rote Knopf wie ein
  // Navigationspunkt neben "Training"; erst als Paar rechts — die uebliche
  // Stelle fuer "Anmelden | Registrieren" — sagt er, wofuer er da ist.
  // Beitreten steht aussen, wie dort ueblich.
  const accountLinks = [
    { ...action, loud: true },
    { ...nav.signup, loud: false },
  ] as const;
  const { navigate } = useSectionTransition();
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
        {/* Left: logo + "Training" (ab lg) + die Menue-Pille.

            Die Pille haengt seit 22.10.2026 als absolutes Kind in DIESEM
            Behaelter statt daneben, weil sie zwischen md und xl nicht mehr in
            die Mitte passt. Gemessen (Chromium, 22.10.2026): das Paar rechts
            ist 332 px breit (156 "Für Mitglieder" + 8 + 168 "Mitglied
            werden"), die offene Pille 296. Mittig braucht das Viewport also
            >= 2 x (40 Rand + 332 + 148 halbe Pille + 16 Luft) = 1072 px; bei
            1024 ueberdeckte die offene Pille den roten Knopf um 8 px, bei 768
            um 128. Darum:
              < md   Pille rechts aussen, das Paar steht im Menue.
              md–xl  Pille direkt rechts neben dem Logo (ab lg neben
                     "Training"), sie waechst nach rechts in die leere Mitte.
                     `left-full` bezieht sich auf diesen Behaelter (darum
                     md:relative), also keine eingerechnete Logobreite.
                     -top-2 gleicht das p-2 der Pille aus, damit die
                     sichtbare Leiste auf Hoehe der Knoepfe sitzt; +8px gibt
                     der offenen Karte (sie fuellt die ganze Pille samt p-2)
                     dieselbe Luecke zum Nachbarn wie im Paar. Engste Stelle:
                     768 px, offene Karte bis 388, Paar ab 404.
              >= xl  wieder mittig in der ganzen Zeile (xl:static gibt die
                     Zeile als Bezug zurueck), wie vor dem 22.10.

            "Training" faellt unter lg weg: bei 768 reichte die offene Karte
            sonst bis 506 px, das Paar beginnt bei 404. Es ist der erste
            Punkt im Menue, also nicht verloren. */}
        <div className="flex items-center gap-3 md:relative xl:static">
          <NavLogo />
          <nav
            className="bg-card-plate border-border hidden h-13 items-center gap-1 rounded-full border p-1.5 lg:flex"
            aria-label="Hauptnavigation"
          >
            {PILL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                className="text-muted-foreground hover:text-foreground hover:bg-card-plate-hot flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Expandable menu pill — Lage je Breite siehe Kommentar oben. */}
          <div className="absolute top-1.5 right-5 z-50 md:-top-2 md:right-auto md:left-[calc(100%+8px)] xl:top-1.5 xl:left-1/2 xl:-translate-x-1/2">
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
                className="bg-card-plate border-border pointer-events-none absolute inset-0 rounded-[28px] border"
              />
              <div className="relative">
                <div
                  className="bg-card-plate text-foreground flex h-13 w-full items-center justify-end gap-2 rounded-full pr-1.5 pl-1.5 md:justify-between md:pr-2"
                >
                  <button
                    ref={toggleRef}
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
                    className="hover:bg-card-plate-hot flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
                          {/* Am Handy hat die Kopfleiste keinen Platz fuer das
                              Paar (bei 360 px bleiben zwischen Logo und Pille
                              140 px, das Paar braucht 332), also steht es hier —
                              vor der Navigation, nicht darin. Bis 22.10.2026 nur
                              der rote Knopf: "Mitglied werden" war am Handy
                              weder oben noch im Menue erreichbar.
                              Untereinander statt zwei Spalten: 248 px Innenbreite
                              ergaeben 120 px je Knopf, "Für Mitglieder" braucht
                              mit Polster 156. `md:hidden` am Behaelter, siehe
                              rechts unten. */}
                          <motion.div
                            custom={0}
                            variants={ITEM_VARIANTS}
                            className="mb-6 flex flex-col gap-2 md:hidden"
                          >
                            {accountLinks.map((link) => (
                              <a
                                key={link.href}
                                href={link.href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  closeMenu();
                                  navigate(link.href);
                                }}
                                className={`jjk-btn${link.loud ? " jjk-btn-loud" : ""} h-13 w-full overflow-hidden rounded-full px-5! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
                              >
                                {link.label}
                              </a>
                            ))}
                          </motion.div>

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
                                onClick={(e) => { e.preventDefault(); closeMenu(); navigate(link.href); }}
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
                              <motion.div
                                key={link.href + link.label}
                                custom={8 + i}
                                variants={ITEM_VARIANTS}
                                className="w-fit"
                              >
                                <a
                                  href={link.href}
                                  onClick={(e) => { e.preventDefault(); closeMenu(); navigate(link.href); }}
                                  className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                                >
                                  {link.label}
                                </a>
                              </motion.div>
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
        </div>

        {/* Right: das Konto-Paar, "Für Mitglieder"/"Mein Bereich" (rot) und
            aussen "Mitglied werden" (Platte). Bis 22.10.2026 stand der rote
            Knopf links beim Logo und hier nur "Mitglied werden" — warum
            jetzt beide hier, steht bei `accountLinks`.

            Beide sind .jjk-btn. "Mitglied werden" war vorher von Hand gebaut
            (Platte, Rand, beim Hover --card-plate-hot und --border-hot) — das
            ist Strich fuer Strich der Ruhe- und Hover-Zustand von .jjk-btn,
            nur in der Grundschrift statt in Shippori. Nebeneinander haette
            das Paar damit zwei Schriften gezeigt und sich als zwei Dinge
            gelesen. Jetzt unterscheidet die beiden nur noch die Farbe. Was
            vorher fuer die Platte galt, gilt weiter, weil .jjk-btn es genauso
            macht: Platte statt Zinnober, damit der Kopf zum Rest der Seite
            passt; der Rand ist Kante, nicht Zierde (ohne ihn hat eine Flaeche
            auf dL* 6,0 keine und liest sich nicht als Schaltflaeche); beim
            Hover glimmt der Rand auf statt zu verblassen.
            Was .jjk-btn mitbringt und hier Folgen hat:
              - padding steht in globals.css ausserhalb jeder @layer und
                schlaegt jede Utility; `px-6` am roten Knopf war darum
                wirkungslos (gemessen 179 px, jetzt 156). `px-5!` gewinnt
                ueber !important — 20 px wie der "Training"-Link, und noetig,
                damit das Paar bei 768 neben der offenen Pille Platz hat.
              - der Zinnober-Faden (::after) waechst beim Hover am unteren
                Rand; overflow-hidden schneidet ihn auf die gerade Unterkante
                der Pillenform, sonst ragt er an den Rundungen heraus.
              - .jjk-btn hat keinen eigenen Fokusring, darum der Ring hier.

            Das `hidden md:flex` sitzt am Behaelter und nicht an den Knoepfen:
            .jjk-btn setzt selbst `display: inline-flex` und gewinnt gegen
            `hidden` (s. o., ausserhalb der Layer). Genau daran ist der rote
            Knopf frueher am Handy erschienen und hat sich mit der Menue-Pille
            ueberlagert.

            MagneticLink (wie beim Probetraining im Hero) bewusst nicht: er
            zieht den Knopf bis ~30 px zum Zeiger, bei 8 px Luecke schoebe
            sich der eine Knopf ueber den anderen — das Paar fiele genau beim
            Hinzeigen auseinander. */}
        <div className="hidden items-center gap-2 md:flex">
          {accountLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                closeMenu();
                navigate(link.href);
              }}
              className={`jjk-btn${link.loud ? " jjk-btn-loud" : ""} h-13 overflow-hidden rounded-full px-5! whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
            >
              {link.label}
            </a>
          ))}
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
