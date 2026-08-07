"""
The cold plate: Graz drawn in sumi ink on the paper the night parade is on.

── Why this file exists ────────────────────────────────────────────────────
The opening used to make its "paper" in the shader, out of the ember plate's
own luminance: take the night map, read its brightness, mix between a paper
colour and an ink colour. That is a sepia filter over a photograph of light,
and next to an ensō drawn with a brush and a seal cut out of stone it read as
exactly that. It was the one seam left in the sequence — everything else on the
page is painted, and the largest object on the screen was a filtered raster.

So the cold state gets its own picture, and it is a DRAWING. Same ground, same
frame, same projection as gen-graz-map.py, so the shader can dissolve one into
the other along the fire front and nothing shifts by a pixel.

── What makes it read as ink rather than as thin lines ─────────────────────
Four things, in order of how much they matter:

1. HIERARCHY. The light plate wants the residential mesh at nearly full
   strength — that is what makes a city look inhabited from above. A brush
   drawing wants the opposite: a few strokes that carry the structure and a
   quiet texture under them. So the class widths here are a much wider range
   than in gen-graz-map.py, and the footpaths are a whisper.

2. WIDTH THAT VARIES ALONG THE STROKE. A constant-width line is a pipe. Each
   way is drawn in chunks with its own width, so the stroke swells and thins
   the way a loaded brush does.

3. BLEED. Ink on paper is a dark core with a soft halo where the fibre wicked
   it. That is a blurred copy of the same field under the sharp one, and it is
   most of the difference between "drawn" and "vector".

4. THE PAPER. Not a gradient — the actual silk the Kyōsai scroll is painted on,
   the same crop the slip in the opening uses, mirror-tiled with a slow
   variation field over it so the repeat does not read. Mapped down into the
   night range: the scan is lit for a museum and this page is lit by a candle.

── What it is not ──────────────────────────────────────────────────────────
It is not the hero. The hero is the ember plate and it stays exactly what it
was; this is what the ember plate BURNS OUT OF. Nothing here is ever seen hot.
"""

import importlib.util
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OSM = os.path.join(_ROOT, ".osm")
OUT = os.path.join(_ROOT, "public", "img")
PAPER_SRC = os.path.join(_ROOT, "parade", "2013_767_14.webp")

_spec = importlib.util.spec_from_file_location("gm", os.path.join(_HERE, "gen-graz-map.py"))
gm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gm)

LAT0, LON0 = gm.LAT0, gm.LON0
KM = 9.0

# Matched to zoom-3.webp rather than to the 4000 px hero plate. The cold plate
# is only ever seen at cover scale under a camera that never gets closer than a
# third of the frame, and every byte of it is on the critical path of the first
# second of the page.
W = 2600
H = W * 9 // 16
SS = 2

# Width in metres and ink strength per class.
#
# The range is four to one where gen-graz-map.py's is two to one, and that is
# the whole difference in register. A light plate is a photograph of a city at
# night, where the mesh between the arterials is most of the light. A drawing is
# somebody deciding what to put down: the arterials, the river, the ring, and
# then a suggestion of everything else.
CLASSES = {
    "motorway": (33, 0.92), "trunk": (30, 0.90),
    "motorway_link": (16, 0.58), "trunk_link": (15, 0.56),
    "primary": (24, 0.88), "primary_link": (13, 0.54),
    "secondary": (18, 0.78), "secondary_link": (10, 0.48),
    "tertiary": (13, 0.64), "tertiary_link": (8, 0.42),
    "unclassified": (8, 0.38), "residential": (7, 0.36),
    "living_street": (6, 0.30), "pedestrian": (6, 0.34),
    "service": (3.5, 0.20), "footway": (2.5, 0.13),
    "cycleway": (2.5, 0.13), "track": (2.5, 0.12),
    "path": (2.0, 0.10), "steps": (2.0, 0.11),
}
RAIL_METRES, RAIL_AMP = 5.0, 0.30

# The ink, the sheet, and how far the sheet is taken down from the scan.
INK = np.array([0.055, 0.043, 0.036], np.float32)
PAPER_LEVEL = 0.195          # mean luminance of the finished sheet, 0..1
BLEED_SIGMA = 2.2            # pixels, at W
BLEED_AMOUNT = 0.55

rng = np.random.default_rng(11)


def jitter(seed: int) -> float:
    """Deterministic 0..1 — the same page twice is the same page."""
    x = math.sin(seed * 12.9898) * 43758.5453
    return x - math.floor(x)


