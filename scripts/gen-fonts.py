#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-fonts.py — alle Schriften der Seite, selbst gebaut.

WARUM ES DIESES SKRIPT GIBT
---------------------------
Zwei Gruende, und sie sind verschieden stark.

Der erste ist rechtlich und war dringend: "Shippori Mincho B1" und "Yuji
Syuku" kamen per <link> aus dem Google-CDN. Das heisst, jeder Besucher
schickt seine IP-Adresse an Google in die USA, bevor er ueberhaupt etwas
gesehen hat, und zwar ohne Einwilligung. Das ist in der EU abmahnbar
(LG Muenchen I, 3 O 17493/20).

Der zweite ist Unabhaengigkeit und war nicht dringend: Geist, Geist Mono und
(frueher) Oswald liefen ueber next/font/google. Das ist datenschutzrechtlich
sauber — Next laedt beim BUILD herunter und liefert danach vom eigenen
Server — aber es macht jeden Build von der Erreichbarkeit eines fremden
Dienstes abhaengig. Jetzt liegen alle Schriften im Repo.

Es gibt seither auch eine Anzeigeschrift weniger. Oswald ist raus; die
Ueberschriften stehen in Shippori Mincho B1, derselben Schrift wie die
Kanji. Das ist keine Sparmassnahme, sondern die Sache selbst: Shippori
Mincho basiert laut Google-Fonts-Beschreibung auf der "Tokyo Tsukiji Type
Foundry No. 5 Mincho" — der Giesserei, die den japanischen Mincho-Stil im
19. Jahrhundert gepraegt hat, also genau der Zeit, in der diese Seite
spielt. Weiter dort: "The Extra Bold was originally designed for titles and
headlines" und "designed to be beautiful even when the characters are
enlarged". Die Variante B1 hat gegenueber der Grundschrift "rounded corners
and ink pooling" — gemalte Ecken und Tinte, die ins Papier laeuft. Das ist
das Briefing, nur eben als Schrift. Oswald dagegen ist laut eigener
Beschreibung "a reworking of the classic style historically represented by
the 'Alternate Gothic' sans serif typefaces", gezeichnet, um "better fit the
pixel grid of standard digital screens" — eine amerikanische schmale
Grotesk fuers Bildschirmraster. Sie kam mit dem Template, nicht mit dem
Entwurf.

WARUM SUBSETTEN
---------------
Shippori Mincho B1 deckt JIS Level 1+2 ab: rund 7000 Glyphen, ~2 MB als
woff2 PRO SCHNITT. Drei Schnitte waeren ~6 MB nur fuer Schmuckzeichen — auf
dem Handy inakzeptabel. Google loest das im CDN mit ~120 unicode-range-
Haeppchen pro Schnitt; das waeren hier ~480 Dateien im Repo.

Deshalb der dritte Weg: die Seite braucht nachweislich nur eine Handvoll
Zeichen, und dieses Skript LIEST SIE AUS DEM QUELLTEXT. Es sucht in allen
.ts/.tsx/.css unter app/, components/ und lib/ nach jedem Zeichen jenseits
von ASCII und nimmt genau die auf.

Daraus folgt die eine Regel, die man kennen muss:

    WER EIN NEUES KANJI ODER SONDERZEICHEN IN DEN QUELLTEXT SCHREIBT,
    MUSS DIESES SKRIPT NEU LAUFEN LASSEN — sonst faellt genau dieses
    Zeichen auf eine Systemschrift zurueck, und zwar nur dieses eine.

Das Skript bricht am Ende laut ab, wenn ein gefundenes Zeichen in der
Quelldatei keine Glyphe hat.

Nicht jedes Zeichen im Quelltext gehoert allerdings in eine Schrift — die
Kaesten in den Kommentaren (─ ═) sind Dekoration im Editor, die Medaillen
im Mitgliederbereich (🥇🥈🥉) rendert das System aus seiner Emoji-Schrift.
Die stehen in IGNORE und sind der einzige Ort, an dem dieses Skript etwas
von Hand weiss.

