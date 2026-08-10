"""Das Papier der Eroeffnung — nacktes Blatt, vier Zeichen hineingeschnitten.

── Wozu ─────────────────────────────────────────────────────────────────────
Die Eroeffnung war ein brennender Palast mit einem Klick-Tor davor. Sie ist
jetzt ein Blatt Papier: formatfuellend, dunkel, ohne Malerei darauf, und in das
Blatt sind 柔術廻戦 GESCHNITTEN. Kein Druck, keine Praegung — eine Kerbe mit
einer nahen und einer fernen Wand, die von einem einzigen streifenden Licht so
getroffen wird, dass die zugewandte Wand schwarz bleibt und die abgewandte
einen Rest faengt. Man liest die Schrift deshalb zuerst gar nicht als Schrift,
sondern als Vertiefung.

Beim Scrollen faengt der Grund jeder Kerbe an zu gluehen, die Glut steigt im
Kanal hoch, tritt ueber die Kante und beleuchtet das Papier — und dieses Licht
ist dann das einzige auf der Seite. Genau das braucht die Fackel darunter: sie
uebernimmt eine Lichtquelle, die schon brennt, statt eine neue anzuzuenden.

── Warum drei Dateien und nicht eine ────────────────────────────────────────
Weil der Scroll zwischen ihnen ueberblendet und keine davon berechnet werden
kann, waehrend gescrollt wird. Dieselbe Aufteilung wie ueberall sonst auf
dieser Seite (kalte Platte + Licht im `screen`-Blend), nur mit einer dritten
Ebene, weil das Licht hier zwei getrennte Wege geht:

    paper-cold-<L>.webp    das Blatt und die Kerbe. Aendert sich NIE.
    paper-glow-<L>.webp    die Glut IM Kanal. Duenne Linien, sonst schwarz.
    paper-spill-<L>.webp   was das Licht AUF dem Papier anrichtet: der Halo und
                           die Faser, die erst durch das Streiflicht sichtbar
                           wird. Das Blatt war die ganze Zeit da; sichtbar wird
                           es durch die Schrift.

Beide Ebenen liegen im `mix-blend-mode: screen` ueber der kalten und werden nur
in ihrer Deckkraft gefahren — das ist der ganze Grund fuer die Aufteilung:
Deckkraft ist billig, eine Neuberechnung waere es nicht.

── Warum die Glut von selbst zuerst als Nester erscheint ────────────────────
Der wichtigste Trick der Datei, und er kostet keine vierte Ebene. Die Helligkeit
im Kanal ist nicht konstant: sie folgt `blur(glyph)`, also der DICKE des Strichs.
Wo zwei Striche sich kreuzen und wo der Pinsel breit ansetzt, ist der Wert hoch;
in duennen Auslaeufern niedrig. Faehrt man die Deckkraft dieser einen Datei von
0 hoch, erscheinen deshalb zuerst nur die dicksten Stellen — Kreuzungen, Ecken,
Ansaetze — und erst spaeter der Rest. Das ist exakt die erste Bewegung, ohne
dass irgendwo eine zweite Maske noetig waere.

── Zwei Layouts ─────────────────────────────────────────────────────────────
`wide` (16:10) setzt die vier Zeichen in eine Reihe, `tall` (2:3) in einen
Block 2x2. Ein Bild mit `object-fit: cover` behaelt seine Proportion; vier
Zeichen nebeneinander in einem Hochformat waeren briefmarkengross. CSS waehlt
per `aspect-ratio`-Query.

Quelle: _scout/assets/heiji-sanjo-complete.jpg — Heiji Monogatari Emaki,
Naechtlicher Ueberfall auf den Sanjo-Palast, 13. Jh., MFA Boston, gemeinfrei.
Genommen wird der ANFANG der Rolle, wo sie noch leer ist: dort ist die Seide
ueber die ganze Bildhoehe unbemalt, und was bleibt, sind Faser, Stockflecken
und die Knicke vom Aufgerolltsein — eine Textur, die niemand haette zeichnen
koennen.

Schrift: Shippori Mincho B1, Gewicht 800 — dieselbe, aus der auch
scripts/gen-kanji-paths.py die Titelpfade zieht, damit die eingeschnittenen
Zeichen und der Titel im Rest der Seite dieselben sind.

    python3 scripts/gen-paper.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC = os.path.join(_ROOT, "_scout", "assets", "heiji-sanjo-complete.jpg")
OUTDIR = os.path.join(_ROOT, "public", "img")

# Dieselbe Datei wie in gen-kanji-paths.py. Liegt sie nicht da, holt man sie
# mit `npm pack @fontsource/shippori-mincho-b1` und packt sie aus.
FONT_CANDIDATES = [
    "/tmp/shippori-800.ttf",
    "/tmp/fontdl/package/files/shippori-mincho-b1-japanese-800-normal.woff",
    os.path.join(_ROOT, "node_modules", "@fontsource", "shippori-mincho-b1",
                 "files", "shippori-mincho-b1-japanese-800-normal.woff"),
]
TEXT = "柔術廻戦"

# ── Das Fenster in der Rolle ────────────────────────────────────────────────
# Der linke Anfang: Tuschedichte 0.023 gegen 0.30 im Bildteil, gemessen ueber
# ein Raster von 16:10-Fenstern. Nicht ganz am Rand, weil dort die Montage des
# Scans liegt.
X0, X1 = 0.006, 0.108
Y0, Y1 = 0.020, 0.980

LAYOUTS = {
    # name: (Breite, Hoehe, Zeilen x Spalten, Zeichenhoehe als Anteil der Hoehe,
    #        Mitte des Blocks in y)
    "wide": (2200, 1375, (1, 4), 0.285, 0.470),
    "tall": (1200, 1800, (2, 2), 0.215, 0.455),
}

# ── Der Schnitt ─────────────────────────────────────────────────────────────
# CUT ist die Tiefe in Pixeln, BEVEL die Breite, ueber die die Kante abfaellt.
# Das Verhaeltnis der beiden IST die Steigung, die das Licht sieht — nicht die
# Tiefe fuer sich. Papier statt Stein heisst: weniger tief, weichere Kante.
# (scripts/gen-plaques.py, der Vorlaeufer fuer Stein, lief auf 44 zu 2.6.)
CUT_REL = 0.0162          # Tiefe, in Anteilen der Bildhoehe
BEVEL_REL = 0.0052        # Kantenbreite, dito
LIGHT = (-0.60, -0.66, 0.45)   # links oben, streifend. Kleines z = flach.
AMBIENT = 0.24            # wie viel Licht die Kerbe auch ohne Richtung bekommt
AO_STRENGTH = 0.62        # der Kanal sieht weniger Himmel als die Flaeche
AO_REL = 0.010

# ── Die Gradierung des Papiers ──────────────────────────────────────────────
# Das Blatt ist der hellste Ort der Seite und trotzdem dunkel: die Wand darunter
# liegt bei 5.8-10.6 von 255, das Papier bei 22. Es liegt in einem
# unbeleuchteten Zimmer — man erkennt, dass es warm und faserig ist, aber es
# gibt kein Licht darauf.
TARGET_MEAN = 26.0
PAPER_WARM = (1.00, 0.815, 0.700)   # entsaettigt warm, Richtung Zinnober
DETAIL_GAIN = 2.30        # wie stark Faser, Flecken und Knicke durchkommen
VIGNETTE = 0.34           # es gibt keine gleichmaessige Ausleuchtung

# ── Die Glut ────────────────────────────────────────────────────────────────
NEST_LO, NEST_HI = 0.30, 0.92   # Schwelle auf der Strichdicke: Nester vs. Rest
EMBER_FLOOR = 0.20              # wie hell der duennste Auslaeufer noch wird
NOISE_DEPTH = 0.42              # Kohle ist ungleich
SPILL_RADII = (0.004, 0.016, 0.055, 0.150)
SPILL_WEIGHTS = (0.34, 0.26, 0.22, 0.18)
SPILL_SURFACE = 0.95            # wie stark der Halo die Faser herausholt

SIZE_TARGET_KB = {"cold": 210, "glow": 90, "spill": 130}
K = np.array([0.2126, 0.7152, 0.0722], np.float32)


def blur(x, s):
    """Gauss im Frequenzraum — dieselbe Funktion wie in allen anderen Skripten."""
    h, w = x.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    if x.ndim == 2:
        return np.fft.irfft2(np.fft.rfft2(x) * k, s=(h, w)).astype(np.float32)
    return np.stack(
        [np.fft.irfft2(np.fft.rfft2(x[..., i]) * k, s=(h, w)) for i in range(x.shape[2])],
        axis=-1,
    ).astype(np.float32)


def mblur(x, s):
    """Wie blur, aber gespiegelt gepolstert — sonst laeuft die Kerbe am
    Bildrand in ihren eigenen Schatten auf der Gegenseite."""
    h, w = x.shape[:2]
    ph, pw = min(int(s * 3) + 1, h - 1), min(int(s * 3) + 1, w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    return blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def find_font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            if p.endswith(".woff"):
                from fontTools.ttLib import TTFont
                out = "/tmp/shippori-800.ttf"
                f = TTFont(p)
                f.flavor = None
                f.save(out)
                return out
            return p
    raise SystemExit(
        "Shippori Mincho B1 800 nicht gefunden. "
        "npm pack @fontsource/shippori-mincho-b1 und nach /tmp/fontdl auspacken."
    )


def paper_plate(W, H):
    """Das nackte Blatt: Fenster schneiden, Beleuchtung des Scans herausrechnen,
    Tuschereste wegnehmen, Faser behalten."""
    im = Image.open(SRC).convert("RGB")
    W0, H0 = im.size
    crop = im.crop((int(W0 * X0), int(H0 * Y0), int(W0 * X1), int(H0 * Y1)))
    art = np.asarray(crop.resize((W, H), Image.LANCZOS), np.float32) / 255.0
    del im, crop

    # Der Scan ist ungleich ausgeleuchtet und das ist die Lampe des Museums,
    # nicht das Blatt. Raus damit; unsere eigene Vignette kommt spaeter.
    lf = mblur(art, H / 2.6)
    art = np.clip(art - lf + np.median(lf.reshape(-1, 3), axis=0), 0, 1)
    del lf

    lum = art @ K
    # Was dunkler ist als das Papier und dabei zusammenhaengt, ist Tusche.
    # Sie wird nicht abgedunkelt, sondern GEFUELLT: der Mittelwert der
    # Umgebung, gewichtet mit dem, was kein Loch ist.
    paper_lum = float(np.median(lum))
    hole = np.clip((paper_lum - lum) * 5.5 - 0.35, 0, 1)[..., None]
    keep = 1.0 - hole
    r = H / 24
    filled = mblur(art * keep, r) / (mblur(keep, r) + 1e-4)
    art = np.where(hole > 0.02, filled, art)
    return art


def glyph_mask(W, H, rows, cols, glyph_rel, mid_y, font_path):
    """Die vier Zeichen als weiche Maske, 3-fach gerendert und heruntergerechnet.
    PIL zeichnet TrueType mit Antialiasing, aber eine Kerbe wird aus dem
    GRADIENTEN dieser Maske beleuchtet — und ein einzelnes AA-Pixel ergibt eine
    Kante, die aussieht wie mit dem Messer geschnitten. Dreifach und zurueck
    gibt der Fase Platz."""
    S = 3
    px = int(H * glyph_rel * S)
    font = ImageFont.truetype(font_path, px)
    img = Image.new("L", (W * S, H * S), 0)
    d = ImageDraw.Draw(img)

    # Die Zeichen sind quadratisch auf dem Geviert; gesetzt wird auf dem
    # Geviert, nicht auf der Tintenkontur — sonst tanzen sie in der Zeile.
    adv = px * 1.0
    gap = px * 0.16
    block_w = cols * adv + (cols - 1) * gap
    block_h = rows * adv + (rows - 1) * gap * 1.25
    x0 = (W * S - block_w) / 2
    y0 = mid_y * H * S - block_h / 2

    for i, ch in enumerate(TEXT):
        r, c = divmod(i, cols)
        cx = x0 + c * (adv + gap)
        cy = y0 + r * (adv + gap * 1.25)
        # anchor="lt" auf einer Box, die wir selbst kennen: der Ursprung der
        # Schrift ist die Grundlinie, das Geviert nicht.
        bbox = font.getbbox(ch)
        gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text((cx + (adv - gw) / 2 - bbox[0], cy + (adv - gh) / 2 - bbox[1]),
               ch, font=font, fill=255)

    m = np.asarray(img.resize((W, H), Image.LANCZOS), np.float32) / 255.0
    return np.clip(m, 0, 1)


def build(name, W, H, grid, glyph_rel, mid_y, font_path):
    rows, cols = grid
    paper = paper_plate(W, H)
    m = glyph_mask(W, H, rows, cols, glyph_rel, mid_y, font_path)

    cut = H * CUT_REL
    bevel = H * BEVEL_REL

    # ── Das Hoehenfeld ─────────────────────────────────────────────────────
    # h ist negativ im Schnitt. `blur` erledigt die Fase von selbst: an der
    # Kante faellt der Wert ueber `bevel` ab, in einem breiten Strich erreicht
    # er 1 und der Kanal hat einen Boden. Ein duenner Auslaeufer erreicht die
    # 1 nie und ist deshalb flacher — was stimmt: ein duenner Schnitt IST
    # flacher.
    depth = mblur(m, bevel)
    h = -cut * depth

    gy, gx = np.gradient(h)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    nx, ny, nz = -gx * inv, -gy * inv, inv

    lx, ly, lz = LIGHT
    ln = np.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln

    diff = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    # Auf die ebene Flaeche normiert: dort ist n = (0,0,1), also diff = lz.
    # Ohne das waere das ganze Blatt um den Faktor lz dunkler als es sein soll.
    shade = AMBIENT + (1.0 - AMBIENT) * (diff / lz)

    ao = 1.0 - AO_STRENGTH * np.clip(mblur(m, H * AO_REL) * 1.35, 0, 1)

    # ── Die kalte Platte ───────────────────────────────────────────────────
    plum = paper @ K
    # Zwei Baender, nicht eines: die feine Faser (1.2 px) und die grossen
    # Flecken und Rollknicke (H/12). Nur mit dem feinen Band sieht das Blatt
    # aus wie Beton — die Geschichte des Papiers steckt in der tiefen Frequenz.
    fine = mblur(plum, 1.2) - mblur(plum, H / 46)
    broad = mblur(plum, H / 46) - mblur(plum, H / 12)
    det = fine * 1.0 + broad * 1.35
    base = np.clip(0.42 + det * DETAIL_GAIN, 0, 1)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rr = np.sqrt(((xx / W - 0.5) * 1.05) ** 2 + ((yy / H - 0.5) * 1.15) ** 2)
    vig = 1.0 - VIGNETTE * smoothstep((rr - 0.16) / 0.52)

    lit = base * shade * ao * vig
    cold = np.stack([lit * PAPER_WARM[0], lit * PAPER_WARM[1], lit * PAPER_WARM[2]],
                    axis=-1)
    cold = cold * (TARGET_MEAN / 255.0) / max(float((cold @ K).mean()), 1e-6)
    cold = np.clip(cold, 0, 1)

    # ── Die Glut im Kanal ──────────────────────────────────────────────────
    inside = np.clip((mblur(m, bevel * 0.7) - 0.52) / 0.44, 0, 1)
    thick = mblur(m, bevel * 2.6)
    nest = smoothstep((thick - NEST_LO) / (NEST_HI - NEST_LO))

    rng = np.random.default_rng(7)
    n1 = mblur(rng.random((H, W)).astype(np.float32), H * 0.006)
    n2 = mblur(rng.random((H, W)).astype(np.float32), H * 0.020)
    noise = 0.5 + 0.5 * np.clip((n1 - n1.mean()) * 26 + (n2 - n2.mean()) * 14, -1, 1)
    noise = 1.0 - NOISE_DEPTH * (1.0 - noise)

    e = np.clip(inside * (EMBER_FLOOR + (1.0 - EMBER_FLOOR) * nest) * noise, 0, 1)

    # Die Rampe. Bei kleinem e steht fast reiner Zinnober, bei grossem geht der
    # Kern nach Orange und zuletzt nach Weissgelb — dieselbe Reihenfolge, in der
    # Kohle heiss wird, und dieselbe Farbe, die die ganze Seite sonst nur
    # tropfenweise fuehrt.
    glow = np.stack([
        np.clip(e * 1.12, 0, 1),
        np.clip(np.power(e, 2.50) * 0.50, 0, 1),
        np.clip(np.power(e, 4.20) * 0.26, 0, 1),
    ], axis=-1)

    # ── Was das Licht auf dem Papier anrichtet ─────────────────────────────
    halo = sum(mblur(e, max(1.0, H * r)) * w for r, w in zip(SPILL_RADII, SPILL_WEIGHTS))
    halo = halo / max(float(np.percentile(halo, 99.7)), 1e-6)
    halo = np.clip(halo, 0, 1.4)

    # Die Faser wird nicht heller gemalt, sondern gestreift: der Halo mal dem,
    # was auf dem Blatt ohnehin steht. Deshalb erscheint die Textur erst mit dem
    # Licht — das Blatt war die ganze Zeit da.
    surface = np.clip(0.30 + (base - 0.42) * 3.2 + 0.30, 0, 1)
    s = halo * (1.0 - SPILL_SURFACE + SPILL_SURFACE * surface)
    spill = np.stack([
        np.clip(s * 0.82, 0, 1),
        np.clip(np.power(s, 1.90) * 0.32, 0, 1),
        np.clip(np.power(s, 3.10) * 0.15, 0, 1),
    ], axis=-1)

    out = {}
    for key, arr in (("cold", cold), ("glow", glow), ("spill", spill)):
        path = os.path.join(OUTDIR, "paper-%s-%s.webp" % (key, name))
        im = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), "RGB")
        for q in (88, 80, 72, 64, 56, 48):
            im.save(path, "WEBP", quality=q, method=6)
            kb = os.path.getsize(path) / 1024
            if kb <= SIZE_TARGET_KB[key]:
                break
        l = arr @ K
        print("  %-24s %dx%d  %5.0f KB q%d   Mittel %5.1f  Spitze %5.1f"
              % (os.path.basename(path), W, H, kb, q, l.mean() * 255,
                 np.percentile(l, 99.9) * 255))
        out[key] = arr

    # Zwei Zahlen, die verraten, ob die Kerbe ueberhaupt eine ist: der
    # Unterschied zwischen der zugewandten und der abgewandten Wand.
    edge = (mblur(m, bevel) > 0.15) & (mblur(m, bevel) < 0.85)
    cl = out["cold"] @ K
    near = cl[edge & (gx > 0)].mean() * 255 if (edge & (gx > 0)).any() else 0
    far = cl[edge & (gx < 0)].mean() * 255 if (edge & (gx < 0)).any() else 0
    flat = cl[mblur(m, bevel) < 0.02].mean() * 255
    print("  Kante: zugewandt %.1f  abgewandt %.1f  Flaeche %.1f  (von 255)"
          % (near, far, flat))


if __name__ == "__main__":
    font_path = find_font()
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for name, (W, H, grid, gr, my) in LAYOUTS.items():
        if only and only != name:
            continue
        print("%s:" % name)
        build(name, W, H, grid, gr, my, font_path)
