"use client";

/**
 * FlyIn — the opening: a search across Graz that finds the gym and sets the map
 * alight from it.
 *
 * ── Why it exists ───────────────────────────────────────────────────────────
 * The backdrop is a light map of Graz. Two things were wrong with simply showing
 * it. It reads unmistakably as a city and not at all as an Austrian one — and a
 * map that is just THERE when the page opens is wallpaper, however good it is.
 *
 * The first version answered the first problem: a four-plate dive from Austria
 * down to a street, so the country was the thing you recognised on the way in.
 * It never touched the second one. Camera work on wallpaper is still wallpaper.
 *
 * So the map now has a reason to be on screen. A question is asked in the open —
 * "WO LIEGT DAS BESTE BJJ GYM?" — and something goes looking for the answer,
 * fails five times in public, dives onto the Kasernstraße, opens a file on it,
 * and waits. The click sets the city on fire from that address outward along its
 * own streets. The reader is not shown where the gym is; they watch it be found.
 *
 * The beats are in lib/fly-path.ts and the drawing is in lib/fly-gl.ts. This
 * file is the clock, the interface and the plumbing between them.
 *
 * ── Where the click is ──────────────────────────────────────────────────────
 * The clock is not free-running. It plays up to READY_AT — search finished,
 * camera dived onto the address, file open, map still cold — and then STOPS.
 * Nothing else happens until the reader clicks, and what the click buys them is
 * the fire.
 *
 * That is the whole reason the click exists. A sequence that plays itself out
 * and then asks to be dismissed has a dialog box at the end of it; this one has
 * the reader causing the best thing on the page. It also settles a composition
 * argument for free: the fire wants the frame wide and the address wants it
 * close, and those only stop fighting once they are in sequence.
 *
 * ── Why the interface is in a portal ────────────────────────────────────────
 * Because it was being drawn inside a scaled, tilted box and nobody could read
 * it. The hero puts its whole city layer — backdrop AND this — inside a wrapper
 * carrying `scale: 1.12` and `rotateX: 7deg` at a 1400px perspective (REST_SCALE
 * and REST_TILT in lib/flythrough.ts). The MAP has to be in there, or the last
 * frame of the opening is not the frame the backdrop is showing. The interface
 * emphatically does not: measured on a 1920×950 viewport, a corner readout with
 * a 66px inset lands at x = −1.8, its opposite number lands at 1921.8, and a
 * marker at 94% of the frame height lands at y = 959 of 950 — off the bottom of
 * the screen entirely, which is where the address went.
 *
 * So the map stays in the wrapper and everything else is portalled to the body,
 * where a pixel is a pixel. `heroScreen` below is the one piece of arithmetic
 * that connects them: it puts a point through the same transform by hand, so the
 * brackets still land exactly on the street they are pointing at.
 *
 * ── Why the question is not typed ───────────────────────────────────────────
 * It was going to be a real input, and then it was a line typing itself with a
 * blinking block caret. Both are wrong, for two different reasons.
 *
 * An input is wrong because most readers will not type, and the few who do will
 * type something no BJJ gym's landing page can answer — so the one interactive
 * element on the page would be the one that fails. What the reader actually gets
 * to do is the thing at the END: a click on an address that is by then the only
 * lit thing on the screen.
 *
 * Typing is wrong because of what it SOUNDS like. A caret ticking out characters
 * is a terminal, and a terminal is the one register this page does not have —
 * everything else here is brush, paper and stamp. So the question is a title:
 * two lines, present from the moment the map is, arriving as one thing. Written
 * already, the way anything on a scroll is written already.
 *
 * ── Why it starts black ─────────────────────────────────────────────────────
 * The clock does not start on mount, it starts when there is something to look
 * at: the plate decoded, the arrival-time field uploaded, the first frame drawn.
 * A timeline that begins while the pictures are still in flight plays its first
 * beat to nobody. Until then the layer is a black rectangle, which is also the
 * right first frame for something that is about to boot.
 *
 * ── The two renderers ───────────────────────────────────────────────────────
 *   the canvas   the plate as real geometry under a perspective camera, the cold
 *                pass and the fire in plate space, raster and sweep on top. This
 *                is what ships.
 *
 *   the images   the same plates as <img> elements carrying the SAME camera as a
 *                CSS `matrix3d` — see Camera.cssMatrix. The fallback where there
 *                is no WebGL2. It cannot do the cold pass or the ignition, so
 *                there the search still runs and the map is simply always hot.
 *
 * The camera is flat for the whole opening — no tilt, no bank of its own — so
 * the two are the same picture at every instant rather than only at a hold, and
 * the hand-over needs no timing games. That is not a simplification for its own
 * sake: the stack used to be a plain `scale()` with no perspective and no safety
 * zoom, and the moment the canvas took over the map shifted and grew by up to a
 * third.
 *
 * ── The hand-over at the end ────────────────────────────────────────────────
 * Cold, raster, vignette, grain, sweep and the camera's pull-out are all exactly
 * zero on the last frame, so it is the plain plate at plain cover scale — the
 * picture already sitting underneath. The layer is taken away and the context
 * given back; an idle WebGL context holding two plates and their mipmaps is not
 * free, because browsers cap live contexts and evict the oldest.
 *
 * Under `prefers-reduced-motion` it renders nothing, reports itself landed
 * immediately, and the page carries on without any of this.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/lib/motion";
import { PERSPECTIVE, REST_SCALE, REST_TILT } from "@/lib/flythrough";
import { createFlyGL, makeCamera, sourcesFrom, type FlyGL } from "@/lib/fly-gl";
import {
  DOSSIER,
  DOSSIER_IMAGE,
  END_AT,
  ENSO_KM,
  FIRE_AT,
  IGNITE_SRC,
  PLACES,
  SUMI_SRC,
  PLATES,
  QUERY,
  QUERY_JP,
  READY_AT,
  RED_AT,
  TARGET,
  assertAssetsMatch,
  stateAt,
} from "@/lib/fly-path";
import { ENSO_PATHS, ENSO_START, ENSO_SWEEP, ENSO_VIEW } from "@/lib/enso";

/** Reticle size limits, so it is findable on a phone and never becomes a frame. */
const MARK_MIN_PX = 26;
const MARK_MAX_PX = 200;

