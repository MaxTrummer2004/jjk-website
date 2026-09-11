#!/usr/bin/env python3
"""
gen-logo-emblem.py  —  Emblem-Fassung des Logos fuer den Hero.

Quelle: Bilder/"LOGO - Z (1).pdf", SEITE 7 — schwarzer Kreis, weiss
ausgefuellte Hand, weisser Schriftring "JIU JITSU KAISEN ACADEMY",
EST. 2026, roter Guertelstreifen, dunkle Tuschewolken.

Rendern bei 300 dpi (pymupdf) und den WEISSEN RAND um das Motiv transparent
machen — aber NUR den aussen liegenden Rand, nicht die weisse Hand/Schrift
INNERHALB des schwarzen Kreises. Deshalb Flood-Fill von den vier Ecken aus:
der aussere weisse Bereich ist zusammenhaengend mit dem Rand, die inneren
weissen Flaechen sind vom schwarzen Kreis eingeschlossen und bleiben erhalten.

Danach auf die Bounding-Box beschneiden und als PNG + verlustfreies WebP
ablegen.

Neu erzeugen:  python scripts/gen-logo-emblem.py
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Bilder" / "LOGO - Z (1).pdf"
DST_PNG = ROOT / "public" / "img" / "logo-emblem.png"
DST_WEBP = ROOT / "public" / "img" / "logo-emblem.webp"

PAGE_INDEX = 6      # Seite 7 (0-basiert)
DPI = 300
SENTINEL = (255, 0, 255)   # Magenta — kommt im Logo nicht vor
FLOOD_THRESH = 60          # Toleranz fuer "weiss" beim Flood-Fill


def main() -> None:
    import pymupdf

    doc = pymupdf.open(SRC)
    page = doc[PAGE_INDEX]
    pix = page.get_pixmap(dpi=DPI, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("RGB")
    w, h = img.size

    # Aussenrand von allen vier Ecken fluten (falls der Rand nicht ueber eine
    # einzige Ecke zusammenhaengt).
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(img, corner, SENTINEL, thresh=FLOOD_THRESH)

    arr = np.array(img)
    is_bg = (
        (arr[:, :, 0] == SENTINEL[0])
        & (arr[:, :, 1] == SENTINEL[1])
        & (arr[:, :, 2] == SENTINEL[2])
    )
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)

    # Wo transparent: RGB auf Schwarz setzen, damit kein Magenta-Halo an den
    # Kanten durchscheint, falls Alpha mal interpoliert wird.
    rgb = arr.copy()
    rgb[is_bg] = (0, 0, 0)

    rgba = np.dstack([rgb, alpha])
    out = Image.fromarray(rgba, "RGBA")

    # Auf sichtbaren Inhalt beschneiden.
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    out.save(DST_PNG)
    out.save(DST_WEBP, lossless=True, quality=100, method=6)

    kept = int((alpha > 0).sum())
    total = w * h
    print(f"{DST_PNG.name}: Quelle {w}x{h}, sichtbar {out.size[0]}x{out.size[1]}, "
          f"{100 * kept / total:.1f}% opak")
    print(f"{DST_WEBP.name}: geschrieben")


if __name__ == "__main__":
    main()
