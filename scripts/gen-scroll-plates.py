"""The opening's two plates: the Sanjō scroll, graded by the wall's own function.

── Why this script exists ───────────────────────────────────────────────────
The opening and the sections under it were two separately authored things, and
they read as two things: the wall was black-and-ember, the hero was brown. That
was not a tuning miss, it was a category error.

  The wall REMAPS the scan. gen-wall.py sends every pixel through a lookup that
  has nothing to do with where it started: the beige silk lands on near-black,
  the pigment on ember.

  The hero DIMMED the scan — a CSS `filter: brightness(.30) saturate(.26)` over
  a photograph of a painting. A filter can only scale and rotate colour that is
  already there. Dim a brown painting and you get a darker brown painting.

So this file does to the Heiji scroll exactly what gen-wall.py does to the
night-parade sections: the same arithmetic, in the same order, constant for
constant. The two surfaces then match by construction and keep matching when
either is regenerated.

Output, and the roles are one-for-one with .jjk-wall / .jjk-wall-glow:

  public/img/scroll-cold.webp   the scroll as a wall — night, ink, no browns.
                                Stored WALL_GAIN too bright and divided back
                                down in CSS, for the reason set out at length
                                in gen-wall.py: a near-black image cannot
                                survive a lossy codec, because quantisation
                                steps are absolute and our whole signal fits in
                                a seventh of the range.
  public/img/scroll-glow.webp   the light, on black. Screened over the cold
                                plate, so it is a complete no-op at opacity 0
                                and needs no mask — black adds nothing.

── The four departures from gen-wall.py, and why each is forced ─────────────
1 · `mblur` everywhere, never the wrapping `blur`. The wall is a TILE, so a
    blur that wraps round the edge is correct there — it is the neighbouring
    copy. This is a single stretch of scroll that does not tile, and a wrapping
    blur would carry the fire at one end onto the cavalry at the other.

2 · None of the quilting. No gap paper, no dithered seams, no `quietest()`
    roll. All of that exists to build a repeating surface out of separate
    sheets; here there is one continuous stretch of one scroll.

3 · The light's ink term runs at INK_LIGHT_GAIN, not the wall's 6.5. This is
    one of two numbers that had to be re-derived, and it was re-derived by
    measurement rather than by eye. Running gen-wall.py's own detectors over
    both sets of scans:

        night parade   drawing 10–13 % of the scan · ink 8–11 % · red 0.4–1 %
        Sanjō scroll   drawing 31 %              · ink 28 %   · red 8.3 %

    The parade is an ink scroll with a whisper of pigment. The Sanjō is a fully
    coloured battle painting with three times the drawing on it. Feed the
    second through constants calibrated on the first and the light field
    saturates everywhere — which is exactly what the first attempt looked like:
    the cavalry glowed as hard as the burning palace. So the light's ink gain
    is set to whatever reproduces the parade's ~10 % coverage on THIS scan,
    which is 1.7. The cold plate keeps 6.5, because there the dense dark masses
    are wanted: they are what draws the figures.

4 · The pigment term is FIRE, not `redder`. On the parade, red is rare enough
    that "redder than the paper" and "on fire" are the same set of pixels. Here
    they are not: eight per cent of the scroll is redder than the paper —
    lacquer, armour lacing, banners, the ox-cart — and only the blaze is
    actually alight.

── Separating the blaze from the lacquer ────────────────────────────────────
Fire is first found as warm AND saturated AND bright. Each factor alone is
useless: warm alone is the whole scroll, saturated alone is every dyed robe,
bright alone is bare silk. Only the product is true of flame.

That still leaves the armour. Measured, the raw mask is only 2.3x stronger in
the blaze than over the cavalry — no threshold separates them, because the
lacquer really is warm, saturated and bright; there is just very little of it
in any one place. Which is the actual difference, and it is spatial, not
photometric:

    a fire is a REGION. Armour lacing is TEXTURE.

So the mask is low-passed at FIRE_REGION_RADIUS and thresholded: a blaze a
thousand pixels across survives its own blur, a hundred specks a pixel wide do
not. Measured on this scan that separates them 22:1, and it is what lets
FIRE_WEIGHT be turned up to eight without the cavalry moving — at that setting
the blaze gains 40 % and everything else 4 %.

── FIRE_WEIGHT, and why it is added rather than mixed in ────────────────────
`BASE` below is today's core, clipped at 1 exactly as gen-wall.py clips it, and
the extra fire is added ON TOP of that clip rather than inside it. That matters:
raising the clip instead would have let ink+red+green through where they used
to be cut, and the cavalry brightened by half before anyone touched the fire.
The light field's normaliser and floor are likewise frozen at the FIRE_WEIGHT=1
values and reused, so turning the fire up cannot rescale anything else. At
FIRE_WEIGHT = 1 this file reproduces its own previous output exactly.

The plate is rendered at the PEAK of the flare. The CSS ramps opacity to 1 and
then settles back to about 0.88, so the fire flares as it catches and then
burns steady — an overshoot, done with the only property that is free to
animate.

Source: _scout/assets/heiji-sanjo-complete.jpg
        Heiji Monogatari Emaki, Night Attack on the Sanjō Palace, 13th c.
        MFA Boston, via Wikimedia Commons, public domain. 34396x2172.
"""
import os
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC = os.path.join(_ROOT, "_scout", "assets", "heiji-sanjo-complete.jpg")
_IMG = os.path.join(_ROOT, "public", "img")
OUT_COLD = os.path.join(_IMG, "scroll-cold.webp")
OUT_GLOW = os.path.join(_IMG, "scroll-glow.webp")

