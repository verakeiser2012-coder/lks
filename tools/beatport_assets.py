# -*- coding: utf-8 -*-
"""Файлы для Beatport: логотип лейбла и обложка профиля артиста.

Лейбла как юрлица нет — релизы идут от имени бренда LEVKEYSER, поэтому логотип
лейбла = знак «Печать» с брендборда, перерисованный без SVG-движка: кривые из
SVG-путей досчитываются вручную (квадратичные Безье), чтобы совпасть с эталоном.

Beatport требует: логотип лейбла — квадрат JPG/PNG без прозрачности;
фото артиста в Greenroom — 590×404 JPG/PNG. Фото — настоящий кадр, не графика.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab.ttf')
UP = os.path.join(ROOT, 'public', 'uploads')
OUT = os.environ.get('SCR', UP)

MANE = (0xB4, 0x60, 0x1C)
DUST = (0xDC, 0xCB, 0xA0)
RESIN = (0x21, 0x1A, 0x12)


def qbez(p0, p1, p2, n=24):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]


def mark(size, bg=RESIN):
    """Знак «Печать» в координатах брендборда 150×150, масштаб к size."""
    k = size / 150.0
    S = lambda pts: [(x * k, y * k) for x, y in pts]
    ss = 4  # суперсэмплинг ради ровных кривых
    im = Image.new('RGB', (size * ss, size * ss), bg)
    d = ImageDraw.Draw(im)
    K = lambda pts: [(x * ss, y * ss) for x, y in S(pts)]
    w = lambda v: max(1, int(v * k * ss))
    # кольца
    d.ellipse(K([(5, 5), (145, 145)]), outline=DUST, width=w(3))
    inner = tuple(int(c * 0.5 + b * 0.5) for c, b in zip(DUST, bg))
    d.ellipse(K([(13, 13), (137, 137)]), outline=inner, width=w(1))
    # бюст: M45 118 Q45 84 55 72 Q48 60 52 47 Q56 32 75 30 Q94 32 98 47 Q102 60 95 72 Q105 84 105 118 Z
    poly = [(45, 118)]
    for a, b, c in [((45, 118), (45, 84), (55, 72)), ((55, 72), (48, 60), (52, 47)), ((52, 47), (56, 32), (75, 30)),
                    ((75, 30), (94, 32), (98, 47)), ((98, 47), (102, 60), (95, 72)), ((95, 72), (105, 84), (105, 118))]:
        poly += qbez(a, b, c)[1:]
    d.polygon(K(poly), fill=DUST)
    # кудри — только цвета Гривы
    for cx, cy, r in [(52, 38, 7), (65, 28, 8), (82, 26, 8), (96, 34, 7), (102, 47, 6)]:
        d.ellipse(K([(cx - r, cy - r), (cx + r, cy + r)]), fill=MANE)
    # наушники: чашки + дуга
    for pts in ([(40, 62)] + qbez((40, 62), (40, 55), (47, 54))[1:] + [(47, 74)] + qbez((47, 74), (40, 73), (40, 66))[1:],
                [(110, 62)] + qbez((110, 62), (110, 55), (103, 54))[1:] + [(103, 74)] + qbez((103, 74), (110, 73), (110, 66))[1:]):
        d.polygon(K(pts), fill=bg, outline=DUST, width=w(2))
    d.line(K(qbez((44, 56), (75, 12), (106, 56))), fill=DUST, width=w(4), joint='curve')
    return im.resize((size, size), Image.LANCZOS)


def label_logo(name, with_word):
    size = 1500
    im = mark(size if not with_word else 1500)
    if with_word:
        # знак чуть выше центра, под ним wordmark; Beatport показывает лого мелко, поэтому крупно
        canvas = Image.new('RGB', (size, size), RESIN)
        m = mark(1040)
        canvas.paste(m, ((size - 1040) // 2, 70))
        d = ImageDraw.Draw(canvas)
        f = ImageFont.truetype(FONT, 190)
        txt = 'LEVKEYSER'
        bb = d.textbbox((0, 0), txt, font=f)
        x = (size - bb[2]) // 2 - bb[0]
        y = 1170
        d.text((x, y), 'LEV', font=f, fill=DUST)
        wlev = d.textbbox((0, 0), 'LEV', font=f)[2]
        d.text((x + wlev, y), 'KEYSER', font=f, fill=MANE)
        im = canvas
    im.save(os.path.join(UP, name), quality=92, optimize=True)
    return name


def artist_photo(src, name, focus_y=0.42):
    """590×404: кадрируем по центру с выбранной высотой точки внимания."""
    im = Image.open(os.path.join(UP, src)).convert('RGB')
    W, H = im.size
    tw, th = 590, 404
    scale = max(tw / W, th / H)
    im = im.resize((int(W * scale) + 1, int(H * scale) + 1), Image.LANCZOS)
    W, H = im.size
    left = (W - tw) // 2
    top = int(max(0, min(H - th, H * focus_y - th / 2)))
    im.crop((left, top, left + tw, top + th)).save(os.path.join(UP, name), quality=92, optimize=True)
    return name


if __name__ == '__main__':
    made = [label_logo('label-logo.jpg', False), label_logo('label-logo-wordmark.jpg', True)]
    sheet = Image.new('RGB', (2 * 420 + 30, 440), (150, 190, 150))
    for i, n in enumerate(made):
        t = Image.open(os.path.join(UP, n)); t.thumbnail((400, 400))
        sheet.paste(t, (10 + i * 420, 20))
    sheet.save(os.path.join(OUT, '_label_logos.jpg'), quality=85)
    print('готово:', made)

    # кандидаты в фото профиля — на лист для выбора
    cands = [c for c in ['og-lev.jpg', 'style-13y-06.jpg', 'style-13y-18.jpg', 'style-12y-10.jpg', 'style-film-13y-19.jpg',
                         '646cf6ad9e69599ea3c01982dc226734.jpg', 'a075d56081bf7b8ac02fc22ced2fd699.jpg'] if os.path.exists(os.path.join(UP, c))]
    sheet = Image.new('RGB', (len(cands) * 250 + 10, 300), (150, 190, 150))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(FONT, 16)
    for i, c in enumerate(cands):
        t = Image.open(os.path.join(UP, c)).convert('RGB'); sz = t.size; t.thumbnail((240, 240))
        sheet.paste(t, (10 + i * 250, 10))
        d.text((10 + i * 250, 262), '%d %s %dx%d' % (i, c[:14], sz[0], sz[1]), font=f, fill=(0, 0, 0))
    sheet.save(os.path.join(OUT, '_photo_cands.jpg'), quality=85)
    print('кандидаты:', list(enumerate(cands)))
