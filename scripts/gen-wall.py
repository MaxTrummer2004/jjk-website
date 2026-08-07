"""
The wall behind the academy and gallery sections: an emaki in the dark, lit by
its own pigment.

── What it is ───────────────────────────────────────────────────────────────
A Japanese picture scroll — the aged paper is the wall, the painting on it is
barely visible, and the only thing giving light is the paint itself. Red
pigment strongly, green faintly, the ink lines just enough to be there.

That is what the opening does: a candle in front of a painted wall, and what
you see of the room is what the reds throw back.

── The five things that came before it ─────────────────────────────────────
Sweeping brush strokes read as scratches on the glass. Columns of
pseudo-characters read as fake writing. Paper lanterns read as an icon. A
network of glowing cracks read as a stain. Photographed boards worked, but they
were boards — nothing to do with the subject.

Every one of the first four failed the same way: they were things somebody
INVENTED to put on a wall, and an invented thing asks to be looked at and
judged, which is the one job a background must never do. The answer was not a
better invention. It was to stop inventing and use a real painting, at an
exposure where you can feel it without being able to read it.

── The trick that makes it possible ─────────────────────────────────────────
Paper and painting are separated out of the SAME scan.

The painted areas are inpainted with a weighted blur of everything that is not
painted. Paper has no sharp features, so that is all it takes: fibre, stains,
creases and the horizontal fold lines from being rolled all survive, and the
demons vanish. What is left is a clean sheet of thousand-year-old paper, which
is a texture nobody could have drawn.

Then the painting goes back on top at a fraction of its contrast, and a third
pass turns its pigment into the light source.

Two details, both learned the hard way:

  Ink is found by LOCAL contrast, not by absolute darkness. A scan that is
  browner in one corner than another has a great deal of "darker than the
  median" in it that is only paper.

  Pigment detection has a dead zone. Without it a stained corner registers as
  paint — an early version lit up a quarter of the frame because the paper is
  itself a warm beige and every red test found it.

── Input ────────────────────────────────────────────────────────────────────
Everything in `emaki/` next to the project root, in filename order, laid out
left to right as the scroll would run. Any format Pillow reads. More sections
mean a longer run before the texture repeats, so add as many as you have.

Sources: the Met's open-access collection (CC0 — commercial use, no attribution
required) and other museum scans in the public domain. The scans themselves are
not part of the repo; only the two plates this script writes need committing.

Dependencies are numpy and Pillow only.
"""

import os
import glob
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
SRC_DIR = os.path.join(_ROOT, "emaki")
_IMG = os.path.join(_ROOT, "public", "img")

OUT = os.path.join(_IMG, "wall.webp")
OUT_GLOW = os.path.join(_IMG, "wall-glow.webp")
OUT_SHADE = os.path.join(_IMG, "wall-shade.webp")

# Height of the finished plate. The scroll is wide and short, so this is the
# number that decides how large the demons are on screen; the width follows from
# however many sections there are.
H = 1500
# How many sections actually go into the plate.
#
# Two. More is worse, and that is not about repetition — it is that each scan
# is a separate photograph of a separate piece of paper, with its own tone and
# its own edges, so a row of them reads as a contact sheet rather than as a
# wall. Two large sections fill a screen without either edge showing.
MAX_SECTIONS = 4
# Cap on the finished plate, by AREA rather than by width.
#
# Two tall bands make a plate that is narrow and very high, so a width cap does
# not bite and the file quietly grows to megabytes. What matters is total pixels:
# a background has no business costing more than a few hundred kilobytes, and
# nothing here is ever seen at 1:1 anyway.
MAX_PIXELS = 11_800_000

# The wall is STORED bright and dimmed again in CSS. `.jjk-wall` carries a
# matching `filter: brightness(1 / WALL_GAIN)` — change one and you must change
# the other, or the section's darkness moves.
#
# This is not a look decision, it is the only way to keep the plate from falling
# apart under compression. The finished wall is near-black by design: it lived
# in code values 0..101 with a luminance standard deviation of 6.4, so the whole
# picture occupied about a seventh of the 8-bit range. Lossy codecs quantise in
# ABSOLUTE steps — at JPEG quality 84 the step for mid frequencies is 4 to 8,
# which against a signal that small flattens each 8x8 block to a constant and
# leaves the block edges showing as horizontal streaking. Measured against the
# float the plate is derived from, the error was 2.79 code values on a signal
# whose sd is 6.4: a 44 % error.
#
# Multiplying by 2.5 before encoding and dividing by 2.5 at display time divides
# the codec's error by 2.5 as well, because the error is added in the stored
# domain and scaled down with everything else. Same file size, 30 % less error.
# WebP does the rest: it has no 8x8 block grid to leave behind, and the grid
# metric drops from 1.33 to 1.07 (1.0 = no block structure at all).
#
# 2.5 clips the brightest hundredth of a percent of the paper — specular
# highlights on fibre, invisible at this exposure. Going to 2.18 would clip
# nothing, but the gain would then depend on the brightest pixel in whichever
# scans happen to be in emaki/, and the CSS constant would silently stop
# matching the next time the plate is rebuilt. A fixed number that clips a
# little is the safer of the two.
WALL_GAIN = 2.5

