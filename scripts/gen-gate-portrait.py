"""Portrait-Version des Tor-Heroes fuer mobile Geraete.

Auf einem Hochformat-Schirm (390 x 844 px) zeigt `background-size: cover`
vom Querformat-Original nur die mittleren 26 % der Bildbreite -- das Tor
wirkt unmittelbar nah. Diese Datei schneidet denselben Rohling hochformat:
volle Hoehe der Quelle, Mitte der Breite, Seitenverhaeltnis 9:20 (passend
fuer aktuelle iPhones und Galaxy-Modelle). Damit sieht `cover` auf dem Handy
fast das ganze Motiv statt eines engen Streifens.

Dieselbe Gradierung wie gen-gate.py: identische Konstanten, identische
Rechenschritte. Wer eines aendert, aendert beide.

    python3 scripts/gen-gate-portrait.py
"""

import os
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC  = os.path.join(_ROOT, "_scout", "assets", "gate-source.jpg")
OUT  = os.path.join(_ROOT, "public", "img", "gate-hero-portrait.webp")

# ── Portrait-Ziel ────────────────────────────────────────────────────────────
# 9:20 deckt iPhone 14 (9:19.5) und Galaxy S24 (9:17.5) gut ab.
# MAX_H = Ausgabehoehe; Breite ergibt sich aus dem Verhaeltnis.
TARGET_RATIO = 9.0 / 20.0   # Breite / Hoehe
MAX_H        = 2400
SIZE_TARGET_KB = 380

# ── Identische Konstanten wie gen-gate.py ────────────────────────────────────
WARM_LIFT = 0.030
WARM_GAIN = 5.5
SKY_DROP  = 0.30
NEUTRAL   = (1.00, 0.845, 0.735)

LIGHT_LO      = 0.42
LIGHT_HI      = 0.86
GLOW_RADII    = (0.003, 0.012, 0.045, 0.130)
GLOW_WEIGHTS  = (0.40, 0.28, 0.20, 0.14)

TARGET_MEAN = 34.0
STORE_GAIN  = 3.2
CONTRAST    = 1.18
VIGNETTE    = 0.22

K = np.array([0.2126, 0.7152, 0.0722], np.float32)


def blur(x, s):
    h, w = x.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k  = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    if x.ndim == 2:
        return np.fft.irfft2(np.fft.rfft2(x) * k, s=(h, w)).astype(np.float32)
    return np.stack(
        [np.fft.irfft2(np.fft.rfft2(x[..., i]) * k, s=(h, w))
         for i in range(x.shape[2])],
        axis=-1,
    ).astype(np.float32)


def mblur(x, s):
    h, w = x.shape[:2]
    ph = min(int(s * 3) + 1, h - 1)
    pw = min(int(s * 3) + 1, w - 1)
    if x.ndim == 2:
        return blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)[ph:ph + h, pw:pw + w]
    return blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)[ph:ph + h, pw:pw + w]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ── Laden und Portrait-Schnitt ───────────────────────────────────────────────
im = Image.open(SRC).convert("RGB")
W0, H0 = im.size
print("Quelle: %dx%d" % (W0, H0))

# Schnittbreite: volle Hoehe, Mitte der Breite, Zielverhaeltnis.
# Wenn die Quelle selbst schon schmaeler als das Zielverhaeltnis ist
# (unwahrscheinlich bei einem Querformat-Motiv), nimmt das Skript die volle
# Breite -- das Motiv wird dann nicht breiter als der Schirm erwartet.
crop_w = int(round(H0 * TARGET_RATIO))
crop_w = min(crop_w, W0)
x0 = (W0 - crop_w) // 2
crop = im.crop((x0, 0, x0 + crop_w, H0))
print("  Hochformat-Ausschnitt: %dx%d  (%.0f:%.0f  x=%d)"
      % (crop_w, H0, crop_w, H0, x0))

# Auf Ausgabegroeße skalieren: Hoehe = MAX_H, Breite aus Verhaeltnis.
out_h = min(MAX_H, H0)
out_w = int(round(out_h * TARGET_RATIO))
arr = np.asarray(crop.resize((out_w, out_h), Image.LANCZOS), np.float32) / 255.0
del im, crop

W, H = out_w, out_h

# ── Gradierung (identisch mit gen-gate.py) ───────────────────────────────────
lum  = arr @ K
warm = np.clip((arr[..., 0] - arr[..., 2] - WARM_LIFT) * WARM_GAIN, 0, 1)

base = lum * (1.0 - SKY_DROP * (1.0 - warm))
m    = float(np.median(base))
base = np.clip(m + (base - m) * CONTRAST, 0, 1)
base = np.clip(base + (base - mblur(base, 1.4)) * 0.35, 0, 1)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rr  = np.sqrt(((xx / W - 0.5) * 1.08) ** 2 + ((yy / H - 0.5) * 1.14) ** 2)
vig = 1.0 - VIGNETTE * smoothstep((rr - 0.20) / 0.50)
base = base * vig

chroma_max = arr.max(axis=-1)
sat = (chroma_max - arr.min(axis=-1)) / np.maximum(chroma_max, 1e-4)
red = np.clip((sat - 0.22) * 2.4, 0, 1) * warm
tint = np.stack([
    NEUTRAL[0] + 0.00 * red,
    NEUTRAL[1] - 0.10 * warm - 0.34 * red,
    NEUTRAL[2] - 0.18 * warm - 0.46 * red,
], axis=-1)

cold  = base[..., None] * tint
cold  = cold * (TARGET_MEAN / 255.0) / max(float((cold @ K).mean()), 1e-6)
cold_stored = np.clip(cold * STORE_GAIN, 0, 1)

lit  = smoothstep((lum - LIGHT_LO) / (LIGHT_HI - LIGHT_LO))
core = lit * (0.34 + 0.66 * warm)
halo = sum(mblur(core, max(1.0, H * r)) * w
           for r, w in zip(GLOW_RADII, GLOW_WEIGHTS))
halo = halo / max(float(np.percentile(halo, 99.6)), 1e-6)
g    = np.clip(core * 0.90 + halo * 0.85, 0, 1.5)

glow_stored = np.stack([
    np.clip(g * 0.96, 0, 1),
    np.clip(np.power(g, 2.10) * 0.46, 0, 1),
    np.clip(np.power(g, 3.60) * 0.20, 0, 1),
], axis=-1)

hero = 1 - (1 - cold_stored) * (1 - np.clip(glow_stored * 0.42, 0, 1))
hero = np.clip(hero, 0, 1)

# ── Speichern ────────────────────────────────────────────────────────────────
im_out = Image.fromarray((hero * 255).astype(np.uint8), "RGB")
for q in (92, 86, 80, 72, 64):
    im_out.save(OUT, "WEBP", quality=q, method=6)
    kb = os.path.getsize(OUT) / 1024
    if kb <= SIZE_TARGET_KB:
        break

lval = hero @ K
print("  %-28s %dx%d  %4.0f KB q%d   gespeichert %5.1f  im Browser %5.1f"
      % (os.path.basename(OUT), W, H, kb, q,
         lval.mean() * 255, lval.mean() * 255 / STORE_GAIN))
print("  CSS: brightness(%.3f)  (= 1 / STORE_GAIN)" % (1.0 / STORE_GAIN))
