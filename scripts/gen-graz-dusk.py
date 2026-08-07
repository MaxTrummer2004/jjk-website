"""
The dusk plate the hero starts on before it falls to night.

Same crop and size as graz-night.jpg — pixel for pixel — because the hero
cross-fades one into the other and any offset would show as a ghost. That
registration is free here only because the night version is derived from this
very photo.

It is deliberately NOT the raw sunny original: blending from full daylight to
near-black is a luminance jump that reads as a flash on page load. This is the
same frame taken down to a plausible late dusk, so the transition is a dimming
rather than a cut.
"""

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SRC = "/root/.claude/uploads/53dcd728-12a1-5120-833d-46c08205df64/819dc8d2-Historic_City_Center_of_Graz.jpg"
OUT = "/tmp/jjk/public/img/graz-dusk.jpg"

src = Image.open(SRC).convert("RGB")
SW, SH = src.size

# Identical crop to gen_graz_night.py — keep these in sync.
target_h = int(SW * 9 / 16)
top = int(SH * 0.045)
if top + target_h > SH:
    top = SH - target_h
src = src.crop((0, top, SW, top + target_h))

W, H = 2600, int(2600 * 9 / 16)
src = src.resize((W, H), Image.LANCZOS)
rgb = np.asarray(src, np.float32) / 255.0

lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

# Pull the colour most of the way out; dusk is not a saturated hour.
desat = rgb * 0.32 + lum[..., None] * 0.68

# Split tone: cool shadows, warm highlights. This is what sells "late blue hour"
# more than brightness alone.
shadow = np.clip(1.0 - lum * 2.0, 0, 1)[..., None]
highlight = np.clip((lum - 0.45) * 2.2, 0, 1)[..., None]
cool = np.array([0.42, 0.62, 1.00], np.float32)
warm = np.array([1.00, 0.62, 0.32], np.float32)

out = desat * (1.0 - shadow * 0.55) + desat * shadow * 0.55 * cool
out = out * (1.0 - highlight * 0.45) + out * highlight * 0.45 * warm

# Overall exposure down, contrast up a touch. Not too far down: the hero puts
# a vignette, a grain plate and a warm wash on top of this, and if the plate is
# already dim the opening reads as murk rather than as dusk.
out = np.clip((out - 0.03) * 1.10, 0, 1) * 0.66

# Streetlights already coming on in the densest blocks — gives the eye something
# that survives into the night frame.
warm_mask = np.clip((rgb[..., 0] - rgb[..., 2]) * 2.0, 0, 1)
detail = np.abs(lum - gaussian_filter(lum, 5))
lights = np.clip(detail * 5.0 * warm_mask, 0, 1)
lights = gaussian_filter(lights, 1.4)
out[..., 0] += lights * 0.30
out[..., 1] += lights * 0.15
out[..., 2] += lights * 0.05

# Same finishing as the night plate so the two frames feel like one shot.
rng = np.random.default_rng(11)
a = out * 255.0 + rng.normal(0, 4.0, (H, W, 1)).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
a *= np.clip(1.02 - 0.34 * np.power(d, 1.9), 0, 1)[..., None]

Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").save(
    OUT, quality=86, optimize=True
)
print("wrote", OUT)
