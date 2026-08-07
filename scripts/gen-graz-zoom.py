"""
The fly-in: Europe, Austria, Styria, Graz — four plates that zoom into each other.

── What it is for ──────────────────────────────────────────────────────────
The hero backdrop is a light map of Graz and it is unmistakably a city, but it
is not obviously an Austrian one. Rather than caption it, the opening flies in:
you start with a continent, a country resolves out of it, then a basin, then the
streets you were going to see anyway.

── Why it is images and not a map library ──────────────────────────────────
MapLibre does this motion properly — `flyTo` is the published algorithm for it,
and there is a globe projection now. It was the obvious answer and it lost on
two counts.

A tile map fetches every zoom level it passes through, so a five second flight
is hundreds of requests during the single most important frame on the site; on a
mediocre connection the opening stutters or shows blanks. And the landing has to
hand over to a plate that carries an ember ramp, bloom, grain and a density
falloff, none of which a vector style reproduces — two separately authored
pictures, which this project has learned three times over always read as two.

Four plates out of one script cost about a megabyte, are static, and cannot
stutter. The last one IS the hero backdrop, so there is no hand-over at all.

── How the zoom works ──────────────────────────────────────────────────────
Not a crossfade between fixed frames. Each plate is scaled continuously, and
when it reaches the scale of the next one down, the two swap over a short
overlap while both keep moving. That is the Deep Zoom / OpenSeadragon
arrangement — arbitrarily deep motion out of a handful of images — and the
reason it looks continuous is that nothing ever stops moving.

Every level is centred on the Hauptplatz and rendered in Web Mercator, so the
scaling is a pure zoom with no drift to correct. At nine kilometres Mercator and
the flat projection the street plate was built with agree to well under a pixel,
which is what lets the last level simply BE that plate.

── Where the data comes from ───────────────────────────────────────────────
  9 km      the existing street render (scripts/gen-graz-map.py)
  45, 230   Austrian roads down to secondary, plus settlements by population
  1100      Natural Earth populated places, worldwide

Both wide sets are written by scripts/fetch-zoom-data.py.

Map data (c) OpenStreetMap contributors, ODbL; place points also from Natural
Earth, public domain.
"""

import os
import sys
import json
import math
import importlib.util

import numpy as np
from PIL import Image, ImageDraw

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OSM = os.path.join(_ROOT, ".osm")
OUT = os.path.join(_ROOT, "public", "img")

# The finishing chain — bloom stack, ember ramp, aberration, grain, vignette —
# is imported from the street renderer rather than copied. These plates zoom
# into that one, so any drift between two copies of the curve would show up as
# the picture changing colour on the way in.
_spec = importlib.util.spec_from_file_location("gm", os.path.join(_HERE, "gen-graz-map.py"))
gm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gm)

LAT0, LON0 = gm.LAT0, gm.LON0

# Extent across the frame, in kilometres, wide to narrow. Each step is about
# five times the next, which is roughly the ratio at which a crossfade has room
# to happen while both plates are still visibly moving.
#
# 9 is not rendered here — it is the street plate, and this list ends where that
# one begins.
# 2200, not the 1100 it started at. Eleven hundred kilometres around Graz is
# eastern France to eastern Hungary — Central Europe, and nobody reads that as
# "Europe". At 2200 the frame reaches Britain, the boot of Italy and the Baltic,
# which are the shapes people actually recognise a continent by.
# 600 in the middle, not 230. Two hundred and thirty kilometres around Graz is a
# PIECE of Austria — the border passes through the corners of the frame and the
# country has no shape at all. Austria is five hundred and seventy kilometres
# end to end, so the beat whose entire job is to say "this is Austria" has to be
# wide enough to hold it.
LEVELS = [2200.0, 600.0, 110.0]
FINAL_KM = 9.0

W = 2600
H = W * 9 // 16
SS = 2

# Road width in metres and brightness, for the two wide levels. Only classes
# that are still a line from a hundred kilometres up are in the data at all.
WIDE_CLASSES = {
    "motorway": (150, 1.00), "trunk": (120, 0.95),
    "primary": (90, 0.88), "secondary": (60, 0.78),
    "motorway_link": (60, 0.70), "trunk_link": (55, 0.68), "primary_link": (45, 0.62),
}

