# -*- coding: utf-8 -*-
"""Painterly brush-stroke plates + title/chapter cards for Груша v7.

Plates: one loose horizontal brush stroke of warm paper paint (dry-brush ends, bristle streaks),
placed as a full 1920x1080 transparent frame so CapCut needs no scaling/offset.
Cards: the aromatic-tablet mockup look — soundstates cover art with a dark band at the bottom,
"ГРУША / mark / DJ LEVKA" (DJ LEVKA in the LEVKEYSER neon voice). Chapters reuse the same band.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

OUT = r"C:\Users\User\Desktop\site\tools"
FONTS = os.path.join(OUT, "fonts")
BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
REG = os.path.join(FONTS, "RobotoSlab-Regular.ttf")
COVER = os.path.join(os.path.expanduser("~"), "Desktop", "Музыка", "Релизы", "2026 - Soundstates (EP)",
                     "Обложка", "Soundstates — обложка 3000x3000.jpg")     # папка альбома разобрана 11.09
MARK = os.path.join(OUT, "grusha_logo", "Сокращенный знак", "Сокращенный знак", "Светлый", "СВетлый сокр..png")
WORDMARK = os.path.join(OUT, "grusha_logo", "Основной логотип", "Основной логотип", "Светлый", "Светлый основной.png")

PAPER = np.array([241, 235, 222], np.float32)
BAND = (42, 46, 56)
BEIGE = (230, 221, 210)
NEON = (207, 247, 168)
GLOW = (143, 198, 92)


# ----------------------------------------------------------------- brush stroke
def stroke(w, h, seed, tilt=-1.3):
    rnd = np.random.RandomState(seed)
    ss = 2
    W, H = w*ss, h*ss
    core = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(core)
    # solid heart of the stroke: a fat band whose top/bottom edge wobbles like a loaded brush
    yy = np.arange(W)
    wob_t = np.convolve(rnd.randn(W), np.ones(W//6 | 1)/(W//6 | 1), mode="same"); wob_t /= np.abs(wob_t).max()+1e-9
    wob_b = np.convolve(rnd.randn(W), np.ones(W//6 | 1)/(W//6 | 1), mode="same"); wob_b /= np.abs(wob_b).max()+1e-9
    poly = [(x, H*0.14 + wob_t[x]*H*0.06) for x in range(0, W, 4)] + \
           [(x, H*0.86 + wob_b[x]*H*0.06) for x in range(W-1, -1, -4)]
    dr.polygon(poly, fill=255)
    core = core.filter(ImageFilter.GaussianBlur(H*0.018))
    a = np.asarray(core, np.float32)/255.0

    # bristles: long streaks with varying weight, a few broken (dry brush)
    br = Image.new("L", (W, H), 0)
    d2 = ImageDraw.Draw(br)
    for _ in range(int(90*h/230)):
        y = rnd.uniform(H*0.08, H*0.92)
        x0 = rnd.uniform(0, W*0.10); x1 = W - rnd.uniform(0, W*0.10)
        th = max(2, int(rnd.uniform(2, 9)*ss*h/230))
        val = int(rnd.uniform(120, 255))
        # broken streak: draw in 1-4 pieces
        pieces = rnd.randint(1, 4)
        cuts = np.sort(rnd.uniform(x0, x1, pieces*2))
        for k in range(pieces):
            d2.line([(cuts[2*k], y+rnd.uniform(-3, 3)*ss), (cuts[2*k+1], y+rnd.uniform(-3, 3)*ss)], fill=val, width=th)
    br = br.filter(ImageFilter.GaussianBlur(1.2*ss))
    b = np.asarray(br, np.float32)/255.0

    # ragged tapered ends: per-row entry/exit offsets from smooth noise
    y = np.arange(H)
    n1 = np.convolve(rnd.randn(H), np.ones(41)/41, mode="same"); n1 /= np.abs(n1).max()+1e-9
    n2 = np.convolve(rnd.randn(H), np.ones(41)/41, mode="same"); n2 /= np.abs(n2).max()+1e-9
    xs = np.arange(W)[None, :]
    left = (W*0.09 + n1[:, None]*W*0.06)
    right = (W*0.91 + n2[:, None]*W*0.06)
    env = np.clip((xs-left)/(W*0.07), 0, 1)*np.clip((right-xs)/(W*0.07), 0, 1)
    env = env**0.7
    # bristle streaks only where the brush lands/lifts (the ends); the middle stays solid paint
    ends = np.clip(1.0 - np.minimum(xs-left, right-xs)/(W*0.16), 0, 1)
    alpha = np.clip(a*(1-0.55*ends) + b*ends*1.1, 0, 1)*env
    g = rnd.rand(H, W)
    g = np.asarray(Image.fromarray((g*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3.0*ss)), np.float32)/255.0
    alpha = np.clip(alpha*(0.9+0.2*g), 0, 1)
    alpha = np.asarray(Image.fromarray((alpha*255).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32)

    rgb = np.zeros((h, w, 3), np.float32); rgb[:] = PAPER
    grain = np.asarray(Image.fromarray((rnd.rand(h, w)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0)), np.float32)
    rgb += (grain-127)[:, :, None]*0.05
    # paint thins toward the ends: a touch darker / warmer where the bristles drag
    e2 = np.asarray(Image.fromarray((ends*255).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32)/255.0
    rgb = rgb - e2[:, :, None]*np.array([14, 18, 26], np.float32)
    im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (alpha*0.97).astype(np.uint8)]), "RGBA")
    return im.rotate(tilt, resample=Image.BICUBIC, expand=True)


def frame_with_stroke(w, h, cx, cy, seed, name):
    c = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    s = stroke(w, h, seed)
    x, y = int(cx-s.width/2), int(cy-s.height/2)
    sh = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (x+5, y+9), s.split()[3])
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)))
    c.alpha_composite(s, (x, y))
    c.save(os.path.join(OUT, name))
    return c


# ----------------------------------------------------------------- cards
def light_png(path):
    """Brand PNGs are light-on-white; turn the white into transparency."""
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    alpha = np.clip((250-arr.mean(2))*(255/60.0), 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([np.full_like(np.asarray(im), 230), alpha]), "RGBA")
    out.putdata([(BEIGE[0], BEIGE[1], BEIGE[2], p[3]) for p in out.getdata()])
    return out.crop(Image.fromarray(alpha, "L").getbbox())


def text_layer(txt, font, size, color, cx, cy, spacing=0.0, glow=None):
    """Full-frame RGBA layer with one centred text line (optional neon glow)."""
    f = ImageFont.truetype(font, size)
    layer = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # manual letter spacing
    widths = [d.textlength(ch, font=f) for ch in txt]
    sp = size*spacing
    total = sum(widths) + sp*(len(txt)-1)
    x = cx - total/2
    asc, desc = f.getmetrics()
    y = cy - (asc-desc)/2
    if glow:
        for rad, al in ((26, 70), (12, 120), (5, 200)):
            g = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
            xx = x
            for ch, wch in zip(txt, widths):
                gd.text((xx, y), ch, font=f, fill=glow+(al,)); xx += wch+sp
            layer.alpha_composite(g.filter(ImageFilter.GaussianBlur(rad)))
    xx = x
    for ch, wch in zip(txt, widths):
        d.text((xx, y), ch, font=f, fill=color+(255,)); xx += wch+sp
    return layer


def cover_bg(blur=0, dark=1.0):
    im = Image.open(COVER).convert("RGB")
    im = im.resize((1920, int(im.height*1920/im.width)), Image.LANCZOS)
    top = int(im.height*0.21)          # eyes strip near the top, chest under the band — like the mockup
    im = im.crop((0, max(0, top), 1920, max(0, top)+1080))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    arr = np.asarray(im).astype(np.float32)*dark
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")


def band(img, y0=760, alpha=214):
    b = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    ImageDraw.Draw(b).rectangle([0, y0, 1920, 1080], fill=BAND+(alpha,))
    img.alpha_composite(b)
    return img


def mark_layer(cy, height):
    m = light_png(MARK)
    m = m.resize((int(m.width*height/m.height), height), Image.LANCZOS)
    layer = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    layer.alpha_composite(m, (960-m.width//2, int(cy-height/2)))
    return layer


def save(img, name):
    img.save(os.path.join(OUT, name))


if __name__ == "__main__":
    # --- caption strokes (text centre y = 875, x = 960); names left/right
    frame_with_stroke(1660, 200, 960, 875, 12, "plate_q1.png")
    frame_with_stroke(1660, 330, 960, 875, 34, "plate_q2.png")
    frame_with_stroke(1660, 440, 960, 875, 46, "plate_q3.png")
    frame_with_stroke(860, 300, 490, 875, 78, "plate_name_l.png")
    frame_with_stroke(860, 300, 1430, 875, 91, "plate_name_r.png")
    frame_with_stroke(1400, 200, 960, 875, 57, "plate_intro.png")

    # --- title: background + three separately fading name layers
    save(band(cover_bg(), y0=676), "title_bg.png")

    def place(make, want_top, name):
        """render once, measure where the ink actually landed, re-render shifted onto want_top"""
        layer = make(0)
        box = layer.split()[3].getbbox()
        layer = make(want_top - box[1])
        save(layer, name)
        return layer.split()[3].getbbox()

    # плашка 676–1080: знак ровно в её середине (878), имена одного размера симметрично вверх и вниз
    MID = (676 + 1080) // 2
    b2 = place(lambda dy: mark_layer(MID + dy, 66), MID - 33, "title_mark.png")
    mk_grusha = lambda dy: text_layer("ГРУША", BOLD, 84, BEIGE, 960, 780 + dy, spacing=0.22)
    pg = mk_grusha(-300).split()[3].getbbox()
    place(mk_grusha, b2[1] - 26 - (pg[3] - pg[1]), "title_grusha.png")
    mk_levka = lambda dy: text_layer("DJ LEVKA", BOLD, 84, NEON, 960, 980 + dy, spacing=0.12, glow=GLOW)
    pl = mk_levka(-300).split()[3].getbbox()
    core_top = 20                                    # свечение выше ядра букв примерно на столько
    place(mk_levka, b2[3] + 26 - core_top, "title_levka.png")

    # --- chapter / credit cards: same band over the blurred, darkened cover
    chap_bg = band(cover_bg(blur=40, dark=0.30), y0=0, alpha=120)
    save(chap_bg, "chapter_bg.png")
    # текст глав теперь печатается посимвольно live-надписью (build_v7.py); картинка несёт только знак
    l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    l.alpha_composite(mark_layer(540, 70))                                       # знак — в середине кадра
    save(l, "chapter_mark.png")
    CR = [("В КАДРЕ", ["Груша — благовония, керамика, сказки", "Лев Кейсер — музыка · DJ Levka"]),
          ("МУЗЫКА", ["DJ Levka — d r e a m", "джингл для Груши — Лев Кейсер"]),
          ("СЪЁМКА И МОНТАЖ", ["Лев Кейсер", "GoPro · телефон · руки Груши"]),
          ("СПАСИБО", ["Груше — за дом, ароматы и терпение", "вам — за то, что досмотрели"])]
    for i, (h, body) in enumerate(CR):
        l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
        l.alpha_composite(text_layer(h, REG, 44, BEIGE, 960, 448, spacing=0.4))
        l.alpha_composite(mark_layer(540, 70))
        for k, line in enumerate(body):
            l.alpha_composite(text_layer(line, BOLD, 58, BEIGE, 960, 610+k*90, spacing=0.02))
        save(l, "credit_%02d.png" % (i+1))
    # logo card (end): wordmark + neon DJ LEVKA, no typed "ГРУША"
    l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    wm = light_png(WORDMARK); wm = wm.resize((720, int(wm.height*720/wm.width)), Image.LANCZOS)
    l.alpha_composite(wm, (960-wm.width//2, 470-wm.height//2))
    l.alpha_composite(text_layer("DJ LEVKA", BOLD, 72, NEON, 960, 640, spacing=0.12, glow=GLOW))
    save(l, "card_logo.png")
    l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    l.alpha_composite(text_layer("НОВЫЕ ВЫПУСКИ — СКОРО", REG, 48, BEIGE, 960, 540, spacing=0.3))
    save(l, "card_end.png")

    # --- previews for the user
    frames = sorted(f for f in os.listdir(os.path.join(sys.argv[1], "_f")) if f.endswith(".jpg")) if len(sys.argv) > 1 else []
    if frames:
        fr = Image.open(os.path.join(sys.argv[1], "_f", frames[0])).convert("RGBA").resize((1920, 1080))
        q = fr.copy(); q.alpha_composite(Image.open(os.path.join(OUT, "plate_q2.png")))
        f2 = ImageFont.truetype(REG, 46); d = ImageDraw.Draw(q)
        for k, line in enumerate(["люди перестали чувствовать тонкости.", "привыкли к синтетике"]):
            wl = d.textlength(line, font=f2); d.text((960-wl/2, 830+k*62), line, font=f2, fill=(30, 24, 18, 255))
        q.convert("RGB").save(os.path.join(sys.argv[1], "mock_quote.jpg"), quality=90)
        t = Image.open(os.path.join(OUT, "title_bg.png")).convert("RGBA")
        for n in ("title_grusha.png", "title_mark.png", "title_levka.png"):
            t.alpha_composite(Image.open(os.path.join(OUT, n)))
        t.convert("RGB").save(os.path.join(sys.argv[1], "mock_title.jpg"), quality=90)
        c = Image.open(os.path.join(OUT, "chapter_bg.png")).convert("RGBA"); c.alpha_composite(Image.open(os.path.join(OUT, "chapter_03.png")))
        c.convert("RGB").save(os.path.join(sys.argv[1], "mock_chapter.jpg"), quality=90)
    print("assets written")


# ----------------------------------------------------------------- bespoke plate per caption
PX_PER_UNIT = 8.0          # CapCut text `size` unit -> pixels on a 1080p canvas


def caption_plate(text, size_units, cx, cy, out_name, seed=0, font_path=None, letter_spacing=0.0,
                  pad_x=150, pad_y=64, line_factor=1.42):
    """Render a brush stroke just big enough for `text` at CapCut's `size_units`, centred at (cx, cy)."""
    px = size_units*PX_PER_UNIT
    f = ImageFont.truetype(font_path or REG, int(round(px)))
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    lines = text.split("\n")
    wmax = 0
    for ln in lines:
        w = sum(probe.textlength(ch, font=f) for ch in ln) + px*letter_spacing*max(0, len(ln)-1)
        wmax = max(wmax, w)
    h = px*line_factor*len(lines)
    W = int(min(1860, wmax + 2*pad_x))
    H = int(min(560, h + 2*pad_y))
    frame_with_stroke(W, H, cx, cy, seed or (abs(hash(text)) % 9000 + 7), out_name)
    return out_name, W, H