# Quality for both plates. Lower than the JPEG it replaces and still better,
# because WebP spends its bits where this content actually is.
WEBP_QUALITY = 74

# ---- how far the figures throw light --------------------------------------
# Radii as a fraction of plate height, and they are large on purpose: the third
# one reaches a quarter of the way across the plate. That is the difference
# between paint that is lit and paint that lights the room.
#
# This drives a THIRD plate, `wall-shade`, which is not a picture at all — it is
# an alpha channel that gets used as a CSS mask on the section's darkness. Where
# a figure throws light the mask opens and the paper underneath becomes visible
# with all its texture; between figures the darkness stands at full strength.
#
# It has to work that way round. The obvious alternative — leave the darkness
# alone and turn the red glow up — cannot work, because the glow is screened ON
# TOP of the darkness and screen only adds light. You would get red pools
# floating on black instead of lit paper, which this project has already built
# once by accident.
LIGHT_RADII = (0.032, 0.092, 0.25)
LIGHT_WEIGHTS = (0.44, 0.34, 0.30)
# How much of the darkness the brightest point removes. Not 1.0: even directly
# on a figure a little of the veil stays, so the brightest spots stop just
# short of bare paper and still read as pools of light rather than as holes.
SHADE_MAX = 0.95
# Everything below this percentile of the light field is set to zero dark.
#
# Without it the widest blur puts a little light on literally every pixel — the
# first run reported "light reaches 100 % of the wall" — and the section comes
# out evenly lifted again, which is the whole thing we are trying to get rid of.
# Subtracting a floor is what makes the space between figures actually unlit.
LIGHT_FLOOR_PCT = 40


def blur(x, s):
    """Gaussian blur by FFT, cyclic — so it never disturbs the tiling."""
    h, w = x.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * (np.pi ** 2) * (s ** 2) * (fy * fy + fx * fx))
    if x.ndim == 2:
        return np.fft.irfft2(np.fft.rfft2(x) * k, s=(h, w)).astype(np.float32)
    return np.stack(
        [np.fft.irfft2(np.fft.rfft2(x[..., i]) * k, s=(h, w)) for i in range(x.shape[2])],
        axis=-1,
    ).astype(np.float32)


def blur_mirror(x, s):
    """Gaussian blur, mirror-padded — not cyclic, safe at panel edges.

    blur() wraps cyclically, which is what the finished plate's tiling wants.
    For per-panel vignette removal the panels are NOT tiles of each other, so
    the cyclic version would bleed the left edge of each panel into its own
    right edge, creating a ghost stripe. Mirror padding avoids that: the FFT
    sees a reflection of the panel's own content at the border and never a
    hard discontinuity.
    """
    h, w = x.shape[:2]
    ph = pw = int(s * 3)
    if x.ndim == 2:
        out = blur(np.pad(x, ((ph, ph), (pw, pw)), mode="reflect"), s)
        return out[ph : ph + h, pw : pw + w]
    out = blur(np.pad(x, ((ph, ph), (pw, pw), (0, 0)), mode="reflect"), s)
    return out[ph : ph + h, pw : pw + w]


def dither(shape, t, seed=11):
    """
    A per-pixel choice between two sources, instead of an average of them.

    Cross-fading is the obvious way to join two pieces of paper and it has one
    fatal property: averaging two textures halves their variance. In the middle
    of the fade the grain drops to about 70 % of either side, and a strip where
    the grain quietens is exactly as visible as a strip where it stops — the eye
    is reading texture, not brightness. Measured on the horizontal tile seam,
    the blend zone came out at a column standard deviation of 2.8 against a
    plate median of 6.4, over 7 % of the width.

    So: don't average, choose. Every pixel is taken WHOLLY from one side or the
    other, at full contrast, and the probability of picking the far side ramps
    across the zone. Variance is preserved exactly, because no pixel is ever a
    mixture. What used to be a straight soft boundary becomes an irregular hard
    one, and an irregular boundary between two pieces of the same paper is not a
    boundary at all.

    Two details:

      The noise is blurred, so neighbouring pixels tend to agree and the
      boundary breaks into patches a few pixels across rather than into
      salt-and-pepper.

      Blurring pulls the noise toward its mean, so it is rank-equalised back to
      a flat distribution afterwards. Without that the transition collapses into
      the middle third of the zone and behaves like a hard cut with a fuzzy
      edge.
    """
    rng = np.random.default_rng(seed)
    n = blur_mirror(rng.random(shape).astype(np.float32), 2.2)
    flat = n.ravel()
    ranked = np.empty_like(flat)
    ranked[np.argsort(flat)] = np.linspace(0, 1, flat.size, dtype=np.float32)
    return ranked.reshape(shape) < t