# A settlement's glow. Radius in km goes as the square root of population —
# area with people in it, near enough — and brightness as the logarithm, because
# a city of a million is not a hundred times brighter than one of ten thousand,
# it is a few times brighter and much wider.
# 0.13, not the 0.85 it started at. A city of three hundred thousand came out
# fourteen kilometres in RADIUS, so Graz filled half the forty-five kilometre
# frame as one white balloon. This puts it at about two, which is roughly how
# far a city that size actually spreads.
PLACE_R_KM = 0.13
PLACE_MIN_PX = 0.9

# ...and the scale below which they are not drawn at all.
#
# A settlement disc is a stand-in for a town whose streets are too small to
# resolve. Once they ARE resolved it stops standing in for anything and starts
# sitting on top of it: at 110 km the road network already draws every town in
# the frame, and the discs came out as hard-edged blobs pasted over their own
# streets — Graz worst of all, a circle four times brighter than everything
# around it with 9% of its area clipped to flat white.
#
# That clipping was also the single largest reason the levels disagreed. A disc
# is not a city, and where the streets are there, it is not needed to say so.
PLACE_MAX_KM = 200.0

# Administrative boundaries: countries at the continental level, Austria's nine
# states at the country level.
#
# This is the one place the section's own rule — light is where something is —
# is set aside on purpose, and it earned it. Brightness was not the problem: the
# widest plate was lifted until its mean matched the street plate and it was
# still unrecognisable, because a night view of a continent is hard to place even
# as a real photograph. A border is not a light, it is the line where one thing
# stops being another, and that is what a person reads a map by.
#
# Faint, and fainter than the towns on them. Bright enough to be recognised, not
# bright enough to be looked at — a border that outshines the cities is an atlas.
# Two amplitudes for the national border, because the two levels are asking it
# to do different jobs. At continental scale the coastlines already carry the
# shape and a border only has to separate one glow from the next. At country
# scale there is no coast and the road network runs edge to edge — the border is
# the only thing that can make Austria a shape rather than a texture, so it has
# to be brighter than any road in the frame.
BORDER_AMP_WIDE = 0.34
BORDER_AMP_COUNTRY = 0.95
STATE_AMP = 0.5

# Lift applied to the finished tone curve, per level.
#
# A gain on the light field would do nothing: `tone` normalises to its own
# brightest pixel, so multiplying everything by three gives back exactly the
# same picture. The curve is the only lever there is.
#
# These levels need it and the street plate does not, and the reason is how much
# of the frame has anything in it. Graz at nine kilometres is lit across a third
# of its area; Europe at eleven hundred is lit across eight per cent, and after
# a curve tuned for the dense case the other ninety-two per cent sits at two or
# three of 255 — which is why the first version was unreadable as a continent.
#
# Tapered toward 1 as the levels approach the street plate, so brightness does
# not step at the landing. Measured: without this the wide plates ran at a mean
# of 3.5 to 6.4 against the street plate's 10.7.
# Raised again for the two wide levels once borders and a wider continental
# frame put real content in them: 0.36 was tuned against an almost empty frame
# and left this one at a mean of 17.9 against the street plate's 10.7, which is
# the same mismatch as before with the sign flipped.
LEVEL_GAMMA = [0.55, 0.52, 0.58]


def merc(lat, lon):
    """Web Mercator, in units where one is the equator's circumference."""
    x = lon / 360.0
    s = math.sin(math.radians(max(-85.0, min(85.0, lat))))
    y = -math.log((1 + s) / (1 - s)) / (4 * math.pi)
    return x, y


MX0, MY0 = merc(LAT0, LON0)


def load(name):
    p = os.path.join(OSM, name + ".json")
    if not os.path.exists(p):
        return []
    return json.load(open(p, encoding="utf-8"))


