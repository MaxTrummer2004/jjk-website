"""
The ignite field: how long the fire takes to reach every pixel, travelling the
streets.

── What it is for ──────────────────────────────────────────────────────────
The opening ends with the map catching light from one address outward. A radial
wipe would be the cheap version of that and it looks like a wipe: a circle
crossing a city, indifferent to the city. What actually reads as *ignition* is
the front arriving down a boulevard four kilometres away before it reaches a
courtyard two hundred metres off, because the fire is running along something.

So the front is not a radius. It is an arrival time, precomputed here as a
geodesic distance through the road network and shipped as one grayscale plate
the shader samples in the same UV space as the map.

── How ─────────────────────────────────────────────────────────────────────
Rasterise the network exactly as gen-graz-map.py does — same frame, same
projection, same class widths — and read the result as a conductance. Turn that
into a cost per pixel (bright road: cheap; open ground: thirty times dearer),
then run a Dijkstra sweep from the gym with skimage's MCP_Geometric.

The result is normalised to its own maximum, so 0 is the gym and 1 is the last
pixel in the frame to catch. Everything ignites by the time the front reaches 1;
the roads are done long before that and the leftover range is the ground filling
in behind them, which is the part that sells it as fire rather than as a mask.

── Why water is not subtracted here ────────────────────────────────────────
The street plate darkens the Mur, and rightly — the river is a hole in the light.
But the bridges are roads and they are what connects the two halves of the city.
Multiplying the conductance by the water mask cuts every one of them, and the
front then crawls across the river at ground cost and arrives on the far bank as
a soft blob instead of running over four bridges. The picture keeps its dark
river; the fire uses the bridges.

Map data (c) OpenStreetMap contributors, ODbL.

    python scripts/gen-ignite.py
"""

import os
import json
import math

import numpy as np
from PIL import Image, ImageDraw
from skimage.graph import MCP_Geometric

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OSM = os.path.join(_ROOT, ".osm")
OUT = os.path.join(_ROOT, "public", "img")

# Kept in step with gen-graz-map.py by hand — this script deliberately does not
# import it, because importing runs a module that wants a quarter of a million
# building footprints to do anything at all.
# Moved 500 m south of the Hauptplatz on 2026-08-07. The frame has to hold the
# Kasernstraße with room UNDER it — the opening circles it and hangs a slip off
# it, and at the old centre the gym sat 1.98 km south on a plate that reaches
# 2.53 km, which put it in the bottom eighth of every frame that also held the
# five rejected landmarks. Everything derived from this file moves together:
# graz-night/unlit/glow/lights, zoom-3, the ignite field, and ORIGIN_LAT in
# lib/fly-path.ts.
LAT0, LON0 = 47.0664, 15.4383
KM = 9.0

# The plate this field is sampled against. Same aspect as zoom-3.webp; the field
# itself ships at a quarter of this (see SHRINK), which is all a smooth arrival
# time needs — 96 KB instead of 271 — and it is sampled with bilinear filtering
# anyway. The sweep still runs at full resolution, because connectivity is not
# smooth: a footpath one pixel wide either joins two courtyards or it does not.
W = 2600
H = W * 9 // 16
SHRINK = 4

# Everything past this in the raw field is open ground with no light on it. It
# is a third of the range carrying nothing anybody can see, and spending a third
# of eight bits on it costs precision where the front actually is — the visible
# part of the ignition happens inside a band about 0.03 wide, which is eight
# levels at full range and fourteen at this one.
CLAMP = 0.55

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
RAIL_METRES, RAIL_AMP = 3.5, 0.40

# The source. Kasernstraße, Graz — 47°03'11"N 15°26'36"E.
#
# Note the spelling: the street is Kasern-straße, not Kasernen-straße, which is
# what lib/config.ts currently says. Both exist as words; only one of them is in
# Graz.
GYM_LAT, GYM_LON = 47.0530463, 15.4433255

# Ground cost is 1/GROUND_G, so this number is "open ground is thirty-three
# times slower than a lit street". High enough that the front visibly prefers
# the network, low enough that the ground behind it fills in while the plate is
# still lighting up rather than minutes later.
GROUND_G = 0.03


def load(name):
    p = os.path.join(OSM, name + ".json")
    if not os.path.exists(p):
        print(f"   (no {name}.json — run scripts/fetch-graz-osm.py)")
        return []
    return json.load(open(p, encoding="utf-8"))


def project_factors():
    mpp = KM * 1000.0 / W
    mlon = 111320.0 * math.cos(math.radians(LAT0))
    mlat = 110574.0
    return mpp, mlon, mlat


