"use client";

// Ueberlebt client-seitige Navigation, wird bei Hard-Reload zurueckgesetzt.
// Verhindert, dass der Loader beim Zuruecknavigieren von /mitglieder erneut laeuft.
let introAlreadyPlayed = false;

import { MagneticLink } from "@/components/magnetic-link";
import { softEase, useReducedMotion } from "@/lib/motion";
import { setOpeningDone } from "@/lib/opening";
import Watercolor from "@/components/watercolor";
import { siteConfig } from "@/lib/config";
import Image from "next/image";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Der durchgehende Verlauf Loader → Hero ──────────────────────────────────
// Frueher: zwei getrennte Ebenen. Der Loader (heller Grund, schwarz-weisser
// Watercolor, Logo mit Zaehler) lag als eigenes Overlay ueber dem Hero und
// wurde per AnimatePresence AUSgeblendet, waehrend der Hero mit einem ZWEITEN
// Watercolor-Canvas EINblendete. Zwei WebGL-Instanzen nacheinander, ein harter
// Schnitt dazwischen.
//
// Jetzt: EIN Canvas, der durchgehend steht; seine Farbwerte werden ueber eine
// blend-MotionValue (0..1) im Shader interpoliert (kein Re-Render pro Frame,
// siehe watercolor.tsx). Das Logo ist DASSELBE Element vom Zaehler bis in den
// Hero — es wird nie ab- und wieder aufgebaut, nur seine Groesse/Deckkraft
// verlaeuft. Der Hero-Text blendet gestaffelt darueber ein. Es gibt keinen
// Schnitt mehr, nur einen Farb- und Text-Verlauf.
//
// Das Logo im Hero: KEIN Wasserzeichen mehr hinter dem Text, sondern das
// eigenstaendige Emblem (public/img/logo-emblem.png, s/w + roter Streifen)
// OBERHALB der Ueberschrift, volle Deckkraft, ohne Scrim/Abdunkelung — das
// Emblem bringt seinen eigenen Kontrast (schwarzer Kreis, weisse Zeichnung).
//
// Uebergang aus dem Loader: der Loader zeigt weiter sein grosses helles
// logo-seal.png; im Verlauf wird daraus das Emblem an seiner neuen (kleineren,
// hoeheren) Position. Beides liegt im selben, in-flow gemessenen Slot; Groesse
// und Position verlaufen ueber transform (y/scale, blend-getrieben), die beiden
// Assets werden per Opacity gecrossfadet — kein hartes Umschalten. Der Slot
// wird UNtransformiert vermessen (natuerliche Position im Textblock), daraus
// die Loader-Transform berechnet, die das Emblem waehrend des Zaehlens gross in
// die Viewport-Mitte hebt.

// Emblem-Breite im Hero (Endzustand). Richtwert; als Konstante nachjustierbar.
const EMBLEM_WIDTH = "clamp(150px, 24vh, 300px)";
// Dauer des Farb-/Logo-Verlaufs (Vorgabe 1,2–1,6 s).
const TRANSITION_DURATION = 1.6;

type Phase = "counting" | "transition" | "done";

/**
 * ── Der Scroll-Fade ──────────────────────────────────────────────────────
 * Framers `useScroll({ target, offset })` hat sich in diesem Repo wiederholt
 * als unzuverlaessig gezeigt — auch mit dem exakt gleichen Code wie in der
 * funktionierenden Vorlage, auch nach etlichen anderen Fixes. Statt weiter
 * auf diese Zielverfolgung zu vertrauen, liest dieser Hero die tatsaechliche
 * Position des eigenen Elements direkt: bei jedem "scroll"/"resize"-Ereignis
 * per `getBoundingClientRect()`, live, ohne zwischengespeicherte Hoehe, die
 * veralten koennte. `rect.top` ist 0, wenn der Hero ganz oben im Viewport
 * steht, und negativ, sobald man daran vorbeiscrollt — daraus direkt der
 * Scroll-Anteil, keine Umwege.
 */