/**
 * The same limits for the brush circles, wider at both ends.
 *
 * Wider because they are not a click target, they are a drawing: a circle around
 * a landmark eight kilometres out is allowed to be small, and the answer's
 * circle after the dive is allowed to be a third of the screen. Only the LAST
 * one is ever clicked, and it carries the reticle's limits, not these.
 */
const ENSO_MIN_PX = 34;
const ENSO_MAX_PX = 460;

/** Scratch for the image stack's camera, so it does not fight the renderer's. */
const FLAT_MVP = new Float32Array(16);

/** How long the canvas is given to get going before the opening starts without it. */
const GL_DEADLINE_MS = 1500;

/** How much faster the rest of the sequence runs once somebody clicks through it. */
const SKIP_RATE = 3;

/**
 * Where the file sits relative to the brackets: how far to the side, how far up
 * from their centre, and how close it may come to the edge of the screen.
 *
 * Up and to the right by about a card's height, which is where a reader's eye
 * already is once the dive has landed — and far enough that the wire between
 * them is a wire and not a hyphen.
 */
const FILE_GAP = 76;
const FILE_RISE = 150;
const FILE_MARGIN = 20;

const RAD = Math.PI / 180;

/**
 * A point in the map layer's own coordinates, in screen pixels.
 *
 * The hero wraps the map in `perspective(1400px) scale(1.12) rotateX(7deg)`
 * about the layer's centre — that is framer-motion's own ordering, so rotateX
 * applies first, then the scale, then the divide. Written out rather than read
 * back from the DOM: the interface is placed every frame, and asking the browser
 * for a matrix sixty times a second is a layout read in an animation loop.
 *
 * `u` and `v` are 0–1 across the layer, which is the section, which is the
 * viewport. Returns pixels from the layer's top-left, and the scale factor the
 * transform applies there — the brackets have to grow by it too, or they stop
 * being the size of the thing they are around.
 */
function heroScreen(u: number, v: number, w: number, h: number): {
  x: number;
  y: number;
  k: number;
} {
  const dx = (u - 0.5) * w;
  const dy = (v - 0.5) * h;
  const z = dy * Math.sin(REST_TILT * RAD);
  const f = PERSPECTIVE / (PERSPECTIVE - z);
  return {
    x: w / 2 + REST_SCALE * dx * f,
    y: h / 2 + REST_SCALE * dy * Math.cos(REST_TILT * RAD) * f,
    k: REST_SCALE * f,
  };
}

export interface FlyInProps {
  /** Called once the reader has asked for the fire. */
  onLanded?: () => void;
  /** Seconds the landed frame is held before the layer lets go. */
  hold?: number;
  className?: string;
}

