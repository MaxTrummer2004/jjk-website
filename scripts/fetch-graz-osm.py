"""
Cut the Graz road network out of an OpenStreetMap extract, for gen-graz-map.py.

Run once, then never again unless you want fresher data. The renderer works
entirely offline from what this writes, so the map can be re-framed, re-coloured
and re-rendered at any size without touching the network.

    python3 scripts/fetch-graz-osm.py            # downloads the extract if needed
    python3 scripts/fetch-graz-osm.py path.pbf   # or points at one you already have

── Why not the Overpass API ────────────────────────────────────────────────
That was the first attempt and it is the obvious one: a small query, no
download, no dependencies. It works for arterials — "every motorway and primary
road in a 24x20 km box" comes back in five seconds. It does not work for
residential streets. Every mirror answers that with a 504, and splitting the
area into sixteen tiles does not help: one tile took over two minutes and came
back empty. The limit is not the size of the answer, it is how long a query may
occupy a shared public server, and the residential network of a city is simply
over that line.

The country extract is 800 MB and downloads in well under a minute. One large
sequential read beats sixteen small requests to a server that is rationing.

── Why two passes ──────────────────────────────────────────────────────────
The natural way to read ways with coordinates is osmium's location cache, which
holds every node in the file in memory so that way geometry can be resolved on
the fly. For a whole country that is several gigabytes, most of it nodes in
Vorarlberg that this script will never look at.

So instead: pass one keeps only the nodes inside the Graz box, which is a small
fraction of the file. Pass two keeps the ways whose nodes are in that set. The
node table peaks in the low hundreds of megabytes and both passes are a plain
sequential scan.

The cost is that a way leaving the box is clipped at the boundary rather than
carried out of frame — invisible here, because the box is deliberately larger
than any extent that gets rendered.

Data (c) OpenStreetMap contributors, ODbL. A rendered image derived from this
needs the credit line somewhere on the site — footer or imprint.
"""

import os
import sys
import json
import time
import urllib.request

import osmium

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
CACHE = os.path.join(_ROOT, ".osm")

PBF_URL = "https://download.geofabrik.de/europe/austria-latest.osm.pbf"

# S, W, N, E — about 24 km across and 19 km tall, centred on the Hauptplatz.
# Comfortably larger than the widest extent gen-graz-map.py renders, so nothing
# ever runs off the edge of the data.
BOX = (46.985, 15.280, 47.160, 15.600)

# Grouped by how they should be drawn, not by how OSM classifies them. `tiny`
# exists as its own tier because at the wide extent those ways are under half a
# pixel and contribute haze rather than line — the renderer can then drop the
# whole tier instead of filtering way by way.
TIERS = {
    "major": {"motorway", "trunk", "primary", "secondary", "tertiary",
              "motorway_link", "trunk_link", "primary_link", "secondary_link",
              "tertiary_link"},
    "minor": {"unclassified", "residential", "living_street", "pedestrian"},
    "tiny": {"service", "footway", "path", "track", "steps", "cycleway"},
}
ALL_ROADS = set().union(*TIERS.values())

# Rail. Trams are deliberately left out: in Graz they run down the middle of
# streets that are already drawn, so they would only thicken lines that are
# bright anyway. Heavy rail is the opposite — the yards south of the centre and
# the lines out of the basin are structure that no road describes.
RAIL = {"rail", "light_rail"}


def download(dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 100_000_000:
        print(f"extract: reusing {dest} ({os.path.getsize(dest) // 1_000_000} MB)")
        return dest
    print(f"extract: downloading {PBF_URL}")
    t = time.time()
    urllib.request.urlretrieve(PBF_URL, dest)
    print(f"extract: {os.path.getsize(dest) // 1_000_000} MB in {time.time() - t:.0f}s")
    return dest


def nodes_in_box(path):
    s, w, n, e = BOX
    keep = {}
    t = time.time()
    for o in osmium.FileProcessor(path, osmium.osm.NODE):
        loc = o.location
        if loc.valid():
            lat, lon = loc.lat, loc.lon
            if s <= lat <= n and w <= lon <= e:
                keep[o.id] = (lat, lon)
    print(f"pass 1: {len(keep):,} nodes in box  ({time.time() - t:.0f}s)")
    return keep


def ways_in_box(path, nodes):
    out = {k: [] for k in TIERS}
    water, rail, buildings = [], [], []
    t = time.time()
    for o in osmium.FileProcessor(path, osmium.osm.WAY):
        tags = o.tags
        hw = tags.get("highway")
        rw = tags.get("railway")
        is_building = "building" in tags or "building:part" in tags
        is_water = (
            tags.get("natural") == "water"
            or tags.get("waterway") in ("river", "riverbank")
        )
        if not (hw in ALL_ROADS or rw in RAIL or is_water or is_building):
            continue
        geom = [nodes[nd.ref] for nd in o.nodes if nd.ref in nodes]
        # Two points is the minimum that draws a line. A way reduced to one
        # point by the box clip is a way that only grazed the corner.
        if len(geom) < 2:
            continue

        if is_building:
            # Stored as centre and radius, not as outline.
            #
            # There are a quarter of a million of these and the renderer never
            # sees one larger than a few pixels — at the widest extent a family
            # house is under a pixel across. Keeping the outlines would be a
            # ninety-megabyte file describing corners that get averaged away in
            # the first downsample. The radius comes from the bounding box, so a
            # long industrial hall still reads as bigger than a house.
            lats = [p[0] for p in geom]
            lons = [p[1] for p in geom]
            buildings.append([
                round(sum(lats) / len(lats), 6),
                round(sum(lons) / len(lons), 6),
                round(max(max(lats) - min(lats), (max(lons) - min(lons)) * 0.68) * 1e5, 1),
            ])
            continue

        rec = {"g": [[round(a, 6), round(b, 6)] for a, b in geom]}
        if is_water:
            rec["kind"] = "river" if tags.get("waterway") == "river" else "area"
            water.append(rec)
        elif rw in RAIL:
            rail.append(rec)
        else:
            for tier, members in TIERS.items():
                if hw in members:
                    rec["c"] = hw
                    out[tier].append(rec)
                    break
    print(f"pass 2: " + ", ".join(f"{k} {len(v):,}" for k, v in out.items())
          + f", water {len(water):,}, rail {len(rail):,}, buildings {len(buildings):,}"
          + f"  ({time.time() - t:.0f}s)")
    return out, water, rail, buildings


def main():
    os.makedirs(CACHE, exist_ok=True)
    path = sys.argv[1] if len(sys.argv) > 1 else download(os.path.join(CACHE, "austria.osm.pbf"))

    nodes = nodes_in_box(path)
    if not nodes:
        raise SystemExit("no nodes in box — is this the right extract?")
    tiers, water, rail, buildings = ways_in_box(path, nodes)

    parts = dict(tiers)
    parts["water"] = water
    parts["rail"] = rail
    parts["buildings"] = buildings
    for name, data in parts.items():
        p = os.path.join(CACHE, name + ".json")
        json.dump(data, open(p, "w"), separators=(",", ":"))
        print(f"   {name}.json  {os.path.getsize(p) // 1024} KB")
    print("done")


if __name__ == "__main__":
    main()
