"""
Data for the fly-in: everything between the whole world and the Graz street map.

scripts/fetch-graz-osm.py already covers the last stop — a 24 km box around the
Hauptplatz, every road in it. That box is the entire problem this script exists
to solve: four kilometres up it is the picture, four hundred kilometres up it is
a speck, and there is nothing in the cache to fill the rest of the frame.

Two sources, because no single one is right at every scale.

  Austria, from the same country extract the street map came from. Only the
  roads that are still a line when a country fits on a screen — motorway down
  to secondary — plus every place OSM knows the population of. This is what
  carries the middle of the flight, where the shape of a road network is still
  legible.

  The world, from Natural Earth's populated places. Public domain, about seven
  thousand points with populations, one small file. At continental scale a light
  map is not roads at all; it is where people are, which is exactly what this
  is. Trying to serve that scale from road data would mean the rest of Europe as
  a 28 GB download to draw dots with.

── Why the passes are the other way round ──────────────────────────────────
fetch-graz-osm.py keeps every node inside a small box and then the ways whose
nodes survived. That does not scale: a box holding all of Austria keeps most of
the file's sixty million nodes, and the lookup table alone would be gigabytes.

So this one goes ways first — collect the ids the wide roads reference, which is
a few million — and only then walks the nodes, keeping the ones on that list.
Memory follows the size of the ROAD network rather than the size of the country.

Data (c) OpenStreetMap contributors, ODbL. Natural Earth is public domain and
asks for nothing, though it is good manners to say where it came from.
"""

import os
import sys
import json
import time
import urllib.request

import osmium

_HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(os.path.normpath(os.path.join(_HERE, "..")), ".osm")

# Roads that still read as a line from a hundred kilometres up. Anything below
# secondary is sub-pixel at every extent this data is used for, and there are
# two million of them.
WIDE = {
    "motorway", "trunk", "primary", "secondary",
    "motorway_link", "trunk_link", "primary_link",
}

_NE = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
       "geojson/")
NE_PLACES = _NE + "ne_10m_populated_places_simple.geojson"
# Seven thousand dots on black is not a continent, it is confetti — the first
# render of the widest level was unrecognisable as Europe. Two more layers fix
# that, and both are the right material rather than a decoration:
#
#   urban areas, because a light map at continental scale is built-up EXTENT,
#   not city centres, and a point can only ever be a dot
#
#   coastlines, because the one thing that makes a night view of a continent
#   readable is the line where the lights stop
NE_URBAN = _NE + "ne_10m_urban_areas.geojson"
NE_LAND = _NE + "ne_50m_coastline.geojson"
# Borders, and they are the thing that actually makes the frame readable.
#
# Brightness was not the problem. A night-lights view of a continent is hard to
# recognise even as a real satellite photograph unless you already know what you
# are looking at — the shape people read a map by is the line where one thing
# stops and another starts. That is why the Graz plate works: the Schlossberg is
# a hole and the Mur is a seam, and both are boundaries.
#
# admin_0 gives countries for the continental level, admin_1 gives Austria's
# nine states for the country level.
NE_BORDERS = _NE + "ne_10m_admin_0_boundary_lines_land.geojson"
NE_STATES = _NE + "ne_10m_admin_1_states_provinces_lines.geojson"


def wide_roads(path):
    """Two passes: which nodes the wide roads need, then where those nodes are."""
    t = time.time()
    need = set()
    ways = []
    for o in osmium.FileProcessor(path, osmium.osm.WAY):
        if o.tags.get("highway") in WIDE:
            refs = [nd.ref for nd in o.nodes]
            if len(refs) > 1:
                ways.append((o.tags.get("highway"), refs))
                need.update(refs)
    print(f"pass 1: {len(ways):,} wide roads referencing {len(need):,} nodes  ({time.time() - t:.0f}s)")

    t = time.time()
    loc = {}
    for o in osmium.FileProcessor(path, osmium.osm.NODE):
        if o.id in need:
            l = o.location
            if l.valid():
                loc[o.id] = (round(l.lat, 5), round(l.lon, 5))
    print(f"pass 2: located {len(loc):,}  ({time.time() - t:.0f}s)")

    out = []
    for cls, refs in ways:
        g = [loc[r] for r in refs if r in loc]
        if len(g) > 1:
            out.append({"c": cls, "g": [[a, b] for a, b in g]})
    return out


