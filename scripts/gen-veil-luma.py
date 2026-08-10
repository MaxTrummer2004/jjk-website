"""Luma-Karte fuer den Nebel-Uebergang zwischen Hero und erster Sektion.

── Was eine Luma-Karte ist ─────────────────────────────────────────────────
Der Shader (components/veil-canvas.tsx) entscheidet fuer jedes Pixel nur
eines: bist du schon dran? Die Antwort steht als Helligkeit in dieser Karte —
DUNKEL geht zuerst, HELL zuletzt. Der Uebergang sieht deshalb aus wie das
Bild, das man hineingibt, und nicht wie ein Effekt.

Vorlage: gl-transitions "luma" von gre, MIT.
https://github.com/gl-transitions/gl-transitions

── Woher die Karte kommt ───────────────────────────────────────────────────
Aus public/img/veil-smoke.webp, also aus dem Nebel, der ohnehin schon auf der
Seite liegt. Dessen Alphakanal IST eine Nebeldichte: scripts/gen-veil.py hat
sie aus dem Kontrastverlust einer Waldaufnahme gerechnet, nicht aus deren
Helligkeit. Damit ist die Form dieses Uebergangs fotografischer Nebel und
kein prozedurales Rauschen — und die Rechtelage ist dieselbe wie bisher, weil
keine neue Quelle dazukommt.

── Die drei Schritte, und warum jeder davon noetig ist ─────────────────────
1  GLEICHVERTEILEN. Die Rohdichte klumpt: der grosse Teil des Bildes liegt in
   einem schmalen Wertebereich. Ohne Ausgleich passieren achtzig Prozent der
   Bewegung in zwanzig Prozent des Scrollwegs — es ruckt, statt zu ziehen.
   Ranking-basiert, damit kein scipy noetig ist.

2  RICHTUNG EINRECHNEN. Eine reine Struktur loest sich ueberall gleichzeitig
   fleckig auf; das liest sich als Rauschen und nicht als Wetter. Der Verlauf
   gibt dem Ganzen eine Zugrichtung — von unten und von rechts, weil dort in
   der Aufnahme der Boden und der Wind sind. 55 Prozent Verlauf zu 45 Prozent
   Struktur: genug Ordnung, dass man eine Bewegung erkennt, genug Unordnung,
   dass es kein Wischen ist.

3  WEICHZEICHNEN. Nimmt der Uebergangsfront die Pixelkanten. Der Shader legt
   darueber noch ein weiches Band, aber das kann nur glaetten, was in der
   Karte schon halbwegs stetig ist.

KEIN STORE_GAIN: die Karte wird im Shader als Rohwert gelesen und nicht ueber
CSS brightness() angezeigt. Die Projektregel gilt fuer Bildplatten, nicht fuer
Steuerdaten.

    python3 scripts/gen-veil-luma.py
"""
import os
import numpy as np
from PIL import Image

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))

SRC = os.path.join(_ROOT, "public", "img", "veil-smoke.webp")
OUT = os.path.join(_ROOT, "public", "img", "veil-luma.webp")

W, H = 1024, 640

GRADIENT = 0.55        # Anteil des Richtungsverlaufs an der fertigen Karte
FROM_BOTTOM = 0.62     # wie viel davon von unten kommt, Rest von rechts
BLUR_SIGMA = 2.4
SIZE_TARGET_KB = 90


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


im = Image.open(SRC).convert("RGBA").resize((W, H), Image.LANCZOS)
dens = np.asarray(im.split()[3], np.float32) / 255.0
del im

# Die Dichte selbst, gleichverteilt. Invertiert, weil DICHTER Nebel zuerst
# decken soll: dicht -> dunkel -> geht zuerst.
structure = 1.0 - equalize(dens)

v = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]   # 0 oben, 1 unten
u = np.linspace(0.0, 1.0, W, dtype=np.float32)[None, :]   # 0 links, 1 rechts

# Unten und rechts sind dunkel, also zuerst dran.
ramp = FROM_BOTTOM * (1.0 - v) + (1.0 - FROM_BOTTOM) * u
ramp = np.broadcast_to(ramp, (H, W)).astype(np.float32)

luma = GRADIENT * ramp + (1.0 - GRADIENT) * structure
luma = equalize(luma)
luma = np.clip(blur(luma, BLUR_SIGMA), 0.0, 1.0)

out = Image.fromarray((luma * 255).astype(np.uint8), "L")
for q in (92, 84, 76, 68):
    out.save(OUT, "WEBP", quality=q, method=6)
    kb = os.path.getsize(OUT) / 1024
    if kb <= SIZE_TARGET_KB:
        break

print("%s  %dx%d  %.0f KB q%d" % (os.path.basename(OUT), W, H, kb, q))
print("  min=%.3f median=%.3f max=%.3f" % (
    float(luma.min()), float(np.median(luma)), float(luma.max())))