export function FlyIn({ onLanded, hold = 0.15, className = "" }: FlyInProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const igniteRef = useRef<HTMLImageElement>(null);
  const sumiRef = useRef<HTMLImageElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const ensoRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const sealRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<SVGPolylineElement>(null);
  const reduced = useReducedMotion();

  // The interface lives outside the hero's transformed wrapper — see the note at
  // the top — which means it can only be attached once there is a document.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The clock the whole sequence is a function of, and how fast it is running.
  // Refs rather than state: the loop reads them sixty times a second and nothing
  // in the tree depends on them — every changing thing below is written straight
  // to the DOM, which is the only way a per-frame interface is affordable.
  const clock = useRef(0);
  const rate = useRef(1);
  /** False until the reader has asked for the fire. The clock parks meanwhile. */
  const fired = useRef(false);
  const landedRef = useRef(false);
  const handOver = useRef(false);

  /**
   * One click, and it means one of two things depending on when it lands.
   *
   * Before the search is over it is impatience: the rest plays faster, and from
   * the answer's own circle at the earliest, so nobody can skip past the beat
   * that explains what they are looking at. Once the search IS over it is the
   * actual point of the whole sequence — it releases the clock, and what the
   * clock does next is press THEIR seal onto the address and light the city
   * from it. The machine goes as far as certainty and stops; the decision is
   * not its to make.
   */
  const act = useCallback((): void => {
    if (fired.current) return;
    if (clock.current >= READY_AT) {
      fired.current = true;
      return;
    }
    if (clock.current < RED_AT) clock.current = RED_AT;
    rate.current = SKIP_RATE;
  }, []);

  useEffect(() => {
    if (reduced) {
      onLanded?.();
      return;
    }
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const stack = stackRef.current;
    if (!root || !canvas || !stack) return;

    void assertAssetsMatch();

    const images = Array.from(stack.querySelectorAll<HTMLImageElement>("img[data-km]"));
    let gl: FlyGL | null = null;
    let uploaded = false;
    let dead = false;
    let fellBack = false;

    // ── Bringing the canvas up ────────────────────────────────────────────────
    // The images are already being fetched by the markup, so this waits on the
    // decode rather than starting a second set of requests. `decode()` resolves
    // when the bitmap is ready to be handed to the GPU, which is exactly the
    // moment texImage2D stops being a stall.
    const first = images[0];
    const bring = async (): Promise<void> => {
      const ready = await Promise.race([
        (first
          ? first.decode().then(() => true)
          : Promise.resolve(false)
        ).catch(() => Boolean(first?.complete && first.naturalWidth > 0)),
        new Promise<false>((r) => window.setTimeout(() => r(false), GL_DEADLINE_MS)),
      ]).catch(() => false);

      if (!ready || dead || fellBack) return;
      const made = createFlyGL(
        canvas,
        sourcesFrom(images),
        igniteRef.current,
        sumiRef.current
      );
      if (!made || dead || fellBack) {
        made?.dispose();
        return;
      }
      gl = made;
    };
    void bring();

    const onResize = (): void => gl?.resize();
    window.addEventListener("resize", onResize);

    let raf = 0;
    let armed = false;
    let swapped = false;
    let lastName = "";
    let lastNote = "";
    let lastPhase = "";
    // Measured once, when the file first has a size. Reading offsetHeight every
    // frame is a forced layout inside an animation loop.
    let fileW = 0;
    let fileH = 0;
    const t0 = performance.now();
    let last = t0;

    const frame = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // ── Getting ready ──────────────────────────────────────────────────────
      // One unit of set-up per frame — the program link first, then the coarse
      // plate, then the arrival-time field, then the detail plate. All of it
      // used to happen in the frame the canvas was created in, which is the
      // first frame of the page, and it visibly stuck.
      if (gl) {
        if (!uploaded) uploaded = gl.step();
        if (gl.failed()) {
          gl.dispose();
          gl = null;
        }
      }
      if (!armed) {
        if (now - t0 > GL_DEADLINE_MS && !uploaded) {
          // Written off. The context goes back rather than being left to render
          // into a canvas that will now never be shown — see the swap below for
          // why it can never be shown once this has happened.
          fellBack = true;
          gl?.dispose();
          gl = null;
        }
        // Nothing on screen yet is not a reason to start the clock — but the
        // deadline is. See the note at the top on why it starts black.
        armed = (Boolean(gl) && uploaded) || fellBack;
        if (!armed) {
          raf = requestAnimationFrame(frame);
          return;
        }
      }

      // The hole in the timeline. Everything past READY_AT is the fire, and the
      // fire is the reader's to start — see `act`.
      clock.current += dt * rate.current;
      if (!fired.current) clock.current = Math.min(clock.current, READY_AT);
      if (clock.current >= END_AT) landedRef.current = true;
      const t = clock.current;

      // The page is handed over when the SEAL LANDS, not at the end of the fire
      // and not at the click. `onLanded` mounts the title card and every hero
      // beat is an offset from that moment, so the first kanji lands in the
      // middle of the ignition — the glyphs strike while the city burns rather
      // than politely afterwards.
      //
      // The quarter second between the click and the contact is the stamp
      // coming down. Handing over on the click would put the title card's first
      // frame under a seal that has not touched the paper yet.
      if (fired.current && !handOver.current && clock.current >= FIRE_AT) {
        handOver.current = true;
        onLanded?.();
      }

      const w = root.clientWidth;
      const h = Math.max(1, root.clientHeight);
      const aspect = w / h;
      const st = stateAt(t, aspect);

      // Two state flags, so what is a look rather than a position stays a CSS
      // concern instead of another thing this loop writes sixty times a second.
      // `data-phase` shows the cue once the sequence is waiting; `data-hit` is
      // the layer turning from cold to warm.
      //
      // `data-found` used to be a third, driving the file's unfolding as a
      // keyframe animation. The slip unrolls from the timeline now — the reader
      // can skip the whole beat with a click, and a keyframe that starts when a
      // selector begins to match would have started playing at the exact moment
      // the map was supposed to be catching fire.
      const layer = layerRef.current;
      if (layer && st.phase !== lastPhase) {
        layer.dataset["phase"] = st.phase;
        layer.toggleAttribute("data-hit", st.hit);
        lastPhase = st.phase;
      }

      if (gl) {
        if (gl.render(st.pose, t) && !swapped && !fellBack) {
          // No crossfade and no timing games: the stack and the canvas are the
          // same picture, because the camera is flat for the whole opening and
          // both are given the same one. The only thing that must not happen is
          // a swap AFTER the fallback has been committed to — the stack cannot
          // do the cold pass, so that would be a jump from a hot map to a cold
          // one in the middle of the search.
          swapped = true;
          canvas.style.opacity = "1";
          // Full-size images with `will-change: transform` are composited
          // layers. Taking them out of the tree is the swap AND frees the memory.
          stack.style.display = "none";
        }
      }

      const cam = makeCamera(st.pose, aspect);

      if (!swapped) {
        // The same camera with nothing taken out — the opening never tilts, so
        // there is no attitude to strip and no risk of the projective transform
        // folding the element inside out. Revealed only once a transform is on
        // it: untransformed, the markup shows the plate at plain container width.
        const flat = makeCamera(st.pose, aspect, FLAT_MVP);
        images.forEach((img, i) => {
          img.style.transform = flat.cssMatrix(Number(img.dataset.km), w, w, h);
          img.style.opacity = (st.pose.alpha[i] ?? 0).toFixed(3);
        });
        stack.style.opacity = fellBack ? "1" : "0";
      }

      const veil = veilRef.current;
      if (veil) veil.style.opacity = st.veil.toFixed(3);

      // ── The interface ──────────────────────────────────────────────────────
      const question = questionRef.current;
      if (question) question.style.opacity = st.question.toFixed(3);

      // ── The circles ────────────────────────────────────────────────────────
      //
      // Six of them, anchored to GROUND: five places the search rejected and the
      // one it did not. They are not a reticle being moved around, they are
      // marks left on a map, so each one is projected from its own coordinates
      // every frame and none of them is ever cleared. Once the camera dives they
      // slide off the frame, which is exactly what marks on a map do.
      //
      // The draw-on is a conic mask sweeping the finished shape from the angle
      // the brush landed at — see lib/enso.ts, which shares the convention.
      const ensoEls = ensoRefs.current;
      let targetPx = MARK_MIN_PX;
      for (let i = 0; i < PLACES.length; i++) {
        const el = ensoEls[i];
        const g = PLACES[i];
        if (!el || !g) continue;
        const drawn = st.enso[i] ?? 0;
        // The answer's circle lives as long as the answer does; the guesses go
        // with the rest of the furniture when the fire starts.
        const shown = drawn <= 0 ? 0 : i === PLACES.length - 1 ? st.readout : st.chrome;
        if (shown <= 0.001) {
          if (el.style.opacity !== "0") el.style.opacity = "0";
          continue;
        }
        const km = ENSO_KM[i] ?? 0.5;
        const c = cam.project(g.x, g.y);
        const edge = cam.project(g.x + km / 2, g.y);
        // Unclamped, unlike the reticle: a circle that has been slid back onto
        // the screen is no longer around the place it was drawn around. The
        // range guard is only there to keep the perspective divide sane.
        const seat = heroScreen(
          Math.min(3, Math.max(-2, c.x)),
          Math.min(3, Math.max(-2, c.y)),
          w,
          h
        );
        const px = Math.min(
          ENSO_MAX_PX,
          Math.max(ENSO_MIN_PX, Math.abs(edge.x - c.x) * 2 * w * seat.k)
        );
        if (i === PLACES.length - 1) targetPx = px;
        el.style.left = `${seat.x.toFixed(1)}px`;
        el.style.top = `${seat.y.toFixed(1)}px`;
        el.style.width = `${px.toFixed(1)}px`;
        el.style.height = `${px.toFixed(1)}px`;
        el.style.opacity = shown.toFixed(3);
        el.style.setProperty("--draw", `${(drawn * ENSO_SWEEP).toFixed(1)}deg`);
      }

      // ── The reticle ────────────────────────────────────────────────────────
      //
      // Sized by putting a fixed patch of GROUND through the same camera the
      // renderer uses, so the brackets sit around the place rather than around a
      // number of pixels — and they tighten from a search box to an address when
      // the dive happens because that patch shrinks. Then both the position and
      // the size go through the hero's wrapper transform by hand, because the
      // brackets are drawn outside it and the map is drawn inside it.
      //
      // It is a real focusable button and not a dot, for two reasons: the
      // opening has to be passable on a keyboard, and the ring cursor morphs to
      // whatever it hovers, so over this it becomes the brackets themselves.
      const p = cam.project(st.mark.x, st.mark.y);
      const l = cam.project(st.mark.x - st.markKm / 2, st.mark.y);
      const r = cam.project(st.mark.x + st.markKm / 2, st.mark.y);
      const at = heroScreen(
        Math.min(0.99, Math.max(0.01, p.x)),
        Math.min(0.99, Math.max(0.01, p.y)),
        w,
        h
      );
      // While the search runs there is no reticle at all — the circles are doing
      // that job — so this is only ever the answer's own box. Sized off the last
      // circle when it exists, so the click target IS the drawing and not a
      // rectangle near it.
      const size =
        st.hit && targetPx > MARK_MIN_PX
          ? Math.min(MARK_MAX_PX, targetPx * 0.82)
          : Math.min(MARK_MAX_PX, Math.max(MARK_MIN_PX, Math.abs(r.x - l.x) * w * at.k));
      // Kept inside the screen, and that is not always the same thing as being
      // on the street: the plate is 16:9 and the gym is 1.97 km south of its
      // centre, so a viewport wider than that crops the bottom of the plate away
      // and takes the address with it. Sliding the brackets to the edge is a
      // smaller lie than a click target that is not on the screen.
      const markX = Math.min(w - 24, Math.max(24, at.x));
      const markY = Math.min(h - 30, Math.max(30, at.y));

      const marker = markerRef.current;
      if (marker) {
        marker.style.left = `${markX.toFixed(1)}px`;
        marker.style.top = `${markY.toFixed(1)}px`;
        marker.style.width = `${size.toFixed(1)}px`;
        marker.style.height = `${size.toFixed(1)}px`;
        marker.style.opacity = st.readout.toFixed(3);
        // The snap: the brackets arrive a touch wide and close on the target.
        marker.style.setProperty("--snap", (1 + 0.35 * (1 - st.snap)).toFixed(3));
      }

      // ── The seal ───────────────────────────────────────────────────────────
      //
      // It comes down onto the answer's circle from above the plane of the
      // screen: too big and transparent, then hard onto the paper, then the one
      // small overshoot a hand gives a stamp it has pressed properly. Contact is
      // at 0.72 of the beat, which is also where the map takes its flash — see
      // SEAL_HIT in lib/fly-path.ts.
      const seal = sealRef.current;
      if (seal) {
        const q = st.seal;
        if (q <= 0) {
          if (seal.style.opacity !== "0") seal.style.opacity = "0";
        } else {
          const drop = q < 0.72 ? Math.pow(1 - q / 0.72, 2) : 0;
          const settle = q >= 0.72 ? Math.sin(((q - 0.72) / 0.28) * Math.PI) * 0.07 : 0;
          // A signature, not a placard. It was 0.46 of the box, which put a
          // stamp the size of a fist inside a circle drawn with a brush — the
          // seal ended up being the picture instead of sitting on it. A hanko
          // on a scroll is small: it goes on the work, it is not the work.
          const px = Math.max(22, size * 0.24);
          seal.style.left = `${markX.toFixed(1)}px`;
          seal.style.top = `${markY.toFixed(1)}px`;
          seal.style.width = `${px.toFixed(1)}px`;
          seal.style.height = `${px.toFixed(1)}px`;
          // Against the stamp, not against the document. One glyph now, so it
          // takes most of the square with a carved margin around it.
          seal.style.fontSize = `${(px * 0.62).toFixed(1)}px`;
          seal.style.opacity = (Math.min(1, q / 0.3) * st.readout).toFixed(3);
          seal.style.transform = `translate(-50%, -50%) rotate(-7deg) scale(${(1 + drop * 1.2 + settle).toFixed(3)})`;
          // The ink ring that jumps out from under the edge on contact. Driven
          // as a variable rather than a class, because the reader can skip the
          // whole beat and a CSS animation would then play from the beginning.
          seal.style.setProperty("--hit", Math.max(0, (q - 0.72) / 0.28).toFixed(3));
        }
      }

      const label = labelRef.current;
      if (label) {
        label.style.left = `${markX.toFixed(1)}px`;
        label.style.top = `${markY.toFixed(1)}px`;
        label.style.opacity = st.tag.toFixed(3);
        // Flipped to the other side near the right edge rather than allowed to
        // run off it.
        const flip = markX > w * 0.62;
        label.dataset["side"] = flip ? "left" : "right";
        label.style.transform = flip
          ? `translate(calc(-100% - ${(size / 2 + 12).toFixed(0)}px), -50%)`
          : `translate(${(size / 2 + 12).toFixed(0)}px, -50%)`;
      }
      if (nameRef.current && st.label !== lastName) {
        nameRef.current.textContent = st.label;
        lastName = st.label;
      }
      if (noteRef.current && st.note !== lastNote) {
        noteRef.current.textContent = st.note;
        lastNote = st.note;
      }

      // ── The slip ───────────────────────────────────────────────────────────
      //
      // Pinned to the circle rather than to a corner of the screen: up and to
      // the side, with a thread back to it. That is the whole grammar of the
      // thing — a card floating in a corner is a legend, a slip on a thread is
      // somebody pointing at something.
      //
      // It unrolls from its top edge rather than fading in, which is what a
      // strip of paper does and what a panel does not. `scaleY` and not a
      // clip-path, because the torn bottom edge is already a clip-path and an
      // element only has the one.
      const file = fileRef.current;
      if (file) {
        if (fileH === 0 && file.offsetHeight > 0) {
          fileW = file.offsetWidth;
          fileH = file.offsetHeight;
        }
        const u = st.fuda;
        file.style.opacity = (Math.min(1, u / 0.25) * st.readout).toFixed(3);
        file.style.transform = `scaleY(${(1 - Math.pow(1 - u, 3)).toFixed(3)})`;
        // Right of the brackets if it fits, left if it does not, and never off
        // the top — the dive can leave the address high in a short viewport.
        const wantRight = markX + size / 2 + FILE_GAP + fileW + FILE_MARGIN < w;
        const rawX = wantRight
          ? markX + size / 2 + FILE_GAP
          : markX - size / 2 - FILE_GAP - fileW;
        const x = Math.max(FILE_MARGIN, Math.min(w - FILE_MARGIN - fileW, rawX));
        // Anchored by its MIDDLE, not its bottom edge. Anchoring the bottom put
        // the card most of its own height above the target, which reads as two
        // unrelated things on a screen rather than as one pointing at the other.
        const mid = Math.max(
          FILE_MARGIN + fileH / 2,
          Math.min(h - FILE_MARGIN - fileH / 2, markY - FILE_RISE)
        );
        file.style.left = `${x.toFixed(1)}px`;
        file.style.top = `${(mid - fileH / 2).toFixed(1)}px`;
        file.dataset["side"] = wantRight ? "right" : "left";

        const lead = leadRef.current;
        if (lead && fileH > 0) {
          lead.style.opacity = (Math.min(1, u / 0.4) * st.readout).toFixed(3);
          // Out of the bracket corner nearest the card, diagonally up to the
          // card's height, then straight in. Two segments and a right angle,
          // because a curve would be a drawing and this is a machine.
          const cx = markX + (wantRight ? size / 2 : -size / 2) * 0.72;
          const cy = markY - (size / 2) * 0.72;
          const ex = wantRight ? x : x + fileW;
          const kx = ex + (wantRight ? -26 : 26);
          lead.setAttribute(
            "points",
            `${cx.toFixed(1)},${cy.toFixed(1)} ${kx.toFixed(1)},${mid.toFixed(1)} ${ex.toFixed(1)},${mid.toFixed(1)}`
          );
        }
      }

      if (!landedRef.current) {
        raf = requestAnimationFrame(frame);
        return;
      }

      // Burnt out. The last frame is the plate at plain cover scale, which is
      // the picture already sitting underneath; let the layer go.
      root.style.pointerEvents = "none";
      root.style.transition = `opacity 0.5s linear ${hold}s`;
      root.style.opacity = "0";
      if (layer) {
        layer.style.transition = `opacity 0.4s linear`;
        layer.style.opacity = "0";
      }
      window.setTimeout(() => {
        root.style.display = "none";
        if (layer) layer.style.display = "none";
        gl?.dispose();
        gl = null;
      }, (hold + 0.6) * 1000);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      gl?.dispose();
      gl = null;
    };
    // `act` and `onLanded` are stable for the life of the opening; rerunning
    // this effect would restart the sequence from black.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, mounted]);

  if (reduced) return null;

  const chrome = (
    <div
      ref={layerRef}
      className="jjk-hud-layer"
      data-phase="boot"
      onClick={(e) => {
        e.stopPropagation();
        act();
      }}
    >
      {/* The frame is gone — the label top left, the status top right, the
          coordinates bottom right, and before them the four corner ticks. Every
          one of them was a machine annotating its own screen, and on a page that
          is a painted sheet they were the last things still saying "interface".
          What is left says the same amount: six circles, a name beside the one
          that matters, and a seal.

          `chrome` survives in the timeline because the circles fade with it. */}

      {/* The question. Dead centre and on its own layer, because for three
          seconds it is the only thing on the screen worth reading — and because
          it has to leave without taking the rest of the interface with it.

          Two lines, and the order is deliberate: the brush line is the title, so
          it is first and it is bigger; the German line is the translation, so it
          sits under a hairline the way a gloss does. Aria-hidden on the kanji —
          a screen reader reading both would be reading the same question twice,
          and it would read the second one badly. */}
      <div ref={questionRef} className="jjk-hud-query" style={{ opacity: 0 }}>
        <span className="jjk-hud-query-jp" aria-hidden="true">
          {QUERY_JP}
        </span>
        <span className="jjk-hud-query-de">{QUERY}</span>
      </div>

      {/* The brush circles. One per place the search touches, all of them left
          on the map — see lib/enso.ts for why the geometry is generated.

          Each is its own <svg> at its own size rather than one canvas with six
          shapes on it: they are anchored to six different points on the ground
          and the camera moves under all of them, so there is no shared
          coordinate system to put them in that is not the map itself. */}
      {PLACES.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            ensoRefs.current[i] = el;
          }}
          className="jjk-enso"
          data-answer={i === PLACES.length - 1 ? "" : undefined}
          aria-hidden="true"
          // Where the brush landed, handed to the mask from the same constant
          // the geometry was generated with, so the revealing edge is the brush
          // tip to the degree and there is no second copy of the number in CSS.
          style={{ opacity: 0, "--from": `${ENSO_START}deg` } as CSSProperties}
        >
          <svg viewBox={`0 0 ${ENSO_VIEW} ${ENSO_VIEW}`}>
            <path d={ENSO_PATHS[i] ?? ENSO_PATHS[0]} />
          </svg>
        </span>
      ))}

      {/* The seal. One character, cut out of the ink rather than printed on it,
          which is how a hanko actually reads: the stone is carved away and what
          is left takes the vermilion.

          The SAME stamp that ends up in the corner of the slip, at the same
          size, because it is meant to be the same stamp — pressed once on the
          map and once on the paper by whoever went and looked. */}
      <span ref={sealRef} className="jjk-seal" aria-hidden="true" style={{ opacity: 0 }}>
        <span className="jjk-seal-face font-jp">柔</span>
      </span>

      {/* The thread from the circle to the slip. Its geometry is rewritten every
          frame; `pathLength="1"` lets the draw-on animation live in CSS without
          knowing how long the line happens to be. */}
      <svg className="jjk-file-lead" aria-hidden="true">
        <polyline ref={leadRef} points="0,0 0,0" pathLength="1" />
      </svg>

      <button
        ref={markerRef}
        id="jjk-fly-target"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          act();
        }}
        aria-label="Standort bestätigen"
        className="jjk-fly-marker"
        // The ring cursor becomes the seal over this — see `sealMode` in
        // components/custom-cursor.tsx. It is not a second stamp next to the
        // first: until the reader clicks, the seal on the map is the one the
        // MACHINE pressed, and the one under the pointer is theirs.
        data-cursor-seal=""
        style={{ left: "50%", top: "50%", width: MARK_MIN_PX, height: MARK_MIN_PX, opacity: 0 }}
      >
        {/* Shown by CSS off the layer's `data-phase`, not from here: while the
            sequence waits there is by definition no clock running, so there is
            nothing to drive an opacity with. */}
        <span className="jjk-fly-cue" aria-hidden="true">
          KLICK
        </span>
      </button>

      <div ref={labelRef} className="jjk-hud-label" style={{ opacity: 0 }}>
        <span ref={nameRef} className="jjk-hud-name" />
        <span ref={noteRef} className="jjk-hud-note" />
      </div>

      {/* The slip. It was a dossier card — a dark panel with a hairline frame, a
          scan line over the photograph and VERIFIZIERT in a corner, which is the
          same futuristic register the brackets were in.

          Now it is a paper fuda: a narrow strip with a torn bottom edge, the
          name written down it, the photograph pasted on, and a seal in the
          corner. The information is identical. What changed is who is supposed
          to have made it — a machine printing a record, or somebody who went and
          looked. */}
      <div ref={fileRef} className="jjk-fuda" style={{ opacity: 0 }}>
        {/* No `font-jp` here: the rule in app/globals.css sets the brush face,
            and an unlayered rule beats a Tailwind utility, so the class would
            read as the source of a font it is not actually supplying. */}
        <span className="jjk-fuda-title" aria-hidden="true">
          柔術会戦道場
        </span>

        <div className="jjk-fuda-body">
          <div className="jjk-fuda-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DOSSIER_IMAGE} alt="" loading="lazy" decoding="async" />
          </div>

          <div className="jjk-fuda-address">
            <span>{TARGET.name}</span>
            <span>{TARGET.city}</span>
          </div>

          <dl className="jjk-fuda-rows">
            {DOSSIER.map(([k, v]) => (
              <div key={k} className="jjk-fuda-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The same stamp again, in the corner of the sheet. 柔 rather than a
            denser character on purpose: a seal is read at forty pixels, and a
            twenty-three-stroke glyph at that size is a red square with noise
            in it. Nine strokes still carry — and it is the art's own character. */}
        <span className="jjk-fuda-stamp font-jp" aria-hidden="true">
          柔
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={rootRef}
        className={`absolute inset-0 overflow-hidden ${className}`}
        // The whole layer takes the click, and keeps it: the hero's own handler
        // starts the burn that ends the title card, and that must not fire while
        // the search is still running.
        onClick={(e) => {
          e.stopPropagation();
          act();
        }}
      >
        <div ref={stackRef} className="absolute inset-0" style={{ opacity: 0 }}>
          {PLATES.map((p, i) => (
            // next/image wants to own layout and lazy-loading, and both are wrong
            // here: these are transformed every frame and they are the source
            // bitmaps for the GL textures.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.src}
              src={p.src}
              alt=""
              data-km={p.km}
              loading="eager"
              // Async, and it matters. `sync` forces the decode onto the main
              // thread during the first paint, which showed up as the page
              // hanging right at the start. The sequence waits for the decode
              // anyway, and it waits off-thread.
              decoding="async"
              // The detail plate is nine megapixels and is not looked at for five
              // seconds; the coarse one is on screen in the first. Low priority
              // is the browser's own word for that, and without it the two of
              // them race for the same bandwidth at the one moment the page is
              // blank.
              fetchPriority={i === 0 ? "high" : "low"}
              // Sized to the whole plate rather than object-fit: cover.
              // `translate` and `transform-origin` together put the element's
              // centre on the container's centre, which is the coordinate system
              // cssMatrix works in — see lib/fly-gl.ts.
              className="jjk-fly-plate will-change-transform"
            />
          ))}
        </div>

        {/* The arrival times, fetched as an image so the browser's own decoder
            does the work off-thread and the GPU upload is a texImage2D from a
            bitmap that is already ready. Never drawn: it is data.

            Underneath it the drawn sheet — Graz in ink on the night parade's own
            paper, scripts/gen-graz-sumi.py. That one IS drawn, but only ever by
            the shader: it is what the ember plate burns out of. Fetched the same
            way and for the same reason. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={igniteRef}
          src={IGNITE_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute h-px w-px opacity-0"
          style={{ left: -9999, top: -9999 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={sumiRef}
          src={SUMI_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute h-px w-px opacity-0"
          style={{ left: -9999, top: -9999 }}
        />

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: 0 }}
        />

        {/* Black until there is something to look at. Also the first frame of
            something that is about to boot, which is what this is. */}
        <div ref={veilRef} className="jjk-hud-veil" />
      </div>

      {mounted ? createPortal(chrome, document.body) : null}
    </>
  );
}

export default FlyIn;
