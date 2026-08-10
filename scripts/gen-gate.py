"""Das Tor — ein fremdes Bild, in unsere Gradierung gezogen.

!! LIZENZ VOR DEM LIVEGANG PRUEFEN !!
Die aktuelle Quelle ist gate-source-v2.jpg, ein Pavillon im Nebel, vom
Auftraggeber geliefert. Woher sie stammt, ist hier nicht dokumentiert — das
muss vor der Veroeffentlichung geklaert sein. Das Skript bleibt dabei
unveraendert, es zeigt nur woandershin.
(Die Vorgaengerin war ein Anime-Wallpaper von wallpaperflare.com. Solche Seiten
verteilen Material, an dem sie keine Rechte haben, und fuer eine Seite, die
Mitgliedschaften verkauft, ist das ein Abmahnrisiko.)

── Wozu ─────────────────────────────────────────────────────────────────────
Der Hero ist kein gerechnetes Bild mehr, sondern eine Aufnahme. Was dieses
Skript tut, ist deshalb absichtlich WENIG: die Qualitaet soll aus der Quelle
kommen und nicht aus einer Formel. Es passiert genau dreierlei —

  1  Alles, was nicht warm ist, verliert seine Farbe. Der blaue Nachthimmel
     wird zu Nacht statt zu Blau. Danach fuehrt die Seite wieder genau zwei
     Farben: das Dunkle und den Zinnober.
  2  Das Bild wird in zwei Ebenen ZERLEGT statt abgedunkelt: die kalte Platte
     (Architektur, Stein, Struktur) und das Licht (Feuer, Glut, leuchtende
     Kanten). Damit kann der Scroll das Feuer anfachen, ohne dass ein zweites
     Bild geladen wird — dieselbe Aufteilung wie bei jeder anderen Flaeche
     dieser Seite.
  3  Beides wird ZU HELL gespeichert und in CSS mit `brightness()`
     heruntergezogen.

Punkt 3 ist kein Detail, sondern die Lehre aus dem letzten Anlauf. Das
Papier-Hero wurde mit einem Mittelwert von 26 von 255 gespeichert, nutzte also
zehn Prozent des Wertebereichs, und WebP quantisiert darin in eine Handvoll
Stufen: Baender, weiche Raender, kein Korn. Die Wand und die vier Tafeln machen
es seit jeher richtig (`WALL_GAIN`, `filter: brightness(0.4)`), und diese Datei
macht es genauso.

    python3 scripts/gen-gate.py [quelle.jpg]
"""
import os
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC = os.path.join(_ROOT, "_scout", "assets", "gate-source-v2.jpg")
OUT_COLD = os.path.join(_ROOT, "public", "img", "gate-cold.webp")
OUT_GLOW = os.path.join(_ROOT, "public", "img", "gate-glow.webp")
# Die dritte Ausgabe: beide Platten bereits gemischt. Der Glass-Cursor im Hero
# (components/glass-cursor.tsx) nimmt EINE Textur, nicht zwei — also wird das
# Screening hier gemacht statt im Browser. Der Preis ist, dass das Feuer nicht
# mehr per Scroll angefacht werden kann; bei einem Motiv ohne Feuer kostet das
# nichts.
OUT_HERO = os.path.join(_ROOT, "public", "img", "gate-hero.webp")
if len(sys.argv) > 1:
    SRC = sys.argv[1]

# Die Ausgabebreite. Groesser als die Quelle waere gelogen — hochgerechnete
# Pixel sehen unter dem Nebel genauso weich aus wie ohne ihn.
MAX_W = 2400

# ── Die Farbe ───────────────────────────────────────────────────────────────
# `warm` ist der einzige Farbtraeger, der ueberlebt. Alles andere — Blau,
# Violett, das Gruen von Baeumen — geht auf Neutral, und Neutral ist hier ein
# sehr dunkles Warmgrau, kein Grau.
WARM_LIFT = 0.030      # ab welcher Rot-ueber-Blau-Differenz etwas warm heisst
WARM_GAIN = 5.5
# 0.30 statt 0.62: das aktuelle Motiv ist ein Pavillon im Nebel und damit
# fast vollstaendig unbunt. Ein starkes Abdunkeln des kalten Anteils haette
# hier das ganze Bild getroffen, nicht nur einen blauen Himmel.
SKY_DROP = 0.30        # wie stark der kalte Teil zusaetzlich abgedunkelt wird
NEUTRAL = (1.00, 0.845, 0.735)

