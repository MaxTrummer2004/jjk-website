/**
 * The opening, as arithmetic — a search that finds the gym and sets the map on
 * fire from it.
 *
 * Pure numbers, no DOM and no GL. Two renderers consume it: the WebGL one in
 * lib/fly-gl.ts and the plain <img> fallback in components/fly-in.tsx, and the
 * interface layer on top of both reads the same state. All three have to
 * describe the SAME moment, so the moment lives here.
 *
 * ── Why it is not a zoom any more ───────────────────────────────────────────
 * It used to fly in from Austria down to a Graz street on four plates. That was
 * built to answer a real question — the backdrop is unmistakably a city and not
 * at all an obviously Austrian one — and it answered it by establishing the
 * place. It never solved the other half: a map that is simply THERE when the
 * page opens is wallpaper, and no amount of camera work on wallpaper makes it
 * mean anything.
 *
 * So the map now has a reason to be on screen. Something is looking for
 * something on it. The question is asked in the open, the search runs and fails
 * five times in public, and when it finally lands the city lights up from that
 * one address outward. The reader is not shown where the gym is; they watch it
 * be found.
 *
 * ── The shape ───────────────────────────────────────────────────────────────
 *   boot     black, then the map fades up COLD — a blue-grey scan, not a
 *            picture. Nothing here is the hero yet.
 *   query    the question stands in the middle of the screen, two lines, brush
 *            over display. Not typed and not an input: a text field is a trap —
 *            most people will not type, and the ones who do will type something
 *            this cannot answer.
 *   search   the reticle hops across real Graz landmarks, reads each one out and
 *            rejects it. Five failures, converging southward.
 *   lock     it snaps onto the Kasernstraße — and the camera GOES there, down
 *            to a two-kilometre frame, because an address the reader is meant
 *            to click has to be a place on the screen and not a speck at the
 *            bottom edge of a city.
 *   ready    everything stops. Cold map, one lit address, one word. The clock
 *            does not run again until somebody clicks.
 *   ignite   the click. The streets catch fire from that point outward — see
 *            scripts/gen-ignite.py — the frame turns from cold to hot, and the
 *            camera pulls all the way back out to the hero framing as the fire
 *            spreads. The colour change IS the payoff, which is why everything
 *            before it is deliberately drained.
 *
 * ── Why the fire waits for the click ────────────────────────────────────────
 * Because otherwise the click is a formality — the reader watches the whole
 * thing happen and then presses a button to be allowed to continue, which is a
 * dialog box, not an interaction. Holding the ignition back makes the click the
 * cause of the best thing on the page. It also fixes a composition problem for
 * free: the fire wants the frame WIDE and the address wants it CLOSE, and those
 * are opposite requirements until they are put in sequence — close while it
 * waits, opening out as it burns.
 *
 * ── Why it ends exactly where it started ────────────────────────────────────
 * The last plate IS the hero backdrop. At the end of the ignite the cold pass,
 * the raster, the vignette, the grain and the camera's slow settle are all
 * exactly zero, so the final frame is the plain plate at plain cover scale —
 * the picture already sitting underneath. The layer can then simply be taken
 * away. That is the same discipline the old dive ended on and it is the reason
 * there is no hand-over to hide.
 */

export interface Plate {
  readonly src: string;
  readonly km: number;
}

/**
 * One plate now, where there were four.
 *
 * Not graz-night.webp, which is the same picture at 4000×2250. It is only ever
 * seen at cover scale, so beyond about 2600 across it is nine megapixels of
 * decode and thirty-six of texture upload that no screen can show — and it
 * lands in the first second of the page.
 */
export const PLATES: readonly Plate[] = [
  { src: "/img/zoom-3.webp", km: 9 },
  // The same picture at 4000×2250, faded in for the close-up.
  //
  // Not a second rendering of the map: zoom-3.webp IS this file downsampled, so
  // where they overlap they are the same pixels and the crossfade is a change of
  // SHARPNESS with nothing else moving. That matters — the old four-plate ladder
  // failed because its levels were each normalised against their own brightest
  // pixel and disagreed by up to 6×, and no dissolve between two pictures like
  // that can be made invisible. Two resolutions of one picture have no such
  // problem, which is the whole idea behind an image pyramid.
  //
  // It is nine megapixels, and it is also what CityBackdrop loads, so by the
  // time this needs it the browser has it. See the fetch priority in
  // components/fly-in.tsx for why it does not fight for bandwidth at the start.
  { src: "/img/graz-night.webp", km: 9 },
];

