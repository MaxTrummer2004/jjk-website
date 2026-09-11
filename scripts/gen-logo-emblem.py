#!/usr/bin/env python3
"""
gen-logo-emblem.py  —  Emblem-Fassung des Logos fuer den Hero, freigestellt.

Quelle: Bilder/"LOGO - Z (1).pdf", SEITE 3. Motiv: schwarze Scheibe mit
weissen Kreislinien, weiss/dunkel gezeichneter Hand, Tuschewolken, Guertel
mit rotem Streifen — auf WEISSEM Seitengrund.

Struktur der Seite: das Motiv sitzt auf einer SCHWARZEN Flaeche (Kasten), mit
schmalen WEISSEN Seitenraendern links/rechts (Seitengrund). Auf der schwarzen
Flaeche das weisse Liniengefuege: doppelter Kreisring, Hand, Guertelkontur,
dazu graue Tuschewolken und der rote Guertelstreifen.

Wichtig: der aeussere weisse Kreisring liegt am Rand der schwarzen Scheibe und
haengt dort mit dem WEISSEN Seitengrund ZUSAMMEN. Ein Flood-Fill ueber "weiss"
wuerde deshalb die Ringe mitloeschen (getestet — genau das passiert). Ein Flood
ueber "schwarz" von den Ecken scheitert ebenfalls, weil die Ecken hier weiss
sind. Also der in der Aufgabe genannte FALLBACK: eine Silhouetten-Maske bauen
und als Alphakanal anwenden.

Vorgehen (robust, ohne Radius zu raten):
  1. background = randverbundene HELLE Komponente = der weisse Seitengrund
     (inkl. der mit ihm verbundenen Ringe).
  2. motif = alles andere (schwarze Scheibe, Wolken, Hand-Fuellung, Guertel,
     roter Streifen).
  3. KEEP = binary_fill_holes(motif): die von der Scheibe umschlossenen Loecher
     (Ringe, Hand-Linien) werden gefuellt -> geschlossene Scheibe + Guertel.
  4. Groesste Komponente von KEEP behalten (Scheibe+Guertel), Streusel weg.
Der Alphakanal kommt ALLEIN aus KEEP; die RGB-Werte bleiben original — die
weissen Ringe/Linien bleiben also weiss und sichtbar, nur der Grund AUSSERHALB
der Silhouette wird transparent.

WALL ist die Helligkeitsschwelle fuer "heller Grund". Danach 1px-Feather
(Gauss auf dem Alpha) gegen harten Rand, auf Bounding-Box beschneiden, als
PNG + verlustfreies WebP speichern.

Neu erzeugen:  python scripts/gen-logo-emblem.py
"""

from io import BytesIO
from pathlib import Path
import numpy as np
from scipy import ndimage
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Bilder" / "LOGO - Z (1).pdf"
DST_PNG = ROOT / "public" / "img" / "logo-emblem.png"
DST_WEBP = ROOT / "public" / "img" / "logo-emblem.webp"

PAGE_INDEX = 2      # Seite 3 (0-basiert)
DPI = 300
WALL = 128          # Helligkeitsschwelle: heller Grund vs. Schwarz
CLOSE_RADIUS = 22   # px: versiegelt die weissen Kanaele, die den Kreisrand durchbrechen
FEATHER_SIGMA = 1.2


def disk_struct(radius: int) -> np.ndarray:
    yy, xx = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    return (xx * xx + yy * yy) <= radius * radius


def border_component(mask: np.ndarray) -> np.ndarray:
    """Alle Pixel der Maske, deren Komponente den Bildrand beruehrt."""
    labels, _ = ndimage.label(mask)
    edge = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    ids = np.unique(edge)
    ids = ids[ids != 0]
    return np.isin(labels, ids)


def main() -> None:
    import pymupdf

    doc = pymupdf.open(SRC)
    page = doc[PAGE_INDEX]
    pix = page.get_pixmap(dpi=DPI, alpha=False)
    # Ueber PNG einlesen (nicht frombytes) — vermeidet Stride/Padding-Fallen.
    img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGB")
    arr = np.array(img)
    h, w = arr.shape[:2]

    lum = arr[:, :, 0] * 0.299 + arr[:, :, 1] * 0.587 + arr[:, :, 2] * 0.114
    bright = lum > WALL

    dark = ~bright

    # 1. Weisser Seitengrund = randverbundene helle Komponente (die Ringe haengen
    #    daran, sind hier mit drin). motif = alles andere — enthaelt aber noch
    #    das AUSSEN-Schwarz zwischen Ring und Seitengrund.
    background = border_component(bright)
    motif = ~background
    # 2. Schliessen + Fuellen: die weissen Linien durchbrechen den aeusseren
    #    Kreisring (Hand tritt oben aus), sonst bleibt die Scheibe beim Fuellen
    #    offen. Erst die duennen weissen Kanaele versiegeln, dann fuellen.
    st = disk_struct(CLOSE_RADIUS)
    filled = ndimage.binary_fill_holes(ndimage.binary_closing(motif, structure=st, border_value=0))
    # 3. Aussen-Schwarz abziehen: randverbundenes Dunkel endet am hellen aeusseren
    #    Ring — das ergibt den sauberen Kreisschnitt. Der Guertel ist durch seine
    #    weisse Kontur vom Aussen-Schwarz getrennt und bleibt.
    exterior = border_component(dark)
    keep = filled & ~exterior
    keep = ndimage.binary_fill_holes(keep)
    # 4. groesste Komponente behalten (Scheibe+Guertel), Streusel entfernen.
    lbl, n = ndimage.label(keep)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
        keep = lbl == (int(np.argmax(sizes)) + 1)

    alpha = np.where(keep, 255.0, 0.0)
    alpha = ndimage.gaussian_filter(alpha, sigma=FEATHER_SIGMA)
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)

    rgba = np.dstack([arr, alpha])
    out = Image.fromarray(rgba, "RGBA")

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    out.save(DST_PNG)
    out.save(DST_WEBP, lossless=True, quality=100, method=6)

    opaque = 100 * (np.array(out)[:, :, 3] > 0).mean()
    print(f"{DST_PNG.name}: Quelle {w}x{h} -> sichtbar {out.size[0]}x{out.size[1]}, "
          f"{opaque:.1f}% sichtbar, WALL={WALL}")


if __name__ == "__main__":
    main()
