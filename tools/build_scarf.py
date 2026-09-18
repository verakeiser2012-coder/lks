# -*- coding: utf-8 -*-
"""Платок Soundstates — макет для витрины и печатные файлы.

Решение 17.09.2026: вместо флага Soundstates — платок (унисекс, шейный/головной)
с коллажем обложки. Источник — скан коллажа 1200 dpi (цвет под обложку, без царапин).

Два варианта рисунка, оба собираются:
  A «навылет»  — квадратный кроп коллажа на всё полотно;
  B «с каймой» — коллаж целиком (он не квадратный, 18.6 × 19.9) внутри тёмно-синей
                 каймы, как у классического каре; рваные края бумаги видны полностью.

Размеры: основной 70 × 70 (шейный, унисекс), 90 × 90 (на голову / плечи), 55 × 55 (бандана).
Выбран вариант B (решение владельца 17.09.2026); A остаётся в скрипте на всякий случай.
Печать: 300 dpi, чистый размер + 15 мм припуска на подгиб с каждой стороны.
Ткань — натуральный шёлк, твил 12–14 момми, реактивная печать (решение 17.09.2026, вечер):
не сублимация на полиэстер. Подрядчики и цены — notes/platok-natural-sourcing.md.

Результат:
  public/uploads/product-platok-soundstates.jpg      — макет витрины (вариант по умолчанию)
  <папка>/platok-soundstates-<A|B>-70x70.png/.pdf, -90x90.png/.pdf, _preview.jpg
Запуск: python tools/build_scarf.py [папка_вывода] [A|B]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

Image.MAX_IMAGE_PIXELS = None
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(SITE, "public", "uploads")
FONTS = os.path.join(SITE, "tools", "fonts")
REG = os.path.join(FONTS, "RobotoSlab-Regular.ttf")
BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
SCAN = os.path.join(os.path.expanduser("~"), "Desktop", "музыка", "Релизы", "2026 - Soundstates (EP)",
                    "Обложка", "Soundstates — скан 1200dpi 2026-09-17 (цвет под обложку).png")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "scarf")
DEFAULT = sys.argv[2] if len(sys.argv) > 2 else "B"
os.makedirs(OUT, exist_ok=True)

DPI = 300                    # натуральный шёлк, реактивная печать: Galstyks просит 300 dpi, остальным хватит
HEM = 15                     # мм, припуск на подгиб (ручной рулик 15, машинный 5 — Russian Silk)
SIZES = (55, 70, 90)         # см: бандана, шейный (основной), головной
BORDER_FRAC = 0.055          # кайма варианта B — доля стороны
NAVY = (22, 34, 52)          # кайма: тёмно-синий из космоса коллажа
WALL = (231, 221, 200)
TAR = (33, 26, 18)
DUST = (220, 203, 160)


def px(v_mm):
    return round(v_mm / 25.4 * DPI)


# ------------------------------------------------------------------ рисунок платка

def design(variant, side_px):
    """Квадрат side_px × side_px с рисунком (без припуска)."""
    src = Image.open(SCAN).convert("RGB")
    if variant == "A":
        s = min(src.size)
        y0 = (src.height - s) // 2
        sq = src.crop(((src.width - s) // 2, y0, (src.width - s) // 2 + s, y0 + s))
        return sq.resize((side_px, side_px), Image.LANCZOS)
    # B: коллаж целиком внутри каймы
    im = Image.new("RGB", (side_px, side_px), NAVY)
    inner = side_px - 2 * round(side_px * BORDER_FRAC)
    k = min(inner / src.width, inner / src.height)
    w, h = round(src.width * k), round(src.height * k)
    col = src.resize((w, h), Image.LANCZOS)
    im.paste(col, ((side_px - w) // 2, (side_px - h) // 2))
    # тонкая светлая линия по границе каймы — как кант у каре
    d = ImageDraw.Draw(im)
    m = round(side_px * BORDER_FRAC * 0.55)
    d.rectangle([m, m, side_px - m - 1, side_px - m - 1], outline=DUST, width=max(2, side_px // 500))
    return im


def with_hem(art, side_px, hem_px):
    """Припуск на подгиб: вытягиваем крайние пиксели наружу, чтобы не было белого."""
    full = side_px + 2 * hem_px
    out = Image.new("RGB", (full, full))
    out.paste(art, (hem_px, hem_px))
    out.paste(art.crop((0, 0, side_px, 1)).resize((side_px, hem_px)), (hem_px, 0))
    out.paste(art.crop((0, side_px - 1, side_px, side_px)).resize((side_px, hem_px)), (hem_px, hem_px + side_px))
    out.paste(out.crop((hem_px, 0, hem_px + 1, full)).resize((hem_px, full)), (0, 0))
    out.paste(out.crop((hem_px + side_px - 1, 0, hem_px + side_px, full)).resize((hem_px, full)), (hem_px + side_px, 0))
    return out


def print_files(variant):
    for cm in SIZES:
        side = px(cm * 10)
        art = design(variant, side)
        full = with_hem(art, side, px(HEM))
        base = os.path.join(OUT, "platok-soundstates-%s-%dx%d" % (variant, cm, cm))
        full.save(base + ".png", "PNG")
        jpg = base + "-embed.jpg"
        full.save(jpg, "JPEG", quality=94, subsampling=0)
        pdf = base + ".pdf"
        if os.path.exists(pdf):
            os.remove(pdf)
        total_mm = cm * 10 + 2 * HEM
        c = canvas.Canvas(pdf, pagesize=(total_mm * mm, total_mm * mm))
        c.setTitle("Платок Soundstates %d × %d, вариант %s, печать" % (cm, cm, variant))
        c.drawImage(jpg, 0, 0, total_mm * mm, total_mm * mm)
        c.showPage()
        c.save()
        os.remove(jpg)
        print("  ", os.path.basename(base), "%d × %d px (+%d мм подгиб)" % (full.width, full.height, HEM))


# ------------------------------------------------------------------ макет витрины

def wall_bg(S):
    bg = Image.new("RGB", (S, S), WALL)
    d = ImageDraw.Draw(bg)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(int(WALL[0] - 18 * k), int(WALL[1] - 18 * k), int(WALL[2] - 16 * k)))
    return bg


def cloth(art, w):
    """Ткань: мягкие волны освещения + подвёрнутый уголок с тенью."""
    im = art.resize((w, w), Image.LANCZOS)
    arr = np.asarray(im).astype(float)
    yy, xx = np.mgrid[0:w, 0:w]
    waves = 1 + 0.10 * np.sin((xx + yy) / w * 6.0) * np.sin(yy / w * 2.5 + 0.7) + 0.05 * np.cos(xx / w * 9.0)
    arr = np.clip(arr * waves[..., None], 0, 255)
    im = Image.fromarray(arr.astype("uint8")).convert("RGBA")
    # подвёрнутый нижний правый угол: треугольник заменяем изнанкой (светлее, бледнее)
    t = int(w * 0.16)
    back = Image.fromarray(np.clip(arr * 0.35 + 150, 0, 255).astype("uint8")).convert("RGBA")
    back = back.transpose(Image.FLIP_LEFT_RIGHT)
    mask = Image.new("L", (w, w), 0)
    ImageDraw.Draw(mask).polygon([(w, w - t), (w - t, w), (w, w)], fill=255)
    # сначала вырезаем угол (прозрачно), потом кладём отворот чуть смещённым внутрь
    cut = Image.new("L", (w, w), 255)
    ImageDraw.Draw(cut).polygon([(w, w - t), (w - t, w), (w, w)], fill=0)
    im.putalpha(cut)
    flap = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    fm = Image.new("L", (w, w), 0)
    ImageDraw.Draw(fm).polygon([(w - t, w - t), (w, w - t), (w - t, w)], fill=255)
    flap.paste(back, (0, 0), fm)
    sh = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(w - t - 6, w - t - 6), (w + 4, w - t - 6), (w - t - 6, w + 4)], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    im = Image.alpha_composite(im, sh)
    im = Image.alpha_composite(im, flap)
    return im


def mockup(variant, name="product-platok-soundstates.jpg"):
    S = 1200
    bg = wall_bg(S).convert("RGBA")
    w = 760
    art = design(variant, 900)
    c = cloth(art, w)
    x, y = (S - w) // 2, (S - w) // 2 - 20
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([x + 10, y + 16, x + w + 10, y + w + 16], fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    bg = Image.alpha_composite(bg, shadow)
    bg.alpha_composite(c, (x, y))
    d = ImageDraw.Draw(bg)
    # штамп «макет», как на флагах
    fnt = ImageFont.truetype(REG, 26)
    tw = d.textlength("макет", font=fnt)
    sx, sy = S - tw - 34, S - 52
    d.rounded_rectangle([sx - 14, sy - 8, sx + tw + 14, sy + 36], radius=10, fill=TAR)
    d.text((sx, sy), "макет", font=fnt, fill=DUST)
    out = bg.convert("RGB")
    out.save(os.path.join(UPLOADS, name), "JPEG", quality=90)
    return out


def preview():
    fnt = ImageFont.truetype(BOLD, 30)
    tiles = [(v, mockup(v, name="_platok-%s.jpg" % v)) for v in ("A", "B")]
    for v, _ in tiles:
        os.remove(os.path.join(UPLOADS, "_platok-%s.jpg" % v))
    sh = Image.new("RGB", (1200 * 2 + 60, 1200 + 70), (245, 240, 230))
    d = ImageDraw.Draw(sh)
    for i, (v, im) in enumerate(tiles):
        d.text((20 + i * 1230, 18), "A · навылет" if v == "A" else "B · с каймой, коллаж целиком", font=fnt, fill=TAR)
        sh.paste(im, (20 + i * 1230, 60))
    p = os.path.join(OUT, "_preview-AB.jpg")
    sh.save(p, "JPEG", quality=88)
    print("  ", os.path.basename(p))


if __name__ == "__main__":
    print("Платок Soundstates:")
    for v in ("A", "B"):
        print_files(v)
    preview()
    mockup(DEFAULT)
    print("   макет витрины: вариант", DEFAULT)
