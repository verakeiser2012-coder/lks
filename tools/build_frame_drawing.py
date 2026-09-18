# -*- coding: utf-8 -*-
"""Чертёж каркаса абажура — куб 500 — для мастерской по гибке проволоки.

Первый макет (картинка KP05 без размеров) мастерская в Екатеринбурге
отклонила: не заданы размеры. Здесь заданы все: габарит, проволока, кольцо
под патрон, спицы, заглубление кольца, сварка, покрытие, допуски.

Лист А3 альбомный, масштаб 1:6. Три вида + изометрия + спецификация.
Результат: <папка>/karkas-kub-500-chertezh.pdf и превью jpg.

Запуск: python tools/build_frame_drawing.py [папка_вывода]
"""
import math
import os
import sys

import pymupdf as fitz
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(SITE, "tools", "fonts")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "frame")
os.makedirs(OUT, exist_ok=True)

pdfmetrics.registerFont(TTFont("Slab", os.path.join(FONTS, "RobotoSlab-Regular.ttf")))
pdfmetrics.registerFont(TTFont("SlabB", os.path.join(FONTS, "RobotoSlab-Bold.ttf")))

# ------------------------------------------------------------------ размеры, мм
A = 500          # ребро куба по наружным граням проволоки
D_WIRE = 3       # проволока
RING_IN = 40     # внутренний диаметр кольца под патрон E27
RING_DROP = 100  # кольцо ниже плоскости верхнего квадрата
TOL = 2          # допуск на габарит, ±
QTY = 5

ring_out_r = RING_IN / 2 + D_WIRE
half_diag = A / math.sqrt(2)
spoke_plan = half_diag - ring_out_r                       # проекция спицы на план
spoke_len = math.hypot(spoke_plan, RING_DROP)              # длина спицы
wire_total = 12 * A + 4 * spoke_len + math.pi * (RING_IN + D_WIRE)
mass = wire_total / 1000 * 0.0555                          # кг, сталь Ø3

# ------------------------------------------------------------------ оформление
INK = Color(0.10, 0.09, 0.08)
DIM = Color(0.55, 0.30, 0.10)   # размерные линии — гривой, чтобы отличались от контура
THIN = Color(0.55, 0.52, 0.48)
PAPER = Color(1, 1, 1)

SCALE = 1 / 6.0
PW, PH = 420 * mm, 297 * mm


def S(v):  # мм изделия -> пункты на листе
    return v * SCALE * mm


def arrow(c, x, y, ang, size=2.2 * mm):
    p = c.beginPath()
    p.moveTo(x, y)
    p.lineTo(x - size * math.cos(ang - 0.35), y - size * math.sin(ang - 0.35))
    p.lineTo(x - size * math.cos(ang + 0.35), y - size * math.sin(ang + 0.35))
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def dim_line(c, x1, y1, x2, y2, text, offset=0, side=1):
    """Размер между двумя точками: выноски, линия со стрелками, подпись."""
    c.setStrokeColor(DIM)
    c.setFillColor(DIM)
    c.setLineWidth(0.4)
    ang = math.atan2(y2 - y1, x2 - x1)
    nx, ny = -math.sin(ang) * side, math.cos(ang) * side
    ox, oy = nx * offset, ny * offset
    ex, ey = nx * 2 * mm, ny * 2 * mm
    # выносные линии
    c.line(x1 + nx * 1 * mm, y1 + ny * 1 * mm, x1 + ox + ex, y1 + oy + ey)
    c.line(x2 + nx * 1 * mm, y2 + ny * 1 * mm, x2 + ox + ex, y2 + oy + ey)
    ax1, ay1, ax2, ay2 = x1 + ox, y1 + oy, x2 + ox, y2 + oy
    c.line(ax1, ay1, ax2, ay2)
    arrow(c, ax1, ay1, ang + math.pi)
    arrow(c, ax2, ay2, ang)
    c.setFont("Slab", 8)
    tw = c.stringWidth(text, "Slab", 8)
    mx, my = (ax1 + ax2) / 2, (ay1 + ay2) / 2
    c.saveState()
    c.translate(mx, my)
    deg = math.degrees(ang)
    if 90 < deg <= 270 or deg < -90:
        deg += 180
    c.rotate(deg)
    c.setFillColor(PAPER)
    c.rect(-tw / 2 - 1.2 * mm, 0.6 * mm, tw + 2.4 * mm, 4 * mm, stroke=0, fill=1)
    c.setFillColor(DIM)
    c.drawCentredString(0, 1.5 * mm, text)
    c.restoreState()


