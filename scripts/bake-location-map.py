"""
Backt public/data/graz-streets.json: die Gegend um das Gym, als Zahlen.

components/street-map.tsx zeichnet daraus eine Karte, ohne zur Laufzeit
irgendjemanden zu fragen — kein Token, kein Drittanbieter-Aufruf, kein Eintrag
in der Datenschutzerklaerung. Der Preis ist dieses Skript: zieht der Verein um,
laeuft es einmal neu.

    python3 scripts/bake-location-map.py "Triester Straße 391, 8055 Graz"

Die Antworten von Overpass landen unter .osmcache/ und werden wiederverwendet.
Wer frische Daten will, loescht den Ordner. Das ist nicht Bequemlichkeit: die
oeffentlichen Overpass-Server rationieren nach Rechenzeit, und ein Skript, das
bei jedem Versuch fuenf Abfragen neu stellt, wird nach dem dritten Versuch
abgewiesen.

── Die Ebenen ──────────────────────────────────────────────────────────────
Der Zeichner braucht eine Hierarchie, sonst ist es kein Stadtplan, sondern ein
Bild von Linien. Vier Strassenklassen mit eigener Breite und Helligkeit:

    major   Autobahn, Schnellstrasse, Bundesstrasse   (bis INNER)
    mid     Landes- und Bezirksstrasse                (bis INNER)
    minor   Wohnstrassen, Zufahrten                   (bis INNER)
    path    Fuss- und Radwege, Feldwege               (bis INNER)
    far     nur die breiten, dafuer bis RADIUS

`far` ueberschneidet sich absichtlich mit `major` und `mid`: es traegt das Bild,
solange weit herausgezoomt ist, und wird ausgeblendet, sobald die inneren
Ebenen uebernehmen.

`bld` sind die Gebaeudegrundrisse im Nahbereich — bei 320 m Sichtweite ist ein
Strassennetz fast nichts, da will man den Block sehen. `home` ist das eigene
Haus.

Daten © OpenStreetMap-Mitwirkende, ODbL.
"""

import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
CACHE = os.path.join(ROOT, ".osmcache")
OUT = os.path.join(ROOT, "public", "data", "graz-streets.json")

UA = "jjk-academy-site/1.0 (einmaliger Kartenbau; kontakt ueber jjk.academy)"
OVERPASS = "https://overpass-api.de/api/interpreter"

RADIUS = 3150.0   # weiteste Sicht in Metern
INNER = 1000.0    # ab hier zeichnet der Nahbereich
BLD = 480.0       # so weit reichen die Gebaeudegrundrisse

MAJOR = "motorway|trunk|primary"
MID = "secondary|tertiary"
MINOR = "residential|unclassified|living_street|service"
PATH = "footway|path|cycleway|steps|track|pedestrian"