def render(km):
    """One level as a 0..n light field, before any colour."""
    # Metres per supersampled pixel at the frame centre. Mercator stretches with
    # latitude, and at 47 degrees that is a factor of 1.47 — ignored on purpose:
    # correcting it would make the plates disagree about scale and the zoom would
    # slide. The whole pyramid is drawn in Mercator units and only converted once,
    # here, so every level is wrong by exactly the same amount and the motion is
    # clean.
    span = (km * 1000.0) / (40075017.0 * math.cos(math.radians(LAT0)))
    px = (W * SS) / span
    cx, cy = W * SS / 2, H * SS / 2

    def project(lat, lon):
        x, y = merc(lat, lon)
        return (cx + (x - MX0) * px, cy + (y - MY0) * px)

    light = np.zeros((H * SS, W * SS), np.float32)
    mpp = km * 1000.0 / (W * SS)

    roads = load("wide-roads")
    if roads and km <= 400:
        by_class = {}
        for w in roads:
            by_class.setdefault(w["c"], []).append(w["g"])
        for c, geoms in by_class.items():
            metres, amp = WIDE_CLASSES.get(c, (50, 0.6))
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            wpx = max(1, int(round(max(0.9, metres / mpp))))
            for g in geoms:
                pts = [project(a, b) for a, b in g]
                # Anything wholly off-frame is skipped before PIL sees it: at the
                # widest level almost every road in the country is, and the draw
                # calls are the whole cost of this script.
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.line(pts, fill=255, width=wpx, joint="curve")
            light += np.asarray(canvas, np.float32) / 255.0 * amp

    # ---- the widest level: a continent, not confetti ----------------------
    # Points alone were unreadable — seven thousand dots on black could have been
    # anywhere. Built-up AREA is what a night view of a continent actually shows,
    # and the coastline is what makes it legible as a place: the line where the
    # lights stop is the only edge in the picture.
    if km > 700:
        urban = load("world-urban")
        if urban:
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for ring in urban:
                pts = [project(a, b) for a, b in ring]
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.polygon(pts, fill=255)
            light += np.asarray(canvas, np.float32) / 255.0 * 0.85

        borders = load("world-borders")
        if borders:
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for line in borders:
                pts = [project(a, b) for a, b in line]
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.line(pts, fill=255, width=2, joint="curve")
            light += np.asarray(canvas, np.float32) / 255.0 * BORDER_AMP_WIDE

        coast = load("world-coast")
        if coast:
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for line in coast:
                pts = [project(a, b) for a, b in line]
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.line(pts, fill=255, width=2, joint="curve")
            # Very faint. It is there to be recognised, not looked at — a coast
            # any brighter than the towns on it would be a diagram.
            # 0.30. At 0.13 the coast was there in the data and not on the
            # screen, and without it the frame is dots that could be anywhere.
            light += np.asarray(canvas, np.float32) / 255.0 * 0.30

    # ---- the country level: the nine states ---------------------------------
    # Same argument as the borders above, one scale down. Austria at two hundred
    # kilometres is a road network with no edges; the state lines are what turn
    # it into a country somebody lives in.
    if 100 < km <= 700:
        states = load("world-states")
        if states:
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for line in states:
                pts = [project(a, b) for a, b in line]
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.line(pts, fill=255, width=2, joint="curve")
            light += np.asarray(canvas, np.float32) / 255.0 * STATE_AMP
        borders = load("world-borders")
        if borders:
            canvas = Image.new("L", (W * SS, H * SS), 0)
            d = ImageDraw.Draw(canvas)
            for line in borders:
                pts = [project(a, b) for a, b in line]
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                if max(xs) < 0 or min(xs) > W * SS or max(ys) < 0 or min(ys) > H * SS:
                    continue
                d.line(pts, fill=255, width=4, joint="curve")
            # Heavier than the internal ones, so the country reads as one shape
            # with divisions rather than as nine equally weighted patches.
            light += np.asarray(canvas, np.float32) / 255.0 * BORDER_AMP_COUNTRY

    # Settlements. The Austrian set is far denser and better sourced, so it wins
    # wherever it reaches; the worldwide set fills everything beyond it.
    pts = load("at-places") if km <= 700 else load("world-places")
    if km <= PLACE_MAX_KM:
        pts = []
    if pts:
        canvas = Image.new("L", (W * SS, H * SS), 0)
        d = ImageDraw.Draw(canvas)
        # Smallest first, so where two settlements overlap the larger one is
        # painted last and keeps its brightness. PIL fills rather than maxes.
        for lat, lon, pop in sorted(pts, key=lambda q: q[2]):
            x, y = project(lat, lon)
            r = max(PLACE_MIN_PX, PLACE_R_KM * math.sqrt(max(pop, 1) / 1000.0) * 1000.0 / mpp)
            if x < -r or x > W * SS + r or y < -r or y > H * SS + r:
                continue
            # Divided by 8.5 rather than 6.5: at 6.5 anything over a million
            # reached full white before the bloom had even been applied, and a
            # city that clips is a disc, not a city.
            v = int(np.clip(math.log10(max(pop, 100)) / 8.5, 0, 1) * 255)
            d.ellipse([x - r, y - r, x + r, y + r], fill=v)
        light += np.asarray(canvas, np.float32) / 255.0 * 0.85

    small = Image.fromarray(np.clip(light * 60, 0, 255).astype(np.uint8)).resize(
        (W, H), Image.LANCZOS
    )
    light = np.asarray(small, np.float32) / 60.0

    # The same hot-core-cooling-outward falloff the street plate has, so the
    # frame never brightens toward its corners on the way in.
    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    dd = np.sqrt(((gx - W * 0.5) / (W * 0.62)) ** 2 + ((gy - H * 0.47) / (H * 0.82)) ** 2)
    # Much gentler the wider the frame gets.
    #
    # The street plate's falloff is doing a real job: an inhabited basin IS
    # brightest in the middle, and without it the frame reads as a printed map.
    # Applied unchanged at six hundred kilometres it does something else — it
    # dims Tyrol and Vienna into the background and leaves Styria glowing, so
    # the beat whose whole purpose is to show a COUNTRY shows one province of it.
    # At these scales the falloff is only there to keep the corners from
    # competing with the middle.
    wide = min(1.0, max(0.0, (math.log2(km) - math.log2(20.0)) / 3.0))
    floor = gm.FALLOFF_FLOOR + (0.72 - gm.FALLOFF_FLOOR) * wide
    rate = gm.FALLOFF_RATE + (0.55 - gm.FALLOFF_RATE) * wide
    light *= floor + (1.0 - floor) * np.exp(-rate * dd)
    return light