def conductance():
    """The network as a 0..n field. Roads and rail only — no water, no mass."""
    mpp, mlon, mlat = project_factors()
    cx, cy = W / 2, H / 2

    def project(pts):
        return [
            (cx + (lon - LON0) * mlon / mpp, cy - (lat - LAT0) * mlat / mpp)
            for lat, lon in pts
        ]

    g = np.zeros((H, W), np.float32)

    for tier in ("major", "minor", "tiny"):
        ways = load(tier)
        if not ways:
            continue
        by_class = {}
        for w in ways:
            c, geom = w.get("c"), w.get("g")
            if c in CLASSES and geom and len(geom) > 1:
                by_class.setdefault(c, []).append(geom)
        for c, geoms in by_class.items():
            metres, amp = CLASSES[c]
            canvas = Image.new("L", (W, H), 0)
            d = ImageDraw.Draw(canvas)
            # At least two pixels wide, where the picture uses one. A line one
            # pixel wide is a connected line to the eye and an intermittently
            # broken one to an eight-neighbour sweep, and a break in a footpath
            # is a courtyard that never catches.
            px = max(2, int(round(metres / mpp)))
            for geom in geoms:
                d.line(project(geom), fill=255, width=px, joint="curve")
            g = np.maximum(g, np.asarray(canvas, np.float32) / 255.0 * amp)

    rail = load("rail")
    if rail:
        canvas = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(canvas)
        for w in rail:
            d.line(project(w["g"]), fill=255,
                   width=max(2, int(round(RAIL_METRES / mpp))), joint="curve")
        g = np.maximum(g, np.asarray(canvas, np.float32) / 255.0 * RAIL_AMP)

    return g


def main():
    os.makedirs(OUT, exist_ok=True)
    mpp, mlon, mlat = project_factors()

    g = conductance()
    covered = float((g > 0.01).mean())
    print(f"network: {W}x{H}, {mpp:.2f} m/px, {100 * covered:.1f}% of the frame is road")

    # max() rather than sum() above, so a junction is not cheaper than the
    # streets that meet there. Cost is the reciprocal, clamped so the sweep can
    # never see a zero-cost pixel.
    cost = 1.0 / np.clip(g, GROUND_G, None)

    sx = int(round(W / 2 + (GYM_LON - LON0) * mlon / mpp))
    sy = int(round(H / 2 - (GYM_LAT - LAT0) * mlat / mpp))
    if not (0 <= sx < W and 0 <= sy < H):
        raise SystemExit(f"the gym is outside the {KM:g} km frame at ({sx}, {sy})")

    # Start from the brightest pixel within a few metres rather than the exact
    # coordinate: a street address rounds to somewhere in the roadway, but it can
    # round into the building next to it, and starting on ground costs the first
    # thirty steps at ground price for no reason.
    r = 6
    patch = g[max(0, sy - r):sy + r + 1, max(0, sx - r):sx + r + 1]
    if patch.max() > GROUND_G:
        oy, ox = np.unravel_index(int(np.argmax(patch)), patch.shape)
        sy, sx = max(0, sy - r) + oy, max(0, sx - r) + ox
    print(f"source at pixel ({sx}, {sy}), conductance {g[sy, sx]:.2f}")

    mcp = MCP_Geometric(cost, fully_connected=True)
    dist, _ = mcp.find_costs([[sy, sx]])
    dist = np.asarray(dist, np.float64)
    if not np.isfinite(dist).all():
        # Nothing in a rectangle of a city should be unreachable, but a stray
        # island would otherwise poison the normalisation with an infinity.
        finite = dist[np.isfinite(dist)]
        print(f"   {(~np.isfinite(dist)).sum():,} unreachable pixels, capped")
        dist = np.where(np.isfinite(dist), dist, finite.max())

    on_road = g > 0.2
    print(f"   road reach {dist[on_road].max():,.0f} · frame reach {dist.max():,.0f}"
          f" · roads done at {dist[on_road].max() / dist.max():.2f} of the front")

    t = dist / dist.max()
    stored = np.clip(t / CLAMP, 0, 1)
    small = Image.fromarray(np.clip(stored * 255, 0, 255).astype(np.uint8)).resize(
        (W // SHRINK, H // SHRINK), Image.BOX
    )
    path = os.path.join(OUT, "zoom-3-ignite.webp")
    small.save(path, lossless=True, quality=100, method=6)
    print(f"wrote zoom-3-ignite.webp  {small.width}x{small.height}  "
          f"{os.path.getsize(path) / 1024:.0f} KB")

    # ---- the pacing table --------------------------------------------------
    # Geodesic distance is not evenly distributed over the picture. Nine tenths
    # of the light in this frame is inside the first half of the range, because
    # the arterials reach the edge of the city long before the ground between
    # them fills in. Run the front linearly and the ignition is over while the
    # animation is half done, then nothing visible happens for two seconds.
    #
    # So the front does not move linearly: it moves along the inverse of this
    # curve, which is where the front has to be for each tenth of the *light* to
    # have caught. Weighted by conductance, because unlit ground arriving late
    # is not something anybody can see. lib/fly-path.ts interpolates it.
    w = np.clip(g, 0, 1)
    order = np.argsort(t, axis=None)
    ts = t.ravel()[order]
    cum = np.cumsum(w.ravel()[order])
    cum /= cum[-1]
    front = [0.0] + [
        min(1.0, float(ts[int(np.searchsorted(cum, i / 10.0))]) / CLAMP)
        for i in range(1, 10)
    ] + [1.0]
    print("   front at each tenth of the light: "
          + " ".join(f"{m:.3f}" for m in front))

    meta = {
        "origin": [LAT0, LON0],
        "km": KM,
        "target": [GYM_LAT, GYM_LON],
        "front": [round(f, 4) for f in front],
    }
    json.dump(meta, open(os.path.join(OUT, "ignite.json"), "w"), indent=2)
    print("wrote ignite.json", meta)


if __name__ == "__main__":
    main()
