"""Die Nebelwand, die beim Scrollen ueber den Hero zieht.

Vorbild ist white-desert.com: dort schiebt sich beim Scrollen eine Wand aus
Dunst ueber die Aufnahme und verschluckt sie, und danach ist man in der
naechsten Sektion. Kein Video, keine Simulation, keine laufende Animation — ein
einziges Bild mit Alphakanal, das der Scroll bewegt. Deshalb kostet es nichts
und ruckelt nie.

Bei uns ist die Wand SCHWARZ, weil die Seite in der Nacht spielt und die
Sektion darunter ohnehin schwarz ist. Der Uebergang ist damit kein Effekt,
sondern die Ankunft: was den Hero verschluckt, IST der Raum, in dem es
weitergeht.

── Woher die Struktur kommt, und warum das der Punkt ist ───────────────────
Aus einer ECHTEN Nebelaufnahme (_scout/assets/veil-source.jpg — Nadelwald, der
in eine Wolke laeuft). Der erste Anlauf nahm ein Standbild aus einem
Rauchvideo, und das Ergebnis las sich als das, was es war: eine schwarze
Schicht mit Loechern. Nebel hat keine Loecher, er hat DICHTE — er wird nach
oben duenner, laesst Fernes verschwinden und Nahes stehen, und seine Grenze ist
keine Kante, sondern ein Verlauf ueber hunderte Pixel.

Genau das wird hier extrahiert, in drei Schritten:

  1  Die BAEUME RAUS. Was dunkel und feinteilig ist, ist Wald und nicht Nebel.
     Die Maske dafuer ist ein Hochpass — Nebel hat auf feiner Skala keine
     Struktur, Nadelbaeume haben nichts anderes.
  2  Die LUECKEN FUELLEN. Nicht abdunkeln, nicht wegrechnen: die Loecher
     bekommen den Mittelwert ihrer Umgebung, gewichtet mit dem, was kein Loch
     ist. Dieselbe Technik, mit der auch die Tusche aus der Emaki-Wand
     verschwindet (scripts/gen-wall.py). Danach steht nur noch die Wolke da.
  3  UMDREHEN. Im Original liegt der Nebel oben und der Wald unten. Gebraucht
     wird das Gegenteil: die Wand steigt von unten, weil dort der Boden ist.

Die so gewonnene Dichte wird der ALPHAKANAL; die Farbe ist ueberall dasselbe
Fast-Schwarz. Ein Verlauf im Alpha ist billiger als jede Maske im Browser und
funktioniert ohne `mix-blend-mode`, also auch dort, wo Blend-Modi
Stacking-Kontexte aufreissen wuerden.

    python3 scripts/gen-veil.py [quelle.jpg]
"""
import os
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC = os.path.join(_ROOT, "_scout", "assets", "veil-source.jpg")
OUT = os.path.join(_ROOT, "public", "img", "veil-smoke.webp")
if len(sys.argv) > 1:
    SRC = sys.argv[1]

W, H = 1500, 1000

# ── Die Schwellen auf der Klarheit ──────────────────────────────────────────
# Zwischen diesen beiden Werten liegt der ganze Verlauf von "dicht" nach "klar".
CLARITY_LO = 0.10     # ab so wenig Detailenergie gilt die Luft als dicht
CLARITY_HI = 0.74     # ab so viel gilt sie als klar

# 7, nicht 34. Bei 34 war von der Wolke nichts mehr uebrig als eine glatte
# Huegelkante — und eine glatte Kante ist genau das, was die Wand NICHT sein
# soll. Die Struktur, die zwischen Baumwipfeln und Wolke steht, ist der Grund,
# warum ueberhaupt eine Aufnahme als Quelle dient.
SOFT = 5.0            # Weichzeichnung der fertigen Dichte
GRADIENT = 0.28       # wie stark der Verlauf von unten nach oben nachhilft
CLOSE_AT = 0.88       # ab dieser Hoehe (von oben, 0..1) ist die Wand dicht
# Schwaerzer als die Nacht darunter, nicht gleich schwarz: die Wand soll den
# Hero SCHLUCKEN, nicht sich in ihn einfuegen. Bei 0.015 war sie ein dunkler
# Schleier, durch den das Bild noch durchkam.
INK = (0.004, 0.004, 0.005)   # die Farbe der Wand: Schwarz, minimal kuehl
SIZE_TARGET_KB = 140