def post(query, name):
    """Eine Overpass-Abfrage, gecacht. GET beantwortet der Server mit 406."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name + ".json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    req = urllib.request.Request(
        OVERPASS,
        data=urllib.parse.urlencode({"data": query}).encode(),
        headers={"User-Agent": UA},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.loads(r.read().decode())
            break
        except Exception as exc:  # noqa: BLE001
            if attempt == 2:
                raise
            print(f"  {name}: {exc} — noch einmal in 20 s", file=sys.stderr)
            time.sleep(20)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh)
    return data


def geocode(address):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": address, "format": "jsonv2", "limit": 1}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        hits = json.load(r)
    if not hits:
        raise SystemExit(f"Keine Koordinaten fuer {address!r}")
    return float(hits[0]["lat"]), float(hits[0]["lon"])


def projector(lat0, lon0):
    """Meter ab Mittelpunkt, in Bildschirmrichtung: x nach Osten, y nach SUEDEN.

    y zeigt nach unten, weil der Zeichner die Werte direkt als Leinwand-
    koordinaten nimmt. Eine Umrechnung im Zeichner waere eine Stelle mehr, an
    der ein Vorzeichen falsch sein kann.
    """
    mx = 111320.0 * math.cos(math.radians(lat0))

    def to_xy(lat, lon):
        return ((lon - lon0) * mx, -(lat - lat0) * 110540.0)

    return to_xy


def simplify(pts, eps):
    """Douglas-Peucker. Ohne das ist die Datei viermal so gross, ohne dass man
    auf dem Schirm einen Unterschied saehe."""
    if len(pts) < 3:
        return pts
    ax, ay = pts[0]
    bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    span = math.hypot(dx, dy)
    worst, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        if span < 1e-9:
            d = math.hypot(px - ax, py - ay)
        else:
            d = abs(dy * px - dx * py + bx * ay - by * ax) / span
        if d > worst:
            worst, idx = d, i
    if worst <= eps:
        return [pts[0], pts[-1]]
    return simplify(pts[: idx + 1], eps)[:-1] + simplify(pts[idx:], eps)


def clip(pts, limit):
    """Was ganz ausserhalb liegt, faellt weg; der Rest bleibt ganz. Ein Weg an
    der Grenze wird nicht zerschnitten — der Zeichner blendet den Rand ohnehin
    weich aus, ein sauberer Schnitt waere Arbeit fuer nichts."""
    out, run = [], []
    for x, y in pts:
        if math.hypot(x, y) <= limit:
            run.append((x, y))
        else:
            if len(run) > 1:
                out.append(run)
            run = []
    if len(run) > 1:
        out.append(run)
    return out


def lines(elements, to_xy, limit, eps):
    res = []
    for el in elements:
        geom = el.get("geometry")
        if not geom:
            continue
        pts = [to_xy(p["lat"], p["lon"]) for p in geom]
        for part in clip(pts, limit):
            s = simplify(part, eps)
            if len(s) > 1:
                res.append([round(v, 1) for xy in s for v in xy])
    return res


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else None
    if not address:
        raise SystemExit(__doc__)
    lat0, lon0 = geocode(address)
    print(f"Mittelpunkt: {lat0:.6f}, {lon0:.6f}")
    to_xy = projector(lat0, lon0)
    here = f"{lat0:.6f},{lon0:.6f}"

    def q(body, name):
        return post(f"[out:json][timeout:180];({body});out geom;", name)

    near = q(f'way["highway"~"^({MAJOR}|{MID}|{MINOR}|{PATH})(_link)?$"](around:{INNER},{here});', "near")
    wide = q(f'way["highway"~"^({MAJOR}|{MID})(_link)?$"](around:{RADIUS},{here});', "wide")
    rail = q(f'way["railway"~"^(rail|light_rail|tram|subway|narrow_gauge)$"](around:{RADIUS},{here});', "rail")
    water = q(
        f'way["natural"="water"](around:{RADIUS},{here});'
        f'way["waterway"~"^(river|stream|canal)$"](around:{RADIUS},{here});',
        "water",
    )
    blds = q(f'way["building"](around:{BLD},{here});', "bld")

    def bucket(data, names):
        pat = set(names.split("|"))
        return [
            el
            for el in data["elements"]
            if (el.get("tags", {}).get("highway", "").replace("_link", "")) in pat
        ]

    layers = {
        "major": lines(bucket(near, MAJOR), to_xy, INNER, 2.0),
        "mid": lines(bucket(near, MID), to_xy, INNER, 2.0),
        "minor": lines(bucket(near, MINOR), to_xy, INNER, 2.0),
        "path": lines(bucket(near, PATH), to_xy, INNER, 2.5),
        "far": lines(wide["elements"], to_xy, RADIUS, 6.0),
        "rail": lines(rail["elements"], to_xy, INNER, 2.5),
        "farrail": lines(rail["elements"], to_xy, RADIUS, 8.0),
        "water": lines(water["elements"], to_xy, INNER, 2.5),
        "farwater": lines(water["elements"], to_xy, RADIUS, 8.0),
        "bld": lines(blds["elements"], to_xy, BLD, 1.0),
    }

    # Das eigene Haus: der Grundriss, der den Punkt enthaelt, sonst der
    # naechstgelegene. Ein Geokoder trifft eine Adresse auf ein paar Meter
    # genau, also ist "enthaelt" nicht immer wahr.
    home, best = None, 1e9
    for el in blds["elements"]:
        geom = el.get("geometry") or []
        pts = [to_xy(p["lat"], p["lon"]) for p in geom]
        if len(pts) < 3:
            continue
        inside = False
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 > 0) != (y2 > 0) and 0 < (x1 + (0 - y1) / (y2 - y1) * (x2 - x1)):
                inside = not inside
        d = 0.0 if inside else min(math.hypot(x, y) for x, y in pts)
        if d < best:
            best, home = d, [round(v, 1) for xy in pts for v in xy]
    print(f"Eigenes Gebaeude: {best:.1f} m vom Geokoder-Punkt, {len(home)//2} Ecken")

    out = {
        "note": "OpenStreetMap (ODbL), einmalig geholt und eingebacken. Kein Aufruf zur Laufzeit.",
        "attribution": "© OpenStreetMap contributors",
        "address": address,
        "center": [round(lon0, 7), round(lat0, 7)],
        "inner": INNER,
        "radius": RADIUS,
        "layers": layers,
        "home": home,
        "marks": [],  # von Hand gesetzt, siehe pick-marks.py
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    for k, v in layers.items():
        print(f"  {k:9s} {len(v):5d}")
    print(f"{OUT}: {os.path.getsize(OUT)/1024:.0f} KB")


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main()
