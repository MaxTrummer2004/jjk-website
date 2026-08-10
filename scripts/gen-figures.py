"""Die Bilder in der Galerie und in den vier Ovalen: Menschen, die ringen.

── Was hier vorher stand ────────────────────────────────────────────────────
Platzhalter. Zwoelf gleiche Karten mit je einem Kanji in einem duennen Oval,
einer Nummer und dem Wort MOCK darunter; und in den vier Ovalen der
Taschenlampen-Sektion dasselbe in gross. Zwoelfmal dieselbe Zeichnung ist keine
Galerie, sie ist eine Fehlermeldung mit Serifen.

── Was jetzt darin ist, und warum keine Fotos ───────────────────────────────
Fotografien dieses Raums waeren die richtige Antwort und sind die einzige, die
hier nicht zu haben ist: von diesem Rechner aus laesst sich kein Bildmaterial
beschaffen, und erfundene Bilder einer Halle, die es so nicht gibt, waeren eine
Behauptung, die die Seite nicht deckt.

Was zu haben ist, ist besser als ein Platzhalter und schlechter als eine
Fotografie: fuenf gemeinfreie Blaetter, auf denen Menschen genau das tun, worum
es geht. Der Hokusai-Manga-Band sechs zeigt vier Jujutsu-Lagen — einen Griff von
hinten, eine Bodenlage, einen Stand, einen Seilaufstieg. Die drei Sumo-Blaetter
zeigen Klammern, Griffe am Guertel, verschraenkte Koerper. Das sind keine
Symbole fuer Ringen, das sind Bilder von Ringen.

Und sie gehen durch dieselbe Gradierung wie alles andere auf dieser Seite. Die
Galerie liegt in einem Raum, den man mit einer Fackel liest — ein helles Foto
darin waere ein Loch in der Wand.

── Warum Ausschnitt und nicht ganzes Blatt ─────────────────────────────────
Ein ganzes Blatt hat einen Rand, eine Signatur, ein Siegel und viel Papier. In
einer Galeriekachel liest sich das als Reproduktion — als Bild EINES BILDES.
Der Ausschnitt auf zwei Koerper, ein Bein, einen Griff liest sich als
Aufnahme. Deshalb ist jeder Eintrag unten ein Mittelpunkt und ein Zoom, kein
Rechteck: das Zielformat entscheidet ueber die Kanten, und dieselbe Stelle
funktioniert dann im Hoch- wie im Querformat.

Quellen, alle gemeinfrei, Belege in _scout/assets/SOURCES.md:
  met-55144   Katsukawa Shun'ei, Onogawa und Tanikase, um 1795
  met-39719   Katsukawa Shunsho, Die Ringer, um 1785
  met-931213  Utagawa Kuniyoshi, Sumo-Ringer mit Schiedsrichter, 1847-52
  met-37189   Katsushika Hokusai, Takaneyama und Sendagawa, um 1790-93
  hokusai     Hokusai Manga Band 6, 1817, Kampfkunst-Seite
"""
import os
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC = os.path.join(_ROOT, "_scout", "assets")
OUT = os.path.join(_ROOT, "public", "img")
if len(sys.argv) > 1:
    SRC = sys.argv[1]
if len(sys.argv) > 2:
    OUT = sys.argv[2]

FILES = {
    "onogawa": "met-55144-onogawa-tanikase.jpg",
    "shunsho": "met-39719-shunsho-wrestlers.jpg",
    "kuniyoshi": "met-931213-kuniyoshi-sumo.jpg",
    "hokusai": "hokusai-manga-vol6-martial.jpg",
    "takaneyama": "met-37189-hokusai-sumo.jpg",
}

# name, quelle, mittelpunkt x, mittelpunkt y, zoom (Anteil der kurzen Kante)
GALLERY = [
    ("mock-1", "onogawa", 0.50, 0.26, 1.05),   # die Klammer, zwei Koepfe
    ("mock-2", "hokusai", 0.27, 0.26, 0.62),   # Griff von hinten
    ("mock-3", "shunsho", 0.28, 0.52, 0.78),   # der sich beugende Ringer
    ("mock-4", "kuniyoshi", 0.50, 0.44, 0.98),  # der zentrale Griff
    ("mock-5", "onogawa", 0.38, 0.56, 1.15),   # Ruecken und Guertel
    ("mock-6", "hokusai", 0.28, 0.80, 0.55),   # Bodenlage
    ("mock-7", "shunsho", 0.72, 0.58, 0.72),   # der kauernde Ringer
    ("mock-8", "takaneyama", 0.50, 0.44, 0.92),  # Takaneyama und Sendagawa
    ("mock-9", "onogawa", 0.55, 0.74, 1.10),   # Stand, Beine
    ("mock-10", "hokusai", 0.70, 0.80, 0.52),  # weiter Stand
    ("mock-11", "takaneyama", 0.50, 0.68, 0.80),  # Stand und Guertel
    ("mock-12", "kuniyoshi", 0.42, 0.30, 0.62),  # Kopf an Kopf
]

