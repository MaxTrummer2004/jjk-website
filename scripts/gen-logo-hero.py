#!/usr/bin/env python3
"""
gen-logo-hero.py  —  Hero-Variante des Siegels.

Das volle Logo (public/img/logo-seal.png) hat eine grossflaechige graue
Tuschewolke in der Mitte. Im Hero liegt genau dort der Text — helle Wolke +
heller Text = unlesbar. Diese Variante behaelt NUR die dunkle Linienzeichnung
(Kreis, Schriftring, Hand, Guertel, EST. 2026) und wirft die Wolke sowie den
weissen Grund weg (transparent).

Zusaetzlich wird die Zeichnung in einen hellen Papier-Ton umgefaerbt: im Hero
liegt sie als Wasserzeichen auf DUNKLEM Grund, schwarze Linien waeren dort
unsichtbar. Ein heller Ton bei niedriger Deckkraft (in jjk-hero.tsx gesetzt)
liest sich als feine Silhouette.

Auswahl ueber Luminanz mit weichem Rand, damit die Linien nicht ausfransen:
  lum <= KEEP_FULL   -> voll deckend (die schwarzen Linien)
  lum >= FADE_END    -> transparent (Wolke, weisser Grund)
  dazwischen         -> linear (weiche Antialias-Kante)

Original bleibt unangetastet — Loader und OG-Bild nutzen weiter logo-seal.png.
Neu erzeugen:  python scripts/gen-logo-hero.py
"""

from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "public" / "img" / "logo-seal.png"
DST = Path(__file__).resolve().parent.parent / "public" / "img" / "logo-seal-hero.png"

# Heller Papier-Ton fuer die Linien (nah an --foreground #f3efe9, leicht waermer).
LINE_TONE = (236, 227, 213)

# Luminanz-Schwellen (0..1).
KEEP_FULL = 0.32   # alles Dunklere = volle Linie
FADE_END = 0.52    # alles Hellere = weg (Wolke liegt darueber)


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()

    span = FADE_END - KEEP_FULL
    kept = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            if lum <= KEEP_FULL:
                mask = 1.0
            elif lum >= FADE_END:
                mask = 0.0
            else:
                mask = (FADE_END - lum) / span
            if mask <= 0.0:
                continue
            alpha = int(round(mask * (a / 255.0) * 255))
            if alpha <= 0:
                continue
            opx[x, y] = (LINE_TONE[0], LINE_TONE[1], LINE_TONE[2], alpha)
            kept += 1

    out.save(DST)
    total = w * h
    print(f"{DST.name}: {w}x{h}, {kept}/{total} Pixel behalten ({100*kept/total:.1f}%)")


if __name__ == "__main__":
    main()
