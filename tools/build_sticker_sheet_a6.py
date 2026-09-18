# -*- coding: utf-8 -*-
"""Пробный печатный лист стикеров А6 — файлы для типографии.

Берёт готовые стикеры из папки «Эмодзи» на рабочем столе (512 px, с белым
контуром) и раскладывает шесть штук на листе А6 с вылетами. 512 px на 40 мм —
это 325 dpi, для наклейки хватает без пересборки из исходников.

На выходе, в папке печати:
  stikery-a6-proba.pdf   стр. 1 — печать + контур реза плашечным цветом CutContour,
                         стр. 2 — только контур реза (для плоттера)
  stikery-a6-proba.png   растр листа 300 dpi (если типография не хочет PDF)
  stikery-a6-rez.svg     контуры реза отдельно, в миллиметрах
  stikery-a6-preview.jpg превью для глаз

Размеры: обрезной формат 105 × 148 мм, вылеты 3 мм, безопасное поле 5 мм.
Контур реза отступает от края рисунка на 1 мм, чтобы белая кайма стикера
осталась на наклейке даже при уводе ножа.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from skimage import measure
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColor
from reportlab.lib.utils import ImageReader

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.expanduser("~"), "Desktop", "Эмодзи")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "stikery-a6")
FONT = os.path.join(SITE, "tools", "fonts", "RobotoSlab-Regular.ttf")

DPI = 300
PX = DPI / 25.4  # пикселей в миллиметре

TRIM_W, TRIM_H = 105.0, 148.0
BLEED = 3.0
SAFE = 5.0
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

CELL_MAX = 40.0      # стикер вписывается в квадрат 40 × 40 мм
CUT_OFFSET = 1.0     # мм от края рисунка до линии реза
COLS, ROWS = 2, 3

# Шесть стикеров пробного листа: три фразы и три фото, чтобы увидеть, как
# печатаются и плашка с текстом, и вырезанное по контуру фото.
PICK = [
    ("01-фразы", "001-01-medlenno.png"),
    ("02-фото", "012-01-portrait.png"),
    ("01-фразы", "004-04-bez-ii.png"),
    ("02-фото", "017-06-cake.png"),
    ("01-фразы", "010-12-prohod.png"),
    ("02-фото", "020-09-runway.png"),
]

TAR = (33, 26, 18)


def load_sticker(sub, name):
    im = Image.open(os.path.join(SRC, sub, name)).convert("RGBA")
    return im.crop(im.getbbox())


def fit(im, box_px):
    k = min(box_px / im.width, box_px / im.height)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def cut_contour(alpha_np, offset_px):
    """Внешний контур маски, раздутой на offset_px. Возвращает список точек (x, y) в px."""
    pad = offset_px + 4
    a = np.pad(alpha_np > 40, pad)
    # раздуваем через размытие: круглее, чем квадратная дилатация
    img = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * offset_px + 1))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    m = np.asarray(img) > 127
    contours = measure.find_contours(m.astype(float), 0.5)
    if not contours:
        return []
    c = max(contours, key=len)
    c = measure.approximate_polygon(c, tolerance=1.2)
    # find_contours отдаёт (row, col); переводим в (x, y) и снимаем паддинг
    return [(float(p[1]) - pad, float(p[0]) - pad) for p in c]


def main():
    os.makedirs(OUT, exist_ok=True)
    page_px = (round(PAGE_W * PX), round(PAGE_H * PX))
    sheet = Image.new("RGB", page_px, (255, 255, 255))

    cell_w = (TRIM_W - 2 * SAFE) / COLS
    cell_h = (TRIM_H - 2 * SAFE - 6) / ROWS  # 6 мм внизу под подпись
    placed = []  # (mm_x, mm_y, sticker, contour_px)

    for i, (sub, name) in enumerate(PICK):
        st = fit(load_sticker(sub, name), round(CELL_MAX * PX))
        col, row = i % COLS, i // COLS
        cx = BLEED + SAFE + cell_w * (col + 0.5)
        cy = BLEED + SAFE + cell_h * (row + 0.5)
        x_px = round(cx * PX - st.width / 2)
        y_px = round(cy * PX - st.height / 2)
        sheet.paste(st, (x_px, y_px), st)
        pts = cut_contour(np.asarray(st.split()[-1]), round(CUT_OFFSET * PX))
        placed.append((x_px, y_px, st, pts))

    # подпись внизу в безопасной зоне
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(FONT, round(2.6 * PX))
    label = "levkeiser.shop  ·  стикеры «Лев Кейсер»  ·  проба"
    tw = d.textlength(label, font=f)
    d.text(((page_px[0] - tw) / 2, (PAGE_H - BLEED - SAFE - 3.2) * PX), label, font=f, fill=TAR)

    png_path = os.path.join(OUT, "stikery-a6-proba.png")
    if os.path.exists(png_path):
        os.remove(png_path)
    sheet.save(png_path, "PNG", dpi=(DPI, DPI))

    # ---- PDF: стр. 1 печать + рез, стр. 2 только рез
    pdf_path = os.path.join(OUT, "stikery-a6-proba.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    c = canvas.Canvas(pdf_path, pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Стикеры «Лев Кейсер» — пробный лист А6")
    cut_color = CMYKColor(0, 1, 0, 0, spotName="CutContour")

    def px_to_pt(x_px, y_px):
        return x_px / PX * mm, (PAGE_H - y_px / PX) * mm

    def draw_cuts():
        c.setStrokeColor(cut_color)
        c.setLineWidth(0.25)
        for x_px, y_px, st, pts in placed:
            if not pts:
                continue
            p = c.beginPath()
            x0, y0 = px_to_pt(x_px + pts[0][0], y_px + pts[0][1])
            p.moveTo(x0, y0)
            for px_, py_ in pts[1:]:
                p.lineTo(*px_to_pt(x_px + px_, y_px + py_))
            p.close()
            c.drawPath(p, stroke=1, fill=0)

    def draw_trim_marks():
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.2)
        L = 2.5 * mm
        for x in (BLEED * mm, (BLEED + TRIM_W) * mm):
            for y in (BLEED * mm, (BLEED + TRIM_H) * mm):
                c.line(x, 0, x, L)
                c.line(x, PAGE_H * mm, x, PAGE_H * mm - L)
                c.line(0, y, L, y)
                c.line(PAGE_W * mm, y, PAGE_W * mm - L, y)

    c.drawImage(ImageReader(png_path), 0, 0, PAGE_W * mm, PAGE_H * mm)
    draw_cuts()
    draw_trim_marks()
    c.showPage()
    draw_cuts()
    draw_trim_marks()
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 6)
    c.drawString(BLEED * mm + 2 * mm, (BLEED + 1.5) * mm, "CutContour only - A6 105x148, bleed 3")
    c.showPage()
    c.save()

    # ---- SVG контуров в миллиметрах
    svg_path = os.path.join(OUT, "stikery-a6-rez.svg")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}mm" height="{PAGE_H}mm" '
        f'viewBox="0 0 {PAGE_W} {PAGE_H}">',
        f'  <rect x="{BLEED}" y="{BLEED}" width="{TRIM_W}" height="{TRIM_H}" fill="none" '
        'stroke="#000" stroke-width="0.1" stroke-dasharray="2 1"/>',
    ]
    for x_px, y_px, st, pts in placed:
        if not pts:
            continue
        d_attr = " ".join(
            ("M" if j == 0 else "L") + f"{(x_px + px_) / PX:.2f},{(y_px + py_) / PX:.2f}"
            for j, (px_, py_) in enumerate(pts)
        ) + " Z"
        lines.append(f'  <path d="{d_attr}" fill="none" stroke="#ff00ff" stroke-width="0.1"/>')
    lines.append("</svg>")
    with open(svg_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    # ---- превью: печать + розовый контур, чтобы глазами проверить рез
    prev = sheet.copy()
    pd = ImageDraw.Draw(prev)
    for x_px, y_px, st, pts in placed:
        if pts:
            pd.line([(x_px + a, y_px + b) for a, b in pts] + [(x_px + pts[0][0], y_px + pts[0][1])],
                    fill=(255, 0, 180), width=3)
    pd.rectangle([BLEED * PX, BLEED * PX, (BLEED + TRIM_W) * PX, (BLEED + TRIM_H) * PX],
                 outline=(120, 120, 120), width=2)
    prev_path = os.path.join(OUT, "stikery-a6-preview.jpg")
    if os.path.exists(prev_path):
        os.remove(prev_path)
    prev.resize((prev.width // 2, prev.height // 2), Image.LANCZOS).save(prev_path, "JPEG", quality=88)

    print("Готово:", OUT)
    for n in sorted(os.listdir(OUT)):
        print("  ", n, round(os.path.getsize(os.path.join(OUT, n)) / 1024), "КБ")


if __name__ == "__main__":
    main()
