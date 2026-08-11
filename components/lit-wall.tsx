"use client";

/**
 * LitWall — one painted wall, two rooms, one set of lights.
 *
 * ── What this replaced, and why ─────────────────────────────────────────────
 * There used to be two components here. `Candlelit` put a pool of light under
 * the pointer and left everything else near black; `InkLight` lit itself from
 * the pigment in the wall. Two sections, two lighting rigs, sitting directly on
 * top of each other.
 *
 * Every problem that section boundary produced was a consequence of that, and
 * each one got its own patch:
 *
 *   the background tile restarted at each section, so a `--wall-y` offset was
 *   added to anchor both to the document instead
 *
 *   the two rested at different darknesses, so the numbers were matched by hand
 *
 *   light from the lower section could not cross upward, so a spill layer was
 *   added to throw some of the glow over the boundary
 *
 *   and finally the pointer pool was being clipped at the section's own box, so
 *   the light ended in a straight horizontal line whenever the cursor came near
 *   the bottom of the upper section
 *
 * Four fixes for one fact: the wall is one wall and the lighting was two. So
 * now it is one component used twice, with the pointer and the ignition state
 * shared between them. The first three patches are gone — `--wall-y` still
 * exists but nothing has to be reconciled — and the fourth cannot happen,
 * because both sections draw the same pool at the same document position and
 * each simply shows its own half of it.
 *
 * ── The state ───────────────────────────────────────────────────────────────
 * Both sections are always in the same state. There is exactly one thing that
 * changes, `--unlit`, and it runs from 1 to 0 as the second section arrives:
 *
 *   1   the figures are cold. Both sections are near black and the pointer is
 *       the only light there is.
 *   0   the figures are alight. They open the darkness in the shape of the
 *       light they throw — in BOTH sections, so the wall above lights up too.
 *
 * The class is `jjk-wall-section` and not the shorter name it started with:
 * `.jjk-lit` was already taken by a utility in the design system, so every
 * section was silently picking up a `z-index: 30` that belonged to something
 * else entirely.
 *
 * That is the whole design. The second section does not look different from the
 * first; it looks like the first one after something happened. Nothing has to
 * cross the boundary because there is nothing on either side of it that differs.
 *
 * ── How the darkness is lerped ──────────────────────────────────────────────
 * The veil carries two mask layers and the default compositing between mask
 * layers is `add`, i.e. union: A + B − AB.
 *
 *   A   the shade map — opaque where no figure reaches, transparent where one
 *       does (public/img/wall-shade.webp, out of scripts/gen-wall.py)
 *   B   flat black at alpha `--unlit`
 *
 * Union with a constant b works out to A + b(1 − A). At b = 1 that is 1
 * everywhere — full darkness, no figure holes. At b = 0 it is A — the holes at
 * full strength. So one variable cross-fades between the two states without
 * needing a second copy of anything.
 *
 * It has to be a mask on the DARKNESS rather than a brighter glow on top. The
 * glow is screened, and screen can only add light: turning it up gives red
 * pools floating on black, never lit paper. Removing darkness is what lets the
 * paper come back with its texture.
 *
 * Under `prefers-reduced-motion` none of this exists and the children render
 * plainly.
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

/** Peak opacity of the glow plate once the figures are alight. */
const GLOW_INTENSITY = 0.42;

export interface WallLightProps {
  children: ReactNode;
  /**
   * Radius of the pointer's pool of light, in px.
   *
   * Large, and larger than it was. This is a candle held close to a wall, not a
   * torch beam: a small pool turns reading the section into a search, and at 620
   * a paragraph was wider than the light that was meant to be showing it.
   */
  radius?: number;
  /** How dark the wall is where no light of any kind reaches, 0–1. */
  darkness?: number;
  /** How quickly the pool catches up with the pointer, 0–1 per frame. */
  ease?: number;
  /**
   * The room is already lit. No torch, no ignition — `--unlit` is pinned at 0.
   *
   * For everything below the two sections that earn the reveal. The wall, the
   * veil and the glow plate are the SAME layers at the SAME values, which is
   * the whole reason this is a flag on the existing component rather than a
   * second implementation: two lighting rigs that are meant to look identical
   * will drift, and the seam between them is exactly where anybody looking at
   * the page will be looking.
   *
   * The pointer loop is skipped entirely. `--torch` is `--lit × --unlit`, so at
   * `--unlit: 0` the pool is already worth nothing — tracking a pointer to
   * multiply it by zero sixty times a second is work for no picture.
   */
  lit?: boolean;
  className?: string;
}

