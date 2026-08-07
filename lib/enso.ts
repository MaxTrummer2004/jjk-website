/**
 * Ensō — the brush circle the search draws around every place it looks at.
 *
 * ── Why a circle and not brackets ───────────────────────────────────────────
 * The opening used four corner ticks, which is the universal drawing for "a
 * machine has acquired this". That is exactly the register this page does not
 * have: everything around it is brush, paper and stamp, and a reticle out of a
 * targeting computer made the whole sequence read as science fiction with a
 * Japanese font on top.
 *
 * An ensō does the same job with the opposite accent. It is one stroke, drawn
 * in one breath, and in the Zen reading the circle is a judgement — the state of
 * the mind at the moment it was drawn. Five of them go down on five places that
 * are not the answer, and they all stay on the map. What the reader ends up
 * looking at is a page somebody has been working on.
 *
 * ── Why the path is generated and not a file ────────────────────────────────
 * Because a brush stroke is a shape, not a line. A `stroke` of constant width
 * with round caps is a garden hose; what makes ink read as ink is that the width
 * changes along the stroke — thin where the brush lands, heavy through the
 * middle where it is pressed, thin again as it lifts. That means the geometry is
 * an OUTLINE, walked out along one side and back along the other, and an outline
 * with a hundred samples per side is two kilobytes of path data per circle.
 * Six of those is twelve kilobytes of constants in the bundle, and they would
 * all be the same circle with a different seed.
 *
 * So they are computed here, once, at module load. Forty lines of arithmetic
 * instead, and it costs about a tenth of a millisecond.
 *
 * ── The angle convention ────────────────────────────────────────────────────
 * Clockwise from twelve o'clock, in degrees — NOT the mathematical convention.
 * That is deliberate: it is exactly what `conic-gradient(from …)` uses, and the
 * draw-on animation is a conic mask sweeping over the finished shape. Sharing
 * one convention means the mask edge is the brush tip to the degree, with no
 * correction factor anywhere for somebody to get wrong later.
 */

/** The viewBox everything below is drawn in. */
export const ENSO_VIEW = 100;

/**
 * Where the brush lands, clockwise from the top, and how far round it goes.
 *
 * Not 360°: an ensō is not a closed ring. The gap is where the stroke started
 * and did not quite come back to, and it is the single detail that separates a
 * brush circle from a shape a computer drew.
 */
export const ENSO_START = -142;
export const ENSO_SWEEP = 336;

/** Samples per side of the outline. Ninety is smooth at any size we draw at. */
const STEPS = 90;

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Deterministic noise — the same seed is the same circle, on every load. */
function rand(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * One brush circle, as a filled outline path.
 *
 * The radius wobbles (a hand does not draw a compass circle), and the width
 * follows a landing–press–lift profile with a slow tremor on top. `bite` is how
 * hard the brush is pressed overall.
 */
function ensoPath(seed: number, bite = 1): string {
  const rnd = rand(seed);
  // Two slow harmonics on the radius, at random phase: enough to be visibly
  // out of round, little enough to still be a circle.
  const a1 = 0.028 + rnd() * 0.022;
  const a2 = 0.014 + rnd() * 0.018;
  const p1 = rnd() * TAU;
  const p2 = rnd() * TAU;
  // And two on the width, which is what makes the ink look wet in places.
  const w1 = 0.1 + rnd() * 0.12;
  const w2 = 0.06 + rnd() * 0.1;
  const q1 = rnd() * TAU;
  const q2 = rnd() * TAU;
  const R = 37.5;
  const WMAX = 8.4 * bite;

  const inner: string[] = [];
  const outer: string[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS;
    const deg = ENSO_START + u * ENSO_SWEEP;
    const th = deg * DEG;
    const r = R * (1 + a1 * Math.sin(2 * th + p1) + a2 * Math.sin(3 * th + p2));

    // Landing, press, lift. `u ** 0.55` puts the swell early, which is where a
    // brush actually loads — the heavy part of a stroke is nearer its start
    // than its middle, and a symmetric profile reads as a shaded ring instead.
    const load = Math.sin(Math.PI * Math.pow(u, 0.55));
    const taper = 0.2 + 0.8 * load;
    const tremor = 1 + w1 * Math.sin(5 * th + q1) + w2 * Math.sin(9 * th + q2);
    // The very end is the lift: the last eighth thins to almost nothing however
    // the tremor falls, so the stroke ends in a point rather than a stub.
    const lift = u > 0.88 ? Math.max(0.12, 1 - (u - 0.88) / 0.12) : 1;
    const w = Math.max(0.5, WMAX * taper * tremor * lift) / 2;

    // Clockwise from twelve o'clock: x = sin, y = −cos. Same convention as the
    // conic mask that reveals this — see the note at the top.
    const sx = Math.sin(th);
    const sy = -Math.cos(th);
    const c = ENSO_VIEW / 2;
    outer.push(`${(c + sx * (r + w)).toFixed(2)},${(c + sy * (r + w)).toFixed(2)}`);
    inner.push(`${(c + sx * (r - w)).toFixed(2)},${(c + sy * (r - w)).toFixed(2)}`);
  }

  inner.reverse();
  return `M${outer.join("L")}L${inner.join("L")}Z`;
}

/**
 * Six of them, and none of them the same.
 *
 * Six because there are five places the search rejects and one it does not, and
 * because a repeated shape is the fastest way to tell a reader that what they
 * are watching is a loop. The last one is pressed hardest: it is the answer, and
 * it is the one the seal goes on.
 */
export const ENSO_PATHS: readonly string[] = [
  ensoPath(11, 0.94),
  ensoPath(29, 1.02),
  ensoPath(47, 0.88),
  ensoPath(83, 1.06),
  ensoPath(131, 0.92),
  ensoPath(199, 1.14),
];