/**
 * Arrival times for the ignition, as a grayscale plate in the same UV space.
 *
 * 0 at the gym, 1 at the last pixel to catch, geodesic through the road network
 * rather than radial — a circle crossing a city is a wipe, and reads as one.
 * Written by scripts/gen-ignite.py.
 */
export const IGNITE_SRC = "/img/zoom-3-ignite.webp";

/**
 * The cold plate: Graz drawn in ink, on the paper the night parade is painted
 * on. See scripts/gen-graz-sumi.py.
 *
 * Not a camera plate — the camera never frames this separately. It is a texture
 * the shader dissolves the ember plate out of along the fire front, in the same
 * UV space, so the two are the same ground to the pixel.
 */
export const SUMI_SRC = "/img/graz-sumi.webp";

/** Aspect ratio every plate is rendered at (W = 2600, H = W * 9 / 16). */
export const PLATE_ASPECT = 16 / 9;

export const LEVELS = PLATES.length;
export const END_KM = 9;
/** The camera may never frame more ground than the plate covers. */
export const START_KM = END_KM;

// ── The clock ───────────────────────────────────────────────────────────────
// Seconds from the moment the map is on screen and the sequence is armed — NOT
// from page load. Everything before that is loading, and a timeline that starts
// while the pictures are still in flight plays its first beat to nobody.
const BOOT_SECONDS = 0.75;
const QUERY_AT = 0.55;
/**
 * How long the question is on screen before anything answers it, split in two
 * only because the second half is the part that matters.
 *
 * It used to type itself, character by character, and that was the wrong
 * register. A terminal typing at you is a machine talking; this page is a
 * painted scroll, and what is written on a scroll is written already. So the
 * question ARRIVES — two lines, brush and display, the way a title arrives —
 * and then it stands.
 *
 * QUERY_SECONDS is the arrival and the reading. QUERY_HOLD is the silence
 * after it, which is not dead time: it is the pause where something that has
 * been asked a question has not answered yet, and it is the only reason the
 * search that follows reads as an answer rather than as an animation.
 */
const QUERY_SECONDS = 1.6;
const QUERY_HOLD = 1.35;
export const SEARCH_AT = QUERY_AT + QUERY_SECONDS + QUERY_HOLD;
/**
 * Per rejected candidate.
 *
 * It was 0.42s, which is the right length for a machine ticking through a list
 * and the wrong one for a hand. What goes down on each place now is a brush
 * stroke, and a brush stroke has an after — the moment where the circle is
 * closed and nothing has happened yet is what makes the next one read as
 * another judgement rather than as the next frame. So: draw, then breathe.
 */
export const HOP_SECONDS = 0.72;

/**
 * How long one circle takes to draw, and how long the answer's takes.
 *
 * A brush stroke, not a wipe — and slow enough to be watched. At 0.3s the
 * circle was closing faster than the eye follows the tip, which reads as a
 * shape appearing rather than as somebody drawing. The answer's is slower
 * still: it is the one that is going to be stamped.
 */
const ENSO_DRAW = 0.46;
const ENSO_DRAW_LAST = 0.62;
/**
 * What happens after the last circle is closed, in order.
 *
 * DIVE_WAIT is silence. The red circle is on the answer, the camera has not
 * moved once in the whole search, and for four hundred milliseconds nothing
 * happens at all. That pause is the beat that makes the move that follows a
 * DECISION rather than the next frame of an animation.
 *
 * LOCK_SECONDS is the camera finally going there — and it is the ONLY camera
 * move in the sequence, which is what makes it mean anything. FUDA_SECONDS is
 * the paper slip unrolling once it has landed.
 *
 * Then the clock stops, and the next thing that happens is the reader's.
 */
const DIVE_WAIT = 0.42;
const LOCK_SECONDS = 1.1;
const FUDA_SECONDS = 0.5;
/**
 * The press, and it is on the far side of the click.
 *
 * The seal used to come down on its own, before the reader had done anything,
 * and that was the mistake: a stamp is the one gesture in this whole sequence
 * that is somebody DECIDING, and the machine had already decided. So the
 * search now goes as far as certainty — circle, camera, paper — and stops.
 * The stamp is the reader's, and the city catches from it.
 */
const SEAL_SECONDS = 0.34;
/**
 * The fire, once somebody has asked for it.
 *
 * Three seconds rather than two and a bit. The front is a band of finite width
 * in the arrival-time field, so how long a given street spends ON FIRE is that
 * width times this number — at 2.2s it was about a tenth of a second, which is
 * a flash, not a burn. The char behind it (see CHAR_TAIL in lib/fly-gl.ts) is
 * what needs the room: ash that is gone before the eye reaches it is ash
 * nobody drew.
 */
