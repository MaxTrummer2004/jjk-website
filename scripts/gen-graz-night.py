"""
Turn the daytime aerial of Graz into the night-lights frame the hero wants.

The naive route — desaturate and tint red — keeps the daylight lighting cues
(sunlit roofs, cast shadows, bright green canopy) and reads as a red photo, not
as a city at night. So this does a light-map conversion instead:

  vegetation  -> dark   (parks and the Schlossberg ARE dark at night)
  water       -> dark
  built-up    -> glowing, brightness driven by local detail, because street and
                 roof edges are where the light sits in the reference frame

Then the same finishing chain as the procedural version: bloom stack, ember
ramp, chromatic aberration, grain, vignette.

Outputs two candidates so they can be compared side by side:
  graz-night.jpg      the light-map conversion
  graz-duotone.jpg    a straight ember duotone of the photo, for reference
"""

import os
import numpy as np
from PIL import Image, ImageFilter


def gaussian_filter(a, s):
    """
    Gaussian blur for a 2-D float array, without scipy.

    scipy was the only thing it was ever imported for and it is not installed
    everywhere this runs. PIL cannot stand in — its blur refuses 32-bit float
    images, and quantising the masks to 256 levels on the way through makes
    them band, because everything built from them is thresholded hard.

    So: a blur in the frequency domain, which is exact and costs two FFTs.
    The transform is inherently cyclic, so the array is reflect-padded by four
    sigma first and the padding cropped off again. Without that the sky wraps
    around into the pavement and the top and bottom edges of the light map both
    come out wrong.
    """
    a = np.asarray(a, np.float32)
    r = max(1, int(round(s * 4)))
    pad = np.pad(a, r, mode="reflect")
    h, w = pad.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    out = np.fft.irfft2(np.fft.rfft2(pad) * k, s=(h, w))
    return out[r : r + a.shape[0], r : r + a.shape[1]].astype(np.float32)


SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "graz-source.jpg")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "img")

# --------------------------------------------------------------------- crop --
src = Image.open(SRC).convert("RGB")
SW, SH = src.size

# 16:9 band. Trimmed from the top rather than centred: it drops most of the sky,
# which carries no city, and keeps the Uhrturm whole.
target_h = int(SW * 9 / 16)
top = int(SH * 0.075)
if top + target_h > SH:
    top = SH - target_h
src = src.crop((0, top, SW, top + target_h))

W, H = 3000, int(3000 * 9 / 16)
src = src.resize((W, H), Image.LANCZOS)
rgb = np.asarray(src, np.float32) / 255.0
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]

lum = 0.2126 * R + 0.7152 * G + 0.0722 * B

# ------------------------------------------------------------------- masks --
# Excess green: canopy, lawns, the Stadtpark and the whole Schlossberg.
veg = np.clip((2.0 * G - R - B) * 2.6, 0, 1)
veg = gaussian_filter(veg, 3)

# The Mur reads as dark and blue-ish against everything else.
water = np.clip((B - R) * 3.0, 0, 1) * np.clip(1.0 - lum * 1.6, 0, 1)
water = gaussian_filter(water, 3)

# The sky. The previous source was a pure roofscape with no horizon in it, so
# nothing here needed to know what sky was; this one is a third sky, and left
# alone it lights up — it is bright, it is warm, and the detail test finds
# clouds as readily as it finds streets. Two things identify it: it is high in
# the frame, and it has almost no local structure compared to a city.
yy_, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
flat = 1.0 - np.clip(np.abs(lum - gaussian_filter(lum, 9)) * 26.0, 0, 1)
high = np.clip(1.0 - yy_ / (H * 0.46), 0, 1)
sky = gaussian_filter(np.clip(flat * high * np.clip(lum * 1.5, 0, 1), 0, 1), 12)

built = np.clip(1.0 - veg * 1.35 - water * 1.6 - sky * 1.8, 0, 1)

# ---------------------------------------------------------------- light map --
# Local detail: roof ridges, street canyons, courtyards. This is the structure
# that carries the "grid of lights" read in the reference frame.
blur = gaussian_filter(lum, 5)
detail = np.abs(lum - blur)
detail /= detail.max()

# Warm surfaces (the tile roofs) are the densest built fabric, so let them
# contribute a base glow on top of the detail.
warm = np.clip((R - B) * 1.9, 0, 1)

light = (detail * 2.5 + np.power(warm, 1.4) * 0.55 + np.clip(lum - 0.35, 0, 1) * 0.30) * built
light = np.clip(light, 0, 1.4)

# Density falloff so the frame has a hot core and cools toward the edges, the
# way an inhabited basin does from orbit.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W * 0.46, H * 0.42
d = np.sqrt(((xx - cx) / (W * 0.62)) ** 2 + ((yy - cy) / (H * 0.78)) ** 2)
light *= 0.45 + 0.75 * np.exp(-1.25 * d)

# Scattered hot points — squares, junctions, lit facades.
rng = np.random.default_rng(7)
spark = (rng.random((H, W)) < 0.00055) * built * np.clip(light * 3.5, 0, 1)
light += gaussian_filter(spark.astype(np.float32), 1.1) * 9.0


EMBER_STOPS = [
    (0.00, (2, 2, 4)),
    (0.08, (26, 5, 7)),
    (0.22, (92, 12, 11)),
    (0.40, (172, 30, 14)),
    (0.58, (226, 68, 20)),
    (0.74, (247, 124, 44)),
    (0.88, (253, 189, 118)),
    (1.00, (255, 246, 228)),
]

