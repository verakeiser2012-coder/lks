# -*- coding: utf-8 -*-
"""Печатные файлы интерьерных флагов 150 × 100 см (горизонталь, капитель).

Не макеты для витрины (те собирает build_product_mockups.py), а то, что уходит
подрядчику на сублимацию: полотно 1:1 с припуском на подгиб, без люверсов,
без пометки «макет», без стены.

На каждый флаг:
  <slug>-150x100.pdf — вектор, шрифт встроен, страница 1540 × 1040 мм
                       (1500 × 1000 чистый + 20 мм припуск с каждой стороны);
  <slug>-150x100.png — то же растром, 150 dpi, для тех, кто не берёт PDF.
Плюс превью всех четырёх на одном листе и техлист для подрядчика.

Запуск: python tools/build_flag_print.py [папка_вывода]
"""
import os
import sys

import pymupdf as fitz
from PIL import Image, ImageFilter, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None  # скан коллажа 1200 dpi
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(SITE, "tools", "fonts")
BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "flags")
os.makedirs(OUT, exist_ok=True)
pdfmetrics.registerFont(TTFont("SlabB", BOLD))

# Обложка Soundstates — скан бумажного коллажа 1200 dpi (17.09.2026), 8784 × 9424, весь
# коллаж целиком, цвет подтянут под официальную обложку. Тот же файл идёт на абажур.
COVER = os.path.join(os.path.expanduser("~"), "Desktop", "музыка", "Релизы",
                     "2026 - Soundstates (EP)", "Обложка", "Soundstates — скан 1200dpi 2026-09-17 (цвет под обложку).png")

# ------------------------------------------------------------------ размеры, мм
W, H = 1500, 1000     # чистый размер
BLEED = 20            # припуск на подгиб с каждой стороны
PW, PH = W + 2 * BLEED, H + 2 * BLEED
DPI = 150

# Режем «по принципу баннера»: лейбл «soundstates» по центру полотна (у скана он
# на 39 % высоты; у официального квадрата было 0.46). Решение владельца 14.09.2026.
COVER_CENTER = 0.39

# Палитра «Дикий лев» — как на макетах и на сайте
TAR = (33, 26, 18)
SUNSET = (217, 154, 43)

FLAGS = [
    ("flag-dvigayus-medlenno", "ДВИГАЮСЬ МЕДЛЕННО"),
    ("flag-v-bystrom-mire", "В БЫСТРОМ МИРЕ"),
    ("flag-slow-in-a-fast-world", "SLOW IN A\nFAST WORLD"),
    # flag-soundstates снят 17.09.2026 — платок, tools/build_scarf.py
]


def rgb(t):
    return Color(t[0] / 255, t[1] / 255, t[2] / 255)


def wrap(width_fn, text, max_w):
    """Перенос по словам; явный перенос (\n) уважается как есть."""
    if "\n" in text:
        return text.split("\n")
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if width_fn(probe) <= max_w or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_text(text, box_w, box_h, width_fn_for, max_size, min_size=80, step=8):
    """Та же логика, что в макетах: подбираем кегль, чтобы строки влезли в короб.
    Размеры — в мм; width_fn_for(size) возвращает функцию ширины строки в мм."""
    for size in range(max_size, min_size - 1, -step):
        wf = width_fn_for(size)
        lines = wrap(wf, text, box_w)
        lh = size * 1.18
        if lh * len(lines) <= box_h and all(wf(l) <= box_w for l in lines):
            return size, lines, lh
    return size, lines, lh


# Короб под текст — те же доли, что в flag_panel макетов, но от чистого размера
BOX = (W * 0.08, H * 0.14, W * 0.92, H * 0.86)
MAX_PT = int(H * 0.22)   # мм; в макете max_size = h * 0.22 px при h = высоте полотна


