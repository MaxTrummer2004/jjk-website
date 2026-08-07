"""
The wipe assets: a ragged dissolve mask and the burning edge that rides it.

A `clip-path` wipe is a ruler-straight line, which reads as a slide transition,
not as cursed energy eating the daylight. So the boundary is a baked mask
instead: a left-to-right ramp warped by fractal noise, with the low frequencies
stretched horizontally so the boundary breaks into fingers rather than fuzz.

Two files:
  wipe-mask.png  grayscale — white keeps the dusk plate, black removes it.
                 Applied with mask-size 220% and slid across by mask-position.
  wipe-edge.png  RGBA — the hot, ragged, tendrilled leading edge, translated
                 across the frame on its own.
"""

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

OUT = "/tmp/jjk/public/img"
W, H = 1800, 640
rng = np.random.default_rng(20260803)


def fbm(shape, octaves=5, sx=1.0, sy=1.0):
    """Fractal noise. sx/sy stretch the features — sx big, sy small gives the
    horizontal fingers that make the edge look torn rather than blurred."""
    out = np.zeros(shape, np.float32)
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        scale = 2**o
        field = rng.random(shape).astype(np.float32)
        field = gaussian_filter(field, (max(0.6, 26 * sy / scale), max(0.6, 26 * sx / scale)))
        field = (field - field.mean()) / (field.std() + 1e-6)
        out += field * amp
        total += amp
        amp *= 0.55
    return out / total


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
x = xx / (W - 1)

# Warp the ramp. Two scales: broad tongues, then a finer tear on top.
warp = fbm((H, W), octaves=5, sx=3.4, sy=0.55) * 0.24
warp += fbm((H, W), octaves=4, sx=1.1, sy=0.22) * 0.09

# Transition band. Wide enough that the noise has room to make fingers.
BAND = 0.30
t = np.clip((x + warp - (0.5 - BAND / 2)) / BAND, 0, 1)
t = t * t * (3 - 2 * t)  # smoothstep

# Mask: white on the left (dusk stays), black on the right (night shows).
mask = (1.0 - t) * 255.0
Image.fromarray(np.clip(mask, 0, 255).astype(np.uint8), "L").save(
    f"{OUT}/wipe-mask.png", optimize=True
)
print("wrote wipe-mask.png")

# ---------------------------------------------------------------- the edge --
# Where the mask is mid-transition is exactly where the energy should burn.
heat = 1.0 - np.abs(t * 2.0 - 1.0)
heat = np.clip(heat, 0, 1) ** 1.6

# Filaments: thin bright streaks licking ahead of the front.
fil = fbm((H, W), octaves=4, sx=2.6, sy=0.16)
fil = np.clip((np.abs(fil) - 0.28) * 5.0, 0, 1)
heat = np.clip(heat + heat * fil * 1.5, 0, 1.6)

# Sparse embers thrown off the front.
sp = (rng.random((H, W)) < 0.0009) * (heat > 0.25)
heat += gaussian_filter(sp.astype(np.float32), 1.2) * 22.0
heat = np.clip(heat, 0, 1.8)

edge = np.zeros((H, W, 4), np.float32)
edge[..., 0] = 255
edge[..., 1] = 90 + 150 * np.clip(heat, 0, 1)
edge[..., 2] = 30 + 170 * np.clip(heat - 0.55, 0, 1) / 0.45
edge[..., 3] = np.clip(heat, 0, 1) * 255

# Crop to the band — no point shipping the transparent thirds either side.
cols = np.where(edge[..., 3].max(axis=0) > 6)[0]
if len(cols):
    lo, hi = int(cols.min()), int(cols.max()) + 1
    edge = edge[:, lo:hi]

Image.fromarray(np.clip(edge, 0, 255).astype(np.uint8), "RGBA").save(
    f"{OUT}/wipe-edge.png", optimize=True
)
print("wrote wipe-edge.png", edge.shape)