def seam(a, band, axis=0):
    """
    Make the top and bottom edges meet.

    Both directions get one. Mirroring was tried for the horizontal seam, as
    the board version used, and it does not survive here: a mirrored plank is
    still a plank, but a mirrored demon is obviously the same demon facing the
    other way, and the axis of symmetry is the first thing you see.

    Cross-fading a brush line is visible too, which is why the fade band is
    placed over the emptiest column in the plate rather than at an arbitrary
    edge — see `quietest`.
    """
    out = a.copy()
    t = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, band))
    if axis == 0:
        zone = a[-band:]
        m = dither(zone.shape[:2], t.reshape(-1, 1), seed=11)
        out[-band:] = np.where(m[..., None] if a.ndim == 3 else m, a[:band], zone)
    else:
        zone = a[:, -band:]
        m = dither(zone.shape[:2], t.reshape(1, -1), seed=17)
        out[:, -band:] = np.where(m[..., None] if a.ndim == 3 else m, a[:, :band], zone)
    return out


def quietest(mask, band):
    """
    Roll the plate so its emptiest vertical strip ends up at the edge.

    The horizontal seam has to be cross-faded, and a fade across a brush line
    shows. Putting the join where there is the least paint costs one np.roll and
    makes the difference between an invisible seam and a smeared demon.
    """
    col = mask.mean(axis=0)
    run = np.convolve(np.concatenate([col, col]), np.ones(band) / band, mode="valid")
    return int(np.argmin(run[: len(col)]))


# ================================================================== source ===
paths = sorted(
    p for p in glob.glob(os.path.join(SRC_DIR, "*"))
    if os.path.splitext(p)[1].lower() in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
)
if not paths:
    raise SystemExit(f"no scans in {SRC_DIR} — put the emaki sections there and re-run")

paths_all = list(paths)   # every scan, for choosing the gap paper
paths = paths[:MAX_SECTIONS]

panels = []
for path in paths:
    im = Image.open(path).convert("RGB")
    w = max(1, int(im.width * H / im.height))
    panels.append(np.asarray(im.resize((w, H), Image.LANCZOS), np.float32) / 255.0)

# Level every section onto a common paper tone.
#
# This is what actually kills the patchwork. The sections are separate
# photographs taken under separate lights, so one is pinker and one is greyer,
# and where two meet there is a vertical step in colour that reads as an edge no
# matter how carefully they are joined. Shifting each one onto the average
# median makes them a single sheet.
tones = [np.median(p.reshape(-1, 3), axis=0) for p in panels]
target = np.mean(tones, axis=0)
panels = [np.clip(p + (target - t), 0, 1) for p, t in zip(panels, tones)]

# ---- Per-panel illumination correction ------------------------------------
# Median-shift above equalises the mean, but each scan still carries its own
# slow gradient from the lighting rig it was shot under — a pinker corner,
# a cooler edge — and that gradient survives the join as a large-scale
# brightness ramp that the eye reads as an edge even when the averages match.
#
# Fix: subtract each panel's own low-frequency illumination field (blur radius
# H/3, so only the very slow variations move), then add the panel's scalar
# mean brightness back. Fine detail — fibre, stains, ink — lives in the high
# frequencies and is not touched; only the slow gradient goes.
#
# blur_mirror rather than blur here: the panels are not tiles of each other, so
# the cyclic wrap would cause each panel's left edge to contaminate its own
# right edge through the convolution. Mirror padding keeps the correction local.
panels_new = []
for p in panels:
    lf = blur_mirror(p, H / 3)
    lf_base = np.median(lf.reshape(-1, 3), axis=0)
    panels_new.append(np.clip(p - lf + lf_base, 0, 1))
panels = panels_new

# ---- laid out in BANDS, not in one long strip ------------------------------
# A scroll section is roughly 3:2 landscape, so a row of them is enormously
# wide: eight of them side by side is a plate twenty times wider than it is
# tall, which on a page means the drawings sit in one thin line with nothing
# above or below. Stacking them into bands with paper between spreads the
# painting over the height of the section instead, and it is how scrolls were
# actually mounted on a wall.
#
# The gap matters as much as the layout. It is where the vertical seam ends up,
# and a seam in blank paper is invisible in a way that a seam through a demon
# never is — which is what makes the mirroring the previous version needed
# unnecessary here.
# One section per band. Always — the plate is never laid out side by side.
#
# This used to aim for a squarish plate, which is the right instinct for an
# image and the wrong one for this image, because CSS shows it at a fixed
# WIDTH: `background-size: 2000px auto`. Width is therefore the one dimension
# that buys nothing. A plate twice as wide is not twice as much painting on
# screen, it is the same painting at half size in a tile half as tall — so it
# repeats twice as often AND the demons shrink. Measured, going from two
# sections to four the squarish way: the tile fell from 2750px to 1398px on
# screen and every figure halved.
#
# Stacked, height is free. Four sections make a tile 2.2x taller than the old
# two at the same figure size, so the page repeats a third as often. It also
# retires the horizontal cross-fade between sections inside a band (HBLEND):
# with one per band there is no side-by-side joint left to hide.
per = 1
ROWS = len(panels)
# Pure black between the bands. Smaller than it was, because the falloff no
# longer lives in here — it lives inside the bands (see FADE_OF_H) and the gap
# is now only the dead middle. Keeping 0.34 would have put three quarters of a
# viewport of nothing between two paintings.
GAP = int(H * 0.20)