OVALS = [
    ("hand-sign-1", "hokusai", 0.27, 0.27, 0.60),
    ("hand-sign-2", "onogawa", 0.50, 0.29, 0.98),
    ("hand-sign-3", "shunsho", 0.50, 0.52, 0.92),
    ("hand-sign-4", "hokusai", 0.28, 0.80, 0.56),
]

GALLERY_SIZE = (900, 1200)   # Hochformat, wie die Kacheln es erwarten
OVAL_SIZE = (1400, 1050)     # Querformat, wie die Ovale es erwarten

# ── Konstanten, woertlich aus gen-wall.py / gen-scroll-plates.py ───────────
LIGHT_RADII = (0.032, 0.092, 0.25)
LIGHT_WEIGHTS = (0.44, 0.34, 0.30)
LIGHT_FLOOR_PCT = 40
INK_GAIN = 6.5
PAPER_GRAIN = 1.2
LIGHT_MIX = dict(ink=0.72, red=0.18, green=0.30, body=0.34)
BODY_GAIN = 1.35
BODY_BLUR = 2.5

# ── Die zwei Zahlen, die hier anders sind ─────────────────────────────────
# INK_LIGHT_GAIN: die Wand laeuft auf 1.7, weil sie Hintergrund ist; der Hero
# auf 3.5, weil er das Bild ist. Diese hier sind Bilder in einer Galerie, die
# man ansieht — also 3.5. Bei 1.7 blieben von einem Ringer die Umrisse und
# sonst nichts.
INK_LIGHT_GAIN = 3.5
# body von 0.16 auf 0.34, und das ist der Unterschied zwischen einer Zeichnung
# und einem Koerper. `ink` ist oertlicher Kontrast, findet also Umrisse; ein
# Holzschnitt besteht fast nur aus Umrissen, und bei 0.16 leuchteten genau die
# Linien und sonst nichts — zwoelf Neonschnitte auf Schwarz. `body` misst, wie
# viel dunkler als das blanke Papier eine Stelle ist, tiefpassgefiltert: das
# ist die Masse zwischen den Linien.
#
# Und wie hell das fertige Bild steht. Der Wand-Mittelwert liegt bei 16 von
# 255; das ist richtig fuer eine Flaeche hinter Schrift und falsch fuer eine
# Fotografie an der Wand daneben. 30 ist gemessen der Punkt, an dem die Koerper
# lesbar sind und die Kachel trotzdem im selben Raum haengt — 46 war der erste
# Versuch und kippte ins Neon, weil der Regler dafuer bis auf das Sechsfache
# aufdrehen musste. Deshalb steht er jetzt bei 3.0 an; ein Blatt, das sein Ziel
# nur mit mehr erreichen wuerde, bleibt lieber dunkel.
TARGET_MEAN = 30.0
LIGHT_MAX = 3.0
SIZE_TARGET_KB = 150


def blur(x, s):
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
    h, w = x.shape[:2]
    ph, pw = min(int(s * 3), h - 1), min(int(s * 3), w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    return blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)[ph:ph + h, pw:pw + w]


_cache = {}


def load(key):
    if key not in _cache:
        _cache[key] = Image.open(os.path.join(SRC, FILES[key])).convert("RGB")
    return _cache[key]


def cut(key, cx, cy, zoom, size):
    """Der groesste Ausschnitt im Zielformat um (cx, cy), zoom-mal die kurze
    Kante hoch, am Blattrand angehalten statt darueber hinaus."""
    im = load(key)
    W, H = im.size
    short = min(W, H)
    ch = min(H, short * zoom)
    cw = ch * size[0] / size[1]
    if cw > W:
        cw = W
        ch = cw * size[1] / size[0]
    x = min(max(cx * W - cw / 2, 0), W - cw)
    y = min(max(cy * H - ch / 2, 0), H - ch)
    box = im.crop((int(x), int(y), int(x + cw), int(y + ch)))
    return np.asarray(box.resize(size, Image.LANCZOS), np.float32) / 255.0


