/**
 * fly-gl — the fly-in, drawn by a camera instead of by a scale factor.
 *
 * ── Why this exists at all ──────────────────────────────────────────────────
 * The move used to be `transform: scale()` on four stacked <img> elements. That
 * is a perfectly correct Deep Zoom and it looked cheap, for a reason that has
 * nothing to do with the pictures: a uniform scale about the centre of the frame
 * is the one thing a camera can never do. There is no perspective, so the ground
 * stays a diagram; nothing smears, so there is no speed; the air is perfectly
 * clear from two thousand kilometres up, so there is no distance.
 *
 * So the plates are now geometry. Four quads lying flat on the ground plane at
 * their true sizes in kilometres, one perspective camera descending toward them,
 * and a second pass that does what a lens does on the way.
 *
 * ── Why not three.js ────────────────────────────────────────────────────────
 * It is already in package.json and it is imported by nothing, which is exactly
 * why it stays that way. This is four quads and two shaders; a scene graph would
 * put six hundred kilobytes of library in front of the first frame of the page,
 * and the first frame of the page is the entire thing being built here.
 *
 * WebGL2 or nothing: `createFlyGL` returns null if there is no context, and the
 * caller keeps the CSS stack it was already rendering. Everything below assumes
 * GLSL ES 300 and NPOT mipmaps, both of which come with WebGL2.
 *
 * ── The two passes ──────────────────────────────────────────────────────────
 *   1. the plates, coarsest first, into an offscreen buffer. Premultiplied
 *      alpha, no depth test — they are coplanar, and the order IS the depth.
 *      This is also where the map is cold, and where the fire runs through it:
 *      both are per-pixel functions of the PLATE, so both belong in plate space
 *      rather than on the screen.
 *   2. the buffer to the screen, through radial blur, haze, raster, scan bar,
 *      vignette and grain. All screen-space, all zero at the end.
 *
 * Everything the second pass does is scaled by how far up the ladder the camera
 * still is, and every one of those terms is exactly zero at the destination. The
 * last frame of the move is therefore the plain final plate at plain cover
 * scale, which is the picture already sitting underneath — so the hand-over is
 * invisible by construction rather than by tuning.
 *
 * ── Keeping the widest plate under the frame ────────────────────────────────
 * A tilted camera sees a trapezoid of ground, not a rectangle, and it reaches
 * further at the top of the frame than a plan view does. The coarsest plate is
 * finite, so at the start of the move — the one moment where it is at parity AND
 * the tilt is at maximum — the frame could reach past its edge.
 *
 * `boost` fixes it exactly rather than by margin: the four frustum corners are
 * intersected with the ground plane every frame, and the camera is pulled in by
 * however much it takes for that footprint to fit inside the coarsest plate. It
 * is about fifteen percent at the top of the ladder and decays to exactly 1 as
 * the tilt goes to zero, underneath a move that changes scale by 256×.
 *
 * The finer plates need no such treatment. Each one only has to cover the frame
 * from ITS parity downward, and above that the coarser plate underneath is still
 * fully opaque and several times too large.
 */

import { PLATES, PLATE_ASPECT, START_KM, type Pose } from "@/lib/fly-path";

/** Vertical field of view, radians. Wider is a shorter lens and a stronger tilt. */
const FOV_Y = (34 * Math.PI) / 180;
const TAN_HALF_FOV = Math.tan(FOV_Y / 2);

/**
 * Peak radial smear, as a fraction of the distance from the centre of travel.
 *
 * Large, and it has to be: a drop covers up to three and a half halvings in half
 * a second, and the blur is what the crossfade between two mismatched levels
 * hides behind. The SHAPE of it comes from lib/fly-path.ts — it collapses in the
 * last fifth of the drop, and that collapse is the cut.
 */
const BLUR_MAX = 0.26;

/** Peak arrival flash, and its colour. Set to 0 to remove it entirely. */
const FLASH = 0.11;
const FLASH_COLOUR: readonly [number, number, number] = [1.0, 0.62, 0.3];

/** Peak haze, and the colour the blacks are lifted toward. */
const HAZE_MAX = 0.3;
const HAZE_COLOUR: readonly [number, number, number] = [0.05, 0.056, 0.074];

const VIGNETTE_MAX = 0.36;
const GRAIN_MAX = 0.016;

/**
 * The cold pass: what the map looks like before it is the hero.
 *
 * A tint multiplied by the plate's own LUMINANCE, not a filter over its colour.
 * The plate is an ember ramp from near-black through red to white, and simply
 * desaturating it gives a grey version of a fire; taking the luminance and
 * re-colouring it gives a different picture of the same city, which is what a
 * scan should look like. Blue-grey because the payoff is the heat, and heat
 * only reads as heat against something that is not.
 */
