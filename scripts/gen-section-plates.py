"""The lower half of the page: four painted grounds out of the same scroll.

── Why this exists ──────────────────────────────────────────────────────────
Everything above the timetable stands on a painted surface. Everything below it
stood on `bg-background` and `bg-card`: flat fills, rounded corners, backdrop
blur — a different website wearing the same header. The two halves did not
disagree about taste, they disagreed about what kind of object the page is.

`Room` already solves this for the night-parade wall: one tiled emaki, veiled,
with its own pigment screened back on top. What it cannot do is vary. A wall
that runs for six more sections is a wall you stop seeing, and the tile's
repeat becomes visible the moment there is that much of it on screen at once.

So the lower half alternates. Some sections stand on the parade wall — the same
`Room`, the same tile, no new bytes. Others stand on a STRETCH of the Sanjō
scroll, cropped like a hanging panel: the same painting the opening burns, at
four other places along its thirty-four thousand pixels.

── Why it is the same arithmetic and not a new look ─────────────────────────
Every constant below is lifted verbatim from gen-scroll-plates.py, which lifted
them verbatim from gen-wall.py. That is the entire point and it has been the
lesson of this build three times over: two separately authored surfaces read as
two surfaces, however carefully somebody tunes them towards each other. There
is one grading function on this site and everything painted goes through it.

Three constants do vary, and each variation is a consequence rather than a
preference:

  INK_LIGHT_GAIN — how much of the drawing counts as emitting light. The hero
  runs 3.5 because it is the picture and the reader is meant to make out the
  temple. A background is meant to be FELT and not read: gen-wall.py's own
  calibration is 1.7, and these sit at 2.2 — enough that the figures are there
  when you look for them, not enough to compete with a price table.

  FIRE_WEIGHT — 8.0 only where there is a fire. On the three quiet windows the
  detector finds nothing to weight, so the number would be arithmetic on zero;
  stating it per window keeps that explicit instead of accidental.

  The byte budget. The hero's cold plate gets 560 KB because it is looked at.
  These are looked THROUGH, at about a seventh of their stored brightness, and
  they are four. 190/120 is what fits without the lower half of the page
  costing more than the upper.

── The four windows ─────────────────────────────────────────────────────────
Positions are fractions of the full scroll, which runs right to left in the
original and is stored left to right in the scan.

  carts  0.600–0.745  the ox-carts fleeing across open silk. Mostly bare paper,
                      which is what a six-column timetable needs under it.
  court  0.495–0.615  the palace interior: green blinds, courtiers in rows.
  blaze  0.395–0.505  the fire itself — the right end of the fire the opening
                      is built on. The closing call to action stands on the
                      same fire the page opened with, framed tighter, so it
                      reads as a detail of that picture rather than a reprise.
  sutra  0.860–0.990  the colophon. A scroll ends in a column of writing; so
                      does a page. This one needs no argument.

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
if len(sys.argv) > 1:
    SRC = sys.argv[1]

Y0, Y1 = 0.030, 0.970           # the mount, same row profile as the hero
H = 760                         # output height; a background, not the picture

# name        X0     X1     ink   fire  what it is
WINDOWS = [
    ("carts", 0.600, 0.745, 2.2, 1.0),
    ("court", 0.495, 0.615, 2.2, 1.0),
    ("blaze", 0.395, 0.505, 2.8, 8.0),
    ("sutra", 0.860, 0.990, 2.2, 1.0),
]
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None

# ── Constants, verbatim from gen-scroll-plates.py ───────────────────────────
WALL_GAIN = 2.5
LIGHT_RADII = (0.032, 0.092, 0.25)
LIGHT_WEIGHTS = (0.44, 0.34, 0.30)
LIGHT_FLOOR_PCT = 40
INK_GAIN = 6.5
PAPER_GRAIN = 1.6
FIRE_WARM, FIRE_SAT, FIRE_LUM = 0.10, 0.35, 0.55
FIRE_REGION_RADIUS = 0.07
FIRE_REGION_LO = 0.045
FIRE_REGION_HI = 0.045 * 2.6
LIGHT_MIX = dict(ink=0.72, fire=1.00, red=0.18, green=0.30, body=0.16)
BODY_GAIN = 1.35
BODY_BLUR = 2.5
SIZE_TARGET_KB = {"cold": 190, "glow": 120}


def blur(x, s):
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
    """Reflected at the edges. Never the wrapping one: a panel is not a tile,
    and a blur that wraps carries the fire at one end onto the silk at the
    other."""
    h, w = x.shape[:2]
    ph, pw = min(int(s * 3), h - 1), min(int(s * 3), w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    return blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def save(a, path, budget, gain=1.0):
    im = Image.fromarray(np.clip(a * gain * 255, 0, 255).astype(np.uint8), "RGB")
    for q in (80, 72, 64, 56, 48, 40):
        im.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= budget:
            break
    return q, kb


def plate(name, X0, X1, ink_light_gain, fire_weight, src):
    im = Image.open(src).convert("RGB")
    W0, H0 = im.size
    strip = im.crop((int(W0 * X0), int(H0 * Y0), int(W0 * X1), int(H0 * Y1)))
    CW = int(strip.size[0] * H / strip.size[1])
    art = np.asarray(strip.resize((CW, H), Image.LANCZOS), np.float32) / 255.0
    del im, strip
    CH = H

    # 2 · flatten the scan's own lighting
    lf = mblur(art, H / 3)
    art = np.clip(art - lf + np.median(lf.reshape(-1, 3), axis=0), 0, 1)
    del lf

    # 3 · ink, pigment and fire out of the same scan
    paper_tone = np.median(art.reshape(-1, 3), axis=0)
    dev = art - paper_tone
    lum = 0.2126 * art[..., 0] + 0.7152 * art[..., 1] + 0.0722 * art[..., 2]

    highpass = mblur(lum, H / 50) - lum
    ink = np.clip(highpass * INK_GAIN, 0, 1)
    ink_light = np.clip(highpass * ink_light_gain, 0, 1)
    highpass_ref = highpass.copy()
    redder = np.clip((dev[..., 0] - dev[..., 2] - 0.07) * 11.0, 0, 1)
    greener = np.clip((dev[..., 1] - dev[..., 0] - 0.05) * 11.0, 0, 1)

    chroma_max = art.max(axis=-1)
    sat = (chroma_max - art.min(axis=-1)) / np.maximum(chroma_max, 1e-4)
    warm = art[..., 0] - art[..., 2]
    fire_raw = (np.clip((warm - FIRE_WARM) * 8.0, 0, 1)
                * np.clip((sat - FIRE_SAT) * 6.0, 0, 1)
                * np.clip((lum - FIRE_LUM) * 6.0, 0, 1))
    density = mblur(fire_raw, CH * FIRE_REGION_RADIUS)
    blaze = fire_raw * smoothstep(
        (density - FIRE_REGION_LO) / (FIRE_REGION_HI - FIRE_REGION_LO))

    paper_lum = float(np.median(lum))
    body = mblur(np.clip((paper_lum - lum) / max(paper_lum, 1e-6) * BODY_GAIN, 0, 1),
                 BODY_BLUR)

    drawing = np.clip(np.maximum(ink, np.maximum(redder, greener)), 0, 1)
    del dev, chroma_max, sat, warm

    # 4 · the paper, with the painting taken off it
    hole = np.clip(drawing * 2.2, 0, 1)[..., None]
    keep = 1.0 - hole
    paper = np.where(hole > 0.03,
                     mblur(art * keep, H / 27) / (mblur(keep, H / 27) + 1e-4),
                     art)
    del hole, keep, art

    # 5 · the cold plate
    plum = 0.2126 * paper[..., 0] + 0.7152 * paper[..., 1] + 0.0722 * paper[..., 2]
    det = mblur(plum, PAPER_GRAIN) - mblur(plum, H / 78)
    base = np.clip(0.050 + det * 1.35, 0, 1)
    cold = np.stack([base * 1.25, base * 1.02, base * 0.86], axis=-1)
    cold *= 1 - ink[..., None] * 0.42
    del paper, plum, det, base, ink

    # 6 · the light
    def gate(core, div=None, floor=None):
        lit = sum(mblur(core, max(1.0, CH * r)) * w
                  for r, w in zip(LIGHT_RADII, LIGHT_WEIGHTS))
        d = div if div is not None else max(float(np.percentile(lit, 99.9)), 1e-6)
        lit = lit / d
        f = floor if floor is not None else float(np.percentile(lit, LIGHT_FLOOR_PCT))
        return np.clip(np.power(np.clip((lit - f) / max(1e-6, 1.0 - f), 0, 1), 1.15), 0, 1), d, f

    # The normaliser is frozen against the wall's own mix — ink at 1.7, no body,
    # no fire weight — exactly as the hero freezes it, and for the same reason:
    # a light field that re-normalises itself whenever a term changes rescales
    # everything else with it, and no two plates would then be comparable.
    _ink_ref = np.clip(highpass_ref * 1.7, 0, 1)
    REFERENCE = np.clip(_ink_ref * LIGHT_MIX["ink"] + fire_raw * LIGHT_MIX["fire"]
                        + redder * LIGHT_MIX["red"] + greener * LIGHT_MIX["green"], 0, 1)
    _, DIV, FLOOR = gate(REFERENCE)
    del _ink_ref, REFERENCE, highpass_ref

    BASE = np.clip(ink_light * LIGHT_MIX["ink"] + fire_raw * LIGHT_MIX["fire"]
                   + redder * LIGHT_MIX["red"] + greener * LIGHT_MIX["green"]
                   + body * LIGHT_MIX["body"], 0, 1)
    core = BASE + blaze * (fire_weight - 1.0)
    lit, _, _ = gate(core, DIV, FLOOR)

    halo = (mblur(core, 5) * 0.34 + mblur(core, 18) * 0.22
            + mblur(core, 60) * 0.16 + mblur(core, CH * 0.075) * 0.10)
    halo *= np.clip(lit * 2.5, 0, 1)          # the gate — see gen-scroll-plates
    g = np.clip(core * 0.92 + halo, 0, 1.25)
    glow = np.stack([g * 0.78, np.power(g, 1.7) * 0.26, np.power(g, 2.6) * 0.09], axis=-1)
    del halo, ink_light, redder, greener, drawing, fire_raw, blaze, body, core, g

    out_cold = os.path.join(_IMG, "plate-%s-cold.webp" % name)
    out_glow = os.path.join(_IMG, "plate-%s-glow.webp" % name)
    qc, kc = save(cold, out_cold, SIZE_TARGET_KB["cold"], WALL_GAIN)
    qg, kg = save(glow, out_glow, SIZE_TARGET_KB["glow"])

    cl = 0.2126 * cold[..., 0] + 0.7152 * cold[..., 1] + 0.0722 * cold[..., 2]
    gl = 0.2126 * glow[..., 0] + 0.7152 * glow[..., 1] + 0.0722 * glow[..., 2]
    print("%-6s %5dx%d  %.2f:1   cold %3.0f KB q%d   glow %3.0f KB q%d" %
          (name, CW, CH, CW / CH, kc, qc, kg, qg))
    print("        kalt  Mittel %5.1f  sd %4.1f   |   Licht Mittel %5.1f  "
          "Spitze %5.1f  deckt %2.0f%% der Platte" %
          (cl.mean() * 255, cl.std() * 255, gl.mean() * 255,
           np.percentile(gl, 99.9) * 255, 100 * (lit > 0.08).mean()))
    return CW / CH


print("Quelle: %s" % os.path.basename(SRC))
for name, X0, X1, ig, fw in WINDOWS:
    if ONLY and name not in ONLY:
        continue
    plate(name, X0, X1, ig, fw, SRC)