def build(km, index):
    print(f"level {index}: {km:g} km across, {W}x{H}")
    light = render(km)
    acc = gm.tone(light)
    acc = np.clip(np.power(acc, LEVEL_GAMMA[index]), 0, 1)
    idx = np.clip((acc * 255).astype(np.int32), 0, 255)
    rgb = gm.build_ramp(gm.EMBER_STOPS)[idx]
    gm.finish(rgb, f"zoom-{index}.webp", acc=acc)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    print(f"   lit {100 * (acc > 0.05).mean():.0f}% of the frame, luminance mean {lum.mean():.1f}")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    gm.W, gm.H = W, H
    gm.yy, gm.xx = np.mgrid[0:H, 0:W].astype(np.float32)
    gm.OUT = OUT
    # An argument picks a single level to re-render, by its width in km. Handy
    # when one plate needs redoing and the other two are fine; without it the
    # cheapest change costs all three.
    only = float(sys.argv[1]) if len(sys.argv) > 1 else None
    for i, km in enumerate(LEVELS):
        if only is None or abs(km - only) < 1e-6:
            build(km, i)

    # The last plate is graz-night.webp — the hero backdrop — at the width the
    # rest of the ladder uses. At its native 4000x2250 it is nine megapixels of
    # decode and thirty-six of texture upload for a picture that is only ever
    # seen at cover scale, and it was landing in the first second of the page.
    night = os.path.join(OUT, "graz-night.webp")
    if os.path.exists(night):
        Image.open(night).convert("RGB").resize((W, H), Image.LANCZOS).save(
            os.path.join(OUT, "zoom-3.webp"), quality=82, method=6
        )
        print(f"wrote zoom-3.webp  {W}x{H}")

    # The scale ladder the front end needs, so nobody has to keep two lists of
    # numbers in step by hand.
    ladder = {"levels": LEVELS + [FINAL_KM], "final": "zoom-3.webp"}
    json.dump(ladder, open(os.path.join(OUT, "zoom-levels.json"), "w"), indent=2)
    print("wrote zoom-levels.json", ladder)