def ink_field() -> np.ndarray:
    """The drawing, as 0..1 coverage at W x H."""
    mpp = KM * 1000.0 / (W * SS)
    mlon = 111320.0 * math.cos(math.radians(LAT0))
    mlat = 110574.0
    cx, cy = W * SS / 2, H * SS / 2

    # A generous box around the canvas. Anything outside it is dropped rather
    # than drawn: PIL takes the coordinates it is given, and one way with a
    # decimal point in the wrong place draws a black bar across the sheet at
    # whatever width its class happens to be. (It did. Twice.)
    lim = (-W * SS, -H * SS, W * SS * 2, H * SS * 2)

    def project(pts):
        out = [
            (cx + (lon - LON0) * mlon / mpp, cy - (lat - LAT0) * mlat / mpp)
            for lat, lon in pts
        ]
        return [
            p for p in out
            if lim[0] < p[0] < lim[2] and lim[1] < p[1] < lim[3]
        ]

    field = np.zeros((H * SS, W * SS), np.float32)
    n = 0

    for tier in ("major", "minor", "tiny"):
        ways = gm.load(tier)
        if not ways:
            continue
        by_class = {}
        for w in ways:
            c, g = w.get("c"), w.get("g")
            if c in CLASSES and g and len(g) > 1:
                by_class.setdefault(c, []).append(g)

        for c, geoms in by_class.items():
            metres, amp = CLASSES[c]
            base = max(1.0, metres / mpp)
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for g in geoms:
                pts = project(g)
                if len(pts) < 2:
                    continue
                n += 1
                # A loaded brush does not hold one width for four kilometres.
                # The stroke is cut into chunks and each gets its own, with the
                # chunks overlapping by a point so the joins stay continuous.
                lead = 0.82 + 0.36 * jitter(n * 7 + 3)
                step = max(2, int(round(140 / max(1.0, base ** 0.5))))
                for i in range(0, len(pts) - 1, step):
                    seg = pts[i : i + step + 1]
                    if len(seg) < 2:
                        continue
                    swell = 0.72 + 0.56 * jitter(n * 131 + i)
                    px = max(1, int(round(base * lead * swell)))
                    d.line(seg, fill=255, width=px, joint="curve")
            # Overlapping ways of the same class must not add up — a junction of
            # six residential streets is not darker than a motorway. Ink either
            # covers the paper or it does not.
            field = np.maximum(field, np.asarray(canvas, np.float32) / 255.0 * amp)

    rail = gm.load("rail")
    if rail:
        canvas = Image.new("L", (W * SS, H * SS), 0)
        d = ImageDraw.Draw(canvas)
        for w in rail:
            pts = project(w["g"])
            if len(pts) < 2:
                continue
            d.line(pts, fill=255,
                   width=max(1, int(round(RAIL_METRES / mpp))), joint="curve")
        field = np.maximum(field, np.asarray(canvas, np.float32) / 255.0 * RAIL_AMP)

    print(f"   {n:,} ways drawn")
    small = Image.fromarray(np.clip(field * 255, 0, 255).astype(np.uint8)).resize(
        (W, H), Image.LANCZOS
    )
    return np.asarray(small, np.float32) / 255.0


def built_wash() -> np.ndarray:
    """
    A tone wash where the city is dense.

    Without it the drawing is a road map: every stroke is a line and nothing
    says which part of the frame is the CITY. On the scroll this is the same
    move as the grey behind a crowd — not an object, a weight. Kept very light,
    because a wash that competes with the strokes turns the sheet to mud.
    """
    b = gm.load("buildings")
    if not b:
        return np.zeros((H, W), np.float32)
    mpp = KM * 1000.0 / W
    mlon = 111320.0 * math.cos(math.radians(LAT0))
    arr = np.asarray(b, np.float32)
    bx = (W / 2 + (arr[:, 1] - LON0) * mlon / mpp).astype(np.int32)
    by = (H / 2 - (arr[:, 0] - LAT0) * 110574.0 / mpp).astype(np.int32)
    inside = (bx >= 0) & (bx < W) & (by >= 0) & (by < H)
    field = np.zeros((H, W), np.float32)
    np.add.at(field, (by[inside], bx[inside]), np.clip(arr[:, 2] * 1.11, 4.0, 45.0)[inside])
    field = gm.blur(field, 9.0)
    hot = np.percentile(field[field > 0], 98.5) if (field > 0).any() else 1.0
    return np.clip(field / max(hot, 1e-6), 0, 1.2)


def water_wash() -> np.ndarray:
    """
    The Mur, as a wet brush rather than as a hole.

    In the light plate the river is an absence — it has no streetlights on it,
    so it is black. In a drawing that is wrong twice: water is the one thing on
    a sheet like this that is always LIGHTER than its surroundings, and the Mur
    is the reason Graz is where it is. So it is a pale wash with a darker line
    down its middle, which is how every river on every scroll of this kind is
    drawn.
    """
    mpp = KM * 1000.0 / (W * SS)
    mlon = 111320.0 * math.cos(math.radians(LAT0))
    mlat = 110574.0
    cx, cy = W * SS / 2, H * SS / 2
    body = Image.new("L", (W * SS, H * SS), 0)
    line = Image.new("L", (W * SS, H * SS), 0)
    db, dl = ImageDraw.Draw(body), ImageDraw.Draw(line)
    for w in gm.load("water") or []:
        g = w.get("g") or []
        if len(g) < 2:
            continue
        pts = [(cx + (lo - LON0) * mlon / mpp, cy - (la - LAT0) * mlat / mpp) for la, lo in g]
        pts = [p for p in pts if -W * SS < p[0] < W * SS * 2 and -H * SS < p[1] < H * SS * 2]
        if len(pts) < 2:
            continue
        if w.get("kind") == "river":
            db.line(pts, fill=255, width=max(3, int(round(80 / mpp))), joint="curve")
            dl.line(pts, fill=255, width=max(1, int(round(16 / mpp))), joint="curve")
        else:
            db.polygon(pts, fill=255)
    def down(im):
        return np.asarray(
            im.resize((W, H), Image.LANCZOS), np.float32
        ) / 255.0
    return down(body), down(line)