def label(c, x, y, text, size=8, bold=False, color=INK, anchor="l"):
    c.setFillColor(color)
    c.setFont("SlabB" if bold else "Slab", size)
    if anchor == "c":
        c.drawCentredString(x, y, text)
    elif anchor == "r":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def leader(c, x1, y1, x2, y2, text):
    c.setStrokeColor(DIM)
    c.setLineWidth(0.4)
    c.line(x1, y1, x2, y2)
    c.setFillColor(DIM)
    c.circle(x1, y1, 0.6 * mm, stroke=0, fill=1)
    label(c, x2 + (1.5 * mm if x2 >= x1 else -1.5 * mm), y2 - 1 * mm, text,
          color=DIM, anchor="l" if x2 >= x1 else "r")


def view_title(c, x, y, text):
    label(c, x, y, text, size=10, bold=True)
    c.setStrokeColor(INK)
    c.setLineWidth(0.6)
    c.line(x, y - 1.5 * mm, x + c.stringWidth(text, "SlabB", 10), y - 1.5 * mm)


# ------------------------------------------------------------------ виды

def top_view(c, x0, y0):
    """Вид сверху: квадрат, кольцо в центре, четыре спицы от углов к кольцу."""
    view_title(c, x0, y0 + S(A) + 9 * mm, "Вид сверху")
    a = S(A)
    cx, cy = x0 + a / 2, y0 + a / 2
    c.setStrokeColor(INK)
    c.setLineWidth(1.4)
    c.rect(x0, y0, a, a, stroke=1, fill=0)
    r_out, r_in = S(ring_out_r), S(RING_IN / 2)
    c.circle(cx, cy, r_out, stroke=1, fill=0)
    c.setLineWidth(0.8)
    c.circle(cx, cy, r_in, stroke=1, fill=0)
    c.setLineWidth(1.4)
    for sx, sy in ((x0, y0), (x0 + a, y0), (x0, y0 + a), (x0 + a, y0 + a)):
        ang = math.atan2(cy - sy, cx - sx)
        c.line(sx, sy, cx - r_out * math.cos(ang), cy - r_out * math.sin(ang))
    # осевые
    c.setStrokeColor(THIN)
    c.setLineWidth(0.3)
    c.setDash(4, 2)
    c.line(x0 - 4 * mm, cy, x0 + a + 4 * mm, cy)
    c.line(cx, y0 - 4 * mm, cx, y0 + a + 4 * mm)
    c.setDash()
    # размеры
    dim_line(c, x0, y0, x0 + a, y0, "500", offset=8 * mm, side=-1)
    dim_line(c, x0, y0, x0, y0 + a, "500", offset=8 * mm, side=1)
    leader(c, cx + r_in * 0.7, cy + r_in * 0.7, cx + 22 * mm, cy + 26 * mm,
           "кольцо: внутр. Ø %d, проволока Ø %d" % (RING_IN, D_WIRE))
    leader(c, x0 + a * 0.78, y0 + a * 0.22, x0 + a + 6 * mm, y0 + a * 0.22 - 6 * mm,
           "спица ×4, от угла к кольцу, L ≈ %d, уходит вниз на %d" % (round(spoke_len), RING_DROP))


