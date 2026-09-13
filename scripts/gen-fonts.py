#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-fonts.py — die beiden japanischen Schriften, selbst gehostet.

WARUM ES DIESES SKRIPT GIBT
---------------------------
Bis hierher kamen "Shippori Mincho B1" und "Yuji Syuku" per <link> aus dem
Google-CDN. Das heisst: jeder Besucher schickt seine IP-Adresse an Google in
die USA, bevor er ueberhaupt etwas gesehen hat, und zwar ohne Einwilligung.
Das ist in der EU abmahnbar (LG Muenchen I, 3 O 17493/20). Also liegen die
Schriften jetzt unter public/fonts/ und werden ueber next/font/local geladen.

Der alte Kommentar in app/layout.tsx behauptete, next/font habe kein
japanisches Subset. Das gilt nur fuer next/font/GOOGLE — das bedient sich am
Google-Manifest, und dort ist fuer diese beiden Familien nur `latin`
hinterlegt. next/font/LOCAL nimmt jede Datei, die man ihm hinlegt.

WARUM SUBSETTEN
---------------
Shippori Mincho B1 deckt JIS Level 1+2 ab: rund 7000 Glyphen, ~2 MB als woff2
PRO SCHNITT. Drei Schnitte waeren ~6 MB nur fuer Schmuckzeichen — das ist auf
dem Handy inakzeptabel. Google loest das im CDN mit ~120 unicode-range-
Haeppchen pro Schnitt; das waeren hier ~480 Dateien im Repo.

Deshalb der dritte Weg: die Seite braucht nachweislich nur eine Handvoll
Zeichen, und dieses Skript LIEST SIE AUS DEM QUELLTEXT. Es sucht in allen
.ts/.tsx/.css unter app/, components/ und lib/ nach CJK- und Kana-Zeichen und
nimmt genau die auf, plus die vollstaendigen Kana-Bloecke (damit Furigana
weiterhin frei getippt werden koennen) und Latin-1 fuer die deutschen Umlaute.

Daraus folgt die eine Regel, die man kennen muss:

    WER EIN NEUES KANJI IN DEN QUELLTEXT SCHREIBT, MUSS DIESES SKRIPT
    NEU LAUFEN LASSEN — sonst faellt genau dieses Zeichen auf eine
    Systemschrift zurueck, und zwar nur dieses eine.

Das Skript bricht deshalb am Ende laut ab, wenn ein gefundenes Zeichen in der
Quelldatei keine Glyphe hat.

AUFRUF
------
    python scripts/gen-fonts.py            # nutzt den Download-Cache
    python scripts/gen-fonts.py --refresh  # laedt die TTFs neu

ERGEBNIS
--------
    public/fonts/shippori-mincho-b1-{600,700,800}.woff2
    public/fonts/yuji-syuku-400.woff2
    public/fonts/OFL-ShipporiMinchoB1.txt
    public/fonts/OFL-YujiSyuku.txt

