# -*- coding: utf-8 -*-
"""Варианты чехлов на каркас-куб 500 — лист для выбора, не для витрины.

Куб висит на шнуре, свет внутри включён; видны две боковые грани и открытый
верх с проволокой. Каждая грань — квадрат 50 × 50, файлы граней делает
тот же генератор, что и флаги, но тут они только показаны в перспективе.

Плюс второй лист — кандидаты на замену флага «Музыка без ИИ».

Запуск: python tools/build_lampshade_variants.py [папка_вывода]
"""
import os
import re
import sys

import numpy as np
import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(SITE, "public", "uploads")
FONTS = os.path.join(SITE, "tools", "fonts")
BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
REG = os.path.join(FONTS, "RobotoSlab-Regular.ttf")
MARK_SVG = os.path.join(SITE, "content", "brand", "mark-v3", "head-loops.svg")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "lampshade")
os.makedirs(OUT, exist_ok=True)

TAR = (33, 26, 18)
SUNSET = (217, 154, 43)
DUST = (220, 203, 160)
MANE = (180, 96, 28)
WALL = (231, 221, 200)

F = 600  # сторона грани в файле-грани, px


def font(path, size):
    return ImageFont.truetype(path, size)


def cover(slug):
    return Image.open(os.path.join(UPLOADS, "release-%s.jpg" % slug)).convert("RGB").resize((F, F), Image.LANCZOS)


def text_face(text, bg=TAR, fg=SUNSET, max_frac=0.30):
    """Грань с надписью: подбираем кегль, чтобы влезло в 84 % ширины."""
    im = Image.new("RGB", (F, F), bg)
    d = ImageDraw.Draw(im)
    words = text.split()
    for size in range(int(F * max_frac), 40, -6):
        fnt = font(BOLD, size)
        lines, cur = [], ""
        for w in words:
            probe = (cur + " " + w).strip()
            if d.textlength(probe, font=fnt) <= F * 0.84 or not cur:
                cur = probe
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
        lh = size * 1.15
        if lh * len(lines) <= F * 0.7 and all(d.textlength(l, font=fnt) <= F * 0.84 for l in lines):
            break
    total = (len(lines) - 1) * lh + size * 0.72
    y = (F - total) / 2
    for l in lines:
        w = d.textlength(l, font=fnt)
        d.text(((F - w) / 2, y - size * 0.22), l, font=fnt, fill=fg)
        y += lh
    return im


_mark_cache = {}


def mark_face(bg=TAR, wordmark=False):
    """Знак-монета по центру грани; либо вордмарк LEVKEYSER."""
    im = Image.new("RGB", (F, F), bg)
    if wordmark:
        d = ImageDraw.Draw(im)
        fnt = font(BOLD, 74)
        t = "LEVKEYSER"
        # разрядка как на открытке
        widths = [d.textlength(ch, font=fnt) for ch in t]
        gap = 14
        total = sum(widths) + gap * (len(t) - 1)
        x = (F - total) / 2
        for ch, w in zip(t, widths):
            d.text((x, F / 2 - 50), ch, font=fnt, fill=DUST)
            x += w + gap
        return im
    if "png" not in _mark_cache:
        svg = open(MARK_SVG, encoding="utf-8").read()
        svg = svg.replace('<rect width="150" height="150" fill="#211A12"/>', "")
        svg = re.sub(r"<text[^>]*>.*?</text>", "", svg, flags=re.S)
        tmp = os.path.join(OUT, "_mark.svg")
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(svg)
        pix = fitz.open(tmp)[0].get_pixmap(dpi=400, alpha=True)
        png = os.path.join(OUT, "_mark.png")
        pix.save(png)
        os.remove(tmp)
        _mark_cache["png"] = Image.open(png).convert("RGBA")
    m = _mark_cache["png"].copy()
    s = int(F * 0.56)
    m = m.resize((s, s), Image.LANCZOS)
    im.paste(m, ((F - s) // 2, (F - s) // 2), m)
    return im


# ------------------------------------------------------------------ перспектива

def find_coeffs(src_pts, dst_pts):
    """Коэффициенты PIL PERSPECTIVE: из четырёх точек назначения в четыре исходные."""
    A = []
    for (x, y), (u, v) in zip(dst_pts, src_pts):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(A, dtype=float)
    B = np.array([c for p in src_pts for c in p], dtype=float)
    return tuple(np.linalg.solve(A, B))


def lit(face, side):
    """Ткань на просвет: чуть светлее и теплее, правая грань темнее левой."""
    k = 1.10 if side == "L" else 0.96
    arr = np.asarray(face).astype(float)
    arr = arr * k + np.array([14, 8, 0]) * (1.0 if side == "L" else 0.6)
    # мягкое пятно света в верхней трети — там лампа
    h, w, _ = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    glow = np.exp(-(((xx - w / 2) / (w * 0.55)) ** 2 + ((yy - h * 0.38) / (h * 0.5)) ** 2))
    arr += glow[..., None] * np.array([28, 20, 6])
    return Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))


