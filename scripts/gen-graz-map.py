"""
Graz as a light map — the hero backdrop, built the way the opening frame is built.

── What the reference frame actually is ─────────────────────────────────────
Look at the Tokyo shot in the opening and try to find a building. There isn't
one. No facade, no roof, no street scene. What is on screen is a road network
that glows, a black bay, and dark hills at the edge. It is not a picture of a
city, it is a map of where the light is.

That matters, because it means the frame is not something you photograph and it
is not something you draw. Both of those were tried here first:

  A photograph gives you a fixed number of pixels, and the hero zooms 3.4x into
  it. The first Graz source was 2364px wide, so by the end of the run-in it was
  inventing three pixels for every real one. A 6000px replacement fixed the
  sharpness and brought a new problem: it had the Uhrturm in the foreground, a
  large pale object that is NOT a light source, sitting at the same height as
  the title and competing with it. A third of the frame was sunset sky that had
  to be masked out.

  A commissioned drawing would have to reproduce the street network of Graz
  lane by lane. That is cartography, not illustration — none of the things you
  pay an artist for (line, exaggeration, composition) have anywhere to go in a
  frame that is literally a map. And it would arrive at one fixed resolution.

The data is free, exact, and re-renderable at any size. So: OpenStreetMap.

── Why this reads as Graz ──────────────────────────────────────────────────
Not because of a landmark. Because of a hole.

The Schlossberg has no roads on it, so it comes out as a black mass sitting in
the middle of the brightest part of the city. Nowhere else looks like that. The
Mur cuts diagonally through. The ring of the Innere Stadt closes around the
hole. Somebody who lives here reads that in under a second, faster than they
would read an aerial photograph of their own rooftops.

None of that had to be drawn or masked in. Darkness is simply where no road is.

── How the plates work ─────────────────────────────────────────────────────
Same arrangement as the photographic version this replaces, and for the same
reason — one derivation, three layers, so they can never drift apart:

  graz-unlit   the network in cold grey, barely above black. You can tell
               SOMETHING is in the frame, not what.
  graz-night   the network on the ember ramp, fully alight
  graz-glow    night minus unlit — purely what the light adds

The hero screens `glow` over `unlit` and drives the flicker on the glow layer
alone, so only the red blinks while the shape of the city stays put. Two
separately authored images would never hold that registration; these three come
off the same array.

── Attribution ─────────────────────────────────────────────────────────────
Map data from OpenStreetMap, ODbL. A rendered image derived from it needs a
credit line — "(c) OpenStreetMap-Mitwirkende" in the footer or imprint covers
it. Not a blocker, but it is not optional either.

Dependencies: numpy and Pillow. The road data is fetched once by
scripts/fetch-graz-osm.py into .osm/ and cached; this script never touches the
network.
"""

import os
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OSM = os.path.join(_ROOT, ".osm")
OUT = os.path.join(_ROOT, "public", "img")

# Hauptplatz. Not the geometric centre of the city — the centre of the light,
# which is what the frame is composed around.
# Moved 500 m south of the Hauptplatz on 2026-08-07. The frame has to hold the
# Kasernstraße with room UNDER it — the opening circles it and hangs a slip off
# it, and at the old centre the gym sat 1.98 km south on a plate that reaches
# 2.53 km, which put it in the bottom eighth of every frame that also held the
# five rejected landmarks. Everything derived from this file moves together:
# graz-night/unlit/glow/lights, zoom-3, the ignite field, and ORIGIN_LAT in
# lib/fly-path.ts.
LAT0, LON0 = 47.0664, 15.4383

# Extents, in kilometres across. Named because they are three different
# arguments about what the hero is showing.
EXTENTS = {
    "innere": 2.4,   # the old town: the ring, the hole, the river. Almost a diagram.
    "stadt": 9.0,    # the city: dense core fading into suburbs, hills biting in
    "umland": 20.0,  # the basin: Graz as one bright organism in dark country
}

W = 4000
H = W * 9 // 16
SS = 2  # supersample; lines this thin alias badly at 1:1