LIZENZ
------
Beide Familien stehen unter der SIL Open Font License 1.1. Selbsthosten und
Subsetten sind ausdruecklich erlaubt; die Lizenz muss mitgeliefert werden,
darum landen die beiden OFL.txt neben den Dateien.
"""

from __future__ import annotations

import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:  # pragma: no cover
    sys.exit("fontTools fehlt:  python -m pip install fonttools brotli")

try:
    import brotli  # noqa: F401  — von fontTools fuer woff2 gebraucht
except ImportError:  # pragma: no cover
    sys.exit("brotli fehlt:  python -m pip install brotli")


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
CACHE = ROOT / "scripts" / ".font-cache"

UPSTREAM = "https://raw.githubusercontent.com/google/fonts/main/ofl"

# (Zieldatei, Quelldatei upstream, Ordner upstream, CSS-font-weight)
FACES = [
    ("shippori-mincho-b1-600.woff2", "ShipporiMinchoB1-SemiBold.ttf",  "shipporiminchob1", 600),
    ("shippori-mincho-b1-700.woff2", "ShipporiMinchoB1-Bold.ttf",      "shipporiminchob1", 700),
    ("shippori-mincho-b1-800.woff2", "ShipporiMinchoB1-ExtraBold.ttf", "shipporiminchob1", 800),
    ("yuji-syuku-400.woff2",         "YujiSyuku-Regular.ttf",          "yujisyuku",        400),
]

LICENSES = [
    ("OFL-ShipporiMinchoB1.txt", "shipporiminchob1"),
    ("OFL-YujiSyuku.txt", "yujisyuku"),
]

# Kana, CJK-Interpunktion, CJK-Ideogramme, Halb-/Vollbreite.
CJK_RE = re.compile(
    "["
    "　-〿"   # CJK-Interpunktion (、。「」 …)
    "぀-ゟ"   # Hiragana
    "゠-ヿ"   # Katakana
    "一-鿿"   # CJK Unified Ideographs
    "＀-￯"   # Halbbreite/Vollbreite Formen
    "]"
)

SCAN_DIRS = ("app", "components", "lib")
SCAN_SUFFIXES = (".ts", ".tsx", ".css")

# Immer mitnehmen, unabhaengig vom Quelltext:
#   - ASCII, damit ein Label wie "JJK 2026" nicht mitten im Wort die Schrift
#     wechselt, wenn es in font-jp gesetzt ist
#   - Latin-1 fuer aeoeueszlig
#   - die kompletten Kana-Bloecke, damit Furigana frei getippt werden koennen,
#     ohne dass jemand an dieses Skript denken muss (Kana sind zusammen unter
#     200 Glyphen, das kostet fast nichts)
ALWAYS = (
    set(range(0x20, 0x7F))
    | set(range(0xA0, 0x100))
    | {0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x00B7}
    | set(range(0x3000, 0x3040))   # CJK-Interpunktion
    | set(range(0x3041, 0x30A0))   # Hiragana
    | set(range(0x30A0, 0x3100))   # Katakana
)


def scan_source_chars() -> tuple[set[int], dict[str, list[str]]]:
    """Jedes CJK-Zeichen, das im lebenden Quelltext vorkommt — mit Fundort."""
    found: dict[str, list[str]] = {}
    for directory in SCAN_DIRS:
        for path in sorted((ROOT / directory).rglob("*")):
            if path.suffix not in SCAN_SUFFIXES:
                continue
            rel = path.relative_to(ROOT).as_posix()
            if "_attic" in rel or "node_modules" in rel:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for ch in CJK_RE.findall(text):
                found.setdefault(ch, [])
                if rel not in found[ch]:
                    found[ch].append(rel)
    return {ord(ch) for ch in found}, found


def fetch(folder: str, name: str, refresh: bool) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / name
    if dest.exists() and not refresh:
        return dest
    url = f"{UPSTREAM}/{folder}/{name}"
    print(f"  laden  {url}")
    with urllib.request.urlopen(url) as response:  # noqa: S310 — feste Domain
        dest.write_bytes(response.read())
    return dest


def main() -> int:
    refresh = "--refresh" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)

    source_points, found = scan_source_chars()
    unicodes = sorted(ALWAYS | source_points)

    print(f"Quelltext-Scan: {len(found)} verschiedene CJK-Zeichen in "
          f"{len({f for v in found.values() for f in v})} Dateien")
    print(f"Subset-Umfang:  {len(unicodes)} Codepoints "
          f"(davon {len(ALWAYS)} immer, {len(source_points - ALWAYS)} aus dem Quelltext)")
    print()

    missing_total: dict[str, list[str]] = {}

    for out_name, src_name, folder, weight in FACES:
        src = fetch(folder, src_name, refresh)

        # Was die Quelldatei ueberhaupt hergibt — VOR dem Subsetten pruefen,
        # sonst meldet fontTools nur stumm weniger Glyphen.
        with TTFont(src) as probe:
            covered = set(probe.getBestCmap())
        for ch, places in found.items():
            if ord(ch) not in covered:
                missing_total.setdefault(f"{src_name}: {ch}", places)

        options = subset.Options()
        options.flavor = "woff2"
        options.desubroutinize = False
        options.hinting = True
        options.legacy_kern = False
        options.notdef_outline = False
        options.recalc_bounds = True
        # vert/vrt2/vkna bleiben drin: .jjk-fuda-title in globals.css setzt
        # writing-mode: vertical-rl, und ohne diese Tabellen stehen dort
        # Klammern und Kleinkana falsch gedreht. palt/kern sind die Metrik,
        # mit der Mincho-Kanji nebeneinander sitzen.
        options.layout_features = [
            "kern", "liga", "clig", "calt", "palt", "locl", "ccmp",
            "vert", "vrt2", "vkna", "vpal", "vkrn",
        ]
        options.name_IDs = ["*"]
        options.name_legacy = False
        options.name_languages = ["*"]
        options.drop_tables += ["DSIG"]

        font = subset.load_font(str(src), options)
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        subset.save_font(font, str(OUT / out_name), options)
        font.close()

        before = src.stat().st_size / 1024
        after = (OUT / out_name).stat().st_size / 1024
        print(f"  {out_name:<32} {after:7.1f} kB   "
              f"(aus {before:8.1f} kB TTF, weight {weight})")

    print()
    for out_name, folder in LICENSES:
        text = fetch(folder, "OFL.txt", refresh).read_text(encoding="utf-8")
        (OUT / out_name).write_text(text, encoding="utf-8")
        print(f"  {out_name}")

    if missing_total:
        print()
        print("FEHLENDE GLYPHEN — diese Zeichen stehen im Quelltext, aber nicht")
        print("in der Schrift. Sie fallen im Browser auf eine Systemschrift:")
        for key, places in sorted(missing_total.items()):
            src_name, ch = key.split(": ", 1)
            print(f"  {src_name}  U+{ord(ch):04X} {ch}  "
                  f"({unicodedata.name(ch, '?')})  in {', '.join(places)}")
        return 1

    print()
    print("Alle im Quelltext gefundenen Zeichen sind in allen vier Schnitten "
          "enthalten.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
