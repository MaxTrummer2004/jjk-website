"""Shared helpers for the three opening mocks. 960x540, 24fps, 4s = 96 frames."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 960, 540
FPS, DUR = 24, 4.0
N = int(FPS * DUR)  # 96

PAPER = (26, 22, 18)        # dark paper, near site background but warm
SITE_BG = (7, 7, 10)        # --background
VERMILION = (211, 32, 42)   # --accent
EMBER = (255, 106, 31)
CREAM = (243, 239, 233)
GOLD_CREAM = (244, 227, 168)

FONT_JP = "C:/Windows/Fonts/yumindb.ttf"
FONT_LATIN = "C:/Windows/Fonts/arial.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def ease_out(t):  # cubic
    return 1 - (1 - t) ** 3

def ease_in(t):
    return t ** 3

def clamp01(t):
    return max(0.0, min(1.0, t))

def seg(f, a, b):
    """0..1 progress of frame f within [a,b)."""
    if b <= a:
        return 1.0
    return clamp01((f - a) / (b - a))

def to_np(im):
    return np.asarray(im.convert("RGB"), dtype=np.float32)

def to_im(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def rgb_offset(im, dx):
    """Misregistered print: shift R right, B left by dx px."""
    if dx <= 0:
        return im
    a = to_np(im)
    out = a.copy()
    out[:, :, 0] = np.roll(a[:, :, 0], dx, axis=1)
    out[:, :, 2] = np.roll(a[:, :, 2], -dx, axis=1)
    return to_im(out)

def darken_to(im, target, t):
    """Blend image toward flat target colour by t."""
    a = to_np(im)
    tgt = np.array(target, dtype=np.float32)
    return to_im(a * (1 - t) + tgt * t)

def vignette(im, strength=0.55):
    a = to_np(im)
    h, w = a.shape[:2]
    y, x = np.ogrid[:h, :w]
    cy, cx = h / 2, w / 2
    d = np.sqrt(((x - cx) / (w * 0.62)) ** 2 + ((y - cy) / (h * 0.62)) ** 2)
    mask = np.clip(1 - strength * np.clip(d - 0.45, 0, None) ** 1.5, 0, 1)
    return to_im(a * mask[:, :, None])

def grain(im, amount=7, seed=0):
    rng = np.random.default_rng(seed)
    a = to_np(im)
    a += rng.normal(0, amount, a.shape[:2])[:, :, None]
    return to_im(a)

def night_grade(im, t):
    """Pull toward the site's candle-lit night: crush shadows, warm the rest."""
    a = to_np(im) / 255.0
    a = a ** (1 + 1.1 * t)                      # gamma down
    warm = a * np.array([1.0, 1 - 0.25 * t, 1 - 0.45 * t])
    out = warm * (1 - 0.55 * t) * 255
    return to_im(out)

def draw_kanji_column(im, text, x, y, size, fill, tracking=1.12, stroke=0,
                      stroke_fill=None, opacity=1.0):
    """Vertical column of glyphs, top at y, centred on x."""
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(FONT_JP, size)
    cy = y
    for ch in text:
        d.text((x, cy), ch, font=f, fill=(*fill, int(255 * opacity)),
               anchor="ma", stroke_width=stroke,
               stroke_fill=(*stroke_fill, int(255 * opacity)) if stroke_fill else None)
        cy += int(size * tracking)
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")

def draw_text(im, text, xy, fontpath, size, fill, opacity=1.0, anchor="mm",
              tracking=0):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(fontpath, size)
    if tracking:
        # letter-spaced latin line, centred on xy
        widths = [d.textlength(c, font=f) for c in text]
        total = sum(widths) + tracking * (len(text) - 1)
        x = xy[0] - total / 2
        for c, cw in zip(text, widths):
            d.text((x, xy[1]), c, font=f, fill=(*fill, int(255 * opacity)),
                   anchor="lm")
            x += cw + tracking
    else:
        d.text(xy, text, font=f, fill=(*fill, int(255 * opacity)), anchor=anchor)
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")

def seal(im, xy, size, char="柔", opacity=1.0):
    """Vermilion hanko square, hand-cut edge, carved character."""
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    rng = np.random.default_rng(7)
    pts = []
    corners = [(x, y), (x + size, y), (x + size, y + size), (x, y + size)]
    for i in range(4):
        ax, ay = corners[i]
        bx, by = corners[(i + 1) % 4]
        for t in np.linspace(0, 1, 6, endpoint=False):
            jx = rng.uniform(-size * 0.015, size * 0.015)
            jy = rng.uniform(-size * 0.015, size * 0.015)
            pts.append((ax + (bx - ax) * t + jx, ay + (by - ay) * t + jy))
    d.polygon(pts, fill=(198, 40, 34, int(255 * opacity)))
    f = font(FONT_JP, int(size * 0.72))
    d.text((x + size / 2, y + size / 2 + size * 0.02), char, font=f,
           fill=(20, 12, 10, int(235 * opacity)), anchor="mm")
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")

def paper_field(seed=3):
    """Dark warm paper with faint fibre noise."""
    rng = np.random.default_rng(seed)
    base = np.tile(np.array(PAPER, dtype=np.float32), (H, W, 1))
    noise = rng.normal(0, 5, (H, W))[:, :, None]
    lowfreq = np.asarray(
        Image.fromarray(rng.uniform(0, 255, (27, 48)).astype(np.uint8))
        .resize((W, H), Image.BILINEAR), dtype=np.float32)[:, :, None]
    base += noise + (lowfreq - 127) * 0.06
    return to_im(base)

def save_outputs(frames, name, outdir):
    """12-frame contact sheet + animated GIF."""
    import os
    os.makedirs(outdir, exist_ok=True)
    idx = np.linspace(0, len(frames) - 1, 12).astype(int)
    cw, ch = W // 2, H // 2
    sheet = Image.new("RGB", (cw * 4, ch * 3), (0, 0, 0))
    for i, fi in enumerate(idx):
        th = frames[fi].resize((cw, ch), Image.LANCZOS)
        sheet.paste(th, ((i % 4) * cw, (i // 4) * ch))
    sheet.save(f"{outdir}/kontaktbogen.png")
    small = [f.resize((W // 2, H // 2), Image.LANCZOS) for f in frames]
    small[0].save(f"{outdir}/mock.gif", save_all=True, append_images=small[1:],
                  duration=int(1000 / FPS), loop=0)
    print(f"{name}: kontaktbogen + gif -> {outdir}")
