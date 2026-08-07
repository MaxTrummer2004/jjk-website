"""
Three treated versions of the opening plate.

The plain black-and-white conversion looked like what it is — the photograph,
desaturated. The manga version went too far the other way and read as a filter
pretending to be a drawing. These three sit in between: each one is
unmistakably treated, and none of them pretends to be hand-made.

  graz-signal.jpg    The same derivation as the night frame — vegetation and
                     water dark, built fabric glowing — but graded cold instead
                     of ember. The flicker then reads as one image igniting
                     rather than as two different pictures swapping. Of the
                     three this is the only one that ties the two frames
                     together conceptually.

  graz-litho.jpg     Photocopied. Crushed to nearly two tones with dust and
                     paper grain. Keeps photographic masses, so it never looks
                     drawn — it looks reproduced.

  graz-negative.jpg  Inverted. Parks go white, the built city goes black, and
                     the Mur becomes a bright ribbon. The most immediately
                     striking and the least readable as a place.

All share the crop and size of graz-night.jpg — the hero flickers between them
and any difference in framing would show as a jump.
"""

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import gaussian_filter

SRC = "/root/.claude/uploads/53dcd728-12a1-5120-833d-46c08205df64/819dc8d2-Historic_City_Center_of_Graz.jpg"
OUT = "/tmp/jjk/public/img"

src = Image.open(SRC).convert("RGB")
SW, SH = src.size

target_h = int(SW * 9 / 16)
top = int(SH * 0.045)
if top + target_h > SH:
    top = SH - target_h
src = src.crop((0, top, SW, top + target_h))

W, H = 2600, int(2600 * 9 / 16)
src = src.resize((W, H), Image.LANCZOS)
rgb = np.asarray(src, np.float32) / 255.0
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
lum = 0.2126 * R + 0.7152 * G + 0.0722 * B

rng = np.random.default_rng(17)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)


def finish(arr, grain=4.0, vignette=0.16, name="out.jpg"):
    a = arr + rng.normal(0, grain, (H, W, 1)).astype(np.float32)
    a *= np.clip(1.0 - vignette * np.power(d, 2.0), 0, 1)[..., None]
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").save(
        f"{OUT}/{name}", quality=90, optimize=True
    )
    print("wrote", name)


# ============================================================== 1 · signal ===
# Same masks as scripts/gen-graz-night.py. Kept in step with that file by hand;
# if the night derivation changes, this wants the same change.
veg = gaussian_filter(np.clip((2.0 * G - R - B) * 2.6, 0, 1), 3)
water = gaussian_filter(np.clip((B - R) * 3.0, 0, 1) * np.clip(1.0 - lum * 1.6, 0, 1), 3)
built = np.clip(1.0 - veg * 1.35 - water * 1.6, 0, 1)

detail = np.abs(lum - gaussian_filter(lum, 5))
detail /= detail.max()
warm = np.clip((R - B) * 1.9, 0, 1)

light = (detail * 2.5 + np.power(warm, 1.4) * 0.55 + np.clip(lum - 0.35, 0, 1) * 0.30) * built
light = np.clip(light, 0, 1.4)

cx, cy = W * 0.46, H * 0.42
dd = np.sqrt(((xx - cx) / (W * 0.62)) ** 2 + ((yy - cy) / (H * 0.78)) ** 2)
light *= 0.45 + 0.75 * np.exp(-1.25 * dd)

base = Image.fromarray(np.clip(light, 0, 4) * 190).convert("L")
acc = (
    np.asarray(base.filter(ImageFilter.GaussianBlur(0.8)), np.float32) * 1.00
    + np.asarray(base.filter(ImageFilter.GaussianBlur(4)), np.float32) * 0.40
    + np.asarray(base.filter(ImageFilter.GaussianBlur(16)), np.float32) * 0.18
    + np.asarray(base.filter(ImageFilter.GaussianBlur(55)), np.float32) * 0.09
)
acc /= acc.max()
acc = np.clip(np.power(acc, 1.25) * 0.95 + np.power(acc, 5.0) * 0.55, 0, 1)

# Cold ramp: near-black, through steel, to a bone highlight.
stops = [
    (0.00, (6, 7, 10)),
    (0.18, (26, 30, 38)),
    (0.42, (74, 82, 94)),
    (0.68, (140, 150, 162)),
    (0.86, (198, 205, 212)),
    (1.00, (245, 248, 250)),
]
ramp = np.zeros((256, 3), np.float32)
for i in range(256):
    t = i / 255
    for j in range(len(stops) - 1):
        t0, c0 = stops[j]
        t1, c1 = stops[j + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0)
            ramp[i] = [c0[k] + (c1[k] - c0[k]) * f for k in range(3)]
            break

finish(ramp[np.clip((acc * 255).astype(np.int32), 0, 255)], 3.5, 0.20, "graz-signal.jpg")

# =============================================================== 2 · litho ===
# Orange-filter weighting again, so roofs and foliage separate before the tone
# curve throws away the middle.
g = 0.46 * R + 0.40 * G + 0.14 * B
g = np.clip(g + (g - gaussian_filter(g, 5)) * 1.1, 0, 1)

# Very steep curve — not a hard threshold, which loses every roof at once.
g = np.clip((g - 0.47) * 4.6 + 0.5, 0, 1)
g = np.power(g, 0.9)

# Dust and fibre, the things that say "this went through a machine".
speck = rng.random((H, W)).astype(np.float32)
g -= (speck > 0.9988) * 0.9
g += (speck < 0.0012) * 0.9
g = np.clip(gaussian_filter(g, 0.4), 0, 1)

paper = np.array((236, 232, 222), np.float32)
toner = np.array((22, 20, 22), np.float32)
finish(paper * g[..., None] + toner * (1 - g[..., None]), 5.0, 0.14, "graz-litho.jpg")

# ============================================================ 3 · negative ===
n = 0.46 * R + 0.40 * G + 0.14 * B
n = np.clip(n + (n - gaussian_filter(n, 6)) * 0.5, 0, 1)
n = np.clip((n - 0.46) * 1.5 + 0.46, 0, 1)
n = 1.0 - n
n = 0.04 + n * 0.94

neg = np.repeat((n * 255.0)[..., None], 3, axis=2)
neg *= np.array((0.94, 0.97, 1.0), np.float32)  # a touch cold, like film base
finish(neg, 4.0, 0.18, "graz-negative.jpg")