export const BURN_SECONDS = 3.0;

/**
 * Where the search looks before it looks in the right place.
 *
 * Real coordinates of real Graz landmarks, which matters for one reason: they
 * are on the plate, so the reticle lands on a station, a hill and a university
 * that are visibly there in the light. Ordered to converge — west, north-east,
 * centre-north, south-east, centre — so the last failure is already near the
 * answer.
 */
export interface Candidate {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  /** What the readout says about it. */
  readonly note: string;
}

const CANDIDATES: readonly Candidate[] = [
  { name: "HAUPTBAHNHOF", lat: 47.0725, lon: 15.4166, note: "TATAMI 0 m²" },
  { name: "UNIVERSITÄT GRAZ", lat: 47.0779, lon: 15.4498, note: "TATAMI 0 m²" },
  { name: "SCHLOSSBERG", lat: 47.0763, lon: 15.4373, note: "TATAMI 0 m²" },
  { name: "MESSE GRAZ", lat: 47.0592, lon: 15.4519, note: "TATAMI 0 m²" },
  { name: "JAKOMINIPLATZ", lat: 47.068, lon: 15.4419, note: "TATAMI 0 m²" },
];

/**
 * The answer. See scripts/gen-ignite.py for the spelling — Kasern-, not
 * Kasernen-, whatever lib/config.ts currently says.
 *
 * The coordinates are the street's midpoint rather than the house's, so the
 * reticle is on the right street to within about a hundred metres and not on
 * the right roof. If the exact ones ever turn up, they go here and in
 * scripts/gen-ignite.py together — the fire has to start where the brackets are.
 */
export const TARGET = {
  name: "KASERNSTRASSE 4",
  city: "8010 GRAZ",
  lat: 47.0530463,
  lon: 15.4433255,
  note: "TATAMI 240 m²",
} as const;

/**
 * The file the machine opens once it has found the place.
 *
 * Rows rather than prose, because the whole conceit is that this is a readout —
 * and because a label with a leader line pointing at a target is the one piece
 * of interface grammar that says "this thing, here" without saying anything.
 */
export const DOSSIER: readonly (readonly [string, string])[] = [
  ["KOORD", "47.0530 N · 15.4433 E"],
  ["TATAMI", "240 m²"],
  ["SEIT", "2011"],
  ["STATUS", "AKTIV"],
];

/**
 * The still in the file. A placeholder until there is a photograph of the gym;
 * swapping it is this one line.
 */
export const DOSSIER_IMAGE = "/img/mock-1.jpg";

/**
 * The question, in two registers. The kanji line is the title; the German line
 * underneath is what it says. Neither is typed — see QUERY_SECONDS.
 *
 * 何処 (izuko) rather than どこ: the old written form, which is the one that
 * belongs on a scroll.
 */
export const QUERY_JP = "最強の道場は何処か";
export const QUERY = "Wo liegt das beste BJJ-Gym?";

/** How many places are rejected before the right one, for the scan counter. */
export const CANDIDATE_COUNT = CANDIDATES.length;

/** The last guess has been crossed off; the answer's circle starts here. */
export const RED_AT = SEARCH_AT + HOP_SECONDS * CANDIDATES.length;
/** The circle is closed, the pause is over, and the camera moves. */
export const LOCK_AT = RED_AT + ENSO_DRAW_LAST + DIVE_WAIT;
/** It has landed; the slip unrolls. */
export const FUDA_AT = LOCK_AT + LOCK_SECONDS;
/**
 * When the search is finished and the clock STOPS.
 *
 * components/fly-in.tsx parks the clock exactly here and does not let it move
 * again until the reader clicks, so everything past this point is theirs: the
 * stamp first, then the city. That is why nothing downstream needs a second
 * clock — the timeline simply has a hole in it the length of somebody's
 * attention.
 */
export const READY_AT = FUDA_AT + FUDA_SECONDS;
/**
 * When the seal touches the map, which is a quarter of a second after the
 * click — and which is where the fire starts, the flash goes off and the camera
 * begins to pull back out. Everything that used to hang off READY_AT hangs off
 * this instead, so the whole payoff is simultaneous with the impact.
 */
export const FIRE_AT = READY_AT + SEAL_SECONDS * 0.72;
/** The last instant of the whole thing, fire included. */
export const END_AT = FIRE_AT + BURN_SECONDS;

