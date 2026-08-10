"""The About section's four plates: the kanji cut into stone.

── What they replace ────────────────────────────────────────────────────────
Neon dials. Two thin glowing concentric rings, machine tick marks at five-degree
intervals, a small target dot, kanji set at the compass points, and a bold Latin
caption across the bottom. A targeting computer — the exact register the ensō
note in lib/enso.ts already argues this page must never fall into, arrived at
independently in a different file.

They also sat under a water shader with a bloom pass, so the whole section read
as a liquid sci-fi orb: "diese Bilder schauen etwas zu futuristisch aus, besser
sie sind nicht so flüssig sondern mehr steinig/papierig".

── What these are instead ───────────────────────────────────────────────────
A dōjō plaque. The character cut into stone, lit by one warm light coming in low
from the left — which is the same light the rest of the page is lit by, and the
reason these can sit under the torch without looking borrowed.

Nothing here is drawn as a line. The whole image is a HEIGHT FIELD that is then
lit, so every edge in it is a real edge: the stone's own pitting, the chisel
channel, the slight bevel where the cut breaks the surface. That is what makes
it read as carved rather than as a glyph with a drop shadow on it — a drawn
highlight has to be placed, and a lit one simply happens where the surface turns.

── How the lighting works ───────────────────────────────────────────────────
Given a height field h, the surface normal at a point is (-dh/dx, -dh/dy, 1)
normalised, and the brightness is that dotted with the direction to the light.
Two consequences worth stating, because both are visible:

  The light direction decides which side of every cut is bright. Coming from the
  upper left, the upper-left wall of a channel faces away and goes dark, the
  lower-right wall faces into it and catches. Reverse the light and the carving
  inverts — the character appears to stand proud of the stone instead of being
  cut into it. This is the classic relief illusion and it is one sign flip away.

  Depth is in the same units as the pixel grid. A channel one pixel deep across
  twenty pixels of width has a shallow wall and barely catches; the same depth
  across three pixels is a cliff. So the bevel is blurred deliberately, and the
  blur radius is what sets how sharp the chisel was.

── Palette ──────────────────────────────────────────────────────────────────
The same tilt the wall and the scroll come out of — [1.25, 1.02, 0.86] on a
near-black base — so these belong to the same night without being graded twice.

Output: public/img/hand-sign-1..4.jpg, 4:3, shown inside an ellipse with a 1.15
scale and a pointer parallax, so everything that matters stays well inside.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

_HERE = os.path.dirname(os.path.abspath(__file__))
_OUT = os.path.normpath(os.path.join(_HERE, "..", "public", "img"))
if len(sys.argv) > 1:
    _OUT = sys.argv[1]

W, H = 1400, 1050
GLYPHS = ["柔", "術", "廻", "戦"]
FONT = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"

# ── The carve ───────────────────────────────────────────────────────────────
# Depth and bevel are one decision, not two: what the light sees is the SLOPE of
# the channel wall, which is depth divided by bevel. At 26 over 7 the wall rose
# less than four units per pixel, the normal barely tilted, and the character
# came out as a soft bruise rather than a cut. 44 over 2.6 is seventeen — a wall
# steep enough to throw a real bright edge on the side facing the light and a
# real dark one opposite.
CUT_DEPTH = 44.0          # height units; the channel floor below the surface
BEVEL = 2.6               # px of blur on the cut wall — how sharp the chisel was
LIGHT = (-0.62, -0.58, 0.53)   # from upper left, low. Flip x and y to un-carve.

# ── The stone ───────────────────────────────────────────────────────────────
# Sigma in px, amplitude in height units — from broad swell in the face down
# to the tooth. Without the first two the surface reads as sandpaper: even
# grain at one scale is the signature of an abrasive, not of a stone.
# The finest octave was 1.2px at 0.5 — pure per-pixel noise, invisible at any
# size this is shown at and expensive in every byte budget it touches, because
# a lossy codec cannot predict noise and has to store it. Dropped.
GRAIN_OCTAVES = ((150.0, 5.0), (46.0, 3.2), (13.0, 1.9), (4.2, 1.0))
PIT_COUNT = 2200          # small chips, the thing that says stone and not paper
# The plate is shown UNDER the wall's veil, which passes about seven per cent of
# it until the torch opens — so it is stored bright for the same reason
# wall.webp is, and for once that is not a codec argument but a compositing one.
EXPOSURE = 0.150          # mean luminance of the finished plate, 0–1
CONTRAST = 2.05           # around the mean, before the knee
# The warm tilt is applied through luminance rather than flat. Flat, it tints the
# shadows as well and the whole plate comes out sandstone-brown — which is a
# perfectly good stone and the wrong one for this page. Weighted, only surfaces
# actually turned into the light go warm and everything else stays near-neutral
# black, which is what the wall and the scroll do and why they read as ember on
# night rather than as brown.
WARMTH = (1.25, 1.02, 0.86)
WARM_BIAS = 1.6           # exponent on luminance before the tilt is applied
# Four of these load together in one section, and stone grain is the worst
# case for a lossy codec — it is high-frequency and unpredictable, so every
# byte of it has to be stored rather than inferred.
SIZE_TARGET_KB = 300


def blur(x, s):
    """Gaussian, reflected at the edges — a wrapping blur would carry the
    character's own cut around to the opposite side of the stone."""
    if s <= 0:
        return x
    h, w = x.shape[:2]
    ph, pw = min(int(s * 3), h - 1), min(int(s * 3), w - 1)
    p = np.pad(x, ((ph, ph), (pw, pw)), mode="reflect")
    hh, ww = p.shape
    fy = np.fft.fftfreq(hh)[:, None]
    fx = np.fft.rfftfreq(ww)[None, :]
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    return np.fft.irfft2(np.fft.rfft2(p) * k, s=(hh, ww)).astype(np.float32)[ph:ph + h, pw:pw + w]