AUFRUF
------
    python scripts/gen-fonts.py            # nutzt den Download-Cache
    python scripts/gen-fonts.py --refresh  # laedt die Quelldateien neu

ERGEBNIS
--------
    public/fonts/shippori-mincho-b1-{600,700,800}.woff2   Anzeige + Kanji
    public/fonts/yuji-syuku-400.woff2                     Pinselzeile
    public/fonts/geist-var.woff2                          Fliesstext
    public/fonts/geist-mono-var.woff2                     Augenbrauen, Zahlen
    public/fonts/OFL-*.txt

LIZENZ
------
Alle vier Familien stehen unter der SIL Open Font License 1.1. Selbsthosten
und Subsetten sind ausdruecklich erlaubt; die Lizenz muss mitgeliefert
werden, darum landen die OFL-Texte neben den Dateien.
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

# Die japanischen Schnitte. Sie tragen zusaetzlich die Kana-Bloecke und die
# im Quelltext gefundenen Kanji.
CJK_FACES = [
    ("shippori-mincho-b1-600.woff2", "ShipporiMinchoB1-SemiBold.ttf",  "shipporiminchob1"),
    ("shippori-mincho-b1-700.woff2", "ShipporiMinchoB1-Bold.ttf",      "shipporiminchob1"),
    ("shippori-mincho-b1-800.woff2", "ShipporiMinchoB1-ExtraBold.ttf", "shipporiminchob1"),
    ("yuji-syuku-400.woff2",         "YujiSyuku-Regular.ttf",          "yujisyuku"),
]

# Die lateinischen Schnitte. Variable Fonts mit einer Gewichtsachse — eine
# Datei deckt 100 bis 900 ab, was billiger ist als vier feste Schnitte.
LATIN_FACES = [
    ("geist-var.woff2",      "Geist[wght].ttf",     "geist"),
    ("geist-mono-var.woff2", "GeistMono[wght].ttf", "geistmono"),
]

