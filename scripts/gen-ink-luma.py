"""Luma-Karte fuer den Tusche-Seitenuebergang.

Quelle: "Splashed-Ink Landscape" von Bokusho Shusho, Tusche auf Papier,
gemeinfrei (CC0). Metropolitan Museum of Art, Objekt 53228.
https://www.metmuseum.org/art/collection/search/53228

Der Shader (components/ink-canvas.tsx) liest aus dieser Karte, WANN ein Pixel
gedeckt wird: dunkel zuerst, hell zuletzt. Die Form des Uebergangs ist damit
die Form dessen, was hier drinsteht.

── Was an der ersten Fassung falsch war ────────────────────────────────────
Sie hat die Museumsaufnahme als Ganzes genommen: 2998 x 4000 Pixel, und darauf
ist nicht nur die Malerei zu sehen, sondern auch die Montage der Rolle und der
dunkle Hintergrund des Fotostudios — zwei breite, fast gleichmaessig dunkle
Balken links und rechts vom Bildfeld. Dunkel heisst "zuerst dran", also deckte
der Uebergang als Erstes zwei riesige Rechtecke zu. Das waren die Quadrate.

Dazu kam die Reihenfolge der Rechenschritte: das Histogramm wurde
gleichverteilt, BEVOR weichgezeichnet wurde. Gleichverteilung spreizt kleine
Unterschiede auf den vollen Wertebereich — auch die 8x8-Bloecke, die die
JPEG-Kompression in den flachen Papierflaechen hinterlaesst. Aus unsichtbaren
Kompressionsartefakten wurden dadurch sichtbare Kacheln, und der Weichzeichner
danach konnte sie nur noch verwischen, nicht mehr entfernen.

── Was diese Fassung anders macht ──────────────────────────────────────────
1  BILDFELD AUSSCHNEIDEN. Nur die Malerei, ohne Montage und Studiohintergrund.
2  QUERSTELLEN. Die Rolle ist hochformatig, der Bildschirm ist breit. Gedreht
   passt der Ausschnitt ohne Quetschen — und eine um 90 Grad gedrehte
   Landschaft liest sich nicht mehr als Landschaft, sondern als das, was sie
   hier sein soll: Tuschestruktur.
3  ERST ENTBLOCKEN, DANN SPREIZEN. Ein leichter Weichzeichner vor der
   Gleichverteilung nimmt den JPEG-Bloecken die Kanten, bevor irgendetwas sie
   verstaerken kann.
4  RICHTUNG EINRECHNEN. Ein Verlauf von oben rechts, also von dort, wo der
   Knopf steht, der diesen Uebergang ausloest. Ohne ihn bricht die Tusche
   ueberall gleichzeitig auf und liest sich als Flimmern statt als Bewegung.

    python3 scripts/gen-ink-luma.py
"""
import os
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))

SRC = os.path.join(_ROOT, "_scout", "assets", "ink-luma-source.jpg")
OUT = os.path.join(_ROOT, "public", "img", "ink-luma.webp")

# Das Bildfeld in Anteilen der Aufnahme — alles ausserhalb ist Montage und
# Studiohintergrund. Von Hand an der Aufnahme abgelesen.
CROP = (0.250, 0.052, 0.756, 0.958)   # links, oben, rechts, unten

W, H = 1280, 800

DEBLOCK = 2.2        # Weichzeichner VOR der Spreizung — gegen JPEG-Bloecke
FINAL_BLUR = 3.4     # Weichzeichner danach — gegen Pixelkanten an der Front
INSET = 0.018        # Sicherheitsstreifen: der Rand der Malerei ist nie sauber
GRADIENT = 0.38      # Anteil des Richtungsverlaufs
SIZE_TARGET_KB = 110


def blur(x, s):
    """Gauss ueber FFT, gespiegelt gepolstert."""
    h, w = x.shape
    ph = min(int(s * 3) + 1, h - 1)
    pw = min(int(s * 3) + 1, w - 1)
    p = np.pad(x, ((ph, ph), (pw, pw)), mode="reflect")
    hh, ww = p.shape
    fy = np.fft.fftfreq(hh)[:, None].astype(np.float32)
    fx = np.fft.rfftfreq(ww)[None, :].astype(np.float32)
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    out = np.fft.irfft2(np.fft.rfft2(p) * k, s=(hh, ww)).astype(np.float32)
    return out[ph:ph + h, pw:pw + w]


def equalize(a):
    flat = a.ravel()
    ranks = np.argsort(np.argsort(flat))
    return (ranks / (len(flat) - 1)).reshape(a.shape).astype(np.float32)


im = Image.open(SRC).convert("L")
sw, sh = im.size
box = (
    int(CROP[0] * sw), int(CROP[1] * sh),
    int(CROP[2] * sw), int(CROP[3] * sh),
)
im = im.crop(box)
# Ein schmaler Streifen am Rand des Bildfelds gehoert noch zur Montage oder ist
# angeschnittene Farbe. Der bleibt draussen: eine dunkle Leiste laengs des
# Bildrands deckt beim Uebergang als geschlossenes Rechteck zu, und genau so
# etwas hat die erste Fassung zu Quadraten gemacht.
cw, ch = im.size
im = im.crop((
    int(cw * INSET), int(ch * INSET),
    int(cw * (1.0 - INSET)), int(ch * (1.0 - INSET)),
))
# Querstellen, dann auf Zielgroesse. Erst drehen, dann skalieren — andersherum
# wuerde einmal quer und einmal laengs unterschiedlich stark geglaettet.
im = im.transpose(Image.ROTATE_90)
im = im.resize((W, H), Image.LANCZOS)

gray = np.asarray(im, np.float32) / 255.0
del im

# 1  Entblocken, DANN spreizen. Diese Reihenfolge ist der ganze Unterschied
#    zwischen Tusche und Kacheln.
gray = blur(gray, DEBLOCK)
structure = equalize(gray)

# 2  Richtung: von oben rechts nach unten links. Dort steht der Knopf, der
#    den Uebergang ausloest — die Tusche waechst aus der Hand des Lesers.
v = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
u = np.linspace(0.0, 1.0, W, dtype=np.float32)[None, :]
d = np.sqrt(((1.0 - u) ** 2) * 0.72 + (v ** 2) * 0.28)
ramp = np.broadcast_to(d / float(d.max()), (H, W)).astype(np.float32)

luma = GRADIENT * ramp + (1.0 - GRADIENT) * structure
luma = equalize(luma)
luma = np.clip(blur(luma, FINAL_BLUR), 0.0, 1.0)

out = Image.fromarray((luma * 255).astype(np.uint8), "L")
for q in (95, 90, 84, 76):
    out.save(OUT, "WEBP", quality=q, method=6)
    kb = os.path.getsize(OUT) / 1024
    if kb <= SIZE_TARGET_KB:
        break

print("%s  %dx%d  %.0f KB q%d" % (os.path.basename(OUT), W, H, kb, q))
print("  min=%.3f median=%.3f max=%.3f" % (
    float(luma.min()), float(np.median(luma)), float(luma.max())))