def places(path):
    """Settlements with a population, which is what a country looks like at night."""
    out = []
    for o in osmium.FileProcessor(path, osmium.osm.NODE):
        t = o.tags
        if t.get("place") not in ("city", "town", "village", "suburb"):
            continue
        pop = t.get("population")
        try:
            n = int("".join(ch for ch in (pop or "") if ch.isdigit()) or 0)
        except ValueError:
            n = 0
        if n < 500:
            # No population tag, or a hamlet. Given a floor by rank instead, so a
            # town that nobody has counted still shows up as a town.
            n = {"city": 30000, "town": 6000, "village": 900, "suburb": 4000}[t.get("place")]
        l = o.location
        if l.valid():
            out.append([round(l.lat, 4), round(l.lon, 4), n])
    return out


def _geojson(url, name, pick):
    p = os.path.join(CACHE, name + ".json")
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        print(f"{name}: cached")
        return
    raw = json.loads(urllib.request.urlopen(url, timeout=240).read())
    out = []
    for f in raw.get("features", []):
        pick(f, out)
    json.dump(out, open(p, "w"), separators=(",", ":"))
    print(f"{name}: {len(out):,} shapes, {os.path.getsize(p) // 1024} KB")


def _rings(geom, out, step=1):
    """Flatten a GeoJSON geometry to lists of [lat, lon]."""
    t, c = geom.get("type"), geom.get("coordinates")
    if t == "Polygon":
        polys = [c]
    elif t == "MultiPolygon":
        polys = c
    elif t == "LineString":
        out.append([[round(p[1], 3), round(p[0], 3)] for p in c[::step]])
        return
    elif t == "MultiLineString":
        for line in c:
            out.append([[round(p[1], 3), round(p[0], 3)] for p in line[::step]])
        return
    else:
        return
    for poly in polys:
        if poly and len(poly[0]) > 3:
            out.append([[round(p[1], 3), round(p[0], 3)] for p in poly[0][::step]])


def natural_earth():
    p = os.path.join(CACHE, "world-places.json")
    if os.path.exists(p) and os.path.getsize(p) > 10000:
        print("world: cached")
        return
    print("world: downloading Natural Earth populated places")
    raw = json.loads(urllib.request.urlopen(NE_PLACES, timeout=180).read())
    out = []
    for f in raw.get("features", []):
        pr = f.get("properties", {})
        c = (f.get("geometry") or {}).get("coordinates")
        if not c:
            continue
        pop = pr.get("pop_max") or pr.get("pop_min") or 0
        if pop:
            out.append([round(c[1], 3), round(c[0], 3), int(pop)])
    json.dump(out, open(p, "w"), separators=(",", ":"))
    print(f"world: {len(out):,} places, {os.path.getsize(p) // 1024} KB")


def world_shapes():
    _geojson(NE_URBAN, "world-urban", lambda f, o: _rings(f.get("geometry") or {}, o))
    _geojson(NE_LAND, "world-coast", lambda f, o: _rings(f.get("geometry") or {}, o, 2))
    _geojson(NE_BORDERS, "world-borders", lambda f, o: _rings(f.get("geometry") or {}, o))
    _geojson(NE_STATES, "world-states", lambda f, o: _rings(f.get("geometry") or {}, o))


def main():
    os.makedirs(CACHE, exist_ok=True)
    natural_earth()
    world_shapes()

    pbf = sys.argv[1] if len(sys.argv) > 1 else os.path.join(CACHE, "austria.osm.pbf")
    if not os.path.exists(pbf):
        raise SystemExit(f"no extract at {pbf} — see scripts/fetch-graz-osm.py")

    p = os.path.join(CACHE, "wide-roads.json")
    if not (os.path.exists(p) and os.path.getsize(p) > 10000):
        json.dump(wide_roads(pbf), open(p, "w"), separators=(",", ":"))
        print(f"   wide-roads.json  {os.path.getsize(p) // 1024} KB")

    p = os.path.join(CACHE, "at-places.json")
    if not (os.path.exists(p) and os.path.getsize(p) > 1000):
        t = time.time()
        d = places(pbf)
        json.dump(d, open(p, "w"), separators=(",", ":"))
        print(f"   at-places.json  {len(d):,} settlements, "
              f"{os.path.getsize(p) // 1024} KB  ({time.time() - t:.0f}s)")
    print("done")


if __name__ == "__main__":
    main()