# ---- horizontal cross-fade at section joints within each row --------------
# When per > 1, two scan sections meet side by side inside a row. A hard
# concatenation leaves a vertical seam where the two photographs differ in
# grain direction, small-scale tone, or anything the slow-gradient correction
# did not capture. A 6 %-wide cosine ramp dissolves that boundary.
HBLEND = max(8, int(H * 0.06))


def h_blend(left, right, bw):
    """Join two scan sections without averaging them — see `dither`."""
    t = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, bw))).reshape(1, -1)
    m = dither(left[:, -bw:].shape[:2], t, seed=23)
    blend = np.where(m[..., None], right[:, :bw], left[:, -bw:])
    return np.concatenate([left[:, :-bw], blend, right[:, bw:]], axis=1)


rows = []
for r in range(ROWS):
    chunk = panels[r * per : (r + 1) * per]
    if not chunk:
        continue
    row = chunk[0]
    for p in chunk[1:]:
        row = h_blend(row, p, HBLEND)
    rows.append(row)

row_w = max(r.shape[1] for r in rows)

# Rows are padded to a common width by repeating their own last strip of paper,
# so a short row trails off into blank scroll rather than ending in a hard edge.
padded = []
for r in rows:
    if r.shape[1] < row_w:
        tail = r[:, -max(8, r.shape[1] // 10):]
        reps = int(np.ceil((row_w - r.shape[1]) / tail.shape[1]))
        fill = np.concatenate([tail[:, ::-1], tail] * reps, axis=1)[:, : row_w - r.shape[1]]
        r = np.concatenate([r, fill], axis=1)
    padded.append(r)

# ---- the gap is blank paper, quilted ---------------------------------------
# Three answers before this one, and each failure narrowed the problem.
#
#   Flat colour. The wall is built from `det = plum - blur(plum)`, so a field
#   with no spatial variation has det = 0 and comes out perfectly smooth. The
#   eye finds that boundary instantly — not from a brightness step, which
#   colour-matching fixes, but from grain simply stopping.
#
#   Synthesised paper: the quietest ROWS from all the scans, sorted by how quiet
#   they were, mirror-stacked. Sorting rows by quietness throws away the one
#   thing that made them paper — that each row belongs directly above the next.
#   What came back was horizontal streaking with no vertical structure, repeated
#   up and down the gap by the mirroring.
#
#   Darkness. Correct in principle, and it does look clean, but it reads as a
#   hole punched in the wall rather than as the wall continuing. The section is
#   supposed to be one sheet of old paper with paintings on it at intervals.
#
# So: a real, unbroken, two-dimensional piece of blank paper, in its original
# row order, taken from the same scans.
#
# The source is chosen by measurement rather than named, because the obvious
# candidate is the wrong one. The scan with the emptiest corner in the set is
# 600 px wide, which at band height is a 3.9x upscale — its "grain" would be
# interpolation, not fibre. The scoring below therefore penalises upscale, and
# it picks a section that is not used for the bands at all: same paper, same
# photographic session, 1.6x like everything else, and a 700x700 clear area.
PAPER_MAX_UPSCALE = 2.4
PAPER_OVERLAP = 0.18   # of the block width, dithered — see `dither`


def _busy(a):
    """Where there is drawing. Same two tests the plate itself is built on."""
    lm = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    ink = np.clip((blur_mirror(lm, H / 50) - lm) * 6.5, 0, 1)
    d = a - np.median(a.reshape(-1, 3), axis=0)
    pig = np.maximum(
        np.clip((d[..., 0] - d[..., 2] - 0.07) * 11.0, 0, 1),
        np.clip((d[..., 1] - d[..., 0] - 0.05) * 11.0, 0, 1),
    )
    return np.maximum(ink, pig)


def _clearest_block(a, bh, bw):
    """Emptiest bh x bw rectangle, and how empty it is."""
    b = _busy(a)
    ii = np.pad(b, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    ys = range(0, max(1, b.shape[0] - bh), 40)
    xs = range(0, max(1, b.shape[1] - bw), 40)
    best = (1e9, 0, 0)
    for y in ys:
        for x in xs:
            v = (ii[y + bh, x + bw] - ii[y, x + bw] - ii[y + bh, x] + ii[y, x]) / (bh * bw)
            if v < best[0]:
                best = (v, y, x)
    return best


BLOCK_H, BLOCK_W = min(H // 2, 700), 700
cands = []
for path in paths_all:
    im = Image.open(path).convert("RGB")
    if H / im.height > PAPER_MAX_UPSCALE:
        continue
    arr = np.asarray(
        im.resize((max(1, int(im.width * H / im.height)), H), Image.LANCZOS), np.float32
    ) / 255.0
    if arr.shape[1] < BLOCK_W:
        continue
    v, y, x = _clearest_block(arr, BLOCK_H, BLOCK_W)
    cands.append((v, os.path.basename(path), arr[y : y + BLOCK_H, x : x + BLOCK_W]))
if not cands:
    raise SystemExit("no scan with enough resolution for the gap paper")
cands.sort(key=lambda c: c[0])
paper_busy, paper_from, paper_block = cands[0]

# Level it onto the same tone and illumination as the bands, or the gap would be
# a different sheet however well it is joined.
paper_block = np.clip(paper_block + (target - np.median(paper_block.reshape(-1, 3), axis=0)), 0, 1)
# Same gradient-flattening the panels get, at a radius scaled to the block —
# H/3 on a 700 px square would be mostly mirror padding rather than measurement.
_lf = blur_mirror(paper_block, min(H, BLOCK_H) / 3)
paper_block = np.clip(paper_block - _lf + np.median(_lf.reshape(-1, 3), axis=0), 0, 1)
print(f"gap paper from {paper_from}: {BLOCK_W}x{BLOCK_H}, drawing {paper_busy*100:.1f}%")


def quilt(block, th, tw, seed):
    """
    Fill th x tw from one block, without a visible repeat.

    Two things do the work. Every patch is taken at a different random vertical
    offset inside the block, so no two columns of the finished field are the
    same rows of paper — which is what makes a tiled texture readable as tiled.
    And the joins are dithered rather than cross-faded (see `dither`), so the
    boundary between patches is irregular and no pixel is ever an average of
    two, which would show as a strip of quietened grain.
    """
    rng = np.random.default_rng(seed)
    bh, bw = block.shape[:2]
    ov = max(8, int(bw * PAPER_OVERLAP))
    out = np.zeros((th, tw, block.shape[2]), np.float32)

    def patch():
        oy = int(rng.integers(0, max(1, bh - th + 1)))
        p = block[oy : oy + th]
        if p.shape[0] < th:  # block shorter than the gap: reflect to fill
            p = np.concatenate([p, p[::-1]] * (th // max(1, p.shape[0]) + 1), axis=0)[:th]
        return p

    x = 0
    while x < tw:
        p = patch()
        w = min(bw, tw - x)
        if x == 0:
            out[:, :w] = p[:, :w]
        else:
            k = min(ov, w)
            t = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k))).reshape(1, -1)
            m = dither((th, k), t, seed=seed + x)
            out[:, x : x + k] = np.where(m[..., None], p[:, :k], out[:, x : x + k])
            if w > k:
                out[:, x + k : x + w] = p[:, k:w]
        x += bw - ov
    return out


def v_join(top, bottom, bw, seed):
    """Stack two blocks, dithering the boundary instead of cutting it."""
    t = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, bw))).reshape(-1, 1)
    m = dither((bw, top.shape[1]), t, seed=seed)
    blend = np.where(m[..., None], bottom[:bw], top[-bw:])
    return np.concatenate([top[:-bw], blend, bottom[bw:]], axis=0)