def stone(rng):
    """A height field that looks like a cut face: broad swell, then grain, then
    chips. Each octave is white noise blurred to its own scale — cheap, and
    indistinguishable here from anything with a name."""
    h = np.zeros((H, W), np.float32)
    for sigma, amp in GRAIN_OCTAVES:
        n = rng.standard_normal((H, W)).astype(np.float32)
        b = blur(n, sigma)
        h += b / max(b.std(), 1e-6) * amp
    h -= h.mean()

    # Chips. A pit is a small negative dome, and a few thousand of them at mixed
    # sizes is what separates stone from a bumpy plane.
    ys = rng.integers(0, H, PIT_COUNT)
    xs = rng.integers(0, W, PIT_COUNT)
    rs = rng.gamma(1.7, 2.4, PIT_COUNT) + 1.0
    pit = np.zeros((H, W), np.float32)
    for y, x, r in zip(ys, xs, rs):
        r = int(min(r, 14))
        y0, y1 = max(0, y - r), min(H, y + r + 1)
        x0, x1 = max(0, x - r), min(W, x + r + 1)
        if y1 <= y0 or x1 <= x0:
            continue
        gy, gx = np.ogrid[y0 - y:y1 - y, x0 - x:x1 - x]
        d = np.sqrt(gy * gy + gx * gx) / max(r, 1)
        pit[y0:y1, x0:x1] -= np.clip(1.0 - d, 0, 1) ** 1.6 * (r * 0.5)
    return h + blur(pit, 0.7)


def glyph_mask(ch):
    """The character as coverage, 0–1, at a size that leaves room for the
    ellipse the plate is shown in to crop the corners."""
    # `anchor="mm"` centres on the glyph's own middle. The hand-rolled version
    # of this subtracted the ink box's origin from a width computed on the same
    # box, which double-counts the left bearing and pushed every character right
    # far enough to clip it against the ellipse.
    size = int(H * 0.58)
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, size, index=0)
    d.text((W / 2, H / 2), ch, font=f, fill=255, anchor="mm")
    return np.asarray(img, np.float32) / 255.0


def light(height):
    """Lambert on the surface normal. The gradient IS the geometry — everything
    that reads as an edge in the output is a place where this changes."""
    gy, gx = np.gradient(height)
    n = np.stack([-gx, -gy, np.ones_like(height)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array(LIGHT, np.float32)
    L /= np.linalg.norm(L)
    return np.clip(n @ L, 0, 1)


os.makedirs(_OUT, exist_ok=True)
for i, ch in enumerate(GLYPHS):
    rng = np.random.default_rng(1000 + i * 7)
    face = stone(rng)
    cut = blur(glyph_mask(ch), BEVEL)
    height = face - cut * CUT_DEPTH

    lam = light(height)
    # Ambient occlusion, the cheap kind: a channel is darker than the open face
    # simply because less of the sky reaches it, and blurred depth is a fair
    # stand-in for how much.
    ao = np.clip(1.0 - (blur(cut, 22.0) * 0.42), 0, 1)
    lum = lam * ao

    lum = (lum - lum.mean()) * CONTRAST + lum.mean()
    lum = np.clip(lum, 0, 1) ** 1.35
    lum *= EXPOSURE / max(lum.mean(), 1e-6)
    lum = np.clip(lum, 0, 1)

    w = np.power(np.clip(lum / max(lum.max(), 1e-6), 0, 1), WARM_BIAS)[..., None]
    tilt = 1.0 + (np.array(WARMTH, np.float32) - 1.0) * w
    plate = np.clip(lum[..., None] * tilt, 0, 1)
    # One warm rake from the same corner the light comes from, so the plate has
    # a direction and does not sit flat inside its ellipse.
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rake = np.clip(1.0 - np.sqrt(((xx - W * 0.26) / (W * 1.05)) ** 2
                                 + ((yy - H * 0.20) / (H * 1.15)) ** 2), 0, 1) ** 1.6
    plate += rake[..., None] * np.array([0.135, 0.055, 0.018], np.float32)

    out = os.path.join(_OUT, f"hand-sign-{i + 1}.jpg")
    im = Image.fromarray(np.clip(plate * 255, 0, 255).astype(np.uint8), "RGB")
    for q in (82, 74, 66, 58, 50):
        im.save(out, "JPEG", quality=q, optimize=True)
        if os.path.getsize(out) / 1024 <= SIZE_TARGET_KB:
            break
    l = plate @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    print(f"{ch}  {os.path.basename(out)}  {os.path.getsize(out) // 1024} KB   "
          f"q{q}  Helligkeit {l.mean() * 255:.1f}/255  Kontrast sd {l.std() * 255:.1f}")