/**
 * The provider. Wraps every section that shares this wall.
 *
 * The pointer is tracked HERE rather than in the individual sections, and that
 * is the whole point of the component existing: the pool's position is in this
 * element's coordinates, so a pool near a section boundary is drawn by both
 * sections, each showing the part that falls inside itself. They join exactly,
 * because they are the same circle at the same place.
 */
export function WallLight({
  children,
  radius = 620,
  darkness = 0.93,
  ease = 0.16,
  lit = false,
  className = "",
}: WallLightProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced || lit) return;
    // ── Ohne Zeiger: das Licht folgt dem Lesen ──────────────────────────
    // Hier stand vorher ein Ausstieg — kein Zeiger, kein Licht. Auf dem Handy
    // hiess das: die Wand bleibt schwarz, und die Figuren darauf sieht nie
    // jemand. Das war als "vollstaendiges Bild statt verschlechtertem"
    // gedacht, aber ein vollstaendiges Bild ist es nur, wenn etwas darauf zu
    // sehen ist.
    //
    // Was den Zeiger ersetzt, ist der Scroll. Der Lichtkegel steht dort, wo
    // gerade gelesen wird — mittig in der Breite, auf Höhe der Bildschirmmitte
    // — und wandert mit. Dieselbe Idee wie am Rechner: das Licht ist da, wo
    // die Aufmerksamkeit ist. Nur die Quelle der Position ist eine andere.
    if (!window.matchMedia("(pointer: fine)").matches) {
      let raf: number | null = null;

      const place = (): void => {
        raf = null;
        const rect = el.getBoundingClientRect();
        // Etwas ueber der Mitte: gelesen wird im oberen Drittel, nicht in der
        // geometrischen Mitte des Schirms.
        const target = window.innerHeight * 0.42;
        el.style.setProperty("--px", `${(rect.width * 0.5).toFixed(1)}px`);
        el.style.setProperty("--py", `${(target - rect.top).toFixed(1)}px`);
        el.style.setProperty("--lit", "1");
      };

      const onScroll = (): void => {
        if (raf === null) raf = requestAnimationFrame(place);
      };

      place();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });

      return () => {
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    let frame: number | null = null;
    let tx = 0;
    let ty = 0;
    let lx = 0;
    let ly = 0;
    let seeded = false;

    const step = (): void => {
      lx += (tx - lx) * ease;
      ly += (ty - ly) * ease;
      el.style.setProperty("--px", `${lx.toFixed(1)}px`);
      el.style.setProperty("--py", `${ly.toFixed(1)}px`);
      // Park the loop once the light has arrived, so a still pointer costs
      // nothing at all.
      if (Math.abs(tx - lx) > 0.5 || Math.abs(ty - ly) > 0.5) {
        frame = requestAnimationFrame(step);
      } else {
        frame = null;
      }
    };

    const onMove = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
      // Bewegung IST Anwesenheit. `pointerenter` feuert nur beim Ueberqueren
      // der Kante, und wer beim Laden schon im Element steht, ueberquert sie
      // nie — der Torch blieb dann aus, obwohl der Zeiger die ganze Zeit da
      // war. Genau der Fall, den das Intro erzeugt: man faehrt hinein, um zu
      // klicken, und faehrt nicht wieder heraus.
      el.style.setProperty("--lit", "1");
      if (!seeded) {
        // First contact: start the pool under the cursor rather than sliding it
        // in from the corner.
        lx = tx;
        ly = ty;
        seeded = true;
      }
      if (frame === null) frame = requestAnimationFrame(step);
    };

    // Und ein Startpunkt, falls gar nicht bewegt wird. Ohne ihn stehen --px
    // und --py auf 0,0 — der linken oberen Ecke des DOKUMENTS, nicht des
    // Bildschirms — und der Lichtkegel oeffnet sich irgendwo weit oben ausserhalb
    // des Sichtfelds. Die Mitte des Sichtfelds ist der einzige Ort, an dem er
    // ohne Information richtig liegt.
    const rect0 = el.getBoundingClientRect();
    lx = tx = window.innerWidth / 2 - rect0.left;
    ly = ty = window.innerHeight / 2 - rect0.top;
    el.style.setProperty("--px", `${lx.toFixed(1)}px`);
    el.style.setProperty("--py", `${ly.toFixed(1)}px`);

    const onEnter = (): void => el.style.setProperty("--lit", "1");
    const onLeave = (): void => el.style.setProperty("--lit", "0");

    el.addEventListener("pointermove", onMove, { passive: true });
    // Auch ein Druck ohne vorherige Bewegung. Wer das Intro anklickt, ohne die
    // Maus zu bewegen — der Zeiger stand schon auf dem Knopf —, hat sonst
    // weder ein `enter` noch ein `move` erzeugt und steht danach im Dunkeln.
    el.addEventListener("pointerdown", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, ease, lit]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div
      ref={rootRef}
      className={`jjk-wall-light ${className}`}
      style={
        {
          "--pool": `${radius}px`,
          "--dark": darkness,
          ...(lit ? { "--unlit": 0 } : {}),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export interface LitWallProps {
  children: ReactNode;
  /**
   * Raise this section's content above the darkness.
   *
   * Off by default, which is the whole idea of the first section: the veil
   * falls over the writing and the pointer uncovers it. It is the wrong
   * treatment for pictures — a dozen photographs under the same darkness are a
   * dozen dark rectangles — so the gallery sets it and is lit from behind
   * instead of through.
   */
  lift?: boolean;
  /**
   * Set on the section whose arrival lights the figures.
   *
   * Exactly one section in a `WallLight` should carry it. The value it computes
   * is written to the shared parent, so every section changes together — which
   * is the effect: you scroll down, and the whole wall catches, including the
   * part you have already passed.
   */
  ignites?: boolean;
  className?: string;
}

/** One section of the wall. */
export function LitWall({
  children,
  ignites = false,
  lift = false,
  className = "",
}: LitWallProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Two offsets, and they are not the same number.
  //
  //   --wall-y  the section's distance from the top of the DOCUMENT, negated.
  //             `background-position: 0 -offsetTop` makes the section a window
  //             onto one virtual tile plane laid over the whole page, so the
  //             tile never restarts at a section edge.
  //
  //   --sec-y   the section's distance from the WallLight it sits in. The
  //             pointer arrives in the parent's coordinates and this is what
  //             converts it to local ones.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (): void => {
      const box = el.getBoundingClientRect();
      // The WallLight, not `parentElement`. `--py` arrives in the PROVIDER's
      // coordinates, so the offset that converts it to local ones has to be
      // measured against the same element — the moment anything is wrapped in
      // between, a parent-relative offset is wrong by the height of whatever
      // sits above. Identical to `parentElement` while the sections are direct
      // children, which is why this cost nothing to make correct.
      const parent = el.closest(".jjk-wall-light")?.getBoundingClientRect();
      el.style.setProperty("--wall-y", `-${(box.top + window.scrollY).toFixed(0)}px`);
      el.style.setProperty("--sec-y", `${(box.top - (parent?.top ?? 0)).toFixed(0)}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // "start end" is the moment this section's top edge reaches the bottom of the
  // window; "start 30%" is when it has climbed to a third down the screen. The
  // figures catch across that run-in, so it is over well before there is
  // anything worth reading on screen.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 30%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!ignites) return;
    // Written to the PARENT, not to this element. That is what makes the wall
    // above light up at the same time — one variable, inherited by every
    // section under the same WallLight.
    // Written to the WallLight itself, for the same reason: every section under
    // it has to inherit the value, and only the provider is an ancestor of all
    // of them.
    const parent = ref.current?.closest(".jjk-wall-light");
    if (!(parent instanceof HTMLElement)) return;
    const unlit = 1 - Math.min(1, Math.max(0, v));
    parent.style.setProperty("--unlit", unlit.toFixed(3));
  });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={`jjk-wall-section ${className}`}
      {...(lift ? { "data-lift": "" } : {})}
    >
      <div className="jjk-wall" aria-hidden="true" />
      {children}
      <div className="jjk-veil" aria-hidden="true" />
      <div
        className="jjk-wall-glow"
        aria-hidden="true"
        style={{ opacity: `calc((1 - var(--unlit, 1)) * ${GLOW_INTENSITY})` }}
      />
      <div className="jjk-candle" aria-hidden="true" />
    </div>
  );
}

export default LitWall;
