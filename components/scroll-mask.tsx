"use client";

/**
 * ScrollMask — React Bits Pro component, licensed copy (REACTBITS_LICENSE_KEY
 * in .env.local), added from source per Max's request rather than through
 * the shadcn registry install.
 *
 * Adapted from the stock (image-only) version to also drive a <video>
 * element through the same mask/zoom mechanics — the reveal math doesn't
 * care what it's revealing, it just needs an element to transform, so the
 * "img vs video" choice is isolated to `mediaRef`/`renderMedia` below. Also
 * added `onRevealChange`, used by the JJK video card to start/stop playback
 * in sync with the mask opening instead of a separate IntersectionObserver.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ForwardedRef, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Imperative handle exposed when `controlled` is set — lets a caller drive
 * the reveal from its own progress source (e.g. a gesture-locked
 * framer-motion value) instead of real page scroll. Kept separate from the
 * `progress` prop so high-frequency updates during a gesture don't force a
 * React re-render on every frame.
 */
export interface ScrollMaskHandle {
  setProgress: (p: number) => void;
}

export type ScrollMaskVariant =
  | "iris"
  | "wipe"
  | "curtain"
  | "slats"
  | "grid"
  | "type";

export interface ScrollMaskProps {
  /** Which mask geometry drives the reveal */
  variant?: ScrollMaskVariant;
  /** Image revealed through the mask */
  src?: string;
  /**
   * Video revealed through the mask instead of a static image. Takes
   * priority over `src` when both are given; `src` is then used as the
   * `poster`.
   */
  video?: string;
  /** Alternative text for the image */
  alt?: string;
  /** Word carved out of the frame in the type variant */
  word?: string;
  /** Scroll runway beyond the pinned viewport, in viewport heights */
  scrollLength?: number;
  /** Fraction of the runway after which the reveal has fully opened */
  settle?: number;
  /** Follow damping applied to the scroll position, 0 snaps instantly */
  smooth?: number;
  /** Edge softness of the mask, as a percentage of the frame */
  feather?: number;
  /** Delay spread across pieces, 0 fires them together */
  stagger?: number;
  /** Strip count for slats, column count for grid */
  columns?: number;
  /** Horizontal anchor of the reveal, as a percentage of the frame */
  originX?: number;
  /** Vertical anchor of the reveal, as a percentage of the frame */
  originY?: number;
  /** Sweep direction of the wipe variant, in degrees */
  angle?: number;
  /** Scale the image starts at before settling back to 1 */
  zoom?: number;
  /** How the image fills the frame */
  fit?: "cover" | "contain";
  /** Corner radius of the frame, in pixels */
  radius?: number;
  /** Opacity of the scrim laid over the image */
  overlay?: number;
  /** Colour behind the frame */
  background?: string;
  /** Fade children in as the reveal completes */
  revealContent?: boolean;
  /** Hold the reveal steady instead of damping toward it */
  calm?: boolean;
  /** Content layered over the frame */
  children?: ReactNode;
  /** Extra classes for the outer section */
  className?: string;
  /** id/aria-label on the outer section, for anchor links and a11y */
  id?: string;
  "aria-label"?: string;
  /**
   * Fires with the eased reveal progress (0–1) on every paint. Used to
   * play/pause the video in step with the mask instead of a second
   * observer.
   */
  onRevealChange?: (progress: number) => void;
  /**
   * Forwards the underlying <video>/<img> element to the caller — e.g. to
   * call `.play()`/`.pause()` on it — instead of reaching into the DOM.
   */
  mediaRef?: RefObject<HTMLVideoElement | HTMLImageElement | null>;
  /**
   * A full-bleed layer behind the (padded, rounded) media frame, filling
   * the entire pinned viewport instead of just the frame. Use this for an
   * ambient background that should cover the whole hero, not be boxed
   * inside the reveal card.
   */
  backdrop?: ReactNode;
  /**
   * Drive the reveal from an external progress source instead of real page
   * scroll. Skips the scroll listeners and the sticky/pinned-runway layout
   * entirely — the component just fills its parent and paints whatever
   * progress it's given via the `progress` prop / the `setProgress` method
   * on a forwarded ref. Use the ref for per-frame updates (e.g. from a
   * framer-motion value's `.on("change", ...)`), since that skips React
   * re-renders; `progress` is read once as the initial paint and on
   * subsequent prop changes.
   */
  controlled?: boolean;
  /** Initial (and, on change, live) progress when `controlled` is set. */
  progress?: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
const glide = (t: number) => t * t * (3 - 2 * t);
const ramp = (p: number, from: number, to: number) =>
  clamp((p - from) / Math.max(1e-6, to - from), 0, 1);
const phase = (p: number, delay: number, spread: number) => {
  const s = clamp(spread, 0, 0.92);
  return glide(clamp((p - delay * s) / Math.max(1e-6, 1 - s), 0, 1));
};
const escapeText = (raw: string) =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type Sheet = { image: string; size: string; position: string };
type Layer = [string, string, string];

const VOID: Sheet = {
  image: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))",
  size: "100% 100%",
  position: "0% 0%",
};

