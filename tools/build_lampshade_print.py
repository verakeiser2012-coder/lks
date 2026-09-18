# -*- coding: utf-8 -*-
"""Печатные файлы чехлов на каркас-куб 500: обложки альбомов, по одной на все грани.

Решение 14.09.2026: на абажуры идут только обложки альбомов (Ikigai, Flowers,
Soundstates), без надписей и без знака-монеты (знак не утверждён).

Чехол — лента из четырёх граней 500 × 500 = 2000 × 500 мм, сшивается в кольцо,
шнуруется на каркас через люверсы. Файл: 2040 × 540 мм (20 мм припуск на подгиб
сверху/снизу и на стыковой шов по краям), 150 dpi.

Решение 17.09.2026: обложка идёт ОДНОЙ панорамной полосой на все четыре грани
(горизонтальный кроп 4:1 из квадрата), а не четырьмя дублями. Для каждого альбома
задано, где резать: центр по высоте и окно по ширине — у Soundstates окно выбрано так,
чтобы ребро куба делило лицо бюста ровно пополам (ось лица на 0.475 ширины скана →
середина ленты; решение владельца 17.09.2026).
Исходники — самые крупные из папки «музыка» (Soundstates — скан коллажа 1200 dpi).

Результат: <папка>/abazhur-<slug>-2000x500.png/.pdf, превью, техлист.
Запуск: python tools/build_lampshade_print.py [папка_вывода]
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter
Image.MAX_IMAGE_PIXELS = None  # скан коллажа 1200 dpi
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(SITE, "tools", "fonts")
BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
REG = os.path.join(FONTS, "RobotoSlab-Regular.ttf")
MUSIC = os.path.join(os.path.expanduser("~"), "Desktop", "музыка", "Релизы")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "lampshade")
os.makedirs(OUT, exist_ok=True)

FACE = 500           # грань, мм
N = 4                # граней в ленте
BLEED = 20           # припуск, мм
STRIP_W, STRIP_H = FACE * N, FACE
PW, PH = STRIP_W + 2 * BLEED, STRIP_H + 2 * BLEED
DPI = 150
TAR = (33, 26, 18)

# (slug, название, файл, центр окна по высоте, окно по ширине (x0, ширина) в долях)
ALBUMS = [
    ("ikigai", "Ikigai", os.path.join(MUSIC, "2024 - Ikigai (EP)", "Обложка", "Ikigai — обложка 3840x3840.jpg"), 0.50, (0.0, 1.0)),
    ("flowers", "Flowers", os.path.join(MUSIC, "2025 - Flowers (EP)", "Обложка", "Flowers картинка.jpg"), 0.40, (0.0, 1.0)),
    ("soundstates", "Soundstates", os.path.join(MUSIC, "2026 - Soundstates (EP)", "Обложка", "Soundstates — скан 1200dpi 2026-09-17 (цвет под обложку).png"), 0.40, (0.0, 0.95)),
]


def px(v_mm):
    return round(v_mm / 25.4 * DPI)


def strip_for(src_path, cy, win):
    """Панорама: из квадрата берём окно шириной win[1]·W от x = win[0]·W, высотой
    W_окна/4, с центром по высоте cy·H; растягиваем на 2000 × 500 + припуск (сам
    припуск — из той же картинки, окно берётся чуть больше чистого размера)."""
    src = Image.open(src_path).convert("RGB")
    W0, H0 = src.size
    x0 = round(W0 * win[0]); cw = round(W0 * win[1])
    # окно с припуском: пропорция файла PW:PH, чистая часть = cw × cw/4
    full_w = round(cw * PW / STRIP_W)
    full_h = round(full_w * PH / PW)
    x0 = max(0, min(x0 - (full_w - cw) // 2, W0 - full_w))
    y0 = max(0, min(round(H0 * cy - full_h / 2), H0 - full_h))
    crop = src.crop((x0, y0, x0 + full_w, y0 + full_h))
    W, H = px(PW), px(PH)
    strip = crop.resize((W, H), Image.LANCZOS)
    if full_w < W:
        strip = strip.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=3))
    return strip, src.size


def save_pdf(jpg_path, pdf_path, title):
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    c = canvas.Canvas(pdf_path, pagesize=(PW * mm, PH * mm))
    c.setTitle(title)
    c.drawImage(jpg_path, 0, 0, PW * mm, PH * mm)
    c.showPage()
    c.save()


def preview(strips):
    """Лента с разметкой: линии подгиба, границы граней, люверсы."""
    fnt = ImageFont.truetype(REG, 22)
    tiles = []
    for slug, title, strip in strips:
        im = strip.copy()
        im.thumbnail((2040, 540), Image.LANCZOS)
        k = im.width / PW
        d = ImageDraw.Draw(im)
        b = BLEED * k
        d.rectangle([b, b, im.width - b, im.height - b], outline=(255, 255, 255), width=2)
        for i in range(1, N):
            x = b + i * FACE * k
            d.line([(x, 0), (x, im.height)], fill=(255, 255, 255), width=1)
        r = 7
        for i in range(N + 1):
            x = b + i * FACE * k
            x = min(max(x, b + 25 * k), im.width - b - 25 * k)
            for y in (b + 25 * k, im.height - b - 25 * k):
                d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255), width=2)
        tiles.append((title, im))
    W = tiles[0][1].width + 60
    H = sum(t[1].height + 70 for t in tiles) + 90
    sheet = Image.new("RGB", (W, H), (235, 228, 214))
    d = ImageDraw.Draw(sheet)
    d.text((30, 20), "Чехлы на куб 500 — ленты 2000 × 500 для печати. Белая рамка — подгиб, вертикали — рёбра куба, кружки — люверсы (не печатаются)",
           font=ImageFont.truetype(BOLD, 24), fill=TAR)
    y = 80
    for title, im in tiles:
        d.text((30, y), title, font=fnt, fill=TAR)
        sheet.paste(im, (30, y + 32))
        y += im.height + 70
    p = os.path.join(OUT, "_preview-all.jpg")
    sheet.save(p, "JPEG", quality=88)
    print("  ", os.path.basename(p))


def techsheet(sizes):
    lines = ["ЧЕХЛЫ НА КАРКАС-КУБ 500 — техлист для печати и пошива",
             "Редакция 17.09.2026 · ИП Кейсер Л. М. · levkeiser.shop", "",
             "Что это: сменный тканевый чехол на проволочный каркас-куб 500 × 500 × 500 (подвесной абажур).",
             "Лента из четырёх граней, сшитая в кольцо; на каркас шнуруется через люверсы.", "",
             "Файлы (PNG 150 dpi и PDF с тем же растром):"]
    for (slug, title, _, _, _), sz in zip(ALBUMS, sizes):
        lines.append("  abazhur-%s-2000x500 — обложка «%s» одной панорамой на четыре грани (исходник %d × %d)" % (slug, title, sz[0], sz[1]))
    lines += ["",
              "Размеры",
              "  Чистый размер ленты: 2000 × 500 мм = 4 грани по 500 × 500.",
              "  Файл: 2040 × 540 мм — по 20 мм припуска: сверху и снизу на подгиб, по краям на стыковой шов.",
              "  Картинка идёт в припуск (края растянуты), белого не будет.",
              "",
              "Материал и печать",
              "  Полиэстер под сублимацию — СВЕТЛЫЙ и ПРОСВЕЧИВАЮЩИЙ (в отличие от флагов): чехол работает на просвет,",
              "  внутри лампа. Просьба показать 2–3 плотности на образце с лампой.",
              "  Печать сублимационная. Полноцвет, RGB.",
              "  Обложка идёт одной непрерывной полосой вокруг куба; рёбра куба — на четвертях ленты.",
              "",
              "Пошив",
              "  Верх и низ подогнуты на 20 мм и прострочены. Края ленты сшиты в кольцо (шов — на ребре куба).",
              "  Люверсы металлические, никель матовый, малые (внутр. 5–6 мм):",
              "  по 5 сверху и 5 снизу — на каждом ребре куба и на шве, центр в 25 мм от подогнутой кромки.",
              "  Через них чехол шнуруется к верхнему и нижнему квадрату каркаса.",
              "",
              "Лампа: только LED (полиэстер не терпит накаливания) — пишем в карточке, к пошиву не относится.",
              "",
              "Тираж (первый): по 2 чехла на каждый альбом = 6 шт. Просьба назвать цену на 6 / 20 / 40.",
              ""]
    p = os.path.join(OUT, "_техлист.txt")
    with open(p, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("  ", os.path.basename(p))


if __name__ == "__main__":
    print("Чехлы на куб — печать:")
    strips, sizes = [], []
    for slug, title, src, cy, win in ALBUMS:
        strip, sz = strip_for(src, cy, win)
        png = os.path.join(OUT, "abazhur-%s-2000x500.png" % slug)
        strip.save(png, "PNG")
        jpg = os.path.join(OUT, "_embed.jpg")
        strip.save(jpg, "JPEG", quality=94, subsampling=0)
        pdf = os.path.join(OUT, "abazhur-%s-2000x500.pdf" % slug)
        save_pdf(jpg, pdf, "%s — чехол на куб 500, печать" % title)
        os.remove(jpg)
        print("  ", os.path.basename(png), "%d × %d px, исходник %d × %d" % (strip.width, strip.height, sz[0], sz[1]))
        print("  ", os.path.basename(pdf))
        strips.append((slug, title, strip))
        sizes.append(sz)
    preview(strips)
    techsheet(sizes)
