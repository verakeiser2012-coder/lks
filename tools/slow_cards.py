# -*- coding: utf-8 -*-
"""Кадры к записи дневника «Двигаюсь медленно в быстром мире» (лента «Кадры к записи»).
Три карточки в палитре «Дикий лев»: тезис на тёмном, улитка Slow Food с festina lente,
Темп и Василий с репликами. Формат 4:5, 1200×1500 — как вертикальный кадр плёнки.
Результат — public/uploads/slow-card-{1,2,3}.jpg."""
import os, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'tools', 'fonts')
OUT = os.path.join(ROOT, 'public', 'uploads')
MASCOTS = os.environ.get('SLOW_MASCOTS', os.path.join(ROOT, 'content', 'brand', 'mascots-raster'))
SLAB_B = os.path.join(FONTS, 'RobotoSlab-Bold.ttf')
SLAB_R = os.path.join(FONTS, 'RobotoSlab-Regular.ttf')
SLAB_L = os.path.join(FONTS, 'RobotoSlab-Light.ttf')
SERIF_I = r'C:\Windows\Fonts\georgiai.ttf'

SMOLA = (0x21, 0x1A, 0x12); ZAKAT = (0xD9, 0x9A, 0x2B); PYL = (0xDC, 0xCB, 0xA0)
GRIVA = (0xB4, 0x60, 0x1C); AKACIA = (0x6F, 0xA8, 0x3C); CREAM = (0xFF, 0xF8, 0xE6)
W, H = 1200, 1500


def grain(im, seed=3, strength=9):
    import random
    rnd = random.Random(seed)
    px = im.load()
    w, h = im.size
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            n = rnd.randint(-strength, strength)
            r, g, b = px[x, y]
            px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im


def text_size(d, s, f):
    bb = d.textbbox((0, 0), s, font=f)
    return bb[2] - bb[0], bb[3] - bb[1], bb


def centered(d, s, f, cx, y, fill):
    # anchor 'ma' — по верху строки шрифта, а не по рамке глифов: строки без
    # выносных элементов не «подпрыгивают», межстрочный интервал ровный.
    d.text((cx, y), s, font=f, fill=fill, anchor='ma')
    return f.size


def spaced(d, s, f, cx, y, fill, spacing=0.3):
    widths = [text_size(d, ch, f)[0] for ch in s]
    gap = f.size * spacing
    total = sum(widths) + gap * (len(s) - 1)
    x = cx - total / 2
    baseline = y + f.getmetrics()[0]
    for ch, w in zip(s, widths):
        bb = d.textbbox((0, 0), ch, font=f)
        d.text((x - bb[0], baseline), ch, font=f, fill=fill, anchor='ls')
        x += w + gap
    return total


def frame(d, color):
    d.rectangle((40, 40, W - 40, H - 40), outline=color, width=3)


def card_statement():
    im = Image.new('RGB', (W, H), SMOLA)
    d = ImageDraw.Draw(im)
    # тёплое пятно сверху, как на плакате главной
    glow = Image.new('RGB', (W, H), SMOLA)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-200, -500, W + 200, 500), fill=(0x3A, 0x2C, 0x16))
    from PIL import ImageFilter
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im = Image.blend(im, glow, 0.9)
    d = ImageDraw.Draw(im)
    frame(d, (0x5A, 0x48, 0x2A))
    f_k = ImageFont.truetype(SLAB_B, 30)
    spaced(d, 'ВДОХНОВИТЕЛЬНЫЙ ПАРЕНЬ', f_k, W / 2, 150, ZAKAT, 0.35)
    f_big = ImageFont.truetype(SLAB_B, 150)
    y = 380
    for line in ['Двигаюсь', 'медленно', 'в быстром', 'мире.']:
        centered(d, line, f_big, W / 2, y, CREAM)
        y += 175
    f_en = ImageFont.truetype(SLAB_R, 34)
    spaced(d, 'SLOW IN A FAST WORLD', f_en, W / 2, y + 40, ZAKAT, 0.32)
    f_s = ImageFont.truetype(SERIF_I, 40)
    centered(d, 'Не про лень. Про темп, который выбираешь сам.', f_s, W / 2, H - 200, PYL)
    im = grain(im, 3, 7)
    p = os.path.join(OUT, 'slow-card-1.jpg'); im.save(p, quality=90, optimize=True); return p


