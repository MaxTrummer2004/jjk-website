"""
The opening plate: Graz as a manga panel.

The hero opens on this and flickers to the graded night frame, which reads like
a drawn panel resolving into the finished shot.

Two things make it read as manga rather than as a filter:

  Line art via XDoG (extended difference of Gaussians). Two blurs of the
  luminance are subtracted and pushed through a tanh, so crossings become ink
  instead of a soft grey ramp. Sobel or Canny give you a wiring diagram; this
  gives you a pen.

  Screentone. Mid greys are not grey — they are a 45-degree grid of black dots
  whose SIZE carries the tone, exactly like the adhesive sheets the medium is
  named for. This is the single most recognisable feature of the style, and the
  reason a plain sketch filter never quite looks like manga.

Same crop and size as graz-dusk.jpg and graz-night.jpg — the hero swaps between
these frames, and anything but pixel-identical framing would show as a jump.

Two variants are written:
  graz-sketch.jpg       black ink on paper. The default.
  graz-sketch-dark.jpg  the same panel inverted, for a dark opening.
Swap with the `openingSrc` prop on CityBackdrop.
"""

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SRC = "/root/.claude/uploads/53dcd728-12a1-5120-833d-46c08205df64/819dc8d2-Historic_City_Center_of_Graz.jpg"
OUT = "/tmp/jjk/public/img"

src = Image.open(SRC).convert("RGB")
SW, SH = src.size

# Identical crop to the other two plates — keep these in sync.
target_h = int(SW * 9 / 16)
top = int(SH * 0.045)
if top + target_h > SH:
    top = SH - target_h
src = src.crop((0, top, SW, top + target_h))

W, H = 2600, int(2600 * 9 / 16)
src = src.resize((W, H), Image.LANCZOS)
rgb = np.asarray(src, np.float32) / 255.0
gray = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

# Take the edge off the sensor noise first, or every JPEG artefact becomes a
# pen stroke.
gray = gaussian_filter(gray, 0.8)

# ------------------------------------------------------------------- XDoG ---
SIGMA, K, TAU, PHI, EPS = 1.1, 2.4, 0.965, 22.0, -0.012

g1 = gaussian_filter(gray, SIGMA)
g2 = gaussian_filter(gray, SIGMA * K)
dog = g1 - TAU * g2

ink = np.where(dog >= EPS, 1.0, 1.0 + np.tanh(PHI * (dog - EPS)))
ink = np.clip(ink, 0, 1)  # 1 = paper, 0 = ink

# Slightly thicken and soften the line so it reads as a drawn stroke rather
# than a one-pixel scratch.
ink = np.clip(gaussian_filter(ink, 0.6), 0, 1)
ink = np.clip((ink - 0.06) / 0.94, 0, 1)

# ------------------------------------------------------------- screentone ---
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# Tone to reproduce: how dark the photograph is, softened so the dots follow
# masses (a park, a roof in shadow) rather than individual pixels.
# Kept light on purpose. Mapped harder, the parks and the Schlossberg merge
# into one black mass and eat half the panel — the dots have to stay countable
# for the screentone to read as screentone.
tone = np.clip((0.46 - gaussian_filter(gray, 4)) / 0.58, 0, 1)
tone = np.power(tone, 1.35)

# The screen is rotated 45 degrees. Aligning it with the pixel grid produces
# moire against the building edges and looks like a printing fault.
ANG = np.pi / 4
u = xx * np.cos(ANG) + yy * np.sin(ANG)
v = -xx * np.sin(ANG) + yy * np.cos(ANG)

CELL = 7.0
cu = (u % CELL) - CELL / 2
cv = (v % CELL) - CELL / 2
dist = np.sqrt(cu * cu + cv * cv)

# Dot AREA carries the tone, so the radius goes with the square root. Using the
# radius directly makes the midtones far too heavy.
radius = (CELL * 0.50) * np.sqrt(np.clip(tone, 0, 1))
dot = 1.0 - np.clip(dist - radius, 0, 1)  # 1 inside a dot, 0 outside
screen = 1.0 - dot  # 1 = paper, 0 = ink

# Below this there is no tone at all — plain paper, as a real page would be.
screen = np.where(tone < 0.10, 1.0, screen)

# Deep shadow goes to solid black rather than to enormous dots.
solid = np.clip((tone - 0.96) / 0.04, 0, 1)
screen = np.clip(screen - solid, 0, 1)

# Line art and tone both print black, so take whichever is darker.
ink = np.minimum(ink, screen)

rng = np.random.default_rng(4)
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)


PAPER = np.array((238, 233, 223), np.float32)
INK = np.array((14, 12, 13), np.float32)

a = ink[..., None]  # 1 = paper, 0 = ink
page = PAPER * a + INK * (1.0 - a)
page += rng.normal(0, 3.5, (H, W, 1)).astype(np.float32)
page *= np.clip(1.0 - 0.14 * np.power(d, 2.0), 0, 1)[..., None]
page = np.clip(page, 0, 255)

Image.fromarray(page.astype(np.uint8), "RGB").save(
    f"{OUT}/graz-sketch.jpg", quality=88, optimize=True
)
print("wrote graz-sketch.jpg")

# Inverted, for anyone who wants the opening to stay dark. Inverting the
# finished page rather than re-compositing keeps the dots and lines identical.
dark = 255.0 - page
dark *= np.array((0.92, 0.90, 0.94), np.float32)  # cool it very slightly
Image.fromarray(np.clip(dark, 0, 255).astype(np.uint8), "RGB").save(
    f"{OUT}/graz-sketch-dark.jpg", quality=88, optimize=True
)
print("wrote graz-sketch-dark.jpg")