export function JJKHero(): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(introAlreadyPlayed ? "done" : "counting");
  const [progress, setProgress] = useState(introAlreadyPlayed ? 100 : 0);
  const [revealed, setRevealed] = useState(introAlreadyPlayed);
  // blend fuehrt den Farb- und Logo-Verlauf. 0 = Loader-Zustand (hell, s/w),
  // 1 = Hero-Zustand (dunkel, rot). Als MotionValue: der Watercolor liest ihn
  // pro Frame in useFrame, ohne dass React rendert.
  const blend = useMotionValue(introAlreadyPlayed || prefersReducedMotion ? 1 : 0);
  const heroRef = useRef<HTMLElement>(null);
  const scrollFraction = useMotionValue(0);
  // Ab hier ist die Opacity (siehe scrollFade unten) schon laengst bei 0 —
  // der Canvas rendert bis dahin aber trotzdem jeden Frame weiter (r3f hat
  // keine "ist eh unsichtbar"-Erkennung). Genau in dem Moment, wenn man vom
  // Hero weiter zum Video scrollt, konkurriert dieses unsichtbare Rendern
  // mit der Scroll-getriebenen Berechnung der Video-Box um den Hauptthread
  // und laesst den Swipe ruckeln/haengenbleiben ("ein Swipe reicht nicht").
  // Statt den Canvas ab-/aufzubauen (er ist jetzt EINER und muss stehen
  // bleiben) wird er per paused-Prop stillgelegt — frameloop="never".
  // Etwas Puffer (0.6 statt exakt 0.5) gegen Flackern an der Fade-Grenze.
  const [showBackground, setShowBackground] = useState(true);

  // ── Logo-Slot vermessen (fuer den Loader→Emblem-Verlauf) ──────────────────
  // slotRef sitzt UNtransformiert im Textblock (natuerliche Emblem-Position).
  // Daraus: offsetY, um das Emblem in die Viewport-Mitte zu heben, und scale,
  // um es auf die Loader-Groesse (clamp(320,60vw,680)) zu bringen. Bei blend=0
  // (Zaehlen) also gross+zentriert wie der alte Loader, bei blend=1 klein an
  // seinem Platz ueber der H1. ready haelt das Logo verborgen, bis einmal
  // gemessen wurde (kein Aufpoppen an falscher Stelle im ersten Frame).
  const slotRef = useRef<HTMLDivElement>(null);
  const [loaderStart, setLoaderStart] = useState({ offsetY: 0, scale: 1 });
  const [logoReady, setLogoReady] = useState(
    introAlreadyPlayed || prefersReducedMotion
  );

  useEffect(() => {
    const measure = (): void => {
      const el = slotRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const desiredLoaderWidth = Math.min(Math.max(320, 0.6 * vw), 680);
      const scale = desiredLoaderWidth / rect.width;
      const offsetY = vh / 2 - (rect.top + rect.height / 2);
      setLoaderStart((prev) =>
        prev.offsetY === offsetY && prev.scale === scale ? prev : { offsetY, scale }
      );
      setLogoReady(true);
    };
    measure();
    window.addEventListener("resize", measure);
    // Schriften veraendern die Textblock-Hoehe (und damit die Slot-Position)
    // erst nach dem Laden — dann nachmessen.
    if (document.fonts?.ready) void document.fonts.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const update = (): void => {
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = rect.height || 1;
      const fraction = Math.min(Math.max(-rect.top / height, 0), 1);
      scrollFraction.set(fraction);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollFraction]);

  useEffect(() => {
    const unsubscribe = scrollFraction.on("change", (fraction) => {
      const shouldShow = fraction < 0.6;
      setShowBackground((prev) => (prev === shouldShow ? prev : shouldShow));
    });
    return unsubscribe;
  }, [scrollFraction]);

  // Bei 50% der eigenen Hoehe komplett verblasst — danach ist der Hero
  // wirklich weg (opacity 0), nicht nur fast.
  const scrollFade = useTransform(scrollFraction, [0, 0.5], [1, 0]);

  // ── Das Pinning ──────────────────────────────────────────────────────────
  // Der Hero war bisher ein ganz normaler, mitscrollender Abschnitt: beim
  // ersten Swipe wanderte er einfach nach oben aus dem Bild, WAEHRENDDESSEN
  // faded er zwar, aber das Video reagierte in genau diesem Swipe kaum
  // sichtbar mit — es fuehlte sich an, als wuerde nur der Hero wegscrollen
  // und erst ein zweiter Swipe das Video bringen. Jetzt exakt wie die
  // Video-Box in video-showcase.tsx gepinnt: `fixed` (haengt fest am
  // Viewport, bewegt sich NICHT mit dem Scroll) solange scrollFraction < 1,
  // danach `absolute` am unteren Rand der eigenen h-svh-Box verankert — zu
  // dem Zeitpunkt ist die Opacity laengst 0, der Wechsel unsichtbar. Die
  // Section selbst bleibt im Fluss und beansprucht weiter genau eine
  // h-svh-Scrollstrecke, nur ihr INHALT bewegt sich nicht mehr mit.
  const pinPosition = useTransform(scrollFraction, (v) =>
    v >= 1 ? "absolute" : "fixed"
  );
  const pinTop = useTransform(scrollFraction, (v) => (v >= 1 ? "auto" : "0px"));
  const pinBottom = useTransform(scrollFraction, (v) =>
    v >= 1 ? "0px" : "auto"
  );
  // Der Inhalt (inkl. Buttons) haengt jetzt bis fraction=1 fix am Viewport,
  // auch nachdem er bei fraction=0.5 unsichtbar geworden ist — ohne das hier
  // blieben "Book a trial class"/"Schedule" unsichtbar, aber bildschirmfest
  // anklickbar und wuerden Klicks/Taps abfangen, die eigentlich dem Video
  // oder was danach kommt galten. Gleiche Schwelle wie der Opacity-Fade.
  const pinPointerEvents = useTransform(scrollFraction, (v) =>
    v < 0.5 ? "auto" : "none"
  );

  // ── blend-abgeleitete Ebenen (transform/opacity only) ─────────────────────
  // Heller Loader-Grund faded weg, sobald der Verlauf laeuft.
  const lightOpacity = useTransform(blend, [0, 1], [1, 0]);
  // Logo-Verlauf: von gross+zentriert (Loader) nach klein+an-Position (Hero).
  const logoY = useTransform(blend, [0, 1], [loaderStart.offsetY, 0]);
  const logoScale = useTransform(blend, [0, 1], [loaderStart.scale, 1]);
  // Asset-Crossfade im Slot: Loader-Siegel faded WEG, Emblem faded EIN.
  const loaderFadeOut = useTransform(blend, [0, 1], [1, 0]);
  const emblemOpacity = useTransform(blend, [0, 1], [0, 1]);

  // ── Scroll-Sperre ─────────────────────────────────────────────────────────
  // Waehrend des gesamten Verlaufs (counting + transition) kein Scrollen;
  // sobald phase="done", sofort wieder frei (Cleanup stellt overflow her).
  useEffect(() => {
    if (phase === "done") return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = prev; };
  }, [phase]);

  // Nav soll warten, bis der Verlauf durch ist — aber nur beim ersten Laden.
  // Bei client-seitiger Ruecknavigation ist introAlreadyPlayed true; bei
  // prefers-reduced-motion gibt es keinen Verlauf, auf den die Nav warten muss.
  useEffect(() => {
    if (introAlreadyPlayed || prefersReducedMotion) return;
    setOpeningDone(false);
    return () => { setOpeningDone(true); };
  }, [prefersReducedMotion]);

  // prefers-reduced-motion: kein Verlauf, direkt der Hero-Endzustand.
  useEffect(() => {
    if (!prefersReducedMotion) return;
    setProgress(100);
    blend.set(1);
    setRevealed(true);
    setPhase("done");
    setOpeningDone(true);
    introAlreadyPlayed = true;
  }, [prefersReducedMotion, blend]);

  // Progress-Counter: alle 30 ms +1 bis 100 (~3 s gesamt).
  useEffect(() => {
    if (phase !== "counting" || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p + 1, 100));
    }, 30);
    return () => window.clearInterval(id);
  }, [phase, prefersReducedMotion]);

  // Bei 100: kurzer Hold, dann in die Uebergangsphase.
  useEffect(() => {
    if (phase !== "counting" || progress < 100 || prefersReducedMotion) return;
    const holdT = window.setTimeout(() => setPhase("transition"), 700);
    return () => window.clearTimeout(holdT);
  }, [phase, progress, prefersReducedMotion]);

  // Uebergang: blend 0→1 animieren (Farbe + Logo), Text gestaffelt darueber.
  // Der Text ist HELL (text-foreground). Er darf erst erscheinen, wenn der
  // Grund dunkel genug ist — sonst helle Schrift auf noch hellem Grund, also
  // unlesbar. Deshalb NICHT an einem festen Timer haengen, sondern an einer
  // blend-Schwelle: revealed erst ab blend >= 0.6 (Grund schon deutlich
  // dunkel). setOpeningDone(true) erst am Ende — dann faehrt die Nav am
  // richtigen Punkt ein und der Scroll wird frei.
  useEffect(() => {
    if (phase !== "transition") return;
    const unsub = blend.on("change", (v) => {
      if (v >= 0.6) setRevealed(true);
    });
    const controls = animate(blend, 1, {
      duration: TRANSITION_DURATION,
      ease: softEase,
      onComplete: () => {
        setRevealed(true);
        introAlreadyPlayed = true;
        setOpeningDone(true);
        setPhase("done");
      },
    });
    return () => { unsub(); controls.stop(); };
  }, [phase, blend]);

  // fadeUp: bestehende Text-Einblendung. Der zeitliche Versatz zum Hintergrund
  // kommt jetzt aus der blend-Schwelle (revealed), nicht aus dem Delay — hier
  // nur noch die kleine Staffelung der Zeilen untereinander.
  const fadeUp = (delay: number) => ({
    initial: false as const,
    animate: revealed
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    transition: prefersReducedMotion
      ? { duration: 0.01 }
      : revealed
        ? { duration: 0.7, ease: softEase, delay: delay + 0.1 }
        : { duration: 0 },
  });

  const counting = phase === "counting";
  // Watercolor-Deckkraft: waehrend des Zaehlens sanft rein (voll bei progress=60),
  // danach voll. Der Farbverlauf selbst laeuft ueber blend, nicht ueber opacity.
  const wcOpacity = counting ? Math.min(1, progress / 60) : 1;

  return (
    <section
      ref={heroRef}
      // h-svh, bewusst NICHT dvh/lvh: dvh folgt live der Adressleiste — genau
      // waehrend die beim ersten Swipe einklappt, aendert sich dann live die
      // Section-Hoehe MITTEN in der Wischgeste, was einen Teil davon
      // "auffrisst". lvh loeste zwar den Rand unten, verschob den
      // zentrierten Titel aber bei sichtbarer Leiste (Normalzustand beim
      // Laden) nach unten. svh ist statisch — kein Ruckeln, Titel/Buttons
      // korrekt zentriert im Normalzustand. Diese Section selbst ist kein
      // `position: fixed` (nur ihr Inhalt gleich, siehe pinPosition) — sie
      // beansprucht nur weiterhin genau eine h-svh-Scrollstrecke im Fluss.
      className="relative h-svh min-h-[640px]"
      aria-label={siteConfig.fullName}
    >
      <motion.div
        style={{ position: pinPosition, top: pinTop, bottom: pinBottom, left: 0, right: 0 }}
        // Dunkler Grund immer — er wird beim Wegscrollen (scrollFade) sichtbar
        // und ist der Hero-Endzustand. Der helle Loader-Grund liegt als eigene
        // Opacity-Ebene darueber (lightOpacity) und faded beim Verlauf weg.
        className="bg-background-deep z-0 flex h-svh min-h-[640px] items-center justify-center overflow-hidden"
      >
      <motion.div
        style={{
          opacity: prefersReducedMotion ? 1 : scrollFade,
          pointerEvents: prefersReducedMotion ? "auto" : pinPointerEvents,
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* Heller Loader-Grund — nur eine Opacity-Ebene, kein filter/kein
            background-color-Tween (verboten). blend=0 → deckt hell, blend=1 →
            weg, der dunkle Grund darunter kommt durch. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-[#f5f3ef]"
          style={{ opacity: lightOpacity }}
        />

        {/* EIN Watercolor-Canvas, durchgehend. blend interpoliert die Farben
            von der hellen s/w-Fassung in die dunkle rote Hero-Fassung. paused
            legt ihn beim Wegscrollen still (frameloop=never), zusaetzlich zum
            internen IntersectionObserver. -inset-1 als Puffer gegen mobile
            Adressleisten-Resizes (siehe video-showcase.tsx). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1"
          style={{ opacity: wcOpacity }}
        >
          <Watercolor
            className="absolute inset-0"
            blend={blend}
            color1="#f5f3ef"
            color2="#2b2b2b"
            saturation={0}
            brightness={0.5}
            color1To="#030304"
            color2To="#7a1a08"
            saturationTo={0.65}
            brightnessTo={0.04}
            opacity={1}
            speed={0.3}
            scale={0.8}
            driftSpeed={0.025}
            warpSpeed={0.05}
            paused={!showBackground}
          />
        </div>

        {/* Der Hero-Text: Emblem, Kanji, H1, Tagline, Buttons — das Emblem ist
            das ERSTE Element ueber der Ueberschrift (volle Deckkraft, kein
            Scrim, das Emblem bringt seinen eigenen Kontrast mit). */}
        <div className="relative z-10 flex max-w-3xl flex-col items-center px-6 text-center">
          {/* Emblem-Slot: der aeussere div ist der UNtransformierte Messpunkt
              (slotRef) an der natuerlichen Position im Textblock; die innere
              Ebene traegt die blend-getriebene Transform (y/scale). Beim Zaehlen
              gross+zentriert wie der Loader, im Hero klein an dieser Stelle.
              logoReady haelt es verborgen, bis einmal gemessen wurde. */}
          <div
            ref={slotRef}
            aria-hidden="true"
            className="relative"
            style={{ width: EMBLEM_WIDTH, opacity: logoReady ? 1 : 0 }}
          >
            <motion.div className="relative" style={{ y: logoY, scale: logoScale }}>
              {/* Emblem — Sizer + Hero-Endzustand, volle Deckkraft. */}
              <motion.div style={{ opacity: emblemOpacity }}>
                <Image
                  src="/img/logo-emblem.png"
                  alt=""
                  width={2212}
                  height={2250}
                  priority
                  className="block h-auto w-full select-none"
                />
              </motion.div>
              {/* Loader-Fassung — darueber, faded im Verlauf weg (Crossfade,
                  kein hartes Umschalten). */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{ opacity: counting ? progress / 100 : loaderFadeOut }}
              >
                <Image
                  src="/img/logo-seal.png"
                  alt=""
                  width={620}
                  height={673}
                  priority
                  className="block h-auto w-full select-none"
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Kein Textschatten mehr: der Grund ist im Hero dunkel (brightness
              0.04), helle Schrift steht kontrastreich; das Wasserzeichen hinter
              dem Text ist weg. jjk-aberrate bewusst NICHT auf der H1. */}
          <motion.h1
            {...fadeUp(0.16)}
            className="text-foreground mt-6 text-[clamp(44px,7.5vw,84px)] leading-[1.02] font-medium tracking-tight text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Jiu-Jitsu Kaisen Academy
          </motion.h1>
          <motion.div {...fadeUp(0.28)} className="mt-9 flex items-center gap-3">
            <MagneticLink
              href="#pricing"
              reduce={prefersReducedMotion}
              className="bg-foreground text-background inline-flex h-13 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Book a trial class
            </MagneticLink>
            <a
              href="#schedule"
              className="bg-background text-foreground border-border hover:bg-muted inline-flex h-13 items-center rounded-full border px-8 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Schedule
            </a>
          </motion.div>
        </div>

        {/* Zaehler unten rechts — blendet aus, sobald 100 erreicht ist (darf ein
            normales Ausblenden sein). Nach dem Verlauf (phase="done") ganz weg. */}
        {phase !== "done" && !prefersReducedMotion && (
          <motion.p
            aria-hidden="true"
            initial={false}
            animate={{ opacity: progress >= 100 ? 0 : 1 }}
            transition={{ duration: 0.5, ease: softEase }}
            className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 text-[clamp(56px,11vw,150px)] leading-none tracking-tighter tabular-nums text-black font-medium select-none"
          >
            {progress}
          </motion.p>
        )}
      </motion.div>
      </motion.div>
    </section>
  );
}