# ── Die Trennung in Platte und Licht ────────────────────────────────────────
# Die Schwelle ist der einzige wirklich heikle Wert: zu tief, und die halbe
# Architektur wandert ins Licht und flackert beim Anfachen mit; zu hoch, und
# das Feuer hat keinen Koerper.
LIGHT_LO = 0.42        # ab hier zaehlt Helligkeit als Licht
LIGHT_HI = 0.86        # ab hier ist es reines Licht
GLOW_RADII = (0.003, 0.012, 0.045, 0.130)
GLOW_WEIGHTS = (0.40, 0.28, 0.20, 0.14)

# ── Die Gradierung ──────────────────────────────────────────────────────────
# Zielwerte NACH dem CSS-Faktor. Die Datei selbst wird um STORE_GAIN heller
# gespeichert; `filter: brightness(1/STORE_GAIN)` zieht sie im Browser wieder
# herunter, und dazwischen liegt der volle Wertebereich statt eines Zehntels.
# Heller als Wand (5.8-10.6) und Tafeln (6.9-12.3), und das ist kein Verstoss
# gegen die Regel, sondern ihre Anwendung: ueber die Wand zieht der Leser eine
# Fackel, dieses Bild muss ohne eine auskommen. Bei 17 war der erste Eindruck
# der Seite eine schwarze Flaeche mit einem Titel darauf — gemessen an einem
# Screenshot, nicht geschaetzt.
TARGET_MEAN = 34.0
STORE_GAIN = 3.2
CONTRAST = 1.18        # leichte S-Kurve, damit die Nacht Nacht bleibt
VIGNETTE = 0.22

SIZE_TARGET_KB = {"cold": 320, "glow": 200, "hero": 380}
K = np.array([0.2126, 0.7152, 0.0722], np.float32)


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
    ph, pw = min(int(s * 3) + 1, h - 1), min(int(s * 3) + 1, w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    return blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def save(path, arr, key, W, H):
    im = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), "RGB")
    for q in (92, 86, 80, 72, 64):
        im.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= SIZE_TARGET_KB[key]:
            break
    l = arr @ K
    print("  %-18s %dx%d  %4.0f KB q%d   gespeichert %5.1f  im Browser %5.1f"
          % (os.path.basename(path), W, H, kb, q, l.mean() * 255,
             l.mean() * 255 / STORE_GAIN))


im = Image.open(SRC).convert("RGB")
W0, H0 = im.size
W = min(MAX_W, W0)
H = int(round(H0 * W / W0))
art = np.asarray(im.resize((W, H), Image.LANCZOS), np.float32) / 255.0
del im

lum = art @ K
warm = np.clip((art[..., 0] - art[..., 2] - WARM_LIFT) * WARM_GAIN, 0, 1)

# ── Die kalte Platte ───────────────────────────────────────────────────────
# Struktur, nichts als Struktur. Der kalte Teil des Bildes wird zusaetzlich
# gedaempft, damit der Nachthimmel nicht als zweite Farbe stehenbleibt.
base = lum * (1.0 - SKY_DROP * (1.0 - warm))
# Eine S-Kurve um den Median: die Nacht wird Nacht, das Getroffene bleibt
# getroffen. Ohne sie wird jedes Abdunkeln zu Grau.
m = float(np.median(base))
base = np.clip(m + (base - m) * CONTRAST, 0, 1)
# Ein Hauch Schaerfe gegen das Weichzeichnen der Verkleinerung. Mehr waere
# Bildbearbeitung, und die soll hier nicht stattfinden.
base = np.clip(base + (base - mblur(base, 1.4)) * 0.35, 0, 1)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rr = np.sqrt(((xx / W - 0.5) * 1.08) ** 2 + ((yy / H - 0.5) * 1.14) ** 2)
vig = 1.0 - VIGNETTE * smoothstep((rr - 0.20) / 0.50)
base = base * vig