def cube(faces, size=900, bg=WALL, dark_room=False):
    """faces: (левая грань, правая грань). Возвращает картинку куба на шнуре."""
    S = size
    if dark_room:
        bg = (52, 44, 34)
    im = Image.new("RGB", (S, S), bg)
    # вертикальный градиент стены
    d = ImageDraw.Draw(im)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(c * (1 - 0.10 * k)) for c in bg))

    a = S * 0.36          # проекция ребра
    cx, top = S * 0.5, S * 0.30
    dx, dy = a * 0.87, a * 0.34   # наклон изометрии
    # вершины: верхняя грань — ромб; нижние — ниже на a
    Tl = (cx - dx, top + dy)      # левый верх
    Tf = (cx, top + 2 * dy)       # ближний верх
    Tr = (cx + dx, top + dy)      # правый верх
    Tb = (cx, top)                # дальний верх
    down = lambda p: (p[0], p[1] + a)
    Bl, Bf, Br = down(Tl), down(Tf), down(Tr)

    # тень на стене/полу
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([Bl, Bf, Br, (Br[0] + 30, Br[1] + 60), (Bf[0], Bf[1] + 90), (Bl[0] - 20, Bl[1] + 50)],
                               fill=(0, 0, 0, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(24))
    im = Image.alpha_composite(im.convert("RGBA"), sh)

    for face, quad, side in ((faces[0], [Tl, Tf, Bf, Bl], "L"), (faces[1], [Tf, Tr, Br, Bf], "R")):
        f = lit(face, side)
        coeffs = find_coeffs([(0, 0), (F, 0), (F, F), (0, F)], quad)
        warped = f.transform((S, S), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).polygon(quad, fill=255)
        im.paste(warped, (0, 0), mask)

    d = ImageDraw.Draw(im)
    # проволока: верхний ромб, спицы к кольцу, кольцо
    wire = (236, 232, 224)
    d.line([Tl, Tb, Tr], fill=wire, width=3)
    d.line([Tl, Tf, Tr], fill=wire, width=3)
    ring = (cx, top + dy + a * 0.2)
    for p in (Tl, Tf, Tr, Tb):
        d.line([p, ring], fill=wire, width=2)
    d.ellipse([ring[0] - 16, ring[1] - 7, ring[0] + 16, ring[1] + 7], outline=wire, width=3)
    # свет наружу через верх
    gl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(gl).ellipse([cx - a * 0.9, top - a * 0.25, cx + a * 0.9, top + 2 * dy + 10], fill=(255, 220, 150, 60))
    gl = gl.filter(ImageFilter.GaussianBlur(40))
    im = Image.alpha_composite(im, gl)
    d = ImageDraw.Draw(im)
    # шнур и патрон
    d.line([(cx, 0), ring], fill=(40, 34, 28), width=4)
    d.rectangle([cx - 9, ring[1] - 26, cx + 9, ring[1] + 6], fill=(30, 26, 22))
    # рёбра куба поверх ткани — тонкая светлая проволока
    d.line([Tf, Bf], fill=(200, 196, 188), width=2)
    return im.convert("RGB")


def sheet(items, cols, title, path, tile=900, label_h=100):
    rows = (len(items) + cols - 1) // cols
    gap = 30
    W = cols * tile + (cols + 1) * gap
    H = rows * (tile + label_h) + (rows + 1) * gap + 70
    sh = Image.new("RGB", (W, H), (245, 240, 230))
    d = ImageDraw.Draw(sh)
    d.text((gap, 20), title, font=font(BOLD, 34), fill=TAR)
    for i, (img, cap) in enumerate(items):
        x = gap + (i % cols) * (tile + gap)
        y = 70 + gap + (i // cols) * (tile + label_h + gap)
        sh.paste(img.resize((tile, tile), Image.LANCZOS), (x, y))
        # подпись в две строки, если не влезает в плитку
        fnt = font(REG, 26)
        words, lines, cur = cap.split(), [], ""
        for wd in words:
            probe = (cur + " " + wd).strip()
            if d.textlength(probe, font=fnt) <= tile or not cur:
                cur = probe
            else:
                lines.append(cur)
                cur = wd
        lines.append(cur)
        for j, ln in enumerate(lines[:3]):
            d.text((x, y + tile + 12 + j * 30), ln, font=fnt, fill=TAR)
    sh.save(path, "JPEG", quality=88)
    print("  ", os.path.basename(path))


# ------------------------------------------------------------------ варианты абажуров

def lampshade_sheet():
    items = [
        (cube((text_face("ДВИГАЮСЬ"), text_face("МЕДЛЕННО"))),
         "A · Фраза по кругу: ДВИГАЮСЬ / МЕДЛЕННО / В БЫСТРОМ / МИРЕ, грань — слово"),
        (cube((text_face("ДВИГАЮСЬ", bg=DUST, fg=TAR), text_face("МЕДЛЕННО", bg=DUST, fg=TAR)), dark_room=True),
         "B · Фонарь: то же, но светлая ткань и тёмные буквы — светится вся грань"),
        (cube((cover("soundstates"), cover("soundstates"))),
         "C · Один релиз на все четыре грани (Soundstates)"),
        (cube((cover("ikigai"), cover("flowers"))),
         "D · Дискография: четыре разных обложки, по одной на грань"),
        (cube((cover("flowers"), text_face("FLOWERS", fg=DUST))),
         "E · Обложка + название релиза через грань (2 + 2)"),
        (cube((mark_face(), mark_face(wordmark=True))),
         "F · Бренд: знак-монета и LEVKEYSER, без слогана"),
        (cube((cover("bubblegum"), cover("hotline")), dark_room=True),
         "G · Яркие синглы в тёмной комнате: Bubblegum / Hotline"),
        (cube((text_face("ЭТО НЕ ПРО ЛЕНЬ"), text_face("ТЕМП ВЫБИРАЮ САМ"))),
         "H · Четыре тезиса манифеста, по одному на грань"),
    ]
    sheet(items, 4, "Чехлы на каркас-куб 500 — варианты (свет включён, видны две грани из четырёх)",
          os.path.join(OUT, "abazhur-varianty.jpg"))


# ------------------------------------------------------------------ замена «Музыка без ИИ»

def flag_panel(text):
    """Горизонтальный флаг 3:2 на стене — как в макетах витрины, но без люверсов и штампа."""
    w, h = 900, 600
    im = Image.new("RGB", (w, h), TAR)
    d = ImageDraw.Draw(im)
    words = text.split()
    for size in range(int(h * 0.22), 30, -4):
        fnt = font(BOLD, size)
        lines, cur = [], ""
        for wd in words:
            probe = (cur + " " + wd).strip()
            if d.textlength(probe, font=fnt) <= w * 0.84 or not cur:
                cur = probe
            else:
                lines.append(cur)
                cur = wd
        lines.append(cur)
        lh = size * 1.18
        if lh * len(lines) <= h * 0.72 and all(d.textlength(l, font=fnt) <= w * 0.84 for l in lines):
            break
    total = (len(lines) - 1) * lh + size * 0.72
    y = (h - total) / 2
    for l in lines:
        tw = d.textlength(l, font=fnt)
        d.text(((w - tw) / 2, y - size * 0.22), l, font=fnt, fill=SUNSET)
        y += lh
    # на стену
    S = 900
    bg = Image.new("RGB", (S, S), WALL)
    fw, fh = 720, 480
    x, y0 = (S - fw) // 2, (S - fh) // 2
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([x + 10, y0 + 16, x + fw + 10, y0 + fh + 16], fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    bg = Image.alpha_composite(bg.convert("RGBA"), sh).convert("RGB")
    bg.paste(im.resize((fw, fh), Image.LANCZOS), (x, y0))
    return bg


def flag_sheet():
    cands = [
        ("ЭТО НЕ ПРО ЛЕНЬ", "1 · заголовок первой главы манифеста"),
        ("ТЕМП ВЫБИРАЮ САМ", "2 · «выбирать темп самому, а не брать навязанный»"),
        ("ОДИН ДУБЛЬ", "3 · из главы про кино; коротко, под 90 × 60 над столом"),
        ("АЛЬБОМ ЦЕЛИКОМ", "4 · как слушать; пара к нему — «БЕЗ SHUFFLE»"),
        ("ВСЕЛЕННАЯ НЕ ОБЪЯСНЯЕТ ПОЧЕМУ", "5 · хук серии States of Mind"),
        ("SLOW IN A FAST WORLD", "6 · английская версия пары одной строкой"),
        ("РУКАМИ", "7 · то же, что «без ИИ», но без «ИИ» на стене"),
        ("МЕДЛЕННО — ЭТО ВЫБОР", "8 · из описания карточки флага"),
    ]
    items = [(flag_panel(t), cap) for t, cap in cands]
    sheet(items, 4, "Замена флага «Музыка без ИИ» — кандидаты",
          os.path.join(OUT, "flag-zamena-varianty.jpg"))


if __name__ == "__main__":
    print("Листы вариантов:")
    lampshade_sheet()
    flag_sheet()
