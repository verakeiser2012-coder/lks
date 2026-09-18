# -*- coding: utf-8 -*-
"""Заставки для коллаборации с мастерской «Флёр» (флертекстиль.рф):
обложка выпуска подкаста (1200×1200) и обложка дропа «Флёр × Лев» (1600×1200).

Стиль — их: светло-серый «текстильный» фон, чёрный логотип-вензель с лентой
L'ATELIER CRÉATEUR TEXTILE, классическая антиква. Наша сторона — знак-силуэт
и слаб-сериф LEVKEISER, золото «Закат» точечно, как нитка в ткани.

Исходники: content/brand/partners/fleur-logo-black.png (с сайта мастерской),
content/brand/mark-v2 (знак, растр — _levkeiser-mark-mono-900.png).
Результат — public/uploads/podcast-fleur.jpg и public/uploads/drop-fleur.jpg.
"""
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'content', 'brand', 'partners')
OUT = os.path.join(ROOT, 'public', 'uploads')
SLAB_B = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab-Bold.ttf')
SLAB_R = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab-Regular.ttf')
SERIF = r'C:\Windows\Fonts\georgia.ttf'
SERIF_I = r'C:\Windows\Fonts\georgiai.ttf'

LINEN = (0xE7, 0xE5, 0xE1)       # фон, чуть теплее серого с их сайта (#DFDFE2)
LINEN_DARK = (0xD6, 0xD3, 0xCE)
INK = (0x1A, 0x18, 0x16)         # почти чёрный, как их логотип
GOLD = (0xB8, 0x86, 0x0B)        # наш акцент, приглушённый под их палитру
SMOLA = (0x21, 0x1A, 0x12)