def pdf_text_flag(slug, text):
    path = os.path.join(OUT, "%s-150x100.pdf" % slug)
    if os.path.exists(path):
        os.remove(path)
    c = canvas.Canvas(path, pagesize=(PW * mm, PH * mm))
    c.setTitle("%s — флаг 150 × 100, печать" % text.replace("\n", " "))
    c.setFillColor(rgb(TAR))
    c.rect(0, 0, PW * mm, PH * mm, stroke=0, fill=1)

    def width_for(size):
        return lambda s: c.stringWidth(s, "SlabB", size * mm) / mm

    size, lines, lh = fit_text(text, BOX[2] - BOX[0], BOX[3] - BOX[1], width_for, MAX_PT)
    c.setFillColor(rgb(SUNSET))
    c.setFont("SlabB", size * mm)
    # Центруем по видимой высоте капители (0.72 кегля над базовой линией у Roboto
    # Slab), а не по интерлиньяжу — иначе блок уезжает вверх.
    n = len(lines)
    visual = (n - 1) * lh + size * 0.72
    center = BLEED + H - (BOX[1] + BOX[3]) / 2
    y = center - visual / 2 + (n - 1) * lh
    for ln in lines:
        c.drawCentredString((BLEED + W / 2) * mm, y * mm, ln)
        y -= lh
    c.showPage()
    c.save()
    print("  ", os.path.basename(path), "кегль %d мм, строк %d" % (size, len(lines)))
    return path


def png_from_pdf(pdf, slug):
    doc = fitz.open(pdf)
    pix = doc[0].get_pixmap(dpi=DPI, alpha=False)
    out = os.path.join(OUT, "%s-150x100.png" % slug)
    pix.save(out)
    print("  ", os.path.basename(out), "%d × %d px" % (pix.width, pix.height))
    return out