if len(sys.argv) > 1:
    SRC = sys.argv[1]
if len(sys.argv) > 3:
    OUT_COLD, OUT_GLOW = sys.argv[2], sys.argv[3]

# ── The window ──────────────────────────────────────────────────────────────
# Fractions of the full scroll, and this is now a STILL — the opening no longer
# unrolls, it opens on the fire. Which changes what the crop should be:
#
#   The old crop was 5.6 screens wide because most of it flew past; two thirds
#   of it carried a baked motion blur and only the landing zone was sharp. With
#   nothing moving, all of that is bytes spent on pixels nobody sees — and
#   worse, on an ultrawide screen the frame reached into the smeared part.
#
#   So the window is cut to what a frame can actually show: 3.62:1, which
#   covers everything up to 32.6:9, sharp end to end. The blaze fills the left
#   two thirds and the palace gable anchors the right.
#
# Change these and the CSS must follow — this script prints both numbers it
# needs, and `.jjk-scroll-plate` has nowhere else to get them.
X0, X1 = 0.345, 0.560
Y0, Y1 = 0.030, 0.970           # the mount: a row profile of the scan puts the
                                # dark mounting edge below 0.022 and above 0.973
FIRE = 0.435                    # centre of the blaze, in scroll fractions
FRAME_ANCHOR = 0.42             # where the blaze sits across the viewport
H = 1000                        # output height, and the unit every scale below
                                # is expressed in — gen-wall.py's convention

# ── Constants, verbatim from gen-wall.py ────────────────────────────────────
WALL_GAIN = 2.5                 # paired with `filter: brightness()` in the CSS
LIGHT_RADII = (0.032, 0.092, 0.25)
LIGHT_WEIGHTS = (0.44, 0.34, 0.30)
LIGHT_FLOOR_PCT = 40
INK_GAIN = 6.5                  # the drawing, for the cold plate