/**
 * ── Ink on paper ──────────────────────────────────────────────────────────
 * What the map is before it burns. It was a blue-grey phosphor scan, and the
 * page it opens is a Kyōsai handscroll — the reader crossed from one century to
 * another in a single click. Same sequence, told in the material the rest of
 * the site is made of.
 *
 * A smoke-darkened sheet rather than a fresh one: real ezu are light paper with
 * dark ink, which on a page whose whole mood is night would be a white flash on
 * load. This is the same relationship — ink DARKER than its ground — on a sheet
 * that has been in a room with a candle for two hundred years. Luminance about
 * 0.10, so it is unmistakably paper and still dark.
 *
 * That is also what makes the payoff work. Blue turning orange is a colour
 * change. Paper turning to fire and then to night is a change of STATE, and the
 * ignite field already knows the shape of it.
 */
/**
 * ── The sheet is a picture now ──────────────────────────────────────────────
 * There used to be six constants here — a paper colour, an ink colour, a gain,
 * a gamma, a fibre amplitude — and a few lines of shader that built the cold
 * state out of the EMBER plate's own luminance: read how bright the streetlight
 * is, mix between paper and ink by that. It was a sepia filter over a
 * photograph of light, and next to an ensō drawn with a brush and a seal cut
 * out of stone it read as exactly that.
 *
 * The cold state is its own plate now: Graz drawn in ink, on the paper the
 * night parade is painted on, with the strokes weighted the way a drawing
 * weights them rather than the way a city glows. See scripts/gen-graz-sumi.py.
 * The shader samples it in the same UV as the map, so the front dissolves one
 * into the other with nothing moving.
 */

/**
 * The char. Paper does not go straight from white to gone — a dark edge runs
 * just behind the flame, and it is the single detail that makes a burn read as
 * burning rather than as a wipe.
 *
 * It used to be a Gaussian, symmetric about CHAR_AT, and that was the bug. A
 * symmetric band is a stripe that TRAVELS: it darkens a pixel and then lets go
 * of it, and at a front that crosses any given pixel in about a tenth of a
 * second nobody ever sees it. Paper does not work that way — the char is what
 * the flame LEAVES, so it has a hard front edge and a long trail, and the trail
 * is the whole reason the sheet looks consumed rather than swapped.
 *
 * So the profile is asymmetric: a narrow Gaussian ramp in front of the band
 * (CHAR_W, so the darkening arrives with the flame rather than before it) and
 * an exponential decay behind it (CHAR_TAIL, in ignite units — about a fifth of
 * the whole field, which at BURN_SECONDS is most of a second of visible ash on
 * any given street). It fades rather than staying black because what is
 * underneath is the hero backdrop, and the last frame has to be that and
 * nothing else.
 */
const CHAR: readonly [number, number, number] = [0.055, 0.028, 0.014];
const CHAR_AT = 0.035;
const CHAR_W = 0.045;
const CHAR_TAIL = 0.22;

/**
 * The front, in the units of the ignite plate: how soft it is, and the rim.
 *
 * The rim is multiplied by the plate's luminance, so it burns along the streets
 * and does nothing in the fields — which is the whole difference between fire
 * and a wipe.
 */
const FRONT_WIDTH = 0.1;
const RIM_WIDTH = 0.08;
/**
 * Two gains, because a burning sheet is not a burning street map.
 *
 * RIM_BASE is what the flame does on bare paper — everywhere, because the whole
 * sheet is alight. RIM_GAIN is what it does extra along the streets, which is
 * where the ignite field routes it. The front's SHAPE follows the roads either
 * way; this only decides how much brighter the roads are while they go.
 */
const RIM_BASE = 0.08;
const RIM_GAIN = 2.8;
const RIM_COLOUR: readonly [number, number, number] = [1.0, 0.55, 0.22];

/**
 * The raster and the sweep bar are gone. They were the two loudest things on the
 * screen saying "terminal", on a page that is a painted scroll — see the note on
 * PAPER above. `pose.scanY` survives in the timeline for the moment; nothing
 * reads it.
 */

/** Device pixel ratio ceiling. Twelve taps per pixel is the reason for a ceiling. */
const MAX_DPR = 1.25;

const PLATE_VERT = `#version 300 es
in vec2 aPos;
uniform mat4 uMVP;
uniform vec2 uSize;
out vec2 vUv;
void main() {
  // The quad is -0.5..0.5 and gets its real size in kilometres here, so the
  // plate is literally lying on the ground at the scale it was rendered for.
  // Row 0 of the image is north, hence the flip in v.
  vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  gl_Position = uMVP * vec4(aPos * uSize, 0.0, 1.0);
}`;

const PLATE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uTex;
uniform sampler2D uIgnite;
uniform sampler2D uSumi;
uniform float uAlpha;
uniform float uFeather;
uniform float uCold;
uniform float uReveal;
uniform float uFrontWidth;
uniform float uRimWidth;
uniform float uRimGain;
uniform float uRimBase;
uniform vec3 uRimColour;
uniform vec3 uChar;
uniform float uCharAt;
uniform float uCharW;
uniform float uCharTail;