def blur(x, s):
    """Gauss ueber die FFT, gespiegelt gepolstert — sonst laeuft die Wolke am
    Bildrand in ihr eigenes Gegenteil."""
    h, w = x.shape
    ph, pw = min(int(s * 3) + 1, h - 1), min(int(s * 3) + 1, w - 1)
    p = np.pad(x, ((ph, ph), (pw, pw)), mode="reflect")
    hh, ww = p.shape
    fy = np.fft.fftfreq(hh)[:, None].astype(np.float32)
    fx = np.fft.rfftfreq(ww)[None, :].astype(np.float32)
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    out = np.fft.irfft2(np.fft.rfft2(p) * k, s=(hh, ww)).astype(np.float32)
    return out[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


im = Image.open(SRC).convert("L")
d = np.asarray(im.resize((W, H), Image.LANCZOS), np.float32) / 255.0
del im

# ── Die Dichte kommt aus dem KONTRAST, nicht aus der Helligkeit ────────────
# Der erste Anlauf hat die Baeume maskiert und die Loecher gefuellt. Das
# funktioniert — und uebrig bleibt ein Verlauf, eine glatte Huegelkante, also
# genau das, was eine echte Aufnahme ueberfluessig macht.
#
# Nebel verraet sich nicht durch Helligkeit, sondern dadurch, dass er KONTRAST
# FRISST. Ein Baum in klarer Luft hat harte Kanten, derselbe Baum hinter drei-
# hundert Metern Nebel ist ein blasser Fleck, und dazwischen liegt jede
# Zwischenstufe. Die lokale Detailenergie ist damit ein direktes Mass fuer die
# Dichte davor — physikalisch richtig und, was hier mehr zaehlt, unregelmaessig:
# Baender, Loecher, Schwaden, alles an der richtigen Stelle.
#
# Die Baeume verschwinden dabei von selbst und muessen nicht gefuellt werden.
# Wo sie scharf stehen, ist die Dichte null; wo sie verschwimmen, ist sie hoch.
detail = np.abs(d - blur(d, 2.2))
energy = blur(detail, H * 0.014)
clarity = energy / max(float(np.percentile(energy, 97)), 1e-6)
dens = 1.0 - smoothstep((clarity - CLARITY_LO) / (CLARITY_HI - CLARITY_LO))

# Sehr dunkle Stellen sind Wald im Vordergrund, kein Nebel — auch wenn dort
# zufaellig wenig Detail liegt (ein Stamm im Schatten ist glatt und schwarz).
dens = dens * np.clip((d - 0.06) * 6.0, 0, 1)

dens = blur(dens, SOFT)
dens = dens / max(float(np.percentile(dens, 99.0)), 1e-6)

# ── Umdrehen ───────────────────────────────────────────────────────────────
# Im Original liegt der Nebel oben und der Wald unten. Die Wand steigt aber
# von unten, weil dort der Boden ist.
dens = dens[::-1]

# Der Verlauf hilft nach: nach unten dichter, nach oben duenner. Er ersetzt die
# Struktur nicht, er gewichtet sie.
v = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]   # 0 oben, 1 unten
alpha = np.clip(dens * (1.0 - GRADIENT + GRADIENT * (v * 1.7)) * 1.62, 0, 1)
# Und die obere Haelfte wird konsequent freigeraeumt. Ohne das steht dort das
# umgedrehte Nadelwerk als Muster im Alphakanal — man sieht der Wand an, dass
# sie einmal ein Wald war, und das ist genau der Moment, in dem ein Effekt
# auffliegt. Die Wand STEIGT, also gehoert ihre Masse nach unten.
alpha = alpha * smoothstep((v - 0.04) / 0.46)
# Die untersten Zeilen sind ohne Wenn und Aber dicht: eine Wand mit Loechern im
# Boden ist keine.
alpha = np.maximum(alpha, smoothstep((v - CLOSE_AT) / (1.0 - CLOSE_AT)))
trees = 1.0 - dens   # nur noch fuer die Messzeile unten

rgba = np.dstack([
    np.full((H, W), INK[0], np.float32),
    np.full((H, W), INK[1], np.float32),
    np.full((H, W), INK[2], np.float32),
    alpha,
])
im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), "RGBA")
for q in (90, 82, 74, 66, 58):
    im.save(OUT, "WEBP", quality=q, method=6, exact=True)
    kb = os.path.getsize(OUT) / 1024
    if kb <= SIZE_TARGET_KB:
        break
print("%s  %dx%d  %.0f KB q%d" % (os.path.basename(OUT), W, H, kb, q))
print("  klare Luft auf %.0f %% der Flaeche" % (float((trees > 0.7).mean()) * 100))
print("  Alpha: unten %.2f  bei 60 %% %.2f  bei 30 %% %.2f  oben %.2f"
      % (alpha[-1].mean(), alpha[int(H * 0.6)].mean(),
         alpha[int(H * 0.3)].mean(), alpha[0].mean()))