# ── Constants re-derived for this scan — see notes 3 and 4 above ────────────
# ── What actually draws the temple and the soldiers ─────────────────────────
# The wall's construction throws the painting's TONE away and keeps only its
# edges: `det` is a high-pass of the INPAINTED paper, and the ink is then
# SUBTRACTED from an already near-black base. On the wall that is right — the
# figures are meant to be revealed by light, not read.
#
# Here it inverted the source's own figure-ground and then flattened it. In the
# scan the samurai are dark on bright silk; in the plate the silk is near-black
# and the ink darkens it further, so a temple roof — a large flat mass with no
# local contrast inside it — came out as a hole with a thin rim. "Ich tu mir
# schwer, den Tempel oder Soldaten zu erkennen."
#
# So legibility is put where it belongs: in the LIGHT, not in the cold plate.
# The roof is visible because the fire is lighting it, which is both physically
# true and dramatically right — when the fire dies at the end, the roof goes
# dark with it, and the handover to the dark room needs no separate machinery.
#
# Two terms do it, and they answer two different failures:
#
#   INK_LIGHT_GAIN raised 1.7 -> 3.5. The gain controls how much of the drawing
#   counts as emitting. At 1.7 it was calibrated to reproduce the night
#   parade's ~10 % ink coverage, which is correct for a background and too thin
#   for a subject: only the finest lines emitted. At 3.5 the brackets, the
#   eaves, the armour and the horses come with them.
#
#   LIGHT_MIX["body"], new. Local contrast cannot see the inside of a large
#   flat shape — that is what left the roof hollow. `body` is the opposite
#   measurement: how much DARKER than the bare silk a passage is, low-passed so
#   it is a mass rather than an outline. It gives the lacquered roof a body
#   catching firelight instead of a void.
#
# Measured on the frame the reader actually sees, going from (1.7, 0) to
# (3.5, 0.16): local contrast over the temple 4.4 -> 9.0 and over the cavalry
# 4.1 -> 8.7, both roughly doubled — while the flame cores move from 113.1 to
# 113.3 of 255. The fire is not touched at all. What opens is the shadow floor,
# 9.1 -> 18.0, which is the crush that was hiding everything.
INK_LIGHT_GAIN = 3.5            # was 1.7 — see the note above
# The paper's texture is read as a BAND, not as everything above a cutoff.
#
# gen-wall.py takes a plain high-pass — `plum - blur(plum, H/78)` — and that is
# right for the wall, which is seen at 5 % luminance behind a 93 % veil. Here
# the same plate is the picture, at full exposure, and the top of that band is
# not paper at all: it is the film grain of a photograph of a scroll. Amplified
# by 1.35 onto a 0.05 floor it becomes a +-54 % modulation, and it showed up as
# silver speckle crawling all over the smoke.
#
# So the high-pass gets a floor of its own. Measured on this window, blurring
# the near end by 1.6 px cuts the noise in a smooth passage from 14.1 to 5.2 of
# 255 while keeping four fifths of the detail energy (sd 0.116 -> 0.082): the
# grain goes, the fibre, stains and fold lines stay.
PAPER_GRAIN = 1.6               # px; 0 restores gen-wall.py's plain high-pass
FIRE_WARM, FIRE_SAT, FIRE_LUM = 0.10, 0.35, 0.55
FIRE_REGION_RADIUS = 0.07       # of the plate height
FIRE_REGION_LO = 0.045          # blaze below this density is not a blaze
FIRE_REGION_HI = 0.045 * 2.6
FIRE_WEIGHT = 8.0               # the flare's peak; 1.0 is the wall's own mix
LIGHT_MIX = dict(ink=0.72, fire=1.00, red=0.18, green=0.30, body=0.16)
BODY_GAIN = 1.35                # contrast of the mass term against the silk
BODY_BLUR = 2.5                 # px; enough that it is a mass and not an edge

# Byte budgets, per plate. The cold plate gets the larger one and it is not
# generosity: it is the frame the reader looks at for the whole opening, it is
# near-black, and near-black is where a lossy codec does its worst — the
# quantisation step is absolute, so an error of three levels is noise on bright
# paper and blocking on a dark wall. Measured against a q78 reference, the
# displayed error runs 1.8/255 at q70 and 3.0/255 at q40 against a signal whose
# standard deviation is about 17.
SIZE_TARGET_KB = {"cold": 560, "glow": 480}