VJOIN = max(8, int(GAP * 0.30))
half_top, half_bot = GAP // 2, GAP - GAP // 2

# The plate's top and bottom are ONE gap, cut in half and put at opposite ends.
#
# When the plate tiles vertically the bottom edge is followed by the top edge,
# so those two halves meet again and rejoin into the block they were cut from —
# the wrap is a genuine continuation rather than two pieces of paper that happen
# to be similar. This matters: with quilted paper at both ends and no such
# arrangement the vertical seam measured 7.03 against a neighbouring-row figure
# of 2.02, which is a hard horizontal line once per tile.
wrap = quilt(paper_block, GAP, row_w, 101)

art = wrap[half_bot:]
for i, r in enumerate(padded):
    art = v_join(art, r, min(VJOIN, art.shape[0], r.shape[0]), 200 + i)
    tail = wrap[:half_bot] if i == len(padded) - 1 else quilt(paper_block, GAP, row_w, 300 + i)
    art = v_join(art, tail, min(VJOIN, tail.shape[0], r.shape[0]), 400 + i)

# ---- the same trick sideways ----------------------------------------------
# The horizontal wrap had no equivalent fix and it showed: the left and right
# edges are different parts of the painting, so tiling them next to each other
# left a faint vertical line every 2000 px on screen — measured at 4.11 against
# a neighbouring-column figure of 1.96, i.e. twice a normal step, and a straight
# vertical line is something the eye is unusually good at.
#
# So a strip of the same quilted paper is laid over the emptiest columns of the
# plate, cut in half, and the halves put at the two edges. Tiled, they rejoin
# into the strip they came from. Emptiest columns because the strip replaces
# whatever was there — over blank scroll that costs nothing, over a demon it
# would be vandalism, which is what the search below is for.
STRIPE_OF_W = 0.055