const gather = (rows: Layer[]): Sheet => ({
  image: rows.map((r) => r[0]).join(", "),
  size: rows.map((r) => r[1]).join(", "),
  position: rows.map((r) => r[2]).join(", "),
});

const solid = (a: number): Layer => [
  `linear-gradient(rgba(0,0,0,${a.toFixed(3)}), rgba(0,0,0,${a.toFixed(3)}))`,
  "100% 100%",
  "0% 0%",
];

const STOPS = 14;
const ease5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const falloff = (p: number, f: number) => {
  const soft = Math.max(0.8, f);
  const edge = -soft + p * (100 + 2 * soft);
  const opaque = edge - soft;
  if (edge <= 0) return null;
  const span = edge - opaque;
  const head = clamp(-opaque / span, 0, 1);
  const stops: string[] = [];
  for (let i = 0; i <= STOPS; i += 1) {
    const t = head + (1 - head) * (i / STOPS);
    stops.push(
      `rgba(0,0,0,${(1 - ease5(t)).toFixed(4)}) ${(opaque + span * t).toFixed(2)}%`
    );
  }
  return stops.join(", ");
};

const irisSheet = (p: number, f: number, ox: number, oy: number): Sheet => {
  const stops = falloff(p, f);
  if (!stops) return VOID;
  return gather([
    [
      `radial-gradient(circle at ${ox}% ${oy}%, ${stops})`,
      "100% 100%",
      "0% 0%",
    ],
  ]);
};

const wipeSheet = (p: number, f: number, angle: number): Sheet => {
  const stops = falloff(p, f);
  if (!stops) return VOID;
  return gather([
    [`linear-gradient(${angle}deg, ${stops})`, "100% 100%", "0% 0%"],
  ]);
};

const curtainSheet = (p: number, f: number): Sheet => {
  const stops = falloff(p, f);
  if (!stops) return VOID;
  return gather([
    [`linear-gradient(to left, ${stops})`, "50.3% 100%", "0% 0%"],
    [`linear-gradient(to right, ${stops})`, "50.3% 100%", "100% 0%"],
  ]);
};

const typeSheet = (p: number, stamp: string): Sheet => {
  const rows: Layer[] = [[stamp, "contain", "50% 50%"]];
  const cap = ramp(p, 0.54, 1);
  if (cap > 0) rows.push(solid(cap));
  return gather(rows);
};

type Piece = {
  left: number;
  top: number;
  width: number;
  height: number;
  delay: number;
  lift: number;
};