def grade(art, size):
    H = size[1]

    # 2 · die Beleuchtung der Aufnahme flachziehen
    lf = mblur(art, H / 3)
    art = np.clip(art - lf + np.median(lf.reshape(-1, 3), axis=0), 0, 1)

    # 3 · Tusche und Pigment aus derselben Aufnahme
    paper_tone = np.median(art.reshape(-1, 3), axis=0)
    dev = art - paper_tone
    lum = 0.2126 * art[..., 0] + 0.7152 * art[..., 1] + 0.0722 * art[..., 2]

    highpass = mblur(lum, H / 50) - lum
    ink = np.clip(highpass * INK_GAIN, 0, 1)
    ink_light = np.clip(highpass * INK_LIGHT_GAIN, 0, 1)
    redder = np.clip((dev[..., 0] - dev[..., 2] - 0.07) * 11.0, 0, 1)
    greener = np.clip((dev[..., 1] - dev[..., 0] - 0.05) * 11.0, 0, 1)

    paper_lum = float(np.median(lum))
    body = mblur(np.clip((paper_lum - lum) / max(paper_lum, 1e-6) * BODY_GAIN, 0, 1),
                 BODY_BLUR)
    drawing = np.clip(np.maximum(ink, np.maximum(redder, greener)), 0, 1)

    # 4 · das Papier, ohne das Bild darauf
    hole = np.clip(drawing * 2.2, 0, 1)[..., None]
    keep = 1.0 - hole
    paper = np.where(hole > 0.03,
                     mblur(art * keep, H / 27) / (mblur(keep, H / 27) + 1e-4),
                     art)

    # 5 · die kalte Platte
    plum = 0.2126 * paper[..., 0] + 0.7152 * paper[..., 1] + 0.0722 * paper[..., 2]
    det = mblur(plum, PAPER_GRAIN) - mblur(plum, H / 78)
    base = np.clip(0.050 + det * 1.35, 0, 1)
    cold = np.stack([base * 1.25, base * 1.02, base * 0.86], axis=-1)
    cold *= 1 - ink[..., None] * 0.42

    # 6 · das Licht
    core = np.clip(ink_light * LIGHT_MIX["ink"] + redder * LIGHT_MIX["red"]
                   + greener * LIGHT_MIX["green"] + body * LIGHT_MIX["body"], 0, 1)
    lit = sum(mblur(core, max(1.0, H * r)) * w
              for r, w in zip(LIGHT_RADII, LIGHT_WEIGHTS))
    d = max(float(np.percentile(lit, 99.9)), 1e-6)
    lit = lit / d
    f = float(np.percentile(lit, LIGHT_FLOOR_PCT))
    lit = np.clip(np.power(np.clip((lit - f) / max(1e-6, 1.0 - f), 0, 1), 1.15), 0, 1)

    halo = (mblur(core, 5) * 0.34 + mblur(core, 18) * 0.22
            + mblur(core, 60) * 0.16 + mblur(core, H * 0.075) * 0.10)
    halo *= np.clip(lit * 2.5, 0, 1)          # das Tor — siehe gen-scroll-plates
    g = np.clip(core * 0.92 + halo, 0, 1.25)
    glow = np.stack([g * 0.78, np.power(g, 1.7) * 0.26, np.power(g, 2.6) * 0.09], axis=-1)

    # 7 · beides in EIN Bild, weil hier nur eine Datei hingeht
    #
    # Wand und Hero halten kalte Platte und Licht getrennt, weil sie im Browser
    # uebereinandergelegt und einzeln gefahren werden. Eine Galeriekachel ist
    # ein `<img>`; also wird hier dieselbe Rechnung gemacht, die das CSS sonst
    # macht — Bildschirm-Verknuepfung, die nur addieren kann —, und das
    # Ergebnis gespeichert.
    K = np.array([0.2126, 0.7152, 0.0722], np.float32)
    lo, hi = 0.1, LIGHT_MAX
    for _ in range(40):
        k = (lo + hi) / 2
        out = 1 - (1 - cold) * (1 - np.clip(glow * k, 0, 1))
        if (out @ K).mean() * 255 < TARGET_MEAN:
            lo = k
        else:
            hi = k
    out = np.clip(1 - (1 - cold) * (1 - np.clip(glow * k, 0, 1)), 0, 1)
    return out, k


def write(name, arr):
    path = os.path.join(OUT, name + ".jpg")
    im = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), "RGB")
    for q in (86, 80, 74, 68, 60, 52):
        im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
        kb = os.path.getsize(path) / 1024
        if kb <= SIZE_TARGET_KB:
            break
    return q, kb


K = np.array([0.2126, 0.7152, 0.0722], np.float32)
os.makedirs(OUT, exist_ok=True)
for group, size in ((GALLERY, GALLERY_SIZE), (OVALS, OVAL_SIZE)):
    for name, key, cx, cy, zoom in group:
        art = cut(key, cx, cy, zoom, size)
        out, k = grade(art, size)
        q, kb = write(name, out)
        l = out @ K
        print("%-12s %-10s %3.0f KB q%d   Mittel %4.1f  sd %4.1f  Licht x%.2f"
              % (name, key, kb, q, l.mean() * 255, l.std() * 255, k))