stripe_w = max(24, int(art.shape[1] * STRIPE_OF_W))
colbusy = _busy(art).mean(axis=0)
run = np.convolve(np.concatenate([colbusy, colbusy]), np.ones(stripe_w) / stripe_w, mode="valid")
best_x = int(np.argmin(run[: art.shape[1]]))
art = np.roll(art, -best_x, axis=1)      # emptiest strip now starts at column 0

stripe = quilt(paper_block, art.shape[0], stripe_w, 909)
half_l = stripe_w // 2
# Left edge gets the SECOND half of the strip, right edge the first: tiled, the
# right edge is followed by the left and the strip is continuous again.
art[:, :half_l] = stripe[:, stripe_w - half_l :]
art[:, art.shape[1] - (stripe_w - half_l) :] = stripe[:, : stripe_w - half_l]
print(f"wrap stripe {stripe_w}px over columns with {run[best_x]*100:.1f}% drawing")

if art.shape[0] * art.shape[1] > MAX_PIXELS:
    k = (MAX_PIXELS / (art.shape[0] * art.shape[1])) ** 0.5
    im = Image.fromarray((art * 255).astype(np.uint8))
    art = np.asarray(
        im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS), np.float32
    ) / 255.0
    # GAP is in pixels and the vertical fade band is sized from it, so it has to
    # come down with everything else. Forgetting this put the fade half outside
    # the gap and the seam went from 0.1 to 9.
    GAP = max(8, int(GAP * k))
print(f"{len(paths)} section(s) in {ROWS} band(s) -> {art.shape[1]}x{art.shape[0]}")

# ============================================================ what is paint ==
paper_tone = np.median(art.reshape(-1, 3), axis=0)
dev = art - paper_tone
lum = 0.2126 * art[..., 0] + 0.7152 * art[..., 1] + 0.0722 * art[..., 2]

# Local contrast, so an unevenly aged sheet does not read as drawing.
ink = np.clip((blur(lum, H / 50) - lum) * 6.5, 0, 1)
# Dead zones on both, so a stained corner is not mistaken for pigment.
redder = np.clip((dev[..., 0] - dev[..., 2] - 0.07) * 11.0, 0, 1)
greener = np.clip((dev[..., 1] - dev[..., 0] - 0.05) * 11.0, 0, 1)
drawing = np.clip(np.maximum(ink, np.maximum(redder, greener)), 0, 1)

# ================================================================== paper ====
hole = np.clip(drawing * 2.2, 0, 1)[..., None]
keep = 1.0 - hole
paper = np.where(hole > 0.03, blur(art * keep, H / 27) / (blur(keep, H / 27) + 1e-4), art)