# ----------------------------------------------------------------- soft scrim behind neon text
def caption_scrim(text, size_units, cx, cy, out_name, font_path=None, letter_spacing=0.0,
                  line_factor=1.42, pad_x=110, pad_y=54, peak=170, tint=(10, 14, 8), spec=None):
    """A feathered dark blob just big enough to carry `text` — readable neon, no visible plate edge.
    spec: optional [(line, size_units, font_path)] when lines differ in size/font (bold term + body)."""
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    spec = spec or [(ln, size_units, font_path) for ln in text.split("\n")]
    w = h = 0
    for ln, su, fp in spec:
        px = su*PX_PER_UNIT
        f = ImageFont.truetype(fp or font_path or REG, int(round(px)))
        w = max(w, sum(probe.textlength(ch, font=f) for ch in ln) + px*letter_spacing*max(0, len(ln)-1))
        h += px*line_factor
    # текст целиком лежит внутри плотного ядра; растушёвка идёт наружу от него, а не съедает края
    W, H = w + 2*pad_x, min(760, h + 2*pad_y)
    blur = max(26, min(W, H)*0.30)
    ext = 1.2*blur
    a = Image.new("L", (1920, 1080), 0)
    ImageDraw.Draw(a).rounded_rectangle([cx-W/2-ext, cy-H/2-ext, cx+W/2+ext, cy+H/2+ext],
                                        radius=int(min(W, H)*0.42), fill=peak)
    a = a.filter(ImageFilter.GaussianBlur(blur))
    # a second, tighter core so the middle stays dense enough under the text
    b = Image.new("L", (1920, 1080), 0)
    ImageDraw.Draw(b).rounded_rectangle([cx-W*0.46, cy-H*0.40, cx+W*0.46, cy+H*0.40],
                                        radius=int(min(W, H)*0.3), fill=int(peak*0.72))
    b = b.filter(ImageFilter.GaussianBlur(blur*0.55))
    arr = np.clip(np.asarray(a, np.float32) + np.asarray(b, np.float32), 0, 255).astype(np.uint8)
    rgb = np.zeros((1080, 1920, 3), np.uint8); rgb[:] = tint
    Image.fromarray(np.dstack([rgb, arr]), "RGBA").save(os.path.join(OUT, out_name))
    return out_name, int(W), int(H)