# Width in METRES and brightness per road class.
#
# Metres rather than pixels so the three extents stay consistent with each
# other: a residential street is the same street whether you are looking at two
# kilometres or twenty. What changes is how many pixels that is, which is
# exactly the behaviour you want — at the wide extent the small streets
# collapse into capillaries and the arterials carry the structure, which is
# what the reference frame looks like.
#
# The brightness range is deliberately narrow — a shade over two to one from a
# motorway to a footpath, where the first version had four and a half. That
# version was built on the assumption that a hierarchy of road classes is what
# you want to see, and it is wrong: look at the reference frame and the
# arterials are barely brighter than everything else. What makes it dense is
# that the mesh between them reads at nearly full strength, and the bright spots
# come from streets PILING UP, not from a lookup table saying this one is
# important. With a wide range the residential network sank into the black and
# the frame emptied out, which is exactly how it looked.
CLASSES = {
    "motorway": (26, 1.00), "trunk": (22, 0.97),
    "motorway_link": (14, 0.84), "trunk_link": (13, 0.83),
    "primary": (18, 0.94), "primary_link": (11, 0.80),
    "secondary": (14, 0.89), "secondary_link": (9, 0.76),
    "tertiary": (11, 0.85), "tertiary_link": (8, 0.72),
    "unclassified": (8, 0.78), "residential": (7, 0.76),
    "living_street": (6, 0.70), "pedestrian": (6, 0.74),
    "service": (4, 0.62), "footway": (3, 0.54),
    "cycleway": (3, 0.54), "track": (3, 0.46),
    "path": (2.5, 0.44), "steps": (2, 0.46),
}

# Rail: thin and dim, and both numbers were learned the hard way. At seven
# metres and two thirds brightness the yards west of the centre came out as one
# solid slab — thirty parallel tracks each drawn seven metres wide merge into a
# filled rectangle brighter than the old town, and it reads as a mistake in the
# render rather than as a railway. Narrow enough that the tracks stay separate
# is the whole point; a yard should be a comb, not a block.
RAIL_METRES, RAIL_AMP = 3.5, 0.40

# How much light the built-up mass contributes on top of the streets.
#
# This is what stops the frame reading as a road map. Between the streets of a
# real city there is city, and in the reference frame that mass is most of what
# is glowing — the individual roads only become legible near the middle where
# they are wide. Graz has a quarter of a million building footprints in the box
# and they fill exactly the black that made the first render look empty.
#
# Kept well under the streets. Push it past about 0.3 and the mesh drowns in an
# even wash, which is the opposite failure and looks like fog — 0.38 lit three
# quarters of the frame and the streets stopped being readable as streets.
BUILDING_AMP = 0.22

# Density falloff: a hot core cooling toward the edges.
#
# Without it the frame is evenly bright from corner to corner, which no
# inhabited basin has ever looked like from above and which the reference frame
# very obviously does not do — its light falls away into black long before the
# edge. The photographic version of this backdrop has had the same curve from
# the beginning; leaving it out here was an oversight, and it is most of why
# the first dense render looked like a printed map rather than a place.
FALLOFF_FLOOR, FALLOFF_GAIN, FALLOFF_RATE = 0.30, 0.85, 1.35

# WebP, not JPEG, and it is not a small difference here.
#
# A street network is detail everywhere — there is no flat sky to compress — and
# on top of it every plate carries film grain, which is exactly the signal JPEG
# is worst at. At 4000 px the glow plate came to 1.6 MB as a JPEG and 615 KB as
# WebP at visually the same quality; the unlit plate went from 980 KB to 175 KB.
# The whole backdrop is now about 1.2 MB instead of 3.2 MB.
#
# The twinkle plates go up two points because they carry an alpha channel and
# their content is isolated bright cores, which is where WebP's chroma handling
# is least forgiving.
WEBP_QUALITY = 82