# Der Farbton der Flaeche: das Warme behaelt einen Rest eigener Farbe, das
# Kalte bekommt den neutralen Ton der ganzen Seite.
# Warm allein reicht nicht: nach dem Entsaettigen war die halbe Aufnahme
# sepia, weil 63 % der Flaeche irgendwie warm sind. Was den Zinnober traegt,
# ist nicht Waerme, sondern SAETTIGUNG — der Lack des Tores ist kraeftig rot,
# Stein und Holz sind es nicht. Also entscheidet die Chroma, wer Farbe behaelt.
chroma_max = art.max(axis=-1)
sat = (chroma_max - art.min(axis=-1)) / np.maximum(chroma_max, 1e-4)
red = np.clip((sat - 0.22) * 2.4, 0, 1) * warm
tint = np.stack([
    NEUTRAL[0] + 0.00 * red,
    NEUTRAL[1] - 0.10 * warm - 0.34 * red,
    NEUTRAL[2] - 0.18 * warm - 0.46 * red,
], axis=-1)
cold = base[..., None] * tint
cold = cold * (TARGET_MEAN / 255.0) / max(float((cold @ K).mean()), 1e-6)
cold_stored = np.clip(cold * STORE_GAIN, 0, 1)

# ── Das Licht ──────────────────────────────────────────────────────────────
# Was hell UND warm ist, ist Feuer. Was hell und kalt ist (der Mond, ein
# Fensterglas), zaehlt zu einem Drittel mit — es leuchtet ja auch.
lit = smoothstep((lum - LIGHT_LO) / (LIGHT_HI - LIGHT_LO))
core = lit * (0.34 + 0.66 * warm)
halo = sum(mblur(core, max(1.0, H * r)) * w for r, w in zip(GLOW_RADII, GLOW_WEIGHTS))
halo = halo / max(float(np.percentile(halo, 99.6)), 1e-6)
g = np.clip(core * 0.90 + halo * 0.85, 0, 1.5)

# Dieselbe Rampe wie ueberall: bei wenig Licht fast reiner Zinnober, im Kern
# nach Orange und zuletzt nach Weissgelb.
glow = np.stack([
    np.clip(g * 0.96, 0, 1),
    np.clip(np.power(g, 2.10) * 0.46, 0, 1),
    np.clip(np.power(g, 3.60) * 0.20, 0, 1),
], axis=-1)
glow_stored = np.clip(glow * 1.0, 0, 1)   # das Licht wird nicht skaliert:
                                          # es liegt im `screen` und traegt
                                          # seinen Wertebereich selbst.

print("Tor  (Quelle %dx%d)" % (W0, H0))
save(OUT_COLD, cold_stored, "cold", W, H)
save(OUT_GLOW, glow_stored, "glow", W, H)
print("  warm %.1f %% der Flaeche  |  Licht %.1f %%  |  CSS: brightness(%.3f)"
      % (float((warm > 0.5).mean()) * 100, float((lit > 0.5).mean()) * 100,
         1.0 / STORE_GAIN))

# ── Die gemischte Platte ───────────────────────────────────────────────────
# `screen` von Licht auf Struktur, genau wie es der Browser bisher gemacht hat
# (Faktor 0.42 auf dem Licht — voll aufgeschlagen war der Hero eine Blendung).
# Gespeichert wird wieder ZU HELL: `filter: brightness(0.312)` auf dem Canvas
# zieht es herunter, und dazwischen liegt der volle Wertebereich statt eines
# Zehntels. Das ist dieselbe Regel wie ueberall, und ihre Missachtung hat den
# Papier-Hero in Baender zerfallen lassen.
hero = 1 - (1 - cold_stored) * (1 - np.clip(glow_stored * 0.42, 0, 1))
save(OUT_HERO, np.clip(hero, 0, 1), "hero", W, H)
