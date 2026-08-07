"""
Bake the four title glyphs into SVG paths.

The hero title used to be live text with `-webkit-text-stroke`, which is fine for
a static logo but gives you nothing to animate: you cannot run a glowing edge
along a glyph you do not have the outline of. So the glyphs get extracted from
the font once, here, and shipped as path data.

Trade-off, stated plainly: changing the title text now means re-running this
script. In exchange the title never depends on a webfont loading, never flashes
a fallback, and can be drawn stroke by stroke.

Note this traces the glyph CONTOUR, not writing stroke order — fonts carry
outlines, not centrelines. The effect is the silhouette being drawn by a hot
edge, which is how the logo forms in the opening anyway.
"""

import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

FONT = "/tmp/fontdl/package/files/shippori-mincho-b1-japanese-800-normal.woff"
TEXT = "柔術廻戦"
OUT = "/tmp/jjk/lib/kanji-paths.ts"

font = TTFont(FONT)
upm = font["head"].unitsPerEm
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()

entries = []
ymin, ymax = 1e9, -1e9
for ch in TEXT:
    name = cmap[ord(ch)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)

    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    if bounds.bounds:
        ymin = min(ymin, bounds.bounds[1])
        ymax = max(ymax, bounds.bounds[3])

    entries.append(
        {
            "char": ch,
            "d": pen.getCommands(),
            "advance": glyphs[name].width,
        }
    )

ts = f'''/**
 * Title glyphs as SVG path data, generated from Shippori Mincho B1 (weight 800).
 *
 * Generated — do not hand-edit. Regenerate with scripts/gen-kanji-paths.py if the
 * title text ever changes.
 *
 * Coordinates are in font units with the Y axis pointing UP, so a consumer has
 * to flip Y (see components/kanji-title.tsx).
 */

export interface KanjiGlyph {{
  /** The character this path draws, for reference and accessibility. */
  char: string;
  /** SVG path data in font units, Y up. */
  d: string;
  /** Horizontal advance in font units. */
  advance: number;
}}

/** Font units per em — the coordinate scale of every path below. */
export const KANJI_UPM = {upm};

/** Vertical extent actually used by these glyphs, in font units, Y up. */
export const KANJI_Y_MIN = {ymin:.0f};
export const KANJI_Y_MAX = {ymax:.0f};

export const KANJI_TITLE: KanjiGlyph[] = {json.dumps(entries, ensure_ascii=False, indent=2)};
'''

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(ts)

print("wrote", OUT, "upm", upm, "glyphs", len(entries))
for e in entries:
    print(" ", e["char"], "advance", e["advance"], "path chars", len(e["d"]))