EMBER_STOPS = [
    (0.00, (2, 2, 4)), (0.08, (26, 5, 7)), (0.22, (92, 12, 11)),
    (0.40, (172, 30, 14)), (0.58, (226, 68, 20)), (0.74, (247, 124, 44)),
    (0.88, (253, 189, 118)), (1.00, (255, 246, 228)),
]
UNLIT_STOPS = [
    (0.00, (3, 3, 5)), (0.30, (5, 6, 8)), (0.60, (9, 10, 13)),
    (0.85, (14, 16, 20)), (1.00, (20, 23, 28)),
]

rng = np.random.default_rng(7)


def load(name):
    """
    One tier as written by fetch-graz-osm.py: a list of
    {"g": [[lat, lon], ...], "c": "residential"} — water uses "kind" instead
    of "c". Deliberately not the Overpass response shape; that carried a tag
    dictionary and a node list per way and was five times the size for
    information nothing here reads.
    """
    p = os.path.join(OSM, name + ".json")
    if not os.path.exists(p):
        print(f"   (no {name}.json — run scripts/fetch-graz-osm.py)")
        return []
    return json.load(open(p, encoding="utf-8"))


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


def render(km):
    """Rasterise the network for one extent. Returns a 0..n light array."""
    # Equirectangular around the frame centre. Over twenty kilometres the error
    # against a proper projection is well under a pixel, and it keeps the whole
    # thing to two multiplications with no geo stack to install.
    mpp = km * 1000.0 / (W * SS)                 # metres per supersampled pixel
    mlon = 111320.0 * math.cos(math.radians(LAT0))
    mlat = 110574.0
    cx, cy = W * SS / 2, H * SS / 2

    def project(pts):
        return [
            (cx + (lon - LON0) * mlon / mpp, cy - (lat - LAT0) * mlat / mpp)
            for lat, lon in pts
        ]

    light = np.zeros((H * SS, W * SS), np.float32)

    for tier in ("major", "minor", "tiny"):
        ways = load(tier)
        if not ways:
            continue
        # One canvas per class, not per way: overlapping roads of the same class
        # must not add up, or a junction where six residential streets meet
        # would outshine a motorway.
        by_class = {}
        for w in ways:
            c = w.get("c")
            g = w.get("g")
            if c in CLASSES and g and len(g) > 1:
                by_class.setdefault(c, []).append(g)

        for c, geoms in by_class.items():
            metres, amp = CLASSES[c]
            # Clamped below at just under a pixel: a road thinner than the grid
            # would flicker in and out along its length instead of drawing a
            # continuous line, and continuity is the whole texture of the frame.
            px = max(0.9, metres / mpp)
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for g in geoms:
                pts = project(g)
                d.line(pts, fill=255, width=max(1, int(round(px))), joint="curve")
            light += np.asarray(canvas, np.float32) / 255.0 * amp

    # Water. The Mur is bordered by roads on both banks, so without this it
    # reads as a thin dark seam between two bright lines rather than as the
    # thing the city is built around. Drawn as a hole, the same way the
    # Schlossberg is a hole: absence of light, not a painted-in colour.
    water = load("water")
    if water:
        canvas = Image.new("L", (W * SS, H * SS), 0)
        d = ImageDraw.Draw(canvas)
        for w in water:
            g = w.get("g") or []
            if len(g) < 2:
                continue
            pts = project(g)
            if w.get("kind") == "river":
                d.line(pts, fill=255, width=max(2, int(round(30 / mpp))), joint="curve")
            else:
                d.polygon(pts, fill=255)
        light *= 1.0 - np.asarray(canvas, np.float32) / 255.0 * 0.92

    # Rail, drawn with the roads because it is the same kind of thing: a line
    # somebody laid down that has light along it.
    rail = load("rail")
    if rail:
        canvas = Image.new("L", (W * SS, H * SS), 0)
        d = ImageDraw.Draw(canvas)
        for w in rail:
            d.line(project(w["g"]), fill=255,
                   width=max(1, int(round(max(0.9, RAIL_METRES / mpp)))), joint="curve")
        light += np.asarray(canvas, np.float32) / 255.0 * RAIL_AMP

    small = Image.fromarray(np.clip(light * 60, 0, 255).astype(np.uint8)).resize(
        (W, H), Image.LANCZOS
    )
    light = np.asarray(small, np.float32) / 60.0

    # ---- the built mass ----------------------------------------------------
    # Splatted as points into the finished resolution and blurred, rather than
    # drawn as outlines. Two reasons. A quarter of a million polygons through
    # PIL is minutes of drawing for corners that vanish in the first downsample;
    # and at every extent that gets rendered a building is a handful of pixels
    # at most, so what is actually wanted is the DENSITY of building, which is
    # what a blurred splat field is.
    b = load("buildings")
    if b:
        arr = np.asarray(b, np.float32)          # lat, lon, size in 1e-5 degrees
        bx = (W / 2 + (arr[:, 1] - LON0) * mlon / (mpp * SS)).astype(np.int32)
        by = (H / 2 - (arr[:, 0] - LAT0) * mlat / (mpp * SS)).astype(np.int32)
        inside = (bx >= 0) & (bx < W) & (by >= 0) & (by < H)
        # Weight by extent, not by area. Area puts an industrial hall eighty
        # times above a house, and the halls then carry the whole field while
        # the residential blocks — the thing that should be filling the frame —
        # disappear under them.
        wgt = np.clip(arr[:, 2] * 1.11, 4.0, 45.0)[inside]
        field = np.zeros((H, W), np.float32)
        np.add.at(field, (by[inside], bx[inside]), wgt)
        # Blur to roughly a building's own size on screen, so a single house is
        # a soft point and a dense block becomes a continuous glow.
        field = blur(field, max(1.0, 22.0 / (mpp * SS)))
        hot = np.percentile(field[field > 0], 99.0) if (field > 0).any() else 1.0
        light += np.clip(field / max(hot, 1e-6), 0, 1.6) * BUILDING_AMP
        print(f"   {inside.sum():,} buildings in frame")

    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(
        ((gx - W * 0.5) / (W * 0.62)) ** 2 + ((gy - H * 0.47) / (H * 0.82)) ** 2
    )
    light *= FALLOFF_FLOOR + FALLOFF_GAIN * np.exp(-FALLOFF_RATE * d)

    return light