void main() {
  vec3 c = texture(uTex, vUv).rgb;

  // ── Cold, and the fire ────────────────────────────────────────────────────
  // uIgnite holds the time the fire takes to reach this pixel, travelling the
  // road network — 0 at the gym, 1 at the last pixel in the frame to catch. See
  // scripts/gen-ignite.py. Everything here is a function of that one number and
  // the front position, so the ignition is geometry rather than choreography.
  //
  // uCold is 0 for the whole of the rest of the page, and this branch is
  // uniform across the draw, which is the cheap kind.
  if (uCold > 0.0) {
    float d = texture(uIgnite, vUv).r;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

    // The sheet, as drawn — same frame, same projection, same ground.
    vec3 sheet = texture(uSumi, vUv).rgb;

    // How far past this pixel the flame is, in ignite units. Positive is burnt.
    float f = uReveal - d;
    float burnt = clamp(f / uFrontWidth, 0.0, 1.0);
    burnt = burnt * burnt * (3.0 - 2.0 * burnt);
    vec3 col = mix(sheet, c, burnt);

    // The char: it arrives with the flame and then stays, thinning out behind.
    // Asymmetric on purpose — see the note on CHAR_TAIL. Symmetric was a stripe
    // passing through, which is a wipe wearing a costume.
    float ch = f - uCharAt;
    float charA = ch < 0.0
      ? exp(-(ch * ch) / (uCharW * uCharW))
      : exp(-ch / uCharTail);
    col = mix(col, uChar, charA * 0.98);

    // The flame itself. Everywhere, because the whole sheet is alight — and
    // brighter along the streets, which is where the front is routed anyway.
    float e = f / uRimWidth;
    col += uRimColour * (exp(-e * e) * (uRimBase + lum * uRimGain));

    // uCold has to reach exactly zero, or the last frame of the opening is not
    // the plate the page hands over to.
    c = mix(c, col, uCold);
  }

  // The plate's own border, softened.
  //
  // A finer plate becomes visible while it still covers only part of the frame,
  // so a hard edge is a rectangle sitting in the middle of the picture — which
  // was the single most visible thing about the old crossfade. Fading the plate
  // out toward its own border makes it dissolve into the coarser one underneath.
  // uFeather is zero once the plate is opaque, so nothing is ever softened that
  // the reader could be looking at.
  float a = uAlpha;
  if (uFeather > 0.0) {
    vec2 e = min(vUv, 1.0 - vUv) / uFeather;
    float k = clamp(min(e.x, e.y), 0.0, 1.0);
    a *= k * k * (3.0 - 2.0 * k);
  }
  // Premultiplied: the blend is (ONE, ONE_MINUS_SRC_ALPHA), so a finer plate
  // coming in at alpha a replaces exactly a of what is under it and nothing
  // outside its own edges.
  frag = vec4(c * a, a);
}`;

const POST_VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;

uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uBlur;
uniform float uHaze;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform float uFlash;
uniform vec3 uHazeColour;
uniform vec3 uFlashColour;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

const int TAPS = 12;

void main() {
  vec2 dir = vUv - 0.5;
  float r = length(dir);

  vec3 col;
  if (uBlur < 0.002) {
    // Standing still: one sample instead of thirty-six. The opening no longer
    // moves the camera fast enough to need the blur at all — it is kept because
    // it is the one thing here that cannot be got back once removed, and it
    // costs a uniform branch. (Nothing in this shader may be named with a
    // reserved word: "flat" is an interpolation qualifier in GLSL ES 300 and
    // using it as a variable is a compile error, on a shader only built at
    // runtime, which means the canvas silently never appears at all. No
    // backticks either — this whole thing is a JS template literal.)
    col = texture(uSrc, vUv).rgb;
  } else {
    // ── Radial blur ─────────────────────────────────────────────────────────
    // The camera travels along its own view axis, so on the sensor every point
    // slides straight out from the centre of travel, and further out means
    // further travelled. Sampling back along that line is what a shutter does.
    float amt = uBlur * (0.3 + 0.7 * r);
    // Jitter the tap positions per pixel. Twelve fixed taps band visibly into
    // concentric ghosts; noise turns the banding into grain, which is invisible.
    float j = hash(vUv * uRes + uTime) / float(TAPS);

    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < TAPS; i++) {
      float t = float(i) / float(TAPS - 1) + j;
      float w = 1.0 - 0.6 * t;
      float s = 1.0 - amt * t;
      // A trace of lateral dispersion, and only where the frame is already
      // smearing — a lens being asked to do this does not hold all three
      // channels on the same line. At rest uBlur is 0 and so is this.
      float ca = amt * 0.055 * t;
      vec3 c;
      c.r = texture(uSrc, 0.5 + dir * (s + ca)).r;
      c.g = texture(uSrc, 0.5 + dir * s).g;
      c.b = texture(uSrc, 0.5 + dir * (s - ca)).b;
      acc += c * w;
      wsum += w;
    }
    col = acc / wsum;
  }

  // ── Air ───────────────────────────────────────────────────────────────────
  // Depth haze lifts the blacks and takes the contrast down, more of it high up
  // and more toward the top of the frame, which with the camera leaning is the
  // far side of the ground. This is what makes two thousand kilometres read as
  // a distance rather than as a small picture.
  float depth = clamp(uHaze * (0.5 + 0.8 * vUv.y), 0.0, 1.0);
  col = mix(col, uHazeColour + col * 0.55, depth);

  // ── Lens ──────────────────────────────────────────────────────────────────
  col *= 1.0 - uVignette * smoothstep(0.3, 0.78, r);
  col += (hash(vUv * uRes + vec2(uTime * 37.0, uTime * 17.0)) - 0.5) * uGrain;

  // The arrival. Warm, brightest at the centre of travel, gone in a tenth of a
  // second — a landing rather than a strobe.
  col += uFlashColour * uFlash * (1.0 - 0.7 * r);

  frag = vec4(max(col, 0.0), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  // Status deliberately not queried here — see `link`.
  return sh;
}

/**
 * Compile and link, and DO NOT ask whether it worked.
 *
 * Asking is the expensive part. `getProgramParameter(LINK_STATUS)` blocks the
 * main thread until the driver has finished compiling — for the post shader,
 * with its twelve-tap loop, that is tens to hundreds of milliseconds, and it
 * used to happen in the first moments of the page. The status is read later,
 * from `checkLink`, once KHR_parallel_shader_compile says the driver is done.
 */
function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
}

export interface Camera {
  /** Column-major model-view-projection, ready for uniformMatrix4fv. */
  mvp: Float32Array;
  /**
   * A point on the ground to normalised screen coordinates: x right, y DOWN,
   * both 0 at the top-left corner and 1 at the bottom-right. Used to put the
   * click marker on the place the camera is heading for.
   */
  project(x: number, y: number): { x: number; y: number };
  /**
   * The same camera as a CSS `matrix3d`, for an <img> of `imgW` × imgW/ASPECT
   * pixels that shows a plate `plateKm` across.
   *
   * ── Why this exists ────────────────────────────────────────────────────────
   * Because otherwise there are two different pictures on screen at different
   * moments. The image stack used to be a plain `scale()` — no perspective, no
   * target offset, no safety zoom — so the instant the canvas took over, the map
   * shifted and grew by up to a third. Hiding that swap only moves it; the fix
   * is for there to be nothing to hide.
   *
   * A camera looking at a PLANE is a projective map of that plane, and CSS can
   * express one exactly. With no `perspective` property in play, a `matrix3d`
   * supplies its own w and the browser does the divide, so a 3×3 homography
   * written into the right eight slots reproduces the projection to the pixel.
   * Every term below comes from the same closure the MVP is built from, so the
   * two cannot drift apart.
   */
  cssMatrix(plateKm: number, imgW: number, viewW: number, viewH: number): string;
}

const SCRATCH = new Float32Array(16);

/**
 * The camera, in closed form.
 *
 * Exported because two things need it and only one of them is the renderer: the
 * marker has to sit exactly where Graz is on screen, and on a machine without
 * WebGL there is no renderer to ask.
 *
 * ── Keeping the coarsest plate under the frame ──────────────────────────────
 * A tilted camera sees a trapezoid of ground, not a rectangle, and it reaches
 * further at the top of the frame than a plan view does. The coarsest plate is
 * finite, so at the top of the ladder — where the tilt and the target offset are
 * both at maximum — the frame could reach past its edge. `boost` fixes it
 * exactly rather than by margin: the four frustum corners are intersected with
 * the ground plane, and the camera is pulled in by however much it takes for
 * that footprint to fit. It decays to exactly 1 as the tilt goes to zero.
 *
 * The finer plates need no such treatment. Each one only has to cover the frame
 * from ITS parity downward, and above that the coarser plate underneath is still
 * fully opaque and several times too large.
 */
export function makeCamera(pose: Pose, aspect: number, out: Float32Array = SCRATCH): Camera {
  // How a plate is fitted to the viewport: the same rule `object-fit: cover`
  // follows, written out. A 16:9 plate in a wider viewport is limited by its
  // width; in a taller one by its height.
  const cover = Math.min(1, aspect / PLATE_ASPECT);

  const { tilt, roll, offsetX, offsetY } = pose;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  // Camera distance for the nominal frame: at zero tilt the ground rectangle
  // under the camera is exactly `viewW` × `viewH`.
  const viewW = pose.km * cover;
  const viewH = viewW / aspect;
  const nominalD = viewH / 2 / TAN_HALF_FOV;

  const tanX = TAN_HALF_FOV * aspect;
  const limitX = START_KM / 2;
  const limitY = START_KM / (2 * PLATE_ASPECT);

  /** How far past the coarsest plate the frame reaches at distance `dist`. */
  const overreach = (dist: number): number => {
    let worst = 0;
    const eyeX = offsetX - dist * st * sr;
    const eyeY = offsetY - dist * st * cr;
    const eyeZ = dist * ct;
    for (let i = 0; i < 4; i++) {
      const cx = i & 1 ? tanX : -tanX;
      const cy = i & 2 ? TAN_HALF_FOV : -TAN_HALF_FOV;
      // World-space ray direction: the transpose of Rx(-tilt)·Rz(roll).
      const dx = cr * cx + ct * sr * cy + st * sr;
      const dy = -sr * cx + ct * cr * cy + st * cr;
      const dz = st * cy - ct;
      if (dz >= -1e-6) continue;
      const s = -eyeZ / dz;
      worst = Math.max(
        worst,
        Math.abs(eyeX + s * dx) / limitX,
        Math.abs(eyeY + s * dy) / limitY
      );
    }
    return worst;
  };

  // Iterated rather than solved. Pulling the camera in shrinks the footprint
  // about the EYE, not about the plate centre, so with a target offset the first
  // correction is a couple of percent short of enough. A few passes take the
  // residual to nothing and it costs sixteen ray casts.
  //
  // The tolerance is load-bearing. `object-fit: cover` on a viewport no wider
  // than the plate makes the frame's height EXACTLY the plate's height, so the
  // corners land on the edge and the comparison decides on the last bit of a
  // double. At 16:9 and 4:3 it rounded under and did nothing; at 9:19.5 — a
  // phone — it rounded over, fired, and pulled the landing frame in by 0.4%,
  // which is a visible mismatch against the backdrop underneath. This is a
  // backstop against a tilted frame reaching off the plate by a sixth of its
  // width, not a corrector for four molecules.
  let d = nominalD;
  for (let k = 0; k < 4; k++) {
    const over = overreach(d);
    if (over <= 1 + 1e-6) break;
    d /= over * 1.004;
  }

  // V(p) = R·(p − target) + (0, 0, −d) with R = Rx(−tilt)·Rz(roll). Composing
  // four 4×4s to get eight non-zero terms is not worth the helpers.
  const r00 = cr;
  const r01 = -sr;
  const r10 = ct * sr;
  const r11 = ct * cr;
  const r12 = st;
  const r20 = -st * sr;
  const r21 = -st * cr;
  const r22 = ct;

  const tx = -(r00 * offsetX + r01 * offsetY);
  const ty = -(r10 * offsetX + r11 * offsetY);
  const tz = -(r20 * offsetX + r21 * offsetY) - d;

  // Projection. Near and far ride with the camera because the distance itself
  // spans four decades over the move.
  const f = 1 / TAN_HALF_FOV;
  const near = d * 0.02;
  const far = d * 60;
  const p10 = (far + near) / (near - far);
  const p14 = (2 * far * near) / (near - far);
  const px = f / aspect;

  // MVP = P · V, with P's sparsity taken out by hand.
  out[0] = px * r00;
  out[1] = f * r10;
  out[2] = p10 * r20;
  out[3] = -r20;
  out[4] = px * r01;
  out[5] = f * r11;
  out[6] = p10 * r21;
  out[7] = -r21;
  out[8] = 0;
  out[9] = f * r12;
  out[10] = p10 * r22;
  out[11] = -r22;
  out[12] = px * tx;
  out[13] = f * ty;
  out[14] = p10 * tz + p14;
  out[15] = -tz;

  return {
    mvp: out,
    project(x: number, y: number) {
      const cx = px * (r00 * x + r01 * y + tx);
      const cy = f * (r10 * x + r11 * y + ty);
      const cw = -(r20 * x + r21 * y + tz);
      if (cw <= 1e-6) return { x: 0.5, y: 0.5 };
      return { x: (cx / cw + 1) / 2, y: (1 - cy / cw) / 2 };
    },
    cssMatrix(plateKm: number, imgW: number, viewW: number, viewH: number) {
      // Pixels per kilometre on the untransformed element. The element is the
      // whole plate at a fixed size, NOT object-fit: cover — a cover-fitted
      // image is clipped to its box, and a tilted camera has to see ground the
      // box would have cropped away.
      const s = imgW / plateKm;
      // Element-local pixels (origin at its centre, +y down) back to ground
      // kilometres: X = ex/s, Y = -ey/s. Substituting that into the projection
      // above gives a 3×3 in ex, ey.
      const hw = viewW / 2;
      const hh = viewH / 2;
      const h11 = (hw * px * r00) / s;
      const h12 = (-hw * px * r01) / s;
      const h13 = hw * px * tx;
      const h21 = (-hh * f * r10) / s;
      const h22 = (hh * f * r11) / s;
      const h23 = -hh * f * ty;
      const h31 = -r20 / s;
      const h32 = r21 / s;
      const h33 = -tz;
      // Column-major, with the third row and column left as identity: CSS
      // multiplies (ex, ey, 0, 1) and divides by the w that falls out.
      return `matrix3d(${h11},${h21},0,${h31},${h12},${h22},0,${h32},0,0,1,0,${h13},${h23},0,${h33})`;
    },
  };
}

export interface FlyGLSource {
  km: number;
  image: HTMLImageElement;
}

export interface FlyGL {
  /**
   * Put ONE more plate on the GPU. Returns true once they are all up.
   *
   * Deliberately not done in one go. Uploading four plates — one of them nine
   * megapixels — and building their mipmaps costs well over a frame, and the
   * frame it costs is the first one of the page, where a stall is the most
   * visible thing that can possibly happen. One per frame spreads it across the
   * opening dwell, where there is nothing else to do.
   *
   * `render` draws whatever is already up, so the move can start after the
   * first. That is not a compromise: the first plate is the coarsest, which is
   * the only one that is even on screen at the top of the ladder.
   */
  step(): boolean;
  /** True once the programs have failed to link. The caller falls back. */
  failed(): boolean;
  /**
   * Draw one frame. `time` is seconds since the move started, for the grain.
   * Returns false while there is still nothing on the GPU to draw with, so the
   * caller knows to keep showing the image stack.
   */
  render(pose: Pose, time: number): boolean;
  /** Re-read the canvas' CSS size. Cheap enough to call on every resize event. */
  resize(): void;
  dispose(): void;
}

export function createFlyGL(
  canvas: HTMLCanvasElement,
  sources: readonly FlyGLSource[],
  ignite?: HTMLImageElement | null,
  sumi?: HTMLImageElement | null
): FlyGL | null {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!context) return null;
  // Re-bound rather than used directly: TypeScript drops the null narrowing at
  // the first closure boundary, and everything below is closures.
  const gl: WebGL2RenderingContext = context;

  const plateOrNull = link(gl, PLATE_VERT, PLATE_FRAG);
  const postOrNull = link(gl, POST_VERT, POST_FRAG);
  if (!plateOrNull || !postOrNull) return null;
  // Rebound for the same reason `gl` is above: the narrowing does not survive
  // the closures, and every use below is inside one.
  const platePrg: WebGLProgram = plateOrNull;
  const postPrg: WebGLProgram = postOrNull;

  // One buffer serves both programs: a -0.5..0.5 quad for the plates, and the
  // same four corners read as -1..1 clip space for the full-screen pass.
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
    gl.STATIC_DRAW
  );
  const fullscreen = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreen);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const maxAniso = (() => {
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (!ext) return null;
    return {
      ext,
      max: Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number),
    };
  })();

  const textures: { tex: WebGLTexture | null; km: number }[] = [];
  /** The arrival-time plate. Null until it is up, or for good if it never loads. */
  let igniteTex: WebGLTexture | null = null;
  let igniteDone = false;
  /** The drawn sheet. Same lifecycle; without it the cold pass has no picture. */
  let sumiTex: WebGLTexture | null = null;
  let sumiDone = false;

  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  let linked = false;
  let broken = false;

  /** Non-blocking on drivers that support it, one blocking query on those that don't. */
  function checkLink(): boolean {
    if (linked || broken) return linked;
    if (parallel) {
      const done =
        gl.getProgramParameter(platePrg, parallel.COMPLETION_STATUS_KHR) &&
        gl.getProgramParameter(postPrg, parallel.COMPLETION_STATUS_KHR);
      if (!done) return false;
    }
    const ok =
      gl.getProgramParameter(platePrg, gl.LINK_STATUS) &&
      gl.getProgramParameter(postPrg, gl.LINK_STATUS);
    if (ok) linked = true;
    else broken = true;
    return linked;
  }

  function failed(): boolean {
    return broken;
  }

  /** Shared set-up for every texture that goes up. */
  function upload(image: TexImageSource): WebGLTexture | null {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // Mipmaps are not optional here. The camera settles by nine per cent over
    // the opening, so the plate is minified for most of it; without them the
    // street grid aliases into sparkle, and sparkle on a light map reads as
    // content.
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (maxAniso) {
      gl.texParameterf(gl.TEXTURE_2D, maxAniso.ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso.max);
    }
    return tex;
  }

  function step(): boolean {
    // Linking first, and it gets a frame of its own — the uniform lookups below
    // would block on it anyway.
    if (!checkLink()) return false;
    const s = sources[textures.length];
    if (!s) {
      // The plates are up. Then the two data plates, in order and one per
      // frame: the arrival times, then the drawn sheet.
      //
      // BOTH of them live inside this branch, and that is the whole point of
      // the shape. The sheet's upload sat after it once — after a branch that
      // returns on every path — so it was reachable only while plates were
      // still outstanding, which is never, and the opening ran hot from the
      // first frame with a texture that had been fetched and never bound.
      if (!igniteDone) {
        if (!ignite) {
          igniteDone = true;
          return false;
        }
        // Broken, not merely slow: an image that has finished with no pixels is
        // never going to have any. The opening then runs hot from the start,
        // which is a worse opening and not a broken page.
        if (ignite.complete && ignite.naturalWidth === 0) {
          igniteDone = true;
          return false;
        }
        if (!ignite.complete) return false;
        igniteTex = upload(ignite);
        igniteDone = true;
        return false;
      }
      if (!sumiDone) {
        if (!sumi) {
          sumiDone = true;
          return true;
        }
        if (sumi.complete && sumi.naturalWidth === 0) {
          sumiDone = true;
          return true;
        }
        if (!sumi.complete) return false;
        sumiTex = upload(sumi);
        sumiDone = true;
      }
      return true;
    }
    // Not decoded yet. The canvas comes up on the FIRST plate now rather than
    // waiting for all of them, so the later ones can still be in flight — and
    // texImage2D from an unfinished image uploads nothing useful. Try again next
    // frame; the coarser plate underneath is covering the frame meanwhile.
    if (!s.image.complete || s.image.naturalWidth === 0) return false;
    textures.push({ tex: upload(s.image), km: s.km });
    return false;
  }

  // ── Offscreen buffer for the post pass ──────────────────────────────────────
  const fbo = gl.createFramebuffer();
  const colour = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colour);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colour, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Queried lazily, on the first render — `getUniformLocation` blocks on the
  // link exactly like `getProgramParameter` does, so pulling them here would
  // undo the whole point of linking in parallel.
  let uniforms: {
    uMVP: WebGLUniformLocation | null;
    uSize: WebGLUniformLocation | null;
    uAlpha: WebGLUniformLocation | null;
    uFeather: WebGLUniformLocation | null;
    uTex: WebGLUniformLocation | null;
    uIgnite: WebGLUniformLocation | null;
    uSumi: WebGLUniformLocation | null;
    uCold: WebGLUniformLocation | null;
    uReveal: WebGLUniformLocation | null;
    uFrontWidth: WebGLUniformLocation | null;
    uRimWidth: WebGLUniformLocation | null;
    uRimGain: WebGLUniformLocation | null;
    uRimBase: WebGLUniformLocation | null;
    uChar: WebGLUniformLocation | null;
    uCharAt: WebGLUniformLocation | null;
    uCharW: WebGLUniformLocation | null;
    uCharTail: WebGLUniformLocation | null;
    uRimColour: WebGLUniformLocation | null;
    uSrc: WebGLUniformLocation | null;
    uRes: WebGLUniformLocation | null;
    uBlur: WebGLUniformLocation | null;
    uHaze: WebGLUniformLocation | null;
    uVignette: WebGLUniformLocation | null;
    uGrain: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uFlash: WebGLUniformLocation | null;
    uHazeColour: WebGLUniformLocation | null;
    uFlashColour: WebGLUniformLocation | null;
  } | null = null;

  function locations(): NonNullable<typeof uniforms> {
    if (uniforms) return uniforms;
    uniforms = {
      uMVP: gl.getUniformLocation(platePrg, "uMVP"),
      uSize: gl.getUniformLocation(platePrg, "uSize"),
      uAlpha: gl.getUniformLocation(platePrg, "uAlpha"),
      uFeather: gl.getUniformLocation(platePrg, "uFeather"),
      uTex: gl.getUniformLocation(platePrg, "uTex"),
      uIgnite: gl.getUniformLocation(platePrg, "uIgnite"),
      uSumi: gl.getUniformLocation(platePrg, "uSumi"),
      uCold: gl.getUniformLocation(platePrg, "uCold"),
      uReveal: gl.getUniformLocation(platePrg, "uReveal"),
      uFrontWidth: gl.getUniformLocation(platePrg, "uFrontWidth"),
      uRimWidth: gl.getUniformLocation(platePrg, "uRimWidth"),
      uRimGain: gl.getUniformLocation(platePrg, "uRimGain"),
      uRimBase: gl.getUniformLocation(platePrg, "uRimBase"),
      uChar: gl.getUniformLocation(platePrg, "uChar"),
      uCharAt: gl.getUniformLocation(platePrg, "uCharAt"),
      uCharW: gl.getUniformLocation(platePrg, "uCharW"),
      uCharTail: gl.getUniformLocation(platePrg, "uCharTail"),
      uRimColour: gl.getUniformLocation(platePrg, "uRimColour"),
      uSrc: gl.getUniformLocation(postPrg, "uSrc"),
      uRes: gl.getUniformLocation(postPrg, "uRes"),
      uBlur: gl.getUniformLocation(postPrg, "uBlur"),
      uHaze: gl.getUniformLocation(postPrg, "uHaze"),
      uVignette: gl.getUniformLocation(postPrg, "uVignette"),
      uGrain: gl.getUniformLocation(postPrg, "uGrain"),
      uTime: gl.getUniformLocation(postPrg, "uTime"),
      uFlash: gl.getUniformLocation(postPrg, "uFlash"),
      uHazeColour: gl.getUniformLocation(postPrg, "uHazeColour"),
      uFlashColour: gl.getUniformLocation(postPrg, "uFlashColour"),
    };
    return uniforms;
  }

  const mvp = new Float32Array(16);

  let width = 1;
  let height = 1;

  function resize(): void {
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl.bindTexture(gl.TEXTURE_2D, colour);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  resize();

  function render(pose: Pose, time: number): boolean {
    if (!linked || broken || textures.length === 0) return false;
    const u = locations();
    resize();

    makeCamera(pose, width / height, mvp);

    // ── Pass 1 · the plates ──────────────────────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(platePrg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(u.uMVP, false, mvp);
    gl.uniform1i(u.uTex, 0);
    gl.uniform1i(u.uIgnite, 1);
    gl.uniform1i(u.uSumi, 2);

    // The cold pass and the fire. Zero unless the arrival-time plate is up: a
    // cold map that never ignites is the one failure mode worse than a hot one.
    // Both plates or neither. The cold pass without the drawing is the ember
    // map at a third brightness, which reads as a bug rather than as a sheet;
    // and without the arrival-time plate there is nothing to burn along, so a
    // cold map would never ignite. Either missing and the opening simply runs
    // hot from the first frame, which is a lesser opening and not a broken page.
    const cold = igniteTex && sumiTex ? pose.cold : 0;
    gl.uniform1f(u.uCold, cold);
    gl.uniform1f(u.uReveal, pose.reveal);
    gl.uniform1f(u.uFrontWidth, FRONT_WIDTH);
    gl.uniform1f(u.uRimWidth, RIM_WIDTH);
    gl.uniform1f(u.uRimGain, RIM_GAIN);
    gl.uniform1f(u.uRimBase, RIM_BASE);
    gl.uniform1f(u.uCharAt, CHAR_AT);
    gl.uniform1f(u.uCharW, CHAR_W);
    gl.uniform1f(u.uCharTail, CHAR_TAIL);
    gl.uniform3f(u.uChar, CHAR[0], CHAR[1], CHAR[2]);
    gl.uniform3f(u.uRimColour, RIM_COLOUR[0], RIM_COLOUR[1], RIM_COLOUR[2]);
    if (igniteTex) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, igniteTex);
    }
    if (sumiTex) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sumiTex);
    }
    gl.activeTexture(gl.TEXTURE0);

    for (let i = 0; i < textures.length; i++) {
      const t = textures[i];
      if (!t) continue;
      const alpha = pose.alpha[i] ?? 0;
      if (alpha <= 0.001) continue;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.uniform2f(u.uSize, t.km, t.km / PLATE_ASPECT);
      gl.uniform1f(u.uAlpha, alpha);
      gl.uniform1f(u.uFeather, pose.feather[i] ?? 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ── Pass 2 · the lens ────────────────────────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);

    gl.useProgram(postPrg);
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreen);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, colour);
    gl.uniform1i(u.uSrc, 0);
    gl.uniform2f(u.uRes, width, height);

    // Haze, raster, vignette and grain ride how much of the SYSTEM VIEW is left,
    // and every one of them is exactly zero at the end — which is what makes the
    // last frame the plain plate, and the hand-over to the backdrop invisible by
    // construction rather than by tuning.
    const a = pose.screen;
    gl.uniform1f(u.uBlur, BLUR_MAX * pose.blur);
    gl.uniform1f(u.uHaze, HAZE_MAX * Math.pow(a, 0.9));
    gl.uniform1f(u.uVignette, VIGNETTE_MAX * a);
    gl.uniform1f(u.uGrain, GRAIN_MAX * a);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uFlash, FLASH * pose.flash);
    gl.uniform3f(u.uHazeColour, HAZE_COLOUR[0], HAZE_COLOUR[1], HAZE_COLOUR[2]);
    gl.uniform3f(u.uFlashColour, FLASH_COLOUR[0], FLASH_COLOUR[1], FLASH_COLOUR[2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  function dispose(): void {
    for (const t of textures) if (t.tex) gl.deleteTexture(t.tex);
    if (igniteTex) gl.deleteTexture(igniteTex);
    if (sumiTex) gl.deleteTexture(sumiTex);
    gl.deleteTexture(colour);
    gl.deleteFramebuffer(fbo);
    gl.deleteBuffer(quad);
    gl.deleteBuffer(fullscreen);
    gl.deleteProgram(platePrg);
    gl.deleteProgram(postPrg);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return { step, failed, render, resize, dispose };
}

/** The plate list, in the shape `createFlyGL` wants, given the loaded images. */
export function sourcesFrom(images: readonly HTMLImageElement[]): FlyGLSource[] {
  const out: FlyGLSource[] = [];
  PLATES.forEach((p, i) => {
    const image = images[i];
    if (image) out.push({ km: p.km, image });
  });
  return out;
}