def neon_backdrop(text, size_units, cx, cy, out_name, font_path=None, letter_spacing=0.0,
                  pad_x=120, pad_y=70, line_factor=1.42, core=(14, 17, 22), peak=205):
    """Soft dark scrim sized to `text` — feathered, no hard edge, so neon letters read on any footage."""
    px = size_units*PX_PER_UNIT
    f = ImageFont.truetype(font_path or REG, int(round(px)))
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    lines = text.split("\n")
    wmax = max(sum(probe.textlength(ch, font=f) for ch in ln) + px*letter_spacing*max(0, len(ln)-1) for ln in lines)
    W = int(min(1880, wmax + 2*pad_x))
    H = int(min(620, px*line_factor*len(lines) + 2*pad_y))
    feat = max(26, int(H*0.42))
    a = Image.new("L", (W, H), 0)
    ImageDraw.Draw(a).rounded_rectangle([feat*0.55, feat*0.55, W-feat*0.55, H-feat*0.55],
                                        radius=int(min(W, H)*0.34), fill=peak)
    a = a.filter(ImageFilter.GaussianBlur(feat*0.42))
    rgb = Image.new("RGB", (W, H), core)
    pad = Image.merge("RGBA", (*rgb.split(), a))
    c = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    c.alpha_composite(pad, (int(cx-W/2), int(cy-H/2)))
    c.save(os.path.join(OUT, out_name))
    return out_name, W, H