// ── Ground coordinates ──────────────────────────────────────────────────────
// The plate's own frame: equirectangular about the Hauptplatz, which is what
// scripts/gen-graz-map.py rasterises in. Over nine kilometres the error against
// a proper projection is well under a pixel.
// Moved 500 m south of the Hauptplatz on 2026-08-07, together with every plate
// derived from it (scripts/gen-graz-map.py, gen-ignite.py, gen-graz-sumi.py).
// The opening circles the Kasernstraße and hangs a slip off it, and at the old
// centre the gym sat 1.98 km south on a plate reaching 2.53 km — which left no
// room under the answer in any frame that also held the five rejected
// landmarks. It now sits 1.48 km south with a kilometre of map beneath it.
const ORIGIN_LAT = 47.0664;
const ORIGIN_LON = 15.4383;
const M_PER_LON = (111320 * Math.cos((ORIGIN_LAT * Math.PI) / 180)) / 1000;
const M_PER_LAT = 110.574;

export interface Ground {
  /** Kilometres east of the plate centre. */
  x: number;
  /** Kilometres north of the plate centre. */
  y: number;
}

export function groundOf(lat: number, lon: number): Ground {
  return { x: (lon - ORIGIN_LON) * M_PER_LON, y: (lat - ORIGIN_LAT) * M_PER_LAT };
}

/** The inverse, for the coordinate readout that ticks along with the reticle. */
export function latLonOf(x: number, y: number): { lat: number; lon: number } {
  return { lat: ORIGIN_LAT + y / M_PER_LAT, lon: ORIGIN_LON + x / M_PER_LON };
}

const MARKS: readonly Ground[] = CANDIDATES.map((c) => groundOf(c.lat, c.lon));
const TARGET_MARK = groundOf(TARGET.lat, TARGET.lon);

/**
 * Every place the search touches, in order, with the answer last.
 *
 * Exported because the ensō are anchored to GROUND and not to the reticle: they
 * are drawn where they are drawn and they stay there, so once the camera dives
 * they slide off the frame the way marks on a map do. components/fly-in.tsx
 * projects all six every frame.
 */
export const PLACES: readonly Ground[] = [...MARKS, TARGET_MARK];

/**
 * How much ground each circle encloses, in kilometres.
 *
 * Ground and not pixels, for the same reason the reticle was: a circle around a
 * landmark has to mean the same thing at every viewport.
 *
 * The same size for all six. The answer's used to be smaller — three hundred
 * metres against five hundred, on the theory that an address is tighter than a
 * district — and on screen that read as the one circle that mattered being the
 * runt of the set. A judgement is not smaller than the guesses it settles.
 */
export const ENSO_KM: readonly number[] = PLACES.map(() => 0.5);

// ── The ignition's pacing ───────────────────────────────────────────────────
/**
 * Where the front has to be for each tenth of the map's light to have caught.
 *
 * Printed by scripts/gen-ignite.py, and it is not close to a straight line:
 * half the light in the frame is inside the first third of the range, because
 * the arterials reach the edge of the city long before the ground between them
 * fills in. Move the front linearly and the ignition is over while the animation
 * is a third done, then nothing visible happens for a second and a half. So the
 * front moves along the inverse of this instead, and what is linear is the
 * amount of city that is alight.
 */
const FRONT = [
  0.0, 0.238, 0.3258, 0.3977, 0.47, 0.5339, 0.5994, 0.6623, 0.7319, 0.832, 1.0,
];

/** Front position for a given fraction of the light. */
function frontFor(lit: number): number {
  const q = Math.min(1, Math.max(0, lit)) * (FRONT.length - 1);
  const i = Math.min(FRONT.length - 2, Math.floor(q));
  const a = FRONT[i] ?? 0;
  const b = FRONT[i + 1] ?? 1;
  return a + (b - a) * (q - i);
}

