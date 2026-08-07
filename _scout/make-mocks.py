"""Render all three opening mocks: contact sheet + GIF each.

Run from _scout/:  python make-mocks.py [1|2|3]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

from mocklib import (W, H, N, PAPER, SITE_BG, VERMILION, EMBER, CREAM,
                     GOLD_CREAM, FONT_LATIN, seg, ease_out, ease_in, to_np,
                     to_im, rgb_offset, darken_to, vignette, grain, night_grade,
                     draw_kanji_column, draw_text, seal, paper_field,
                     save_outputs)

Image.MAX_IMAGE_PIXELS = None
A = "assets"

TITLE = "柔術廻戦"
SUB = "JIU-JITSU KAISEN ACADEMY · GRAZ"


def cover_crop(im, cx, cy, frac_w, out_w=W, out_h=H):
    """16:9 crop centred at (cx,cy) fractions, frac_w of source width."""
    w, h = im.size
    cw = int(w * frac_w)
    ch = int(cw * out_h / out_w)
    x0 = int(w * cx - cw / 2)
    y0 = int(h * cy - ch / 2)
    x0 = max(0, min(w - cw, x0))
    y0 = max(0, min(h - ch, y0))
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize((out_w, out_h),
                                                      Image.LANCZOS)


def candle_grade(im, t=1.0):
    """The parade treatment: contrast into the night, warm light over it."""
    a = to_np(im) / 255.0
    a = a ** (1 + 0.9 * t)                       # crush toward dark
    warm = a * np.array([1.06, 0.88, 0.66])      # candlelight
    out = warm * (1 - 0.30 * t)
    return to_im(np.clip(out, 0, 1) * 255)


# ───────────────────────── Konzept 1: Der Griff ─────────────────────────────
def konzept1():
    src = Image.open(f"{A}/met-55144-onogawa-tanikase.jpg")
    heads = cover_crop(src, 0.50, 0.14, 0.55)
    grip = cover_crop(src, 0.55, 0.42, 0.60)
    # full print on dark field, right of centre; kanji column left
    full_h = int(H * 0.92)
    full = src.resize((int(src.size[0] * full_h / src.size[1]), full_h),
                      Image.LANCZOS)
    paper = paper_field()

    frames = []
    for f in range(N):
        if f < 8:  # dark paper, ghost 柔
            im = paper.copy()
            t = seg(f, 2, 8)
            if t > 0:
                im = draw_kanji_column(im, "柔", W // 2, H // 2 - 190, 380,
                                       VERMILION, opacity=0.10 * t)
        elif f < 22:  # CUT: heads
            t = seg(f, 8, 22)
            im = candle_grade(heads, 0.85)
            im = rgb_offset(im, max(0, int(7 * (1 - seg(f, 8, 13)))))
            a = to_np(im) * (0.9 + 0.1 * ease_out(t))
            im = to_im(a)
        elif f < 36:  # CUT: grip
            t = seg(f, 22, 36)
            im = candle_grade(grip, 0.85)
            im = rgb_offset(im, max(0, int(7 * (1 - seg(f, 22, 27)))))
            a = to_np(im) * (0.9 + 0.1 * ease_out(t))
            im = to_im(a)
        else:  # full print + title
            t = seg(f, 36, 60)
            im = paper.copy()
            im = darken_to(im, SITE_BG, 0.55)
            scale = 1.0 + 0.05 * (1 - ease_out(t))
            fh = int(full_h * scale)
            fw = int(full.size[0] * fh / full.size[1])
            plate = candle_grade(full.resize((fw, fh), Image.LANCZOS), 0.7)
            px = int(W * 0.60 - fw / 2)
            py = (H - fh) // 2
            mis = max(0, int(6 * (1 - seg(f, 36, 46))))
            plate = rgb_offset(plate, mis)
            im.paste(plate, (px, py))
            # title column, left
            tt = seg(f, 44, 52)
            if tt > 0:
                size = int(92 * (1.18 - 0.18 * ease_out(tt)))
                im = draw_kanji_column(im, TITLE, int(W * 0.185),
                                       H // 2 - int(2.05 * size), size,
                                       (8, 7, 10), stroke=3,
                                       stroke_fill=GOLD_CREAM, opacity=tt)
            st = seg(f, 56, 66)
            if st > 0:
                im = seal(im, (int(W * 0.185) - 26, H - 116), 52,
                          opacity=st)
            bt = seg(f, 62, 74)
            if bt > 0:
                im = draw_text(im, SUB, (int(W * 0.185), H - 44), FONT_LATIN,
                               15, CREAM, opacity=0.85 * bt, tracking=6)
            # handoff: darken whole frame at the end
            ht = seg(f, 78, N - 1)
            if ht > 0:
                im = darken_to(im, SITE_BG, 0.35 * ease_in(ht))
        im = vignette(im)
        im = grain(im, 5, seed=f)
        frames.append(im)
    save_outputs(frames, "konzept-1", "konzept-1")


# ─────────────────────── Konzept 2: Das Skizzenbuch ─────────────────────────
def konzept2():
    src = Image.open(f"{A}/hokusai-manga-vol6-martial.jpg")
    w, h = src.size
    # vignettes off the actual page (fractions of source)
    defs = [
        (0.08, 0.10, 0.62, 0.48),  # throw pair (the payoff)
        (0.60, 0.06, 0.97, 0.52),  # rope climber
        (0.10, 0.55, 0.52, 0.95),  # ground pair
        (0.55, 0.55, 0.95, 0.95),  # stance figure
    ]
    cuts = []
    for (x0, y0, x1, y1) in defs:
        c = src.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
        cuts.append(c)
    # The open sketchbook itself: light paper, lit like the fuda slip.
    rng = np.random.default_rng(11)
    base = np.tile(np.array((206, 190, 160), dtype=np.float32),
                   (H, W, 1))
    base += rng.normal(0, 4, (H, W))[:, :, None]
    lowfreq = np.asarray(
        Image.fromarray(rng.uniform(0, 255, (27, 48)).astype(np.uint8))
        .resize((W, H), Image.BILINEAR), dtype=np.float32)[:, :, None]
    base += (lowfreq - 127) * 0.10
    paper = to_im(base)

    # placements: (cx, cy, target_h, angle, arrive_frame)
    plan = [
        (0.26, 0.38, 360, -2.0, 8),
        (0.74, 0.30, 300, 1.5, 18),
        (0.30, 0.78, 280, 1.0, 28),
        (0.76, 0.74, 290, -1.5, 38),
    ]

    def sketch_layer(c, target_h, angle):
        s = c.resize((int(c.size[0] * target_h / c.size[1]), target_h),
                     Image.LANCZOS)
        s = s.rotate(angle, expand=True, fillcolor=(255, 255, 255))
        a = to_np(s) / 255.0
        # normalise the scan's paper to white so multiply only carries the ink
        a = np.clip(a / 0.82, 0, 1)
        return a

    layers = [sketch_layer(cuts[i], plan[i][2], plan[i][3]) for i in range(4)]

    frames = []
    for f in range(N):
        im = paper.copy()
        base = to_np(im) / 255.0
        comp = base.copy()
        for i, (cx, cy, th, ang, t0) in enumerate(plan):
            if f < t0:
                continue
            lay = layers[i]
            lh, lw = lay.shape[:2]
            # payoff: from f56 the throw pair grows in 3 hard steps
            if i == 0 and f >= 56:
                step = min(2, (f - 56) // 6)
                sc = [1.35, 1.75, 2.15][step]
                nlh, nlw = int(lh * sc), int(lw * sc)
                lay_im = to_im(lay * 255).resize((nlw, nlh), Image.LANCZOS)
                lay = to_np(lay_im) / 255.0
                lh, lw = nlh, nlw
                cx, cy = 0.40, 0.50
            x0 = int(W * cx - lw / 2)
            y0 = int(H * cy - lh / 2)
            x0 = max(-lw + 1, min(W - 1, x0))
            y0 = max(-lh + 1, min(H - 1, y0))
            xs0, ys0 = max(0, x0), max(0, y0)
            xs1, ys1 = min(W, x0 + lw), min(H, y0 + lh)
            if xs1 <= xs0 or ys1 <= ys0:
                continue
            sub = lay[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0]
            # fade others once payoff starts
            fade = 1.0
            if i != 0 and f >= 56:
                fade = 1 - 0.7 * seg(f, 56, 68)
            # ink-hit: 2-frame darker slam
            hit = 1.15 if f - t0 < 2 else 1.0
            region = comp[ys0:ys1, xs0:xs1]
            inked = region * (sub ** hit)
            comp[ys0:ys1, xs0:xs1] = region * (1 - fade) + inked * fade
        im = to_im(comp * 255)
        # vermilion 柔 behind everything mid-way? -> stamped over paper at payoff
        tt = seg(f, 68, 76)
        if tt > 0:
            size = int(84 * (1.15 - 0.15 * ease_out(tt)))
            im = draw_kanji_column(im, TITLE, int(W * 0.80),
                                   H // 2 - int(2.05 * size), size,
                                   (20, 14, 10), stroke=2,
                                   stroke_fill=(200, 60, 40), opacity=tt)
        st = seg(f, 74, 82)
        if st > 0:
            im = seal(im, (int(W * 0.80) - 24, H - 120), 48, opacity=st)
        bt = seg(f, 78, 88)
        if bt > 0:
            im = draw_text(im, SUB, (W // 2, H - 26), FONT_LATIN, 14, (60, 45, 32),
                           opacity=0.9 * bt, tracking=5)
        ht = seg(f, 82, N - 1)
        if ht > 0:
            im = night_grade(im, 0.75 * ease_in(ht))
        im = vignette(im, 0.45)
        im = grain(im, 4, seed=f)
        frames.append(im)
    save_outputs(frames, "konzept-2", "konzept-2")


# ─────────────────────── Konzept 3: Die Rolle brennt ────────────────────────
def konzept3():
    src = Image.open(f"{A}/heiji-sanjo-complete.jpg")
    SW, SH = src.size
    # pre-scale so viewport height = H
    scale = H / SH * 1.15  # slight overscan for push-in
    scroll = src.resize((int(SW * scale), int(SH * scale)), Image.LANCZOS)
    sw, sh = scroll.size

    def view(x_frac, zoom=1.0):
        vh = int(H * 1.15 / zoom)
        vw = int(W * 1.15 / zoom)
        cx = int(sw * x_frac)
        cy = sh // 2
        x0 = max(0, min(sw - vw, cx - vw // 2))
        y0 = max(0, min(sh - vh, cy - vh // 2))
        return scroll.crop((x0, y0, x0 + vw, y0 + vh)).resize((W, H),
                                                              Image.LANCZOS)

    FIRE_X = 0.435   # centre of the blaze
    START_X = 0.16   # procession
    frames = []
    for f in range(N):
        if f < 40:  # the scrub
            t = ease_out(seg(f, 0, 40))
            x = START_X + (FIRE_X - START_X) * t
            im = view(x)
            # motion blur: blend 2 neighbouring samples while fast
            speed = (1 - t)
            if speed > 0.15:
                im2 = view(x + 0.012 * speed)
                im3 = view(x - 0.012 * speed)
                im = to_im((to_np(im) + to_np(im2) + to_np(im3)) / 3)
            im = night_grade(im, 0.30)
        else:  # landed on the fire
            t = seg(f, 40, N - 1)
            zoom = 1.0 + 0.08 * ease_out(t)
            im = view(FIRE_X, zoom)
            im = night_grade(im, 0.30)
            # let the fire lift: boost warm highlights
            a = to_np(im) / 255.0
            lum = a @ np.array([0.4, 0.4, 0.2])
            boost = np.clip(lum - 0.35, 0, None)[:, :, None]
            a = a + boost * np.array([0.55, 0.18, 0.02]) * (0.5 + 0.5 * t)
            im = to_im(a * 255)
        # kanji slam at f52
        tt = seg(f, 52, 58)
        if tt > 0:
            size = int(96 * (1.22 - 0.22 * ease_out(tt)))
            im = draw_kanji_column(im, TITLE, int(W * 0.14),
                                   H // 2 - int(2.05 * size), size,
                                   (8, 7, 10), stroke=3,
                                   stroke_fill=GOLD_CREAM, opacity=tt)
        st = seg(f, 62, 70)
        if st > 0:
            im = seal(im, (int(W * 0.14) - 26, H - 112), 52, opacity=st)
        bt = seg(f, 66, 78)
        if bt > 0:
            im = draw_text(im, SUB, (int(W * 0.55), H - 36), FONT_LATIN, 15,
                           CREAM, opacity=0.9 * bt, tracking=6)
        ht = seg(f, 80, N - 1)
        if ht > 0:
            im = darken_to(im, SITE_BG, 0.45 * ease_in(ht))
        im = vignette(im, 0.6)
        im = grain(im, 5, seed=f)
        frames.append(im)
    save_outputs(frames, "konzept-3", "konzept-3")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "123"
    if "1" in which:
        konzept1()
    if "2" in which:
        konzept2()
    if "3" in which:
        konzept3()