def blur(x, s):
    """Gaussian as a multiply in the frequency domain. Wraps — see note 1."""
    h, w = x.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    if x.ndim == 2:
        return np.fft.irfft2(np.fft.rfft2(x) * k, s=(h, w)).astype(np.float32)
    return np.stack(
        [np.fft.irfft2(np.fft.rfft2(x[..., i]) * k, s=(h, w)) for i in range(x.shape[2])],
        axis=-1,
    ).astype(np.float32)


def mblur(x, s):
    """The same, reflected at the edges. This is the one used below."""
    h, w = x.shape[:2]
    ph, pw = min(int(s * 3), h - 1), min(int(s * 3), w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    out = blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)
    return out[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def save(a, path, budget, gain=1.0):
    """Write, stepping the quality down until the plate fits its budget."""
    im = Image.fromarray(np.clip(a * gain * 255, 0, 255).astype(np.uint8), "RGB")
    for q in (82, 74, 66, 58, 50, 42):
        im.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= budget:
            break
    return q, kb


# ── 1 · The window ──────────────────────────────────────────────────────────
im = Image.open(SRC).convert("RGB")
W0, H0 = im.size
strip = im.crop((int(W0 * X0), int(H0 * Y0), int(W0 * X1), int(H0 * Y1)))
CW = int(strip.size[0] * H / strip.size[1])
art = np.asarray(strip.resize((CW, H), Image.LANCZOS), np.float32) / 255.0
del im, strip
CH = H
print(f"window {CW}x{CH}  ({CW / CH:.3f}:1, covers to {CW / CH * 9:.1f}:9)")

# ── 2 · Flatten the scan's own lighting ─────────────────────────────────────
# gen-wall.py does this per panel before anything else, and every step after it
# reads absolute tone. A photograph of a mounted scroll is never evenly lit, and
# an unflattened gradient comes out as a slow brightening across the plate.
lf = mblur(art, H / 3)
art = np.clip(art - lf + np.median(lf.reshape(-1, 3), axis=0), 0, 1)
del lf

# ── 3 · Ink, pigment and fire, separated out of the same scan ───────────────
# Ink is found by LOCAL contrast, never by absolute darkness: a scan darker at
# one end would otherwise read as ink at that end.
paper_tone = np.median(art.reshape(-1, 3), axis=0)
dev = art - paper_tone
lum = 0.2126 * art[..., 0] + 0.7152 * art[..., 1] + 0.0722 * art[..., 2]

highpass = mblur(lum, H / 50) - lum
ink = np.clip(highpass * INK_GAIN, 0, 1)              # the drawing
ink_light = np.clip(highpass * INK_LIGHT_GAIN, 0, 1)  # the part that emits
highpass_ref = highpass.copy()                        # for the frozen normaliser
redder = np.clip((dev[..., 0] - dev[..., 2] - 0.07) * 11.0, 0, 1)
greener = np.clip((dev[..., 1] - dev[..., 0] - 0.05) * 11.0, 0, 1)

chroma_max = art.max(axis=-1)
sat = (chroma_max - art.min(axis=-1)) / np.maximum(chroma_max, 1e-4)
warm = art[..., 0] - art[..., 2]
fire_raw = (np.clip((warm - FIRE_WARM) * 8.0, 0, 1)
            * np.clip((sat - FIRE_SAT) * 6.0, 0, 1)
            * np.clip((lum - FIRE_LUM) * 6.0, 0, 1))
# A fire is a region; armour lacing is texture. See the note at the top.
density = mblur(fire_raw, CH * FIRE_REGION_RADIUS)
blaze = fire_raw * smoothstep(
    (density - FIRE_REGION_LO) / (FIRE_REGION_HI - FIRE_REGION_LO))

# The mass term. `paper_lum` is the bare silk, so this is "how much darker than
# the paper", blurred just enough that a roof reads as a surface and a brush
# line does not read at all.
paper_lum = float(np.median(lum))
body = mblur(np.clip((paper_lum - lum) / max(paper_lum, 1e-6) * BODY_GAIN, 0, 1),
             BODY_BLUR)

drawing = np.clip(np.maximum(ink, np.maximum(redder, greener)), 0, 1)
del dev, chroma_max, sat, warm

_left = blaze[:, :int(CW * 0.33)].mean()
print(f"  blaze isolated: {blaze[:, int(CW * 0.55):].mean() / max(_left, 1e-9):.0f}x "
      f"stronger over the fire than over the cavalry")

# ── 4 · The paper, with the painting taken off it ───────────────────────────
# Painted areas are inpainted with a weighted blur of everything that is not
# painted. Paper has no sharp features, so that is all it takes: fibre, stains
# and the fold lines from being rolled survive, the painting vanishes.
hole = np.clip(drawing * 2.2, 0, 1)[..., None]
keep = 1.0 - hole
paper = np.where(hole > 0.03,
                 mblur(art * keep, H / 27) / (mblur(keep, H / 27) + 1e-4),
                 art)
del hole, keep, art

# ── 5 · The cold plate ──────────────────────────────────────────────────────
# The remap. `det` is the paper's own texture as a high-pass — the absolute tone
# of the silk is discarded outright, which is exactly why no brown survives —
# rebuilt at 5 % luminance with a warm channel tilt, and the ink cuts into it.
plum = 0.2126 * paper[..., 0] + 0.7152 * paper[..., 1] + 0.0722 * paper[..., 2]
det = mblur(plum, PAPER_GRAIN) - mblur(plum, H / 78)
base = np.clip(0.050 + det * 1.35, 0, 1)
cold = np.stack([base * 1.25, base * 1.02, base * 0.86], axis=-1)
cold *= 1 - ink[..., None] * 0.42
del paper, plum, det, base, ink


# ── 6 · The light ───────────────────────────────────────────────────────────
def gate(core, div=None, floor=None):
    """gen-wall.py's light field: multi-radius blur, normalised, floored, kneed."""
    lit = sum(mblur(core, max(1.0, CH * r)) * w
              for r, w in zip(LIGHT_RADII, LIGHT_WEIGHTS))
    d = div if div is not None else max(float(np.percentile(lit, 99.9)), 1e-6)
    lit = lit / d
    f = floor if floor is not None else float(np.percentile(lit, LIGHT_FLOOR_PCT))
    return np.clip(np.power(np.clip((lit - f) / max(1e-6, 1.0 - f), 0, 1), 1.15), 0, 1), d, f


# Today's core, clipped exactly as gen-wall.py clips it, and its normaliser.
# Both are frozen here and reused below, so turning the fire up cannot rescale
# anything that is not fire.
# The normaliser and the floor are frozen against the ORIGINAL mix — ink at 1.7,
# no body — for the same reason FIRE_WEIGHT is added rather than mixed in: a
# light field that re-normalises itself every time a term is added rescales
# everything else along with it, and nothing downstream would be comparable to
# anything measured before.
_ink_ref = np.clip(highpass_ref * 1.7, 0, 1)
REFERENCE = np.clip(_ink_ref * LIGHT_MIX["ink"]
                    + fire_raw * LIGHT_MIX["fire"]
                    + redder * LIGHT_MIX["red"]
                    + greener * LIGHT_MIX["green"], 0, 1)
_, DIV, FLOOR = gate(REFERENCE)
del _ink_ref, REFERENCE, highpass_ref

BASE = np.clip(ink_light * LIGHT_MIX["ink"]
               + fire_raw * LIGHT_MIX["fire"]
               + redder * LIGHT_MIX["red"]
               + greener * LIGHT_MIX["green"]
               + body * LIGHT_MIX["body"], 0, 1)

core = BASE + blaze * (FIRE_WEIGHT - 1.0)   # the extra sits ON TOP of the clip
lit, _, _ = gate(core, DIV, FLOOR)

halo = (mblur(core, 5) * 0.34
        + mblur(core, 18) * 0.22
        + mblur(core, 60) * 0.16
        + mblur(core, CH * 0.075) * 0.10)
# The gate, and the single most important line for making the two surfaces
# match. Without it the halo is a soft grey wash over the whole plate and the
# section reads as fog rather than as a room with one thing burning in it.
halo *= np.clip(lit * 2.5, 0, 1)

g = np.clip(core * 0.92 + halo, 0, 1.25)
glow = np.stack([g * 0.78, np.power(g, 1.7) * 0.26, np.power(g, 2.6) * 0.09], axis=-1)

# What the weight actually bought, measured rather than asserted.
if FIRE_WEIGHT != 1.0:
    lit0, _, _ = gate(BASE, DIV, FLOOR)
    halo0 = (mblur(BASE, 5) * 0.34 + mblur(BASE, 18) * 0.22
             + mblur(BASE, 60) * 0.16 + mblur(BASE, CH * 0.075) * 0.10)
    halo0 *= np.clip(lit0 * 2.5, 0, 1)
    g0 = np.clip(BASE * 0.92 + halo0, 0, 1.25)
    L, Z = slice(0, int(CW * 0.33)), slice(int(CW * 0.55), None)
    print(f"  FIRE_WEIGHT {FIRE_WEIGHT}: blaze {g[:, Z].mean() / g0[:, Z].mean() * 100:.0f}% "
          f"of the reference mix, cavalry {g[:, L].mean() / g0[:, L].mean() * 100:.0f}%")
    del lit0, halo0, g0

del halo, ink_light, redder, greener, drawing, fire_raw, blaze, body, core, g

# ── 7 · Out ─────────────────────────────────────────────────────────────────
qc, kc = save(cold, OUT_COLD, SIZE_TARGET_KB["cold"], WALL_GAIN)
qg, kg = save(glow, OUT_GLOW, SIZE_TARGET_KB["glow"])

cl = 0.2126 * cold[..., 0] + 0.7152 * cold[..., 1] + 0.0722 * cold[..., 2]
gl = 0.2126 * glow[..., 0] + 0.7152 * glow[..., 1] + 0.0722 * glow[..., 2]
print(f"wrote {os.path.basename(OUT_COLD)}  {kc:.0f} KB  q{qc}")
print(f"      {os.path.basename(OUT_GLOW)}  {kg:.0f} KB  q{qg}")
print(f"  cold luminance x255  mean {cl.mean() * 255:.1f}  sd {cl.std() * 255:.1f}")
print(f"  light reaches {100 * (lit > 0.08).mean():.0f}% of the plate, "
      f"strongly {(lit > 0.5).mean() * 100:.0f}%")
cols = gl.mean(axis=0)
b = np.array([cols[i * CW // 20:(i + 1) * CW // 20].mean() for i in range(20)])
print("  light by column " + " ".join(f"{v / max(b.max(), 1e-9):.2f}" for v in b))

# ── The two numbers the CSS needs ───────────────────────────────────────────
width_svh = CW / CH * 100
blaze_svh = (FIRE - X0) / (X1 - X0) * width_svh
print()
print("CSS — copy both into `.jjk-scroll-plate` in globals.css:")
print(f"  plate width   {width_svh:.1f}svh per 100svh")
print(f"  blaze centre  {blaze_svh:.1f}svh from the plate's left edge")
print(f"  translate: clamp(calc(100vw - {width_svh:.1f}svh), "
      f"calc({FRAME_ANCHOR * 100:.0f}vw - {blaze_svh:.1f}svh), 0px)")