// ── Easings ─────────────────────────────────────────────────────────────────
function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smooth(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

// ── The camera ──────────────────────────────────────────────────────────────
/**
 * ONE move, and everything else is a held frame.
 *
 * It used to creep during the search and drag itself after every hop, which was
 * wrong twice over. A frame that is always moving has no move left for the
 * moment that matters; and a camera that chases the reticle says the machine is
 * looking THERE, when the whole point of five rejected circles is that it is
 * looking at the city and finding nothing. So the search is a still frame. The
 * marks appear on it one by one, they all stay, and nothing else happens.
 *
 * Then the answer's circle goes down — still on the same still frame — and the
 * camera waits four hundred milliseconds and dives. That is the only move in
 * the sequence, it lands on the address, and it does not move again until the
 * fire, which pulls it all the way back out to the hero's own framing.
 */
const LOCK_ZOOM = 0.36;

/**
 * How much air the held frame leaves around the outermost mark, in kilometres —
 * and it is not the same on all four sides.
 *
 * Half a circle plus a little is enough anywhere the marks are just marks. It
 * is not enough under the ANSWER, which is the southernmost of the six by a
 * kilometre and a half: with an even pad it ends up in the bottom eighth of the
 * frame, which reads as an accident of cropping rather than as a composition,
 * and it leaves the slip nowhere to hang.
 *
 * So the south side gets a kilometre. That is what the re-centred plate bought
 * — see ORIGIN_LAT — and it puts the answer at about three quarters of the way
 * down instead of seven eighths.
 */
const FRAME_PAD = 0.45;
const FRAME_PAD_SOUTH = 1.0;

/**
 * The held frame, computed from the PLACES rather than picked by hand.
 *
 * Every one of the six has to be inside it — a search that circles something
 * off the edge of the screen is a search nobody can follow — so the frame is
 * the bounding box of the marks, padded, fitted to the viewport. That makes it
 * aspect-correct by construction, which a hand-picked zoom is not: `cover`
 * means a 21:9 window sees FEWER kilometres top to bottom than a 16:9 one at
 * the same width, and the answer is the southernmost mark by a kilometre.
 *
 * Clamped to the plate, because nothing is served by framing ground that was
 * never rendered. On a portrait phone the clamp bites and the outermost marks
 * go off the sides; that is the one case where there is no frame that works,
 * and losing the Hauptbahnhof is better than losing the answer.
 */
function heldFrame(aspect: number): { km: number; x: number; y: number } {
  const cover = Math.min(1, aspect / PLATE_ASPECT);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of PLACES) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  x0 -= FRAME_PAD;
  x1 += FRAME_PAD;
  y0 -= FRAME_PAD_SOUTH;
  y1 += FRAME_PAD;
  // viewW = km * cover and viewH = viewW / aspect, so this is the width that
  // makes both fit — see the slack arithmetic in stateAt, which uses the same.
  const km = Math.min(END_KM, Math.max(x1 - x0, (y1 - y0) * aspect) / cover);
  return { km, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

const mixGround = (a: Ground, b: Ground, k: number): Ground => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
});

/**
 * Where the camera is at an instant: how much ground it frames and what is in
 * the middle of it.
 *
 * Zoom and aim together rather than in two functions, because they are one
 * gesture — the dive is a move TO somewhere, and computing the two halves of it
 * apart is how they end up arriving at different times.
 */
function frameAt(t: number, aspect: number): { km: number; at: Ground } {
  const held = heldFrame(aspect);
  const heldAt: Ground = { x: held.x, y: held.y };
  const lockKm = END_KM * LOCK_ZOOM;

  if (t >= FIRE_AT) {
    // The stamp has landed. The frame opens all the way back out to the hero's
    // own framing as the city catches, so the fire spreading and the picture
    // widening are one movement.
    const k = smooth((t - FIRE_AT) / (BURN_SECONDS * 0.94));
    return { km: lockKm + (END_KM - lockKm) * k, at: mixGround(TARGET_MARK, ORIGIN, k) };
  }
  if (t >= LOCK_AT) {
    const k = easeOutCubic(clamp01((t - LOCK_AT) / LOCK_SECONDS));
    return {
      km: held.km + (lockKm - held.km) * k,
      at: mixGround(heldAt, TARGET_MARK, k),
    };
  }
  return { km: held.km, at: heldAt };
}

export type Phase =
  | "boot"
  | "query"
  | "search"
  /** The answer's circle is being drawn, on the frame the search was held at. */
  | "mark"
  /** The one camera move. */
  | "lock"
  /** Everything is said and the clock has stopped. The next beat is theirs. */
  | "ready"
  /** Their stamp, and then the city. */
  | "ignite";

export interface Pose {
  /** Camera width in km. */
  km: number;
  /** Frame centre offset from the plate centre, in km, east and north. */
  offsetX: number;
  offsetY: number;
  /** Both zero, always — see the note in components/fly-in.tsx on the swap. */
  tilt: number;
  roll: number;
  /** How much of the system view is left: raster, vignette, grain, haze. */
  screen: number;
  /** Scan bar position down the frame, 0–1, or −1 for none. */
  scanY: number;
  /** How much of the frame is still under the cold pass, 0–1. */
  cold: number;
  /** Ignition front, in the units of the ignite plate. */
  reveal: number;
  /** Radial smear, 0–1. */
  blur: number;
  /** Warm kick, 0–1. */
  flash: number;
  /** Per-plate opacity and border softness. One plate, so: opaque and hard. */
  alpha: number[];
  feather: number[];
}