def cover_flag(slug):
    """Обложка на всю плоскость: кроп квадрата под 154:104 с припуском, апскейл до 150 dpi."""
    src = Image.open(COVER).convert("RGB")
    tw, th = round(PW / 25.4 * DPI), round(PH / 25.4 * DPI)
    k = max(tw / src.width, th / src.height)
    # сначала кроп в исходном разрешении, потом один апскейл
    cw, ch = round(tw / k), round(th / k)
    x0 = (src.width - cw) // 2
    y0 = min(max(round(src.height * COVER_CENTER - ch / 2), 0), src.height - ch)
    crop = src.crop((x0, y0, x0 + cw, y0 + ch))
    big = crop.resize((tw, th), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
    png = os.path.join(OUT, "%s-150x100.png" % slug)
    big.save(png, "PNG", optimize=False)
    jpg = os.path.join(OUT, "_%s-embed.jpg" % slug)
    big.save(jpg, "JPEG", quality=94, subsampling=0)
    print("  ", os.path.basename(png), "%d × %d px (исходник %d × %d, кроп %d × %d от y=%d)"
          % (tw, th, src.width, src.height, cw, ch, y0))
    # и PDF с тем же растром — чтобы у подрядчика был один формат на всю линейку
    pdf = os.path.join(OUT, "%s-150x100.pdf" % slug)
    if os.path.exists(pdf):
        os.remove(pdf)
    c = canvas.Canvas(pdf, pagesize=(PW * mm, PH * mm))
    c.setTitle("Soundstates — флаг 150 × 100, печать")
    # JPEG кладётся в PDF как есть (DCT), без него reportlab пишет растр без сжатия — 110 МБ
    c.drawImage(jpg, 0, 0, PW * mm, PH * mm)
    c.showPage()
    c.save()
    os.remove(jpg)
    print("  ", os.path.basename(pdf))
    return pdf, png


def preview_sheet(pngs):
    """Все четыре на одном листе с рамкой чистого размера и точками люверсов."""
    tiles = []
    for p in pngs:
        im = Image.open(p).convert("RGB")
        im.thumbnail((1540, 1040), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        k = im.width / PW
        b = BLEED * k
        d.rectangle([b, b, im.width - b, im.height - b], outline=(255, 255, 255), width=2)
        r, m = 8, 25 * k + b
        for cx, cy in [(m, m), (im.width - m, m), (m, im.height - m), (im.width - m, im.height - m)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255), width=2)
        tiles.append(im)
    tw, th = tiles[0].size
    gap = 40
    sheet = Image.new("RGB", (tw * 2 + gap * 3, th * 2 + gap * 3 + 60), (235, 228, 214))
    fnt = ImageFont.truetype(BOLD, 28)
    ImageDraw.Draw(sheet).text((gap, 18), "Флаги 150 × 100 — печатные файлы. Белая рамка — линия подгиба, кружки — люверсы (не печатаются)",
                               font=fnt, fill=TAR)
    for i, im in enumerate(tiles):
        sheet.paste(im, (gap + (i % 2) * (tw + gap), 60 + gap + (i // 2) * (th + gap)))
    out = os.path.join(OUT, "_preview-all.jpg")
    sheet.save(out, "JPEG", quality=88)
    print("  ", os.path.basename(out))


def techsheet():
    txt = """ФЛАГИ ИНТЕРЬЕРНЫЕ 150 × 100 см — техлист для печати и пошива
Редакция 14.09.2026 · ИП Кейсер Л. М. · levkeiser.shop

Файлы (на каждый флаг PDF и PNG с одинаковым содержимым):
  flag-dvigayus-medlenno-150x100   — «ДВИГАЮСЬ МЕДЛЕННО»
  flag-v-bystrom-mire-150x100      — «В БЫСТРОМ МИРЕ»
  flag-slow-in-a-fast-world-150x100 — «SLOW IN A FAST WORLD»
PDF — вектор, шрифт встроен.
PNG — растр 150 dpi, RGB.

Размеры
  Чистый размер полотна: 1500 × 1000 мм, горизонтальный.
  Файл: 1540 × 1040 мм — по 20 мм припуска на подгиб с каждой стороны,
  фон и картинка идут в припуск. Если ваш подгиб другой — скажите, перерисуем.
  Второй размер 900 × 600 — та же пропорция 3:2, PDF масштабируется без потерь.

Материал и печать
  Плотный полуматовый полиэстер под сублимацию, не просвечивает на светлой стене,
  не блестит. Плотность и образец — просьба показать до тиража.
  Печать сублимационная. Цветопроба: фон тёмный тёплый, буквы золотые.
    фон    RGB 33 26 18    (#211A12), ориентир CMYK ≈ 70 70 80 85
    буквы  RGB 217 154 43  (#D99A2B), ориентир CMYK ≈ 15 42 95 2
  Важно: фон должен остаться тёплым тёмно-коричневым, не уходить в чистый чёрный
  и не сереть; золото — насыщенное, не лимонное.

Пошив
  Края подогнуты и прострочены, углы усилены.
  Люверсы металлические, 4 шт, по углам: центр в 25 мм от обеих кромок чистого размера.
  Цвет люверса — никель/серебро матовый.

Тираж (первый)
  «ДВИГАЮСЬ МЕДЛЕННО» — 3, «В БЫСТРОМ МИРЕ» — 3, «SLOW IN A FAST WORLD» — 2.
  Просьба назвать цену на 10 / 30 / 50 шт, отдельно печать и отдельно пошив с люверсами.

Упаковка
  Флаг сложен, в конверте; открытку-инструкцию вкладываем сами.
"""
    out = os.path.join(OUT, "_техлист.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(txt)
    print("  ", os.path.basename(out))


if __name__ == "__main__":
    print("Печатные файлы флагов:")
    pngs = []
    for slug, text in FLAGS:
        if text:
            pdf = pdf_text_flag(slug, text)
            pngs.append(png_from_pdf(pdf, slug))
        else:
            pngs.append(cover_flag(slug)[1])
    preview_sheet(pngs)
    techsheet()