# The same city with the lights out. Barely there on purpose — you should be
# able to tell that SOMETHING is in the frame without being able to tell what,
# and only recognise the place once the red comes on. Tops out under 8%
# luminance, which on most screens is a hint rather than a picture.
UNLIT_STOPS = [
    (0.00, (3, 3, 5)),
    (0.30, (5, 6, 8)),
    (0.60, (9, 10, 13)),
    (0.85, (14, 16, 20)),
    (1.00, (20, 23, 28)),
]


def build_ramp(stops):
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
    return ramp


def tone(L):
    """Bloom stack and the night curve. Returns 0..1 per pixel."""
    base = Image.fromarray(np.clip(L, 0, 4) * 190).convert("L")
    acc = (
        np.asarray(base.filter(ImageFilter.GaussianBlur(0.8)), np.float32) * 1.00
        + np.asarray(base.filter(ImageFilter.GaussianBlur(4)), np.float32) * 0.40
        + np.asarray(base.filter(ImageFilter.GaussianBlur(16)), np.float32) * 0.16
        + np.asarray(base.filter(ImageFilter.GaussianBlur(55)), np.float32) * 0.07
    )
    acc /= acc.max()
    # Night curve. A single gamma either darkens everything or nothing, so this
    # is two terms: a steep gamma that kills the ambient wash between the lights,
    # plus a high-order term that gives the bright cores their brightness back.
    return np.clip(np.power(acc, 1.55) * 0.92 + np.power(acc, 5.0) * 0.70, 0, 1)


def finish(out, name, cold_amount=34.0, acc=None):
    """Aberration, grain, vignette — then write."""
    if acc is not None and cold_amount:
        cold = np.clip(0.13 - acc, 0, 1) * cold_amount
        out = out.copy()
        out[..., 1] += cold * 0.5
        out[..., 2] += cold * 0.9

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")

    # Chromatic aberration
    def rescale(ch, sc):
        z = ch.resize((max(1, int(W * sc)), max(1, int(H * sc))), Image.LANCZOS)
        if sc >= 1:
            ox, oy = (z.width - W) // 2, (z.height - H) // 2
            return z.crop((ox, oy, ox + W, oy + H))
        pad = Image.new("L", (W, H), 0)
        pad.paste(z, ((W - z.width) // 2, (H - z.height) // 2))
        return pad

    rc, gc, bc = img.split()
    img = Image.merge("RGB", (rescale(rc, 1.004), gc, rescale(bc, 0.9968)))

    a = np.asarray(img, np.float32) + rng.normal(0, 6.0, (H, W, 1)).astype(np.float32)
    dd = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a *= np.clip(1.03 - 0.52 * np.power(dd, 1.9), 0, 1)[..., None]

    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB").save(
        f"{OUT}/{name}", quality=88, optimize=True
    )
    print("wrote", name)


# --------------------------------------------------------------- the plates --
# One tone map, three plates. Because they come from the same array they line up
# exactly, which is what lets the hero light the city up in place instead of
# swapping one picture for another.
acc = tone(light)
idx = np.clip((acc * 255).astype(np.int32), 0, 255)

night_rgb = build_ramp(EMBER_STOPS)[idx]
# The unlit plate gets its own curve. The night curve exists to crush everything
# that is not a light, which is exactly the material this plate is made of, so
# feeding it that curve leaves nothing at all. This one lifts the midtones just
# enough to suggest a shape.
idx_unlit = np.clip((np.power(acc, 0.80) * 255).astype(np.int32), 0, 255)
unlit_rgb = build_ramp(UNLIT_STOPS)[idx_unlit]

# What the lights add, and nothing else. Screened over the unlit plate this
# rebuilds the night frame; at zero opacity the city is simply dark. That is the
# whole trick — the flicker drives THIS layer, so only the red blinks while the
# hillside and the block structure stay put.
glow_rgb = np.clip(night_rgb - unlit_rgb, 0, 255)

finish(night_rgb, "graz-night.jpg", acc=acc)
finish(unlit_rgb, "graz-unlit.jpg", cold_amount=0.0)
finish(glow_rgb, "graz-glow.jpg", cold_amount=0.0)


def twinkle_layers(L, count=2):
    """Bright cores only, split into `count` random subsets, RGBA."""
    base = Image.fromarray(np.clip(L, 0, 4) * 190).convert("L")
    hot = (
        np.asarray(base.filter(ImageFilter.GaussianBlur(0.8)), np.float32) * 1.0
        + np.asarray(base.filter(ImageFilter.GaussianBlur(5)), np.float32) * 0.5
    )
    hot /= hot.max()
    # Only the top end — this layer adds sparkle, it must not re-add the wash.
    hot = np.clip((hot - 0.42) / 0.58, 0, 1)
    hot = np.power(hot, 1.4)

    # Assign every pixel to one subset via blobby noise, so neighbouring lights
    # blink together (a lit street, not per-pixel static).
    field = gaussian_filter(rng.random((H, W)).astype(np.float32), 6)
    field = (field - field.min()) / (field.max() - field.min() + 1e-6)

    for k in range(count):
        lo, hi = k / count, (k + 1) / count
        member = ((field >= lo) & (field < hi)).astype(np.float32)
        member = gaussian_filter(member, 2)
        a = np.clip(hot * member * 1.9, 0, 1)

        rgbl = np.zeros((H, W, 4), np.float32)
        rgbl[..., 0] = 255
        rgbl[..., 1] = 150 + 90 * a
        rgbl[..., 2] = 60 + 120 * np.power(a, 2.0)
        rgbl[..., 3] = a * 255

        img = Image.fromarray(np.clip(rgbl, 0, 255).astype(np.uint8), "RGBA")
        img = img.resize((1300, H * 1300 // W), Image.LANCZOS)
        img.save(f"{OUT}/graz-lights-{k + 1}.png", optimize=True)
        print("wrote", f"graz-lights-{k + 1}.png")


twinkle_layers(light)