# Only the sides are trimmed now. The top and bottom of the plate are the gaps
# added above, which is exactly what the vertical seam wants to land in.
# Nothing is trimmed any more. The side trim existed to cut off the panel edge
# artefacts at the extreme left and right; the wrap stripe now overwrites the
# outer 5.5 % of the plate with blank paper and covers that ground already. And
# trimming would be actively harmful: it would cut into the two halves of the
# stripe and break the horizontal wrap they exist to make exact.
cy, cx = 0, 0
crop = (slice(cy, art.shape[0] - cy), slice(cx, art.shape[1] - cx))
paper, ink, redder, greener, drawing = (
    x[crop] for x in (paper, ink, redder, greener, drawing)
)
CH, CW = drawing.shape
BX = max(24, CW // 26)
# The vertical fade has to fit INSIDE the half-gap at each edge, or it reaches
# into the painting and smears a demon across the join — which is what a band
# wider than the gap did on the first attempt.
BY = max(24, int(GAP * 0.45))
shift = quietest(drawing, BX)


def tile(a):
    # Both seams are cross-faded, and both land in blank paper — vertically in
    # the gap between bands, horizontally at the emptiest column, which the roll
    # puts at the edge. An earlier version had to mirror vertically because the
    # plate was one band and its top and bottom were sky and ground; with bands
    # and gaps there is nothing at either edge to mismatch.
    a = np.roll(a, -shift, axis=1)
    # Nothing to do. Both wraps are now exact by construction — the top and
    # bottom of the plate are two halves of one quilted block, and so are the
    # left and right edges. Rolling or cross-fading here would move the edges
    # off those halves and break the only two joins that are currently perfect.
    return a


paper, ink_t, redder_t, greener_t = (tile(x) for x in (paper, ink, redder, greener))

# ==================================================================== wall ===
# Near-black and warm. Only the paper's fine detail is kept — its overall
# lightness is thrown away, or the wall would be a beige rectangle.
plum = 0.2126 * paper[..., 0] + 0.7152 * paper[..., 1] + 0.0722 * paper[..., 2]
det = plum - blur(plum, H / 78)
base = np.clip(0.050 + det * 1.35, 0, 1)
wall = np.stack([base * 1.25, base * 1.02, base * 0.86], axis=-1)
# The painting, only just present.
wall *= 1 - ink_t[..., None] * 0.42

Image.fromarray(np.clip(wall * WALL_GAIN * 255, 0, 255).astype(np.uint8), "RGB").save(
    OUT, "WEBP", quality=WEBP_QUALITY, method=6
)

# =================================================================== glow ====
# The DRAWING lights up, in its own shape. Not the red passages, the drawing:
# ink lines, pigment, all of it.
#
# This is the same arrangement as the hero's city, and it took getting it wrong
# to see why. There, `graz-glow` holds the streetlights, and each one lights up
# exactly where it is — a sharp core with a halo around it, so you read
# individual lights in a city rather than a glowing haze. The first version here
# had a huge bloom and almost no core, so the red passages dissolved into
# floating orange clouds with no relation to anything drawn. Red stuff drifting
# about, rather than a painting catching light.
#
# So: a hard core carrying the actual shapes, and only a modest halo. The
# pigment is brighter than the ink, which is what the candle does to it, but
# every line is in there and every line lights up in place.
core = np.clip(ink_t * 0.72 + redder_t * 1.0 + greener_t * 0.55, 0, 1)
# One extra, much wider term than the original three. The red has to reach far
# enough off the figure to look like it is coming FROM it, but not so far that
# it becomes an even wash — the long reach is the shade map's job, not this
# plate's.
# How far the light reaches. Computed here rather than with the shade plate
# further down, because BOTH plates have to be gated by it — see below.
lit = sum(
    blur(core, max(1.0, CH * r)) * w for r, w in zip(LIGHT_RADII, LIGHT_WEIGHTS)
)
lit /= max(float(np.percentile(lit, 99.9)), 1e-6)
_floor = float(np.percentile(lit, LIGHT_FLOOR_PCT))
lit = np.clip((lit - _floor) / max(1e-6, 1.0 - _floor), 0, 1)
# A gentle knee rather than a straight line: it keeps the space between figures
# genuinely dark instead of lifting the whole section on the tail of the blur.
# 1.15, not the 1.45 it started at. The steeper knee kept the space between
# figures beautifully dark and also crushed everything in the middle — the pools
# fell off so fast that only the paint itself was really lit and the wall around
# it barely moved. Flatter here, and the floor above does the job of keeping the
# far field black.
lit = np.clip(np.power(lit, 1.15), 0, 1)

halo = (
    blur(core, 5) * 0.34
    + blur(core, 18) * 0.22
    + blur(core, 60) * 0.16
    + blur(core, CH * 0.075) * 0.10
)
# The halo is switched off wherever no light reaches, and this is the single
# most important line in the file for making the two sections match.
#
# Without it the glow plate still carries a median of 2 code values across the
# 60 % of the wall where the shade mask is fully closed. Screened at a third
# opacity that lifts the ENTIRE section by about one code value — and the
# pointer-lit section above has no glow layer at all, so it sits at 0.78 while
# this one sits at 1.78. Twice as bright, everywhere, which is exactly the step
# at the boundary. Gating both plates on one field makes "unlit" mean the same
# thing in both of them, by construction rather than by tuning.
halo *= np.clip(lit * 2.5, 0, 1)
g = np.clip(core * 0.92 + halo, 0, 1.25)

# Anything that glows also opens the darkness, and this line is what guarantees
# it rather than hoping for it.
#
# `lit` is built from blurs a hundred pixels wide and up, so a thin isolated ink
# stroke barely registers in it while showing up strongly in the glow. Those
# strokes were then lighting the section without revealing any of the wall
# around them — 1 % of the closed region was still coming through at ten code
# values. Taking the maximum of the two makes "there is light here" mean one
# thing across both plates.
lit = np.maximum(lit, np.clip(g * 0.9, 0, 1))
glow = np.stack([g * 0.78, np.power(g, 1.7) * 0.26, np.power(g, 2.6) * 0.09], axis=-1)

# No gain on the glow. Its red channel already runs the full 0..255 — it is a
# picture of light, not of near-black paper — so it has none of the headroom
# problem the wall has and nothing to gain from being scaled.
Image.fromarray(np.clip(glow * 255, 0, 255).astype(np.uint8), "RGB").save(
    OUT_GLOW, "WEBP", quality=WEBP_QUALITY, method=6
)

# =================================================================== shade ===
# The darkness, with holes in it where the figures reach.
#
# Stored as ALPHA rather than as luminance: a CSS mask defaults to reading the
# alpha channel, and `mask-mode: luminance` is the shakier of the two paths
# across browsers. So the colour here is irrelevant and the whole signal lives
# in the fourth channel — opaque where the wall is unlit, transparent where a
# figure lights it.
# At a THIRD of the plate's resolution, and that is where the budget for a
# longer painting came from.
#
# This file was 1.79 MB — the single largest asset on the site — and three
# quarters of it was nothing. It is stored RGBA because a CSS mask reads the
# alpha channel by default (`mask-mode: luminance` is the shakier path across
# browsers), so the three colour channels are written as exact zeros and the
# codec still spends bits on them. Worse, it was carrying a soft light falloff
# at full plate resolution: the smallest of LIGHT_RADII is 1.5% of the plate
# height, so there is nothing in this signal above about a hundredth of Nyquist.
#
# Measured against the full-resolution mask, a third-size version reconstructs
# to a mean error of 4.2 of 255 on a channel whose job is to fade darkness in
# and out over hundreds of pixels. It is upscaled by the browser to
# `mask-size: 2000px auto` regardless.
SHADE_SCALE = 3
sh = np.clip((1.0 - lit * SHADE_MAX) * 255, 0, 255).astype(np.uint8)
sh = np.asarray(
    Image.fromarray(sh, "L").resize(
        (max(1, CW // SHADE_SCALE), max(1, CH // SHADE_SCALE)), Image.LANCZOS
    ),
    np.uint8,
)
shade = np.zeros((sh.shape[0], sh.shape[1], 4), np.uint8)
shade[..., 3] = sh
Image.fromarray(shade, "RGBA").save(
    OUT_SHADE, "WEBP", quality=WEBP_QUALITY + 8, method=6
)
print(f"   wrote {os.path.basename(OUT_SHADE)}  "
      f"{os.path.getsize(OUT_SHADE) // 1024} KB")
print(f"  light reaches {100 * (lit > 0.08).mean():.0f}% of the wall, "
      f"strongly ({(lit > 0.5).mean() * 100:.0f}%)")

# Read back at DISPLAY brightness, not storage brightness: everything below is
# a threshold in code values, and the texture check compares against fixed
# fractions. Leaving the gain in would silently scale every number here by 2.5
# and make them incomparable with every earlier run.
w = np.asarray(Image.open(OUT), np.float32) / WALL_GAIN
wl = 0.2126 * w[..., 0] + 0.7152 * w[..., 1] + 0.0722 * w[..., 2]
sx = float(np.abs(w[:, 0] - w[:, -1]).mean())
sy = float(np.abs(w[0] - w[-1]).mean())
inner = float(np.abs(w[:, 400] - w[:, 401]).mean())
print(f"wrote {OUT}\n       {OUT_GLOW}   {w.shape[1]}x{w.shape[0]}")
print(f"  wall luminance mean {wl.mean():.1f}  sd {wl.std():.1f}")
print(f"  painted {drawing.mean()*100:.0f}% of the scan, of which red {(redder>0.3).mean()*100:.1f}%")
print(f"  seam  x {sx:.2f}  y {sy:.2f}   vs neighbouring columns {inner:.2f}")

# ---- texture uniformity check ---------------------------------------------
# Gap rows should no longer stand out. Success criterion: no run of more than
# ~30 consecutive rows below 60 % of the median row std, same for columns.
# Measured only where there is supposed to be wall. The gaps are deliberately
# black now, so including them would report a five-hundred-row quiet run every
# time and the check would be answering a question nobody asked.
# 0.98, not 0.5: the rows inside the falloff are dimmed on purpose, and a dimmed
# row has a lower standard deviation for reasons that have nothing to do with
# texture. Including them reported a 66-row quiet run that was simply the fade.
row_std = wl.std(axis=1)
# Columns are measured with the seam zones cut off at both edges, because those
# are quiet ON PURPOSE and the check was reporting the design as a defect.
# `quietest` rolls the emptiest strip of the painting to the edge so the
# horizontal join lands in blank paper — that is the entire point of it. Proved
# by running with the join disabled altogether: the outer columns still came out
# at a standard deviation of 3.25 against a plate median of 6.60, so the
# quietness is in the painting, not in the blending.
col_std = wl[:, BX : -BX or None].std(axis=0)
# Referenced to the 20th percentile, not the median.
#
# The median is pulled up by rows full of painting, and the gap is blank paper
# by definition — measuring it against painted rows reports every blank row on
# the wall as a defect, which is not the question. What this check exists to
# catch is texture that is ABSENT: a flat synthesised field with no grain at
# all, which was the first version of the gap and scored near zero. The 20th
# percentile is roughly what blank paper measures, so blank paper passes and
# genuinely dead areas still fail.
med_row = float(np.percentile(row_std, 20))
med_col = float(np.percentile(col_std, 20))
threshold_row = med_row * 0.60
threshold_col = med_col * 0.60

def longest_run_below(arr, thr):
    best = cur = 0
    for v in arr:
        if v < thr:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best

worst_row_run = longest_run_below(row_std, threshold_row)
worst_col_run = longest_run_below(col_std, threshold_col)
print(f"  texture check: worst quiet-row run {worst_row_run} rows  "
      f"(threshold <30, limit {threshold_row:.2f}  median {med_row:.2f})")
# Informational, not a pass/fail. The vertical direction has no equivalent of
# the gap problem — there is nothing synthesised anywhere across the width — and
# the emptiest strip of the painting is deliberately parked next to the seam, so
# a quiet run of a few percent of the width there is the design working, not
# failing. The row figure above is the one to watch.
print(f"                 quiet-col run {worst_col_run} cols of {col_std.shape[0]} "
      f"({100 * worst_col_run / col_std.shape[0]:.0f}% — expected near the seam)  "
      f"limit {threshold_col:.2f}  median {med_col:.2f}")