const ScrollMaskInner = (
  {
    variant = "iris",
    src = "",
    video,
    alt = "",
    word = "SCROLL",
    scrollLength = 1.7,
    settle = 0.84,
    smooth = 0.14,
    feather = 14,
    stagger = 0.55,
    columns = 9,
    originX = 50,
    originY = 50,
    angle = 108,
    zoom = 1.14,
    fit = "cover",
    radius = 18,
    overlay = 0,
    background = "transparent",
    revealContent = true,
    calm = false,
    children,
    className,
    id,
    "aria-label": ariaLabel,
    onRevealChange,
    mediaRef,
    backdrop,
    controlled = false,
    progress: externalProgress = 0,
  }: ScrollMaskProps,
  forwardedRef: ForwardedRef<ScrollMaskHandle>
) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);
  const internalMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(
    null
  );
  const zoomRef = mediaRef ?? internalMediaRef;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spin = useRef(0);
  const beat = useRef(0);
  const live = useRef(false);
  const shown = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const isVideo = Boolean(video);
  const mediaSrc = video ?? src;
  const tiled = variant === "slats" || variant === "grid";
  const runway = Math.max(0.25, scrollLength);
  const finish = clamp(settle, 0.35, 1);
  const soft = clamp(feather, 0, 45);
  const ox = clamp(originX, 0, 100);
  const oy = clamp(originY, 0, 100);
  const veiled = clamp(overlay, 0, 1);
  const dim =
    veiled > 0
      ? `linear-gradient(rgba(0,0,0,${veiled}), rgba(0,0,0,${veiled})), `
      : "";

  const stamp = useMemo(() => {
    const label = (word || "SCROLL").trim() || "SCROLL";
    const em = 200;
    const wide = Math.max(260, label.length * em * 0.6 + em * 0.24);
    const high = em * 1.34;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wide.toFixed(0)} ${high.toFixed(0)}">` +
      `<text x="${(wide / 2).toFixed(0)}" y="${(high * 0.74).toFixed(0)}" text-anchor="middle" ` +
      `font-family="system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" ` +
      `font-size="${em}" font-weight="800" letter-spacing="${(-em * 0.035).toFixed(1)}" fill="#000">` +
      `${escapeText(label)}</text></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [word]);

  const frame = useMemo(() => {
    if (!box.w || !box.h) return null;
    const iw = nat.w || box.w;
    const ih = nat.h || box.h;
    const k =
      fit === "contain"
        ? Math.min(box.w / iw, box.h / ih)
        : Math.max(box.w / iw, box.h / ih);
    const cw = iw * k;
    const ch = ih * k;
    return {
      size: `${cw.toFixed(2)}px ${ch.toFixed(2)}px`,
      x: (box.w - cw) / 2,
      y: (box.h - ch) / 2,
    };
  }, [box, nat, fit]);

  const pieces = useMemo<Piece[]>(() => {
    if (!tiled || !box.w || !box.h) return [];
    const cols = clamp(Math.round(columns), 2, 26);
    const rows =
      variant === "slats"
        ? 1
        : clamp(Math.round(cols * (box.h / box.w) * 0.92), 1, 18);
    const cw = box.w / cols;
    const ch = box.h / rows;
    const out: Piece[] = [];
    let far = 1e-6;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const midX = ((c + 0.5) / cols) * 100;
        const midY = ((r + 0.5) / rows) * 100;
        const dx = (midX - ox) / 100;
        const dy = variant === "slats" ? 0 : (midY - oy) / 100;
        const d = Math.hypot(dx, dy);
        if (d > far) far = d;
        out.push({
          left: c * cw,
          top: r * ch,
          width: cw + 1.6,
          height: ch + 1.6,
          delay: d,
          lift: c % 2 === 0 ? -1 : 1,
        });
      }
    }
    for (const piece of out) piece.delay /= far;
    return out;
  }, [tiled, variant, box, columns, ox, oy]);

  const paint = useCallback(
    (raw: number) => {
      const p = glide(clamp(raw / finish, 0, 1));
      let lens = 1;
      if (!tiled && veilRef.current) {
        const el = veilRef.current;
        let sheet: Sheet;
        if (variant === "wipe") sheet = wipeSheet(p, soft, angle);
        else if (variant === "curtain") sheet = curtainSheet(p, soft);
        else if (variant === "type") sheet = typeSheet(p, stamp);
        else sheet = irisSheet(p, soft, ox, oy);
        el.style.setProperty("-webkit-mask-image", sheet.image);
        el.style.setProperty("mask-image", sheet.image);
        el.style.setProperty("-webkit-mask-size", sheet.size);
        el.style.setProperty("mask-size", sheet.size);
        el.style.setProperty("-webkit-mask-position", sheet.position);
        el.style.setProperty("mask-position", sheet.position);
        if (variant === "type") {
          lens = 0.42 + p * 0.58;
          el.style.transform = `scale(${lens.toFixed(4)})`;
        }
      }
      if (zoomRef.current) {
        const s = (1 + (zoom - 1) * (1 - p)) / lens;
        zoomRef.current.style.transform = `scale(${s.toFixed(4)})`;
      }
      if (tiled) {
        const nodes = pieceRefs.current;
        for (let i = 0; i < pieces.length; i += 1) {
          const node = nodes[i];
          if (!node) continue;
          const piece = pieces[i];
          const local = phase(p, piece.delay, stagger);
          if (variant === "slats") {
            const slide = (1 - local) * 62 * piece.lift;
            node.style.transform = `translate3d(0, ${slide.toFixed(2)}%, 0)`;
            node.style.opacity = clamp(local * 1.9, 0, 1).toFixed(3);
          } else {
            node.style.transform = `scale(${(0.9 + local * 0.1).toFixed(4)})`;
            node.style.opacity = local.toFixed(3);
          }
        }
      }
      if (contentRef.current) {
        const e = revealContent ? glide(ramp(p, 0.5, 0.94)) : 1;
        contentRef.current.style.opacity = e.toFixed(3);
        contentRef.current.style.transform = `translate3d(0, ${((1 - e) * 20).toFixed(2)}px, 0)`;
      }
      onRevealChange?.(p);
    },
    [
      angle,
      finish,
      onRevealChange,
      ox,
      oy,
      pieces,
      revealContent,
      soft,
      stagger,
      stamp,
      tiled,
      variant,
      zoom,
    ]
  );

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return 0;
    const view = root.ownerDocument.defaultView;
    const tall = view ? view.innerHeight : 0;
    const rect = root.getBoundingClientRect();
    const run = rect.height - tall;
    if (run <= 0) return 0;
    return clamp(-rect.top / run, 0, 1);
  }, []);

  // Controlled mode: an external caller drives the reveal (see
  // ScrollMaskHandle above) instead of real page scroll. setProgress paints
  // immediately, bypassing the smoothing/RAF chase below entirely — the
  // caller (e.g. a gesture-locked framer-motion value) already supplies a
  // smooth stream of updates.
  useImperativeHandle(
    forwardedRef,
    () => ({
      setProgress: (p: number) => {
        const next = clamp(p, 0, 1);
        shown.current = next;
        paint(next);
      },
    }),
    [paint]
  );

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;

    if (controlled) {
      // No scroll involvement at all: just keep the mask sized to the
      // stage and paint whatever progress we currently have.
      const gauge = () => {
        const rect = stage.getBoundingClientRect();
        setBox((prev) =>
          Math.abs(prev.w - rect.width) > 0.5 ||
          Math.abs(prev.h - rect.height) > 0.5
            ? { w: rect.width, h: rect.height }
            : prev
        );
        paint(shown.current);
      };
      shown.current = clamp(externalProgress, 0, 1);
      gauge();
      view.addEventListener("resize", gauge);
      const watch = new ResizeObserver(gauge);
      watch.observe(stage);
      return () => {
        view.removeEventListener("resize", gauge);
        watch.disconnect();
      };
    }

    const ease = calm ? 0 : clamp(smooth, 0, 0.95);

    const step = (now: number) => {
      const last = beat.current || now;
      const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
      beat.current = now;
      const target = measure();
      const pull = ease > 0 ? 1 - Math.pow(1 - ease, delta * 60) : 1;
      const next = shown.current + (target - shown.current) * pull;
      shown.current = next;
      paint(next);
      if (Math.abs(target - next) > 0.00025) {
        spin.current = view.requestAnimationFrame(step);
      } else {
        shown.current = target;
        paint(target);
        live.current = false;
      }
    };

    const wake = () => {
      if (live.current) return;
      live.current = true;
      beat.current = 0;
      spin.current = view.requestAnimationFrame(step);
    };

    const gauge = () => {
      const rect = stage.getBoundingClientRect();
      setBox((prev) =>
        Math.abs(prev.w - rect.width) > 0.5 ||
        Math.abs(prev.h - rect.height) > 0.5
          ? { w: rect.width, h: rect.height }
          : prev
      );
      wake();
    };

    shown.current = measure();
    paint(shown.current);

    view.addEventListener("scroll", wake, { passive: true });
    doc.addEventListener("scroll", wake, { passive: true, capture: true });
    view.addEventListener("resize", gauge);
    const watch = new ResizeObserver(gauge);
    watch.observe(stage);

    return () => {
      view.cancelAnimationFrame(spin.current);
      live.current = false;
      view.removeEventListener("scroll", wake);
      doc.removeEventListener("scroll", wake, { capture: true });
      view.removeEventListener("resize", gauge);
      watch.disconnect();
    };
  }, [calm, controlled, externalProgress, measure, paint, smooth]);

  // Repaint if the caller drives us via the `progress` prop instead of the
  // ref (ref-based updates are preferred for per-frame gestures, but a
  // plain prop is simpler for anything that only changes occasionally).
  useEffect(() => {
    if (!controlled) return;
    shown.current = clamp(externalProgress, 0, 1);
    paint(shown.current);
  }, [controlled, externalProgress, paint]);

  useEffect(() => {
    if (isVideo || !src) return;
    let alive = true;
    const probe = new Image();
    probe.onload = () => {
      if (alive) setNat({ w: probe.naturalWidth, h: probe.naturalHeight });
    };
    probe.src = src;
    return () => {
      alive = false;
    };
  }, [isVideo, src]);

  useEffect(() => {
    if (!isVideo) return;
    const el = zoomRef.current as HTMLVideoElement | null;
    if (!el) return;
    const onMeta = (): void =>
      setNat({ w: el.videoWidth, h: el.videoHeight });
    el.addEventListener("loadedmetadata", onMeta);
    if (el.videoWidth) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [isVideo]);

  const veilStyle: CSSProperties = tiled
    ? {}
    : {
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskImage: VOID.image,
        maskImage: VOID.image,
        transformOrigin: "50% 50%",
        willChange: "transform",
      };

  return (
    <section
      ref={rootRef}
      id={id}
      aria-label={ariaLabel}
      className={cn("relative w-full", controlled ? "h-full" : "", className)}
      style={
        controlled
          ? { height: "100%", background }
          : { height: `${((1 + runway) * 100).toFixed(2)}vh`, background }
      }
    >
      <div
        className={
          controlled
            ? "relative flex h-full w-full items-center justify-center"
            : "sticky top-0 flex h-screen w-full items-center justify-center p-4 sm:p-8"
        }
      >
        {backdrop ? (
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            {backdrop}
          </div>
        ) : null}
        <div
          ref={stageRef}
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius: `${radius}px` }}
        >
          {tiled ? (
            <div className="absolute inset-0">
              {pieces.map((piece, i) => (
                <div
                  key={i}
                  ref={(node) => {
                    pieceRefs.current[i] = node;
                  }}
                  className="absolute will-change-transform"
                  style={{
                    left: `${piece.left.toFixed(2)}px`,
                    top: `${piece.top.toFixed(2)}px`,
                    width: `${piece.width.toFixed(2)}px`,
                    height: `${piece.height.toFixed(2)}px`,
                    opacity: 0,
                    backgroundImage: mediaSrc
                      ? `${dim}url("${mediaSrc}")`
                      : undefined,
                    backgroundRepeat: dim
                      ? "no-repeat, no-repeat"
                      : "no-repeat",
                    backgroundSize: `${dim ? "auto, " : ""}${frame ? frame.size : "cover"}`,
                    backgroundPosition: `${dim ? "0 0, " : ""}${
                      frame
                        ? `${(frame.x - piece.left).toFixed(2)}px ${(frame.y - piece.top).toFixed(2)}px`
                        : "center"
                    }`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div ref={veilRef} className="absolute inset-0" style={veilStyle}>
              {isVideo ? (
                <video
                  ref={zoomRef as RefObject<HTMLVideoElement>}
                  src={video}
                  poster={src || undefined}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={alt}
                  className="absolute inset-0 h-full w-full select-none object-cover will-change-transform"
                />
              ) : (
                <img
                  ref={zoomRef as RefObject<HTMLImageElement>}
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none will-change-transform"
                  style={{ objectFit: fit }}
                />
              )}
              {veiled > 0 ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `rgba(0,0,0,${veiled})` }}
                />
              ) : null}
            </div>
          )}
          {children ? (
            <div
              ref={contentRef}
              className="absolute inset-0 flex items-center justify-center p-6 will-change-transform sm:p-10"
              style={{ opacity: revealContent ? 0 : 1 }}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const ScrollMask = forwardRef(ScrollMaskInner);
ScrollMask.displayName = "ScrollMask";

export default ScrollMask;