def snail(d, cx, cy, r, color, width=10):
    """Улитка Slow Food: раковина-спираль и тело одной линией."""
    pts = []
    turns = 2.6
    steps = 260
    for i in range(steps + 1):
        t = i / steps
        a = t * turns * 2 * math.pi
        rr = r * (0.12 + 0.88 * t)
        pts.append((cx + rr * math.cos(a), cy - rr * math.sin(a)))
    d.line(pts, fill=color, width=width, joint='curve')
    # тело: от нижней точки раковины вправо, с головой и рожками
    bx, by = cx + r * 0.2, cy + r * 1.05
    body = [(cx - r * 0.9, by), (cx + r * 0.6, by), (cx + r * 1.35, by - r * 0.15), (cx + r * 1.65, by - r * 0.55)]
    d.line(body, fill=color, width=width, joint='curve')
    hx, hy = body[-1]
    d.line((hx, hy, hx - r * 0.05, hy - r * 0.45), fill=color, width=width - 2)
    d.line((hx, hy, hx + r * 0.3, hy - r * 0.4), fill=color, width=width - 2)
    d.ellipse((hx - r * 0.05 - 9, hy - r * 0.45 - 9, hx - r * 0.05 + 9, hy - r * 0.45 + 9), fill=color)
    d.ellipse((hx + r * 0.3 - 9, hy - r * 0.4 - 9, hx + r * 0.3 + 9, hy - r * 0.4 + 9), fill=color)


def card_snail():
    im = Image.new('RGB', (W, H), PYL)
    d = ImageDraw.Draw(im)
    frame(d, GRIVA)
    f_k = ImageFont.truetype(SLAB_B, 30)
    spaced(d, 'РИМ • 1986 • SLOW FOOD', f_k, W / 2, 150, GRIVA, 0.35)
    snail(d, W / 2 - 60, 640, 230, SMOLA, 14)
    f_lat = ImageFont.truetype(SERIF_I, 96)
    centered(d, 'festina lente', f_lat, W / 2, 1010, SMOLA)
    f_ru = ImageFont.truetype(SLAB_R, 40)
    centered(d, '«спеши медленно»', f_ru, W / 2, 1135, GRIVA)
    f_s = ImageFont.truetype(SLAB_L, 34)
    centered(d, 'Улитка не проигрывает. Она идёт своим ходом.', f_s, W / 2, H - 200, SMOLA)
    im = grain(im, 5, 6)
    p = os.path.join(OUT, 'slow-card-2.jpg'); im.save(p, quality=90, optimize=True); return p


def bubble(d, text, f, cx, y, fill, ink, tail_left):
    w, h, bb = text_size(d, text, f)
    pad = 28
    x1, y1, x2, y2 = cx - w / 2 - pad, y, cx + w / 2 + pad, y + h + pad * 1.6
    d.rounded_rectangle((x1, y1, x2, y2), radius=26, fill=fill)
    tx = x1 + 60 if tail_left else x2 - 60
    d.polygon([(tx - 18, y2 - 2), (tx + 18, y2 - 2), (tx, y2 + 26)], fill=fill)
    d.text((cx - w / 2 - bb[0], y + pad * 0.8 - bb[1]), text, font=f, fill=ink)
    return y2 + 26


def card_mascots():
    im = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(im)
    frame(d, ZAKAT)
    f_k = ImageFont.truetype(SLAB_B, 30)
    spaced(d, 'ТЕМП И ВАСИЛИЙ', f_k, W / 2, 150, GRIVA, 0.35)
    temp = Image.open(os.path.join(MASCOTS, 'mascot-temp.png')).convert('RGBA')
    vas = Image.open(os.path.join(MASCOTS, 'mascot-vasiliy.png')).convert('RGBA')
    temp = temp.resize((int(temp.width * 620 / temp.height), 620), Image.LANCZOS)
    vas = vas.resize((int(vas.width * 470 / vas.height), 470), Image.LANCZOS)
    f_b = ImageFont.truetype(SLAB_B, 40)
    # реплики над героями
    bubble(d, 'Не спешим. Делаем лучше.', f_b, 380, 260, SMOLA, CREAM, True)
    bubble(d, 'Ладно, я подожду… но недолго!', f_b, 800, 430, ZAKAT, SMOLA, False)
    im.paste(temp, (150, 560), temp)
    im.paste(vas, (700, 720), vas)
    d = ImageDraw.Draw(im)
    d.line((120, 1200, W - 120, 1200), fill=ZAKAT, width=3)
    f_s = ImageFont.truetype(SLAB_L, 34)
    centered(d, 'Лев, который никуда не торопится,', f_s, W / 2, 1232, SMOLA)
    centered(d, 'и кот, который хочет всё и сразу.', f_s, W / 2, 1282, SMOLA)
    f_t = ImageFont.truetype(SLAB_R, 28)
    spaced(d, 'LEVKEISER.COM', f_t, W / 2, H - 170, GRIVA, 0.3)
    im = grain(im, 8, 5)
    p = os.path.join(OUT, 'slow-card-3.jpg'); im.save(p, quality=90, optimize=True); return p


if __name__ == '__main__':
    for fn in (card_statement, card_snail, card_mascots):
        print(fn())