export interface Opening {
  phase: Phase;
  pose: Pose;
  /** Where the reticle is, on the ground. */
  mark: Ground;
  /** How wide the brackets are, in kilometres of ground. */
  markKm: number;
  /** 0 at the instant of a hop, 1 once it has settled. Drives the snap. */
  snap: number;
  /** What the reticle is looking at, if anything yet. */
  label: string;
  note: string;
  /** True from the lock onward. */
  hit: boolean;
  /**
   * How far each brush circle is drawn, 0–1, one per entry in PLACES. They only
   * ever go up: an ensō that has been drawn stays drawn, which is the whole
   * reason the map ends up looking worked on rather than animated.
   */
  enso: readonly number[];
  /** The seal coming down, 0–1. Contact is at about 0.72 — see SEAL_HIT. */
  seal: number;
  /** The paper slip unrolling under it, 0–1. */
  fuda: number;
  /**
   * Opacity of the question, which sits in the MIDDLE of the screen while it
   * stands and then leaves. Separate from `chrome` because for three seconds it
   * is not furniture, it is the content.
   */
  question: number;
  /**
   * Opacity of the furniture — the frame and the status readouts.
   * It leaves when the fire starts; by then it has said everything it has to
   * say, and a hero with an interface still bolted to it is a screenshot.
   */
  chrome: number;
  /**
   * Opacity of the reticle. Separate from `chrome` and it stays: the target is
   * the ANSWER, and it is what the click is for.
   */
  readout: number;
  /**
   * Opacity of the small label pinned beside the brackets.
   *
   * It carries the rejected candidates during the search and then gets out of
   * the way, because the file that opens on the dive says all of it and more.
   * Two readouts saying the same thing is one readout too many.
   */
  tag: number;
  /** Black over everything while the pictures are still arriving, 1–0. */
  veil: number;
}

const NOTHING: Ground = { x: 0, y: 0 };
/** The plate centre — the Hauptplatz, and where the camera starts and ends. */
const ORIGIN: Ground = { x: 0, y: 0 };

/**
 * How much ground the brackets enclose, in kilometres, while searching and once
 * locked.
 *
 * A patch of GROUND rather than a number of pixels, so the brackets mean the
 * same thing at every viewport — and the tightening from one to the other is
 * what the lock LOOKS like. Seven hundred and fifty metres is a landmark and its
 * surroundings; three hundred is an address.
 */
const SEARCH_KM = 0.75;
const LOCK_KM = 0.3;

/**
 * The whole opening at one instant.
 *
 * `time` is seconds since the sequence was armed, and it is NOT a free-running
 * clock: components/fly-in.tsx holds it at READY_AT until the reader clicks.
 * Past END_AT it returns the last frame forever, which is what the page hands
 * over to.
 */