def sheet() -> np.ndarray:
    """
    The paper. Mirror-tiled out of the one region of the scroll with no ink on
    it anywhere, then broken up so the repeat does not read as a repeat.
    """
    src = Image.open(PAPER_SRC).convert("RGB").crop((0, 50, 300, 470))
    t = np.asarray(src, np.float32) / 255.0
    th, tw = t.shape[:2]
    ny, nx = H // th + 2, W // tw + 2
    rows = []
    for j in range(ny):
        row = []
        for i in range(nx):
            b = t
            if (i + j) % 2:
                b = b[:, ::-1]
            if j % 2:
                b = b[::-1]
            row.append(b)
        rows.append(np.concatenate(row, 1))
    big = np.concatenate(rows, 0)[:H, :W]

    # A slow field over the top, so eight tiles across do not read as eight
    # tiles: the sheet is unevenly aged rather than evenly patterned.
    f = rng.random((H // 32 + 2, W // 32 + 2)).astype(np.float32)
    f = np.asarray(
        Image.fromarray((f * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC),
        np.float32,
    ) / 255.0
    f = gm.blur(f, 26)
    f = (f - f.mean()) / max(f.std(), 1e-6)
    big *= (1.0 + 0.085 * f)[..., None]

    # And down into the night. The scan is lit for a museum; this page is lit by
    # a candle, and a sheet at its own scanned level would be a white flash on
    # load. The RELATIVE variation is what carries the material, so the level is
    # simply rescaled rather than curved.
    lum = big @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    big *= PAPER_LEVEL / max(float(lum.mean()), 1e-6)
    return big


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    print(f"sumi: {KM} km across, {W}x{H}, centre {LAT0}, {LON0}")

    paper = sheet()
    ink = ink_field()
    body, thread = water_wash()

    # The bleed: a blurred copy of the same field under the sharp one. This is
    # most of the difference between ink and a vector.
    halo = gm.blur(ink, BLEED_SIGMA) * BLEED_AMOUNT
    cover = np.clip(np.power(np.clip(ink + halo, 0, 1), 0.92), 0, 1)

    # The wash goes UNDER the strokes: it is the weight of the place, not a
    # thing drawn on it.
    mass = built_wash()
    paper = paper * (1.0 - 0.30 * mass[..., None])

    out = paper * (1.0 - cover[..., None]) + INK * cover[..., None]

    # The river: lighten the sheet, then lay the thread of the channel back in.
    wash = np.clip(body * 0.85, 0, 1)[..., None]
    out = out * (1.0 - wash) + (paper * 1.34) * wash
    ch = np.clip(thread * 0.55, 0, 1)[..., None]
    out = out * (1.0 - ch) + INK * 1.6 * ch

    # Age. A handful of foxing spots, and the corners a shade heavier, because a
    # sheet that is even from edge to edge is a texture and not an object.
    spots = np.zeros((H, W), np.float32)
    for _ in range(70):
        y, x = rng.integers(0, H), rng.integers(0, W)
        r = int(rng.integers(6, 26))
        yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
        m = np.exp(-(yy * yy + xx * xx) / (2 * (r / 2.2) ** 2)) * float(rng.uniform(0.04, 0.13))
        y0, x0 = max(0, y - r), max(0, x - r)
        y1, x1 = min(H, y + r + 1), min(W, x + r + 1)
        spots[y0:y1, x0:x1] += m[y0 - (y - r) : y1 - (y - r), x0 - (x - r) : x1 - (x - r)]
    out *= (1.0 - np.clip(spots, 0, 0.3))[..., None]

    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((gx - W / 2) / (W / 2)) ** 2 + ((gy - H / 2) / (H / 2)) ** 2)
    out *= np.clip(1.0 - 0.20 * np.power(d, 2.2), 0, 1)[..., None]

    # Fibre. The plate is sampled at about 1:1 on a laptop, so this is the last
    # thing between it and looking like a flat fill.
    out += rng.normal(0, 0.0055, (H, W, 1)).astype(np.float32)

    img = Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8), "RGB")
    path = os.path.join(OUT, "graz-sumi.webp")
    img.save(path, "WEBP", quality=84, method=6)
    print(f"   wrote graz-sumi.webp  {os.path.getsize(path) // 1024} KB")
    print(f"   ink covers {100 * (cover > 0.25).mean():.1f}% of the sheet")


if __name__ == "__main__":
    main()
