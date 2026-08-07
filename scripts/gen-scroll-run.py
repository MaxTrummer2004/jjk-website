"""The opening's one asset: a stretch of the Sanjo scroll, night-graded,
with directional blur baked into the run-up so only the landing zone is sharp.

Source: _scout/assets/heiji-sanjo-complete.jpg (Wikimedia Commons, PD;
original 13th c., MFA Boston). 34396x2172.

Output: public/img/scroll-run.webp

The strip runs from the tail of the cavalry into the great fire. The left
two thirds fly past at speed in the opening, so they carry a horizontal
motion blur — which is also what keeps the WebP small: smeared pixels
compress to nearly nothing, and the byte budget is spent where the scrub
stops.
"""
from PIL import Image, ImageFilter
import numpy as np
import os

Image.MAX_IMAGE_PIXELS = None

SRC = os.path.join(os.path.dirname(__file__), "..", "_scout", "assets",
                   "heiji-sanjo-complete.jpg")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "img",
                   "scroll-run.webp")

# Fractions of the full scroll width. The blaze is centred near 0.435; the
# strip ends shortly after it so the landing frame is fire edge to edge.
X0, X1 = 0.17, 0.505
FIRE = 0.435          # centre of the landing view, as a fraction of the scroll
OUT_H = 1000

im = Image.open(SRC)
W, H = im.size
# trim the scan's own mounting edges top and bottom
strip = im.crop((int(W * X0), int(H * 0.028), int(W * X1), int(H * 0.978)))
sw = int(strip.size[0] * OUT_H / strip.size[1])
strip = strip.resize((sw, OUT_H), Image.LANCZOS)

# ---- night grade: the parade treatment -------------------------------------
a = np.asarray(strip, dtype=np.float32) / 255.0
a = a ** 1.45                                   # contrast into the night
a *= np.array([1.04, 0.89, 0.70])               # candle warmth
a *= 0.74                                       # overall level down
# let the flames keep their heat: boost warm highlights back up
lum = a @ np.array([0.45, 0.40, 0.15])
boost = np.clip(lum - 0.30, 0, None)[:, :, None]
a = a + boost * np.array([0.50, 0.16, 0.02])
strip = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

# ---- directional blur on the run-up ----------------------------------------
# Fire centre in strip coordinates:
fire_px = int((FIRE - X0) / (X1 - X0) * sw)
sharp_half = int(sw * 0.115)  # half-width of the sharp landing zone

blurred = strip.filter(ImageFilter.GaussianBlur(0.8)).filter(
    ImageFilter.BoxBlur(0))
# horizontal smear: blur each row-block horizontally only (approximate with a
# wide box blur on a horizontally squeezed copy)
smear = strip.resize((sw // 6, OUT_H), Image.BILINEAR).resize(
    (sw, OUT_H), Image.BILINEAR)

mask = np.zeros((OUT_H, sw), dtype=np.float32)
x = np.arange(sw, dtype=np.float32)
d = np.abs(x - fire_px)
ramp = np.clip((d - sharp_half) / (sw * 0.18), 0, 1)  # 0 sharp -> 1 smeared
mask[:] = ramp[None, :]
m = mask[:, :, None]

s = np.asarray(strip, dtype=np.float32)
b = np.asarray(smear, dtype=np.float32)
out = s * (1 - m) + b * m
final = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

for q in (68, 60, 52, 44):
    final.save(OUT, "WEBP", quality=q, method=6)
    kb = os.path.getsize(OUT) / 1024
    print(f"q={q}: {kb:.0f} KB  ({final.size[0]}x{final.size[1]})")
    if kb < 460:
        break
print("fire centre at px", fire_px, "of", sw, f"({fire_px/sw:.3f})")
w_per_100h = final.size[0] / final.size[1] * 100
print(f"CSS: strip width = {w_per_100h:.1f}svh per 100svh height")
print(f"CSS: fire centre = {fire_px / sw * w_per_100h:.1f}svh")