export function stateAt(time: number, aspect: number = PLATE_ASPECT): Opening {
  const t = Math.max(0, time);
  // The same rule `object-fit: cover` follows. A portrait viewport showing a
  // 16:9 plate sees only 42% as many kilometres across, so an offset in km is
  // two and a half times further across the screen there.
  const cover = Math.min(1, aspect / PLATE_ASPECT);

  // ── Camera ────────────────────────────────────────────────────────────────
  const shot = frameAt(t, aspect);
  const km = shot.km;
  // Clamped to what is actually there rather than left to the renderer's safety
  // zoom. That mechanism pulls the camera IN to make a frame fit, which changes
  // the scale — fine as a backstop for a dive, wrong here, where the framing at
  // every instant is the composition. Clamping the aim instead means the frame
  // is always exactly the zoom that was asked for.
  const viewW = km * cover;
  const viewH = viewW / aspect;
  const slackX = Math.max(0, (END_KM - viewW) / 2);
  const slackY = Math.max(0, (END_KM / PLATE_ASPECT - viewH) / 2);
  const at = shot.at;
  const aim = (v: number, slack: number): number =>
    Math.min(slack, Math.max(-slack, v));

  // ── Where the reticle is ──────────────────────────────────────────────────
  let phase: Phase = "boot";
  let mark: Ground = NOTHING;
  let markKm = SEARCH_KM;
  let snap = 1;
  let label = "";
  let note = "";
  let hit = false;

  if (t >= READY_AT) {
    // The clock is parked at exactly READY_AT until the reader clicks, so this
    // comparison is the whole difference between waiting and burning.
    phase = t > READY_AT ? "ignite" : "ready";
    mark = TARGET_MARK;
    markKm = LOCK_KM;
    label = TARGET.name;
    note = TARGET.note;
    hit = true;
  } else if (t >= LOCK_AT) {
    phase = "lock";
    mark = TARGET_MARK;
    // The lock tightens: the brackets come in from the search box to the
    // address over the first third of the beat.
    const k = smooth((t - LOCK_AT) / (LOCK_SECONDS * 0.45));
    markKm = SEARCH_KM + (LOCK_KM - SEARCH_KM) * k;
    snap = k;
    label = TARGET.name;
    note = TARGET.note;
    hit = true;
  } else if (t >= RED_AT) {
    // The last guess has been rejected and the answer is being circled — on the
    // same held frame, because the camera has not been given a reason to move
    // yet. It gets one when the circle closes.
    phase = "mark";
    mark = TARGET_MARK;
    markKm = LOCK_KM;
    label = TARGET.name;
    note = TARGET.note;
    hit = true;
  } else if (t >= SEARCH_AT) {
    phase = "search";
    const i = Math.min(
      CANDIDATES.length - 1,
      Math.floor((t - SEARCH_AT) / HOP_SECONDS)
    );
    mark = MARKS[i] ?? NOTHING;
    snap = clamp01(((t - SEARCH_AT) / HOP_SECONDS - i) / 0.35);
    const c = CANDIDATES[i];
    label = c?.name ?? "";
    // The verdict lands a beat after the name, so the machine is seen to read
    // before it is seen to reject.
    note = (t - SEARCH_AT) / HOP_SECONDS - i > 0.42 ? `${c?.note ?? ""} · NEGATIV` : "";
  } else if (t >= QUERY_AT) {
    phase = "query";
  }

  // ── Interface ─────────────────────────────────────────────────────────────
  const chrome = smooth((t - 0.25) / 0.45) * (1 - smooth((t - (FIRE_AT + 0.1)) / 0.6));
  // The question leaves as the search starts. It has been answered by then, or
  // it is about to be, and a question still sitting over its own answer reads as
  // a caption.
  const question =
    smooth((t - QUERY_AT) / 0.55) * (1 - smooth((t - (SEARCH_AT - 0.2)) / 0.35));
  // The click target, which is now the answer's own circle. It arrives with the
  // dive rather than with the search — during the search there is nothing to
  // click, and a target that has been clickable for three seconds while five
  // wrong answers went past it is a target nobody believes.
  //
  // It goes with the fire: the last thing to leave, and it leaves because by
  // then the whole city is saying it.
  const readout =
    smooth((t - RED_AT) / 0.12) * (1 - smooth((t - (FIRE_AT + 0.25)) / 0.55));
  // The small label beside whichever circle is current. Gone by the time the
  // seal comes down, which is when the slip says all of it and more.
  const tag =
    smooth((t - SEARCH_AT + 0.12) / 0.2) *
    (1 - smooth((t - (LOCK_AT + LOCK_SECONDS * 0.35)) / 0.3));
  // The scan bar runs while the system is working and stops when it has an
  // answer. −1 turns it off in the shader rather than parking it at an edge.
  const working = t >= QUERY_AT && t < RED_AT;  // the sweep stops when it hits
  const scanY = working ? ((t - QUERY_AT) / 1.35) % 1 : -1;

  // ── Cold, and the fire ────────────────────────────────────────────────────
  //
  // −1 and not 0 before the stamp, and that is a bug fix rather than a taste.
  // The shader's flame is a band around the front: `f = uReveal - d`, and the
  // rim is exp(-(f/width)²). At uReveal = 0 every pixel whose arrival time is
  // near zero has f near zero — and the pixels with arrival time near zero are
  // exactly the streets around the gym. So the neighbourhood of the answer sat
  // there glowing, softly on fire, for the whole opening. Parking the front a
  // full unit behind the plate puts every pixel far outside the band, which is
  // what "there is no fire yet" has to mean numerically.
  let reveal = -1;
  let cold = 1;
  let flash = 0;
  if (t > FIRE_AT) {
    const s = clamp01((t - FIRE_AT) / BURN_SECONDS);
    // Decelerating: it goes off at once and then fills in. `lit` is the fraction
    // of the map's LIGHT that has caught, which frontFor turns into a position.
    const lit = 1 - Math.pow(1 - s, 2);
    reveal = frontFor(lit);
    // Held at full until the front has run out, then withdrawn over the tail.
    // By then 97% of the light is already hot, so what this crossfades is the
    // unlit ground behind it, which nobody can see either way — but it has to
    // reach exactly zero or the last frame is not the plate.
    cold = 1 - smooth((s - 0.82) / 0.18);
    flash = Math.pow(1 - clamp01((t - FIRE_AT) / 0.32), 2) * 0.85;
  }

  const screen = 1 - smooth((t - (FIRE_AT + 0.15)) / (BURN_SECONDS * 0.8));

  return {
    phase,
    pose: {
      km,
      offsetX: aim(at.x, slackX),
      offsetY: aim(at.y, slackY),
      // Flat, always. A tilt would put the <img> fallback and the canvas on
      // different pictures — see the note on cssMatrix in lib/fly-gl.ts — and
      // the last frame has to be the backdrop's own framing anyway.
      tilt: 0,
      roll: 0,
      screen: clamp01(screen) * smooth(t / BOOT_SECONDS),
      scanY,
      cold: clamp01(cold),
      reveal,
      blur: 0,
      flash,
      // The coarse plate is always opaque; the detail plate arrives with the
      // dive and never leaves. No feather on either: they cover the same ground,
      // so there is no edge in the middle of the picture to soften.
      alpha: [1, smooth((t - LOCK_AT) / (LOCK_SECONDS * 0.75))],
      feather: PLATES.map(() => 0),
    },
    mark,
    markKm,
    snap,
    label,
    note,
    hit,
    // Monotone by construction: every circle is a clamped ramp off its own
    // start, so nothing here can un-draw when the reader skips ahead.
    enso: PLACES.map((_, i) =>
      i < CANDIDATES.length
        ? clamp01((t - (SEARCH_AT + i * HOP_SECONDS)) / ENSO_DRAW)
        : clamp01((t - RED_AT) / ENSO_DRAW_LAST)
    ),
    seal: clamp01((t - READY_AT) / SEAL_SECONDS),
    fuda: clamp01((t - FUDA_AT) / FUDA_SECONDS),
    question: clamp01(question),
    chrome: clamp01(chrome),
    readout: clamp01(readout),
    tag: clamp01(tag),
    veil: 1 - smooth(t / (BOOT_SECONDS * 0.8)),
  };
}