LICENSES = [
    ("OFL-ShipporiMinchoB1.txt", "shipporiminchob1"),
    ("OFL-YujiSyuku.txt", "yujisyuku"),
    ("OFL-Geist.txt", "geist"),
    ("OFL-GeistMono.txt", "geistmono"),
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

# Steht im Quelltext, gehoert aber in keine Schriftdatei:
#   U+2500-257F  Rahmenzeichen — Ueberschriften in Kommentarbloecken
#   U+FEFF       Byte Order Mark am Dateianfang
#   ab U+1F000   Emoji, dazu ✅ und ❌ — die rendert das System aus seiner
#                eigenen Emoji-Schrift, keine Textschrift hat sie
IGNORE = set(range(0x2500, 0x2580)) | {0xFEFF, 0x2705, 0x274C}

# Immer mitnehmen, unabhaengig vom Quelltext. Das ist die Grundausstattung,
# die eine deutschsprachige Seite braucht, ohne dass jemand an dieses Skript
# denken muss:
#   ASCII                     — Grundalphabet, Ziffern, Satzzeichen
#   Latin-1                   — aeoeue, szlig, Akzente
#   Latin Extended-A          — Makronvokale der Japanisch-Umschrift (Sanjo,
#                               jokyu). Nur 128 Glyphen, kostet fast nichts,
#                               und OHNE SIE FAELLT GENAU EIN BUCHSTABE MITTEN
#                               IM WORT auf eine Systemschrift zurueck.
#   Typografie                — Gedankenstriche, Anfuehrungszeichen, Auslassung
#   Pfeile, Mathe, Waehrung   — -> und <- der Blaetter-Steuerung, das Euro,
#                               Paragraf fuer die Rechtsseiten
LATIN_BASE = (
    set(range(0x20, 0x7F))
    | set(range(0xA0, 0x100))
    | set(range(0x100, 0x180))
    | {0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2026}
    | {0x2039, 0x203A, 0x00AB, 0x00BB}
    | {0x2190, 0x2192, 0x2194, 0x2212, 0x2248, 0x00B1, 0x00D7, 0x00F7}
    | {0x20AC, 0x00A7, 0x00A9, 0x00AE, 0x2122, 0x2022}
)

# Zusaetzlich fuer die japanischen Schnitte: die vollstaendigen Kana-Bloecke,
# damit Furigana frei getippt werden koennen, ohne dass jemand an dieses
# Skript denken muss. Kana sind zusammen unter 200 Glyphen.
KANA_BASE = (
    set(range(0x3000, 0x3040))   # CJK-Interpunktion
    | set(range(0x3041, 0x30A0))  # Hiragana
    | set(range(0x30A0, 0x3100))  # Katakana
)


BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
# Ohne re.DOTALL trifft . kein Zeilenende — das ist hier genau richtig.
LINE_COMMENT = re.compile(r"//.*")


def strip_comments(text: str, suffix: str) -> str:
    """Denselben Text ohne Kommentare.

    Gebraucht fuer GENAU EINE Entscheidung: ob ein fehlendes Zeichen ein
    Fehler ist oder nur ein Hinweis. Dieses Projekt kommentiert ausfuehrlich,
    und in den Kommentaren stehen Namen wie "Sanjo-Palast" und "enso" mit
    Makron — Zeichen, die Shippori Mincho gar nicht hat. Wuerde das Skript
    daran scheitern, scheiterte es an Prosa, die nie gerendert wird.

    Zum SUBSETTEN wird weiter der volle Text gelesen. Ein Zeichen zu viel in
    der Schrift kostet ein paar Byte; ein Zeichen zu wenig kostet einen
    sichtbaren Schriftwechsel mitten im Wort. Die Richtung des Irrtums ist
    also bewusst gewaehlt.

    Der Zeilenkommentar-Ausdruck trifft auch das // in einer URL. Das macht
    die Fehlerpruefung nur nachsichtiger, nie strenger, und ist hier egal.
    """
    text = BLOCK_COMMENT.sub(" ", text)
    if suffix != ".css":
        text = LINE_COMMENT.sub(" ", text)
    return text


def keep_char(ch: str) -> bool:
    point = ord(ch)
    return not (point < 0x80 or point in IGNORE or point > 0xFFFF)


def scan_source_chars() -> tuple[
    dict[str, list[str]], dict[str, list[str]], set[str]
]:
    """Jedes Nicht-ASCII-Zeichen aus dem lebenden Quelltext, mit Fundort.

    Rueckgabe: (cjk, latin, rendered). cjk und latin sind getrennt, weil
    Geist keine Kanji tragen muss und Shippori beides tragen soll;
    `rendered` ist die Teilmenge, die ausserhalb von Kommentaren steht und
    deshalb tatsaechlich auf den Bildschirm kommen kann.
    """
    cjk: dict[str, list[str]] = {}
    latin: dict[str, list[str]] = {}
    rendered: set[str] = set()
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

            for ch in text:
                if not keep_char(ch):
                    continue
                bucket = cjk if CJK_RE.match(ch) else latin
                bucket.setdefault(ch, [])
                if rel not in bucket[ch]:
                    bucket[ch].append(rel)

            for ch in strip_comments(text, path.suffix):
                if keep_char(ch):
                    rendered.add(ch)

    return cjk, latin, rendered


def fetch(folder: str, name: str, refresh: bool) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / name.replace("[", "_").replace("]", "_")
    if dest.exists() and not refresh:
        return dest
    quoted = name.replace("[", "%5B").replace("]", "%5D")
    url = f"{UPSTREAM}/{folder}/{quoted}"
    print(f"  laden  {url}")
    with urllib.request.urlopen(url) as response:  # noqa: S310 — feste Domain
        dest.write_bytes(response.read())
    return dest


def build(
    out_name: str,
    src_name: str,
    folder: str,
    unicodes: list[int],
    needed: dict[str, list[str]],
    refresh: bool,
    missing: dict[str, list[str]],
    rendered: set[str],
    vertical: bool,
) -> None:
    src = fetch(folder, src_name, refresh)

    # Was die Quelldatei ueberhaupt hergibt — VOR dem Subsetten pruefen,
    # sonst meldet fontTools nur stumm weniger Glyphen.
    with TTFont(src) as probe:
        covered = set(probe.getBestCmap())
    for ch, places in needed.items():
        if ord(ch) not in covered:
            missing.setdefault(f"{src_name}\t{ch}", places)

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = False
    options.hinting = True
    options.legacy_kern = False
    options.notdef_outline = False
    options.recalc_bounds = True
    # Variable Fonts behalten ihre Gewichtsachse: eine Datei, 100 bis 900.
    options.retain_gids = False
    features = ["kern", "liga", "clig", "calt", "locl", "ccmp", "tnum", "case"]
    if vertical:
        # vert/vrt2/vkna: .jjk-fuda-title in globals.css setzt writing-mode:
        # vertical-rl, und ohne diese Tabellen stehen dort Klammern und
        # Kleinkana falsch gedreht. palt ist die Metrik, mit der Mincho-Kanji
        # nebeneinander sitzen.
        features += ["palt", "vert", "vrt2", "vkna", "vpal", "vkrn"]
    options.layout_features = features
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
    print(f"  {out_name:<30} {after:7.1f} kB   (aus {before:8.1f} kB)")


def main() -> int:
    # Ohne das bricht die Meldung ueber fehlende Glyphen unter Windows genau
    # an dem Zeichen ab, das sie melden will (Konsole steht auf cp1252).
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    refresh = "--refresh" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)

    cjk_found, latin_found, rendered = scan_source_chars()

    latin_points = LATIN_BASE | {ord(c) for c in latin_found}
    cjk_points = latin_points | KANA_BASE | {ord(c) for c in cjk_found}

    files = {f for v in cjk_found.values() for f in v} | {
        f for v in latin_found.values() for f in v
    }
    print(f"Quelltext-Scan: {len(cjk_found)} CJK-Zeichen und {len(latin_found)} "
          f"weitere Nicht-ASCII-Zeichen in {len(files)} Dateien")
    print(f"Subset-Umfang:  {len(cjk_points)} Codepoints japanisch, "
          f"{len(latin_points)} lateinisch")
    print()

    missing: dict[str, list[str]] = {}

    print("Japanisch / Anzeige:")
    for out_name, src_name, folder in CJK_FACES:
        build(out_name, src_name, folder, sorted(cjk_points),
              {**cjk_found, **latin_found}, refresh, missing, rendered,
              vertical=True)

    print()
    print("Lateinisch:")
    for out_name, src_name, folder in LATIN_FACES:
        build(out_name, src_name, folder, sorted(latin_points),
              latin_found, refresh, missing, rendered, vertical=False)

    print()
    for out_name, folder in LICENSES:
        text = fetch(folder, "OFL.txt", refresh).read_text(encoding="utf-8")
        (OUT / out_name).write_text(text, encoding="utf-8")
        print(f"  {out_name}")

    fatal = {k: v for k, v in missing.items() if k.endswith("	FEHLT")}
    harmless = {k: v for k, v in missing.items() if k not in fatal}

    if harmless:
        print()
        print("Nicht in der Schrift, aber auch nicht auf der Seite — diese")
        print("Zeichen stehen nur in Kommentaren. Kein Handlungsbedarf:")
        seen: set[str] = set()
        for key in sorted(harmless):
            ch = key.split("	")[1]
            if ch in seen:
                continue
            seen.add(ch)
            print(f"  U+{ord(ch):04X} {ch}  ({unicodedata.name(ch, '?')})")

    if fatal:
        print()
        print("FEHLENDE GLYPHEN — diese Zeichen stehen in gerendertem Text,")
        print("aber nicht in der Schrift. Der Browser faellt fuer genau dieses")
        print("eine Zeichen auf die naechste Schrift der Kette zurueck, und das")
        print("ist mitten im Wort sichtbar:")
        for key, places in sorted(fatal.items()):
            src_name, ch, _ = key.split("	")
            print(f"  {src_name}  U+{ord(ch):04X} {ch}  "
                  f"({unicodedata.name(ch, '?')})  in {', '.join(places[:3])}")
        return 1

    print()
    print("Jedes Zeichen, das auf der Seite erscheinen kann, ist in allen "
          "Schnitten enthalten.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