def front_view(c, x0, y0):
    """Вид спереди: квадрат и заглублённое кольцо со спицами."""
    view_title(c, x0, y0 + S(A) + 9 * mm, "Вид спереди (все четыре стороны одинаковы)")
    a = S(A)
    cx = x0 + a / 2
    top = y0 + a
    c.setStrokeColor(INK)
    c.setLineWidth(1.4)
    c.rect(x0, y0, a, a, stroke=1, fill=0)
    ring_y = top - S(RING_DROP)
    r_out = S(ring_out_r)
    # кольцо в проекции — отрезок
    c.setLineWidth(2.2)
    c.line(cx - r_out, ring_y, cx + r_out, ring_y)
    # спицы: от углов верхнего квадрата к кольцу. Задние две совпадают с передними в проекции.
    c.setLineWidth(1.4)
    c.line(x0, top, cx - r_out, ring_y)
    c.line(x0 + a, top, cx + r_out, ring_y)
    # размеры
    dim_line(c, x0, y0, x0, top, "500", offset=8 * mm, side=1)
    dim_line(c, x0 + a, top, x0 + a, ring_y, str(RING_DROP), offset=8 * mm, side=-1)
    dim_line(c, x0, y0, x0 + a, y0, "500", offset=8 * mm, side=-1)
    leader(c, x0 + a, y0 + a * 0.35, x0 + a + 10 * mm, y0 + a * 0.35 + 2 * mm,
           "проволока Ø %d, сталь" % D_WIRE)
    leader(c, cx, ring_y, cx + 14 * mm, ring_y - 12 * mm, "кольцо под патрон E27")
    leader(c, x0 + a, y0, x0 + a + 8 * mm, y0 + 5 * mm, "угол 90°, r гиба ≤ 5")


def iso_view(c, x0, y0):
    """Изометрия — чтобы было видно, как всё собрано. Без размеров."""
    view_title(c, x0, y0 + 112 * mm, "Общий вид")
    k = S(A) * 0.62
    ex = (k * math.cos(math.radians(30)), k * math.sin(math.radians(30)))
    ey = (-k * math.cos(math.radians(30)), k * math.sin(math.radians(30)))
    ez = (0, k)
    ox, oy = x0 + 50 * mm, y0 + 2 * mm

    def P(u, v, w):  # u,v,w в долях ребра
        return (ox + u * ex[0] + v * ey[0] + w * ez[0], oy + u * ex[1] + v * ey[1] + w * ez[1])

    c.setStrokeColor(INK)
    c.setLineWidth(1.2)
    corners = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for lvl in (0, 1):
        for i in range(4):
            u1, v1 = corners[i]
            u2, v2 = corners[(i + 1) % 4]
            c.line(*P(u1, v1, lvl), *P(u2, v2, lvl))
    for u, v in corners:
        c.line(*P(u, v, 0), *P(u, v, 1))
    # кольцо: эллипс в плоскости, заглублённой на RING_DROP
    wz = 1 - RING_DROP / A
    rr = ring_out_r / A
    pts = [P(0.5 + rr * math.cos(t), 0.5 + rr * math.sin(t), wz) for t in
           [i * 2 * math.pi / 36 for i in range(37)]]
    c.setLineWidth(1.8)
    p = c.beginPath()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    c.drawPath(p, stroke=1, fill=0)
    c.setLineWidth(1.2)
    for u, v in corners:
        ang = math.atan2(0.5 - v, 0.5 - u)
        c.line(*P(u, v, 1), *P(0.5 - rr * math.cos(ang), 0.5 - rr * math.sin(ang), wz))