def tone(L):
    """Bloom stack and the night curve. Identical in shape to the photo version."""
    base = Image.fromarray(np.clip(L, 0, 4) * 190).convert("L")
    acc = (
        np.asarray(base.filter(ImageFilter.GaussianBlur(0.8)), np.float32) * 1.00
        + np.asarray(base.filter(ImageFilter.GaussianBlur(4)), np.float32) * 0.40
        + np.asarray(base.filter(ImageFilter.GaussianBlur(16)), np.float32) * 0.16
        + np.asarray(base.filter(ImageFilter.GaussianBlur(55)), np.float32) * 0.07
    )
    acc /= max(acc.max(), 1e-6)
    # Two terms rather than one gamma: the first sets the floor, the second
    # hands the bright cores their brightness back.
    #
    # The exponents are much gentler than the photographic version this is
    # derived from, and that is not a taste decision. There, a steep gamma was
    # doing real work — a photograph has ambient haze between the lights that
    # has to be crushed or the night never gets dark. Here every non-zero pixel
    # is a road or a building that is genuinely there. Crushing it does not
    # remove haze, it removes the city, and 1.55 removed most of Graz.
    return np.clip(np.power(acc, 1.28) * 0.94 + np.power(acc, 4.0) * 0.62, 0, 1)


def blur(a, s):
    """
    Gaussian blur for a 2-D float array, without scipy.

    PIL's blur is used everywhere else in this file, but it refuses 32-bit
    float images, and routing a mask through 8-bit on the way in and out makes
    it band — which shows immediately in the twinkle subsets, because those are
    thresholded hard afterwards.

    So: a blur in the frequency domain. The transform is cyclic, so the array is
    reflect-padded by four sigma first and the padding cropped off again;
    without that the top edge of the frame wraps into the bottom.
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


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def finish(out, name, cold_amount=34.0, acc=None):
    if acc is not None and cold_amount:
        cold = np.clip(0.13 - acc, 0, 1) * cold_amount
        out = out.copy()
        out[..., 1] += cold * 0.5
        out[..., 2] += cold * 0.9

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")

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
        os.path.join(OUT, name), "WEBP", quality=WEBP_QUALITY, method=6
    )
    print(f"   wrote {name}  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB")


def twinkle_layers(L, prefix, count=2):
    """Bright cores only, split into subsets that blink independently."""
    base = Image.fromarray(np.clip(L, 0, 4) * 190).convert("L")
    hot = (
        np.asarray(base.filter(ImageFilter.GaussianBlur(0.8)), np.float32) * 1.0
        + np.asarray(base.filter(ImageFilter.GaussianBlur(5)), np.float32) * 0.5
    )
    hot /= max(hot.max(), 1e-6)
    hot = np.power(np.clip((hot - 0.42) / 0.58, 0, 1), 1.4)

    # Blobby noise assigns whole neighbourhoods to a subset, so a lit street
    # blinks together instead of dissolving into per-pixel static.
    field = blur(rng.random((H, W)).astype(np.float32), 6)
    field = (field - field.min()) / (field.max() - field.min() + 1e-6)

    for k in range(count):
        lo, hi = k / count, (k + 1) / count
        member = blur(((field >= lo) & (field < hi)).astype(np.float32), 2)
        a = np.clip(hot * member * 1.9, 0, 1)
        rgba = np.zeros((H, W, 4), np.float32)
        rgba[..., 0] = 255
        rgba[..., 1] = 150 + 90 * a
        rgba[..., 2] = 60 + 120 * np.power(a, 2.0)
        rgba[..., 3] = a * 255
        im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")
        im = im.resize((1300, H * 1300 // W), Image.LANCZOS)
        name = f"{prefix}-lights-{k + 1}.webp"
        im.save(os.path.join(OUT, name), "WEBP", quality=WEBP_QUALITY + 2, method=6)
        print(f"   wrote {name}  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB")


def build(name, km, prefix):
    print(f"{name}: {km} km across, {W}x{H}")
    light = render(km)
    acc = tone(light)
    idx = np.clip((acc * 255).astype(np.int32), 0, 255)

    night_rgb = build_ramp(EMBER_STOPS)[idx]
    # The unlit plate gets its own curve. The night curve exists to crush
    # everything that is not a light, which here is the entire image, so
    # feeding it that curve leaves nothing at all.
    idx_unlit = np.clip((np.power(acc, 0.80) * 255).astype(np.int32), 0, 255)
    unlit_rgb = build_ramp(UNLIT_STOPS)[idx_unlit]
    glow_rgb = np.clip(night_rgb - unlit_rgb, 0, 255)

    finish(night_rgb, f"{prefix}-night.webp", acc=acc)
    finish(unlit_rgb, f"{prefix}-unlit.webp", cold_amount=0.0)
    finish(glow_rgb, f"{prefix}-glow.webp", cold_amount=0.0)
    twinkle_layers(light, prefix)

    lum = 0.2126 * night_rgb[..., 0] + 0.7152 * night_rgb[..., 1] + 0.0722 * night_rgb[..., 2]
    print("   lit %.1f%% of the frame, luminance mean %.1f" % ((acc > 0.05).mean() * 100, lum.mean()))


# Which extent actually ships. Everything else renders under `map-<name>-` so
# alternatives can be compared side by side without overwriting the live plates.
#
# `stadt` because it is the one where the Schlossberg is unmistakable. Wider and
# the hole shrinks to a smudge; tighter and the frame stops being a city and
# becomes a street plan, which happens somewhere around four kilometres.
SHIPPED = "stadt"

if __name__ == "__main__":
    import sys

    os.makedirs(OUT, exist_ok=True)
    for n in sys.argv[1:] or [SHIPPED]:
        build(n, EXTENTS[n], "graz" if n == SHIPPED else f"map-{n}")