def linen(w, h, seed=7):
    """Ткань: мелкое зерно + едва заметная сетка нитей."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h), LINEN)
    px = im.load()
    for y in range(h):
        for x in range(w):
            n = rnd.randint(-7, 7)
            r, g, b = LINEN
            px[x, y] = (r + n, g + n, b + n)
    d = ImageDraw.Draw(im, 'RGBA')
    for x in range(0, w, 6):
        d.line((x, 0, x, h), fill=(255, 255, 255, 22), width=1)
    for y in range(0, h, 6):
        d.line((0, y, w, y), fill=(0, 0, 0, 10), width=1)
    return im.filter(ImageFilter.GaussianBlur(0.4))


def fleur_logo(width):
    im = Image.open(os.path.join(BRAND, 'fleur-logo-black.png')).convert('LA')
    # Прозрачность у файла есть; чёрный оставляем чёрным.
    l, a = im.split()
    rgba = Image.merge('RGBA', (Image.new('L', im.size, INK[0]), Image.new('L', im.size, INK[1]), Image.new('L', im.size, INK[2]), a))
    ratio = width / rgba.width
    return rgba.resize((width, int(rgba.height * ratio)), Image.LANCZOS)


def fleur_monogram(width):
    """Только вензель с лентой — левая часть логотипа."""
    im = Image.open(os.path.join(BRAND, 'fleur-logo-black.png')).convert('LA')
    crop = im.crop((0, 0, 655, 752))
    l, a = crop.split()
    rgba = Image.merge('RGBA', (Image.new('L', crop.size, INK[0]), Image.new('L', crop.size, INK[1]), Image.new('L', crop.size, INK[2]), a))
    ratio = width / rgba.width
    return rgba.resize((width, int(rgba.height * ratio)), Image.LANCZOS)


def lev_mark(width, color=INK):
    """Знак-силуэт: у растра запечён тёмный фон — делаем его прозрачным, силуэт красим."""
    im = Image.open(os.path.join(BRAND, '_levkeiser-mark-mono-900.png')).convert('RGB')
    w, h = im.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    src = im.load(); dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            # расстояние до фона «Смола»
            dist = abs(r - SMOLA[0]) + abs(g - SMOLA[1]) + abs(b - SMOLA[2])
            a = 0 if dist < 40 else (255 if dist > 120 else int((dist - 40) / 80 * 255))
            dst[x, y] = (color[0], color[1], color[2], a)
    ratio = width / w
    return out.resize((width, int(h * ratio)), Image.LANCZOS)


def text_w(d, s, f):
    bb = d.textbbox((0, 0), s, font=f)
    return bb[2] - bb[0], bb[3] - bb[1], bb


def centered(d, s, f, cx, y, fill):
    w, h, bb = text_w(d, s, f)
    d.text((cx - w / 2 - bb[0], y - bb[1]), s, font=f, fill=fill)
    return h


def spaced(d, s, f, cx, y, fill, spacing=0.22):
    """Разрядка капителью: буквы по одной с интервалом."""
    widths = [text_w(d, ch, f)[0] for ch in s]
    gap = f.size * spacing
    total = sum(widths) + gap * (len(s) - 1)
    x = cx - total / 2
    # Общая базовая линия для всех букв: иначе É с акутом «проваливается» вниз,
    # потому что его рамка выше рамки соседей.
    baseline = y + f.getmetrics()[0]
    for ch, w in zip(s, widths):
        bb = d.textbbox((0, 0), ch, font=f)
        d.text((x - bb[0], baseline), ch, font=f, fill=fill, anchor='ls')
        x += w + gap
    return total


def rule(d, x1, x2, y, color=INK, width=2):
    d.line((x1, y, x2, y), fill=color, width=width)


def stitch(d, x1, x2, y, color=GOLD):
    """Золотая строчка — пунктир, как шов."""
    x = x1
    while x < x2:
        d.line((x, y, min(x + 14, x2), y), fill=color, width=3)
        x += 26


def podcast_cover():
    S = 1200
    im = linen(S, S)
    d = ImageDraw.Draw(im)
    cx = S / 2
    # рамка-паспарту
    d.rectangle((44, 44, S - 44, S - 44), outline=INK, width=3)
    d.rectangle((58, 58, S - 58, S - 58), outline=LINEN_DARK, width=1)

    f_small = ImageFont.truetype(SLAB_B, 30)
    y = 108
    tw = spaced(d, 'ПОДКАСТ', f_small, cx, y, INK, spacing=0.45)
    gap = 36
    rule(d, cx - tw / 2 - gap - 150, cx - tw / 2 - gap, y + 18, INK, 2)
    rule(d, cx + tw / 2 + gap, cx + tw / 2 + gap + 150, y + 18, INK, 2)

    logo = fleur_logo(760)
    im.paste(logo, (int(cx - logo.width / 2), 200), logo)

    # × и имя словами — знак Льва не ставим, он ещё не утверждён (12.09), как у «Груши».
    y2 = 200 + logo.height + 40
    stitch(d, 300, S - 300, y2)
    f_x = ImageFont.truetype(SERIF, 84)
    name = 'Лев Кейсер'
    f_name = ImageFont.truetype(SLAB_B, 62)
    nw = text_w(d, name, f_name)[0]
    xw = text_w(d, '×', f_x)[0]
    total = xw + 36 + nw
    x = cx - total / 2
    yb = y2 + 52
    bbx = d.textbbox((0, 0), '×', font=f_x)
    d.text((x - bbx[0], yb + 40 - bbx[1]), '×', font=f_x, fill=INK)
    x += xw + 36
    bbn = d.textbbox((0, 0), name, font=f_name)
    d.text((x - bbn[0], yb + 46 - bbn[1]), name, font=f_name, fill=INK)

    f_sub = ImageFont.truetype(SERIF_I, 40)
    centered(d, 'Разговор в мастерской интерьерного текстиля', f_sub, cx, yb + 190, INK)
    f_tag = ImageFont.truetype(SERIF, 26)
    spaced(d, 'ЕКАТЕРИНБУРГ • 2026', f_tag, cx, S - 128, GOLD, spacing=0.3)
    path = os.path.join(OUT, 'podcast-fleur.jpg')
    im.save(path, quality=90, optimize=True)
    return path


def drop_cover():
    W, H = 1600, 1200
    im = linen(W, H, seed=11)
    d = ImageDraw.Draw(im)
    d.rectangle((44, 44, W - 44, H - 44), outline=INK, width=3)
    d.rectangle((58, 58, W - 58, H - 58), outline=LINEN_DARK, width=1)

    f_small = ImageFont.truetype(SLAB_B, 30)
    spaced(d, 'ДРОП • ОСЕНЬ 2026', f_small, W / 2, 104, INK, spacing=0.4)

    # слева — вензель Флёр, справа — имя Льва словами (знак ещё не утверждён, 12.09),
    # между ними ×
    mono = fleur_monogram(470)
    row_y = 250
    im.paste(mono, (250, row_y), mono)
    f_x = ImageFont.truetype(SERIF, 150)
    bbx = d.textbbox((0, 0), '×', font=f_x)
    d.text((W / 2 - (bbx[2] - bbx[0]) / 2 - bbx[0], row_y + 170 - bbx[1]), '×', font=f_x, fill=INK)
    right_cx = W - 250 - 200
    f_lev_big = ImageFont.truetype(SLAB_B, 92)
    centered(d, 'Лев', f_lev_big, right_cx, row_y + 120, INK)
    centered(d, 'Кейсер', f_lev_big, right_cx, row_y + 235, INK)
    f_lev_sub = ImageFont.truetype(SLAB_R, 30)
    spaced(d, 'LEVKEISER', f_lev_sub, right_cx, row_y + 370, GOLD, spacing=0.3)

    # имя мастерской под вензелем
    f_fleur = ImageFont.truetype(SERIF, 86)
    centered(d, 'Флёр', f_fleur, 250 + mono.width / 2, row_y + mono.height + 8, INK)

    y = 900
    stitch(d, 300, W - 300, y)
    f_sub = ImageFont.truetype(SERIF_I, 46)
    centered(d, 'Кастомные светильники: абажуры мастерской, свет по-нашему', f_sub, W / 2, y + 36, INK)
    f_tag = ImageFont.truetype(SERIF, 26)
    # É — готовым символом U+00C9: разложенная форма (E + акут) рисуется PIL криво.
    spaced(d, "L'ATELIER CRÉATEUR TEXTILE • LEVKEISER", f_tag, W / 2, H - 120, GOLD, spacing=0.28)
    path = os.path.join(OUT, 'drop-fleur.jpg')
    im.save(path, quality=90, optimize=True)
    return path


if __name__ == '__main__':
    print(podcast_cover())
    print(drop_cover())