def spec_table(c, x0, y0, w):
    rows = [
        ("Изделие", "Каркас подвесного абажура, куб, под тканевый чехол"),
        ("Габарит", "%d × %d × %d мм по наружным граням проволоки, допуск ±%d мм" % (A, A, A, TOL)),
        ("Проволока", "Сталь низкоуглеродистая, Ø %d мм, одна на все элементы" % D_WIRE),
        ("Верх и низ", "Два квадрата %d × %d, углы 90°, радиус гиба не более 5 мм" % (A, A)),
        ("Стойки", "4 шт × %d мм, строго вертикальны, куб не должен «играть» ромбом" % A),
        ("Кольцо", "1 шт, внутренний Ø %d мм (под патрон E27 с прижимными кольцами), "
                   "центр по осям куба, на %d мм ниже плоскости верхнего квадрата" % (RING_IN, RING_DROP)),
        ("Спицы", "4 шт, от каждого угла верхнего квадрата к кольцу, L ≈ %d мм; "
                  "четыре спицы симметричны, кольцо строго по центру" % round(spoke_len)),
        ("Соединения", "Сварка; швы зачищены заподлицо, без заусенцев и острых кромок — "
                       "на углы шнуруется ткань"),
        ("Покрытие", "Порошковая окраска, белый RAL 9016, матовая или полуматовая, "
                     "без потёков на кольце и в углах"),
        ("Проволоки на 1 шт", "≈ %.1f м, масса ≈ %.2f кг" % (wire_total / 1000, mass)),
        ("Тираж", "%d шт пробная партия; при удачном образце — до 40 шт" % QTY),
        ("Не нужно", "Никакой электрики: патрон, провод и подвес — покупные, отдельно"),
    ]
    label(c, x0, y0, "Спецификация", size=10, bold=True)
    y = y0 - 8 * mm
    col = 34 * mm
    c.setStrokeColor(THIN)
    c.setLineWidth(0.3)
    for k, v in rows:
        lines = wrap(c, v, "Slab", 8, w - col - 2 * mm)
        h = max(1, len(lines)) * 4.2 * mm + 2.6 * mm
        c.line(x0, y + 1.8 * mm, x0 + w, y + 1.8 * mm)
        label(c, x0, y - 3 * mm, k, size=8, bold=True)
        for i, ln in enumerate(lines):
            label(c, x0 + col, y - 3 * mm - i * 4.2 * mm, ln, size=8)
        y -= h
    c.line(x0, y + 1.8 * mm, x0 + w, y + 1.8 * mm)
    return y


def wrap(c, text, fnt, size, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        probe = (cur + " " + wd).strip()
        if c.stringWidth(probe, fnt, size) <= max_w or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def title_block(c):
    c.setStrokeColor(INK)
    c.setLineWidth(0.8)
    c.rect(8 * mm, 8 * mm, PW - 16 * mm, PH - 16 * mm, stroke=1, fill=0)
    label(c, 14 * mm, PH - 18 * mm, "Каркас абажура — куб %d" % A, size=18, bold=True)
    label(c, 14 * mm, PH - 25 * mm,
          "Чертёж для гибки и сварки проволоки. Масштаб 1:6, размеры в мм. Лист А3.",
          size=9, color=THIN)
    label(c, PW - 14 * mm, PH - 18 * mm, "ИП Кейсер Л. М. · Екатеринбург", size=9, anchor="r")
    label(c, PW - 14 * mm, PH - 24 * mm, "Редакция 14.09.2026 · levkeiser.shop", size=8, color=THIN, anchor="r")


def build():
    path = os.path.join(OUT, "karkas-kub-500-chertezh.pdf")
    if os.path.exists(path):
        os.remove(path)
    c = canvas.Canvas(path, pagesize=(PW, PH))
    c.setTitle("Каркас абажура — куб 500 — чертёж")
    title_block(c)

    # левая колонка: вид сверху над видом спереди
    top_view(c, 40 * mm, 168 * mm)
    front_view(c, 40 * mm, 42 * mm)
    # середина: изометрия
    iso_view(c, 150 * mm, 150 * mm)
    # правая колонка: спецификация
    y = spec_table(c, 262 * mm, PH - 40 * mm, 146 * mm)

    # примечание под изометрией
    note = [
        "Как это используется: на каркас через люверсы по углам",
        "шнуруется тканевый чехол 4 × (%d × %d) — сменный." % (A, A),
        "Поэтому важны прямые углы, ровные швы и одинаковые грани.",
        "Патрон E27 с прижимными кольцами ставится в кольцо,",
        "подвес и лампа (только LED) — покупные.",
    ]
    for i, ln in enumerate(note):
        label(c, 150 * mm, 120 * mm - i * 4.6 * mm, ln, size=8, color=THIN)

    c.showPage()
    c.save()
    print("  ", os.path.basename(path))
    doc = fitz.open(path)
    pix = doc[0].get_pixmap(dpi=110)
    prev = os.path.join(OUT, "karkas-kub-500-chertezh-preview.jpg")
    pix.save(prev)
    print("  ", os.path.basename(prev))
    return path


if __name__ == "__main__":
    print("Чертёж каркаса:")
    build()
    print("Спица L = %.1f мм, проволока на 1 шт = %.2f м, масса ~ %.2f кг" % (spoke_len, wire_total / 1000, mass))