/** The frame the page hands over to: wide, hot, nothing on top. */
export function landedState(): Opening {
  return stateAt(END_AT + 10);
}

/**
 * Development-only check that this file and the render scripts still agree.
 *
 * Cheap, once per load, and it catches the failure mode that is invisible in the
 * result: assets that are still the right pictures built against different
 * numbers. It has happened once already, by factors of 2, 2.6 and 2.4.
 */
export async function assertAssetsMatch(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const complain = (...args: unknown[]): void => {
    // A build-time-style error that can only be checked at runtime. Never runs
    // in production; silence would be worse than a console line.
    console.error("[opening]", ...args);
  };
  try {
    const [levels, ignite] = await Promise.all([
      fetch("/img/zoom-levels.json").then((r) => r.json() as Promise<unknown>),
      fetch("/img/ignite.json").then((r) => r.json() as Promise<unknown>),
    ]);
    const known = (levels as { levels?: unknown }).levels;
    if (Array.isArray(known) && !known.map(Number).includes(END_KM)) {
      complain(
        `the plate is ${END_KM} km wide here but zoom-levels.json has`,
        known,
        "· re-run scripts/gen-graz-zoom.py"
      );
    }
    const meta = ignite as { origin?: number[]; km?: number; front?: number[] };
    if (meta.km !== END_KM || meta.origin?.[0] !== ORIGIN_LAT || meta.origin?.[1] !== ORIGIN_LON) {
      complain(
        "the ignite plate was built for a different frame:",
        meta.origin,
        meta.km,
        `· this file uses ${ORIGIN_LAT}, ${ORIGIN_LON}, ${END_KM} km`
      );
    }
    if (meta.front && meta.front.some((v, i) => Math.abs(v - (FRONT[i] ?? -1)) > 5e-4)) {
      complain(
        "the ignition pacing table is stale — copy the one",
        "scripts/gen-ignite.py printed into FRONT:",
        meta.front
      );
    }
  } catch {
    // No file, no network, no matter. This is a hint, not a dependency.
  }
}
