"""
The opening plate: the aerial in plain black and white.

No line art, no screentone, no attempt to look drawn — the manga version was a
good trick and read as a trick. This is just the photograph, printed
monochrome, and it holds up because the subject already has the structure:
roof grain, the dark mass of the Schlossberg, the river cutting through.

Same crop and size as graz-night.jpg, because the hero flickers between the two
and any difference in framing would show as a jump.

Kept deliberately bright. The hero lays a vignette, a grain plate and a warm
wash on top; a plate that is already dim ends up as murk.
"""

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

SRC = "/root/.claude/uploads/53dcd728-12a1-5120-833d-46c08205df64/819dc8d2-Historic_City_Center_of_Graz.jpg"
OUT = "/tmp/jjk/public/img"

src = Image.open(SRC).convert("RGB")
SW, SH = src.size

# Identical crop to the other plates — keep these in sync.
target_h = int(SW * 9 / 16)
top = int(SH * 0.045)
if top + target_h > SH:
    top = SH - target_h
src = src.crop((0, top, SW, top + target_h))

W, H = 2600, int(2600 * 9 / 16)
src = src.resize((W, H), Image.LANCZOS)
rgb = np.asarray(src, np.float32) / 255.0

# Not the standard luma weights: pulling the red channel up and green down is
# the old orange-filter trick from black-and-white film. Terracotta roofs go
# bright, foliage goes dark, and the city separates from the parks — which is
# the whole reason this frame works in monochrome.
gray = 0.46 * rgb[..., 0] + 0.40 * rgb[..., 1] + 0.14 * rgb[..., 2]

# Local contrast, so the roof texture stays legible after the tone curve.
gray = np.clip(gray + (gray - gaussian_filter(gray, 6)) * 0.55, 0, 1)

# Filmic S-curve around the midpoint.
PIVOT, CONTRAST = 0.46, 1.42
gray = np.clip((gray - PIVOT) * CONTRAST + PIVOT, 0, 1)
gray = np.power(gray, 0.94)

# Print blacks, not crushed ones. A true 0 in the shadows looks like a hole.
gray = 0.055 + gray * 0.93

rng = np.random.default_rng(3)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)

out = np.repeat((gray * 255.0)[..., None], 3, axis=2)
out += rng.normal(0, 4.0, (H, W, 1)).astype(np.float32)
out *= np.clip(1.0 - 0.16 * np.power(d, 2.0), 0, 1)[..., None]

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB").save(
    f"{OUT}/graz-bw.jpg", quality=90, optimize=True
)
print("wrote graz-bw.jpg")
