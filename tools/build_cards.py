# -*- coding: utf-8 -*-
"""Печатные карточки: открытка к флагам и карточка-сертификат к бюстам.

Всё векторное (текст — встроенный Roboto Slab, QR — прямоугольники), только
знак-«монета» растрируется из SVG на 600 dpi: MuPDF не рисует текст по дуге,
поэтому берём знак без ободковой надписи.

Открытка к флагам — А6 (105 × 148 мм), две стороны, вылеты 3 мм. Кладётся в
конверт с каждым флагом: как повесить, как стирать, что это за ткань.

Карточка к бюсту — А7 горизонтальная (105 × 74 мм), две стороны, вылеты 3 мм.
Персональная: номер, код, фраза и материал берутся из таблицы busts, QR ведёт
на страницу проверки подлинности levkeiser.shop/b/<код>. На каждый бюст своя
пара страниц, в одном PDF — вся партия по порядку номеров.

  python tools/build_cards.py <папка-вывода>
"""
import os
import sys
import sqlite3
import fitz
import segno
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "content", "print", "cards")
FONTS = os.path.join(SITE, "tools", "fonts")
# Силуэт в профиль, без черт лица: гравюрную редакцию (mark-art) владелец отклонил 11.09 —
# «бивис какой-то». Камея читается как знак, а не как портрет.
MARK_SVG = os.path.join(SITE, "content", "brand", "mark-v3", "head-loops.svg")
DB = os.path.join(SITE, "data", "shop.db")
SITE_HOST = "levkeiser.shop"

pdfmetrics.registerFont(TTFont("Slab", os.path.join(FONTS, "RobotoSlab-Regular.ttf")))
pdfmetrics.registerFont(TTFont("SlabB", os.path.join(FONTS, "RobotoSlab-Bold.ttf")))
pdfmetrics.registerFont(TTFont("SlabL", os.path.join(FONTS, "RobotoSlab-Light.ttf")))

# Палитра «Дикий лев»
TAR = Color(33 / 255, 26 / 255, 18 / 255)
DUST = Color(220 / 255, 203 / 255, 160 / 255)
SUNSET = Color(217 / 255, 154 / 255, 43 / 255)
MANE = Color(180 / 255, 96 / 255, 28 / 255)
DUST_DIM = Color(220 / 255, 203 / 255, 160 / 255, alpha=0.55)
TAR_DIM = Color(33 / 255, 26 / 255, 18 / 255, alpha=0.6)

BLEED = 3.0


# ------------------------------------------------------------------ утилиты

def mark_png(path):
    """Знак-монета из SVG без фоновой плашки и без ободковой надписи, с прозрачностью."""
    svg = open(MARK_SVG, encoding="utf-8").read()
    # убираем фоновый квадрат: на карточке знак стоит кругом, а не квадратом
    svg = svg.replace('<rect width="150" height="150" fill="#211A12"/>', "")
    # ободковая надпись всё равно не рендерится MuPDF — вырезаем, чтобы не было пустого места
    import re
    svg = re.sub(r"<text[^>]*>.*?</text>", "", svg, flags=re.S)
    # диск под знак — как на монете; ставим сразу после открывающего <svg ...>,
    # чтобы не зависеть от того, есть ли в файле <defs>
    head_end = svg.index(">", svg.index("<svg")) + 1
    svg = svg[:head_end] + '<circle cx="75" cy="75" r="72" fill="#211A12"/>' + svg[head_end:]
    tmp = path + ".svg"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(svg)
    pix = fitz.open(tmp)[0].get_pixmap(dpi=600, alpha=True)
    pix.save(path)
    os.remove(tmp)
    return path


def wrap(text, font, size, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(probe, font, size) <= max_w or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_block(c, x, y_top, w, text, font, size, color, leading=None, align="left"):
    """Абзац от верхней кромки вниз. Возвращает y нижней строки."""
    leading = leading or size * 1.32
    c.setFillColor(color)
    c.setFont(font, size)
    y = y_top - size
    for line in wrap(text, font, size, w):
        if align == "center":
            c.drawCentredString(x + w / 2, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y + leading


def trim_marks(c, page_w, page_h):
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.2)
    L = 2.5 * mm
    for x in (BLEED * mm, (page_w - BLEED) * mm):
        c.line(x, 0, x, L)
        c.line(x, page_h * mm, x, page_h * mm - L)
    for y in (BLEED * mm, (page_h - BLEED) * mm):
        c.line(0, y, L, y)
        c.line(page_w * mm, y, page_w * mm - L, y)


def fill_page(c, page_w, page_h, color):
    c.setFillColor(color)
    c.rect(0, 0, page_w * mm, page_h * mm, stroke=0, fill=1)


def qr_vector(c, url, x, y, size, fg, bg=None):
    """QR как набор прямоугольников: печатается резко в любом размере."""
    qr = segno.make(url, error="m")
    n = qr.symbol_size(border=0)[0]
    quiet = 2  # тихая зона в модулях
    cell = size / (n + 2 * quiet)
    if bg is not None:
        c.setFillColor(bg)
        c.roundRect(x, y, size, size, cell * 1.5, stroke=0, fill=1)
    c.setFillColor(fg)
    for r, row in enumerate(qr.matrix):
        for col, v in enumerate(row):
            if v:
                c.rect(x + (col + quiet) * cell, y + size - (r + 1 + quiet) * cell,
                       cell + 0.05, cell + 0.05, stroke=0, fill=1)


def flag_icon(c, x, y, w, h, stroke):
    """Схема флага: прямоугольник и четыре люверса по углам."""
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 0.6 * mm, stroke=1, fill=0)
    r = 0.9 * mm
    m = 1.8 * mm
    for cx, cy in ((x + m, y + m), (x + w - m, y + m), (x + m, y + h - m), (x + w - m, y + h - m)):
        c.circle(cx, cy, r, stroke=1, fill=0)


# ------------------------------------------------------------ открытка к флагам

def flag_postcard(mark):
    tw, th = 105.0, 148.0
    pw, ph = tw + 2 * BLEED, th + 2 * BLEED
    path = os.path.join(OUT, "otkrytka-flagi-a6.pdf")
    if os.path.exists(path):
        os.remove(path)
    c = canvas.Canvas(path, pagesize=(pw * mm, ph * mm))
    c.setTitle("Открытка к флагам — А6, две стороны")
    S = 8.0  # безопасное поле от обрезного края
    x0, x1 = (BLEED + S) * mm, (pw - BLEED - S) * mm
    W = x1 - x0

    # --- лицо: тёмное, фраза золотом
    fill_page(c, pw, ph, TAR)
    msz = 26 * mm
    c.drawImage(ImageReader(mark), (pw * mm - msz) / 2, (ph - BLEED - S - 4) * mm - msz, msz, msz, mask="auto")
    c.setFillColor(DUST)
    c.setFont("SlabB", 7.5)
    c.drawCentredString(pw * mm / 2, (ph - BLEED - S - 4) * mm - msz - 6 * mm, "L E V K E Y S E R")

    y = (ph / 2 + 6) * mm
    c.setFillColor(SUNSET)
    c.setFont("SlabB", 24)
    # капителью — как на самих флагах (решение 14.09.2026)
    for line in ("ДВИГАЮСЬ", "МЕДЛЕННО", "В БЫСТРОМ", "МИРЕ"):
        c.drawCentredString(pw * mm / 2, y, line)
        y -= 29
    c.setFillColor(DUST_DIM)
    c.setFont("Slab", 7.5)
    c.drawCentredString(pw * mm / 2, (BLEED + S + 3) * mm, "интерьерный флаг · сублимация на плотном полиэстере")
    trim_marks(c, pw, ph)
    c.showPage()

    # --- оборот: светлый, инструкция
    fill_page(c, pw, ph, DUST)
    y = (ph - BLEED - S) * mm
    c.setFillColor(TAR)
    c.setFont("SlabB", 14)
    c.drawString(x0, y - 14, "Как повесить")
    flag_icon(c, x1 - 18 * mm, y - 15 * mm, 18 * mm, 12 * mm, TAR)
    y -= 22

    steps = [
        "Четыре люверса по углам. Держится на двух гвоздях, крючках или шнуре — рама не нужна.",
        "Сначала верхние два: отметьте точки по люверсам, повесьте, проверьте горизонт по верхней кромке.",
        "Нижние два — по желанию: с ними полотно натянуто ровно, без них слегка живёт от сквозняка.",
    ]
    for i, s in enumerate(steps, 1):
        c.setFillColor(MANE)
        c.setFont("SlabB", 9.5)
        c.drawString(x0, y - 9.5, str(i))
        y = text_block(c, x0 + 6 * mm, y, W - 6 * mm - 20 * mm * (i == 1), s, "Slab", 9.4, TAR) - 7

    y -= 8
    c.setFillColor(TAR)
    c.setFont("SlabB", 14)
    c.drawString(x0, y - 14, "Уход")
    y -= 22
    care = [
        "Стирка деликатная, 30 °C, без отбеливателя. Не отжимать в барабане — сушить расправленным.",
        "Гладить с изнанки на низкой температуре. Краска сублимационная: она в волокне, а не сверху, и стирки её не смывают.",
        "Ткань плотная и полуматовая: не просвечивает на светлой стене и не бликует под лампой.",
    ]
    for s in care:
        c.setFillColor(MANE)
        c.circle(x0 + 1.2 * mm, y - 7, 1.1 * mm, stroke=0, fill=1)
        y = text_block(c, x0 + 6 * mm, y, W - 6 * mm, s, "Slab", 9.4, TAR) - 7

    y -= 8
    c.setFillColor(TAR)
    c.setFont("SlabB", 14)
    c.drawString(x0, y - 14, "Если что-то не так")
    y -= 22
    y = text_block(c, x0, y, W,
                   "Шов разошёлся, люверс выпал, печать с браком — напишите нам, заменим. "
                   "Адрес и все вещи серии — на сайте.", "Slab", 9.4, TAR)

    c.setFillColor(TAR)
    c.setFont("SlabB", 9)
    c.drawString(x0, (BLEED + S + 1) * mm, SITE_HOST)
    c.setFillColor(TAR_DIM)
    c.setFont("Slab", 7.5)
    c.drawRightString(x1, (BLEED + S + 1) * mm, "LEVKEYSER · Екатеринбург")
    trim_marks(c, pw, ph)
    c.showPage()
    c.save()
    return path


# ------------------------------------------------------------ карточки к бюстам

def bust_cards(mark):
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    busts = con.execute("SELECT * FROM busts ORDER BY number").fetchall()
    if not busts:
        print("В таблице busts пусто — карточки не собраны")
        return None

    tw, th = 105.0, 74.0
    pw, ph = tw + 2 * BLEED, th + 2 * BLEED
    path = os.path.join(OUT, "kartochki-byusty-a7.pdf")
    if os.path.exists(path):
        os.remove(path)
    c = canvas.Canvas(path, pagesize=(pw * mm, ph * mm))
    c.setTitle("Карточки-сертификаты к бюстам — А7, две стороны, вся партия")
    S = 6.0
    x0, x1 = (BLEED + S) * mm, (pw - BLEED - S) * mm
    W = x1 - x0
    total = len(busts)

    rows = []
    for b in busts:
        number = f"{b['number']:03d}"
        code = b["code"]
        url = f"https://{SITE_HOST}/b/{code}"
        rows.append((number, code, b["kind"], b["material"], b["phrase"], url))

        # --- лицо: светлое, номер и фраза
        fill_page(c, pw, ph, DUST)
        msz = 20 * mm
        c.drawImage(ImageReader(mark), x1 - msz, (ph - BLEED - S) * mm - msz, msz, msz, mask="auto")
        y = (ph - BLEED - S) * mm
        c.setFillColor(TAR_DIM)
        c.setFont("SlabB", 6.5)
        c.drawString(x0, y - 7, "L E V K E Y S E R  ·  СЕРИЯ SOUNDSTATES")
        c.setFillColor(TAR)
        c.setFont("SlabB", 26)
        c.drawString(x0, y - 36, f"№ {number}")
        c.setFillColor(TAR_DIM)
        c.setFont("Slab", 8)
        c.drawString(x0, y - 47, f"из {total} в первой партии")
        c.setFillColor(TAR)
        c.setFont("SlabB", 10)
        c.drawString(x0, y - 60, b["kind"])
        # Фраза — главное на лицевой стороне: крупно, в нижней половине, во всю ширину
        text_block(c, x0, (BLEED + S + 22) * mm, W, "«" + b["phrase"] + "»", "SlabB", 12.5, TAR)
        c.setFillColor(TAR_DIM)
        c.setFont("Slab", 7)
        c.drawString(x0, (BLEED + S + 0.5) * mm, f"{b['material']} · отлито вручную в Екатеринбурге")
        trim_marks(c, pw, ph)
        c.showPage()

        # --- оборот: тёмный, QR и код
        fill_page(c, pw, ph, TAR)
        qsz = 30 * mm
        qx, qy = x1 - qsz, (ph * mm - qsz) / 2
        qr_vector(c, url, qx, qy, qsz, TAR, DUST)
        y = (ph - BLEED - S) * mm
        c.setFillColor(DUST_DIM)
        c.setFont("SlabB", 6.5)
        c.drawString(x0, y - 7, "ПОДЛИННОСТЬ")
        c.setFillColor(SUNSET)
        c.setFont("SlabB", 15)
        c.drawString(x0, y - 22, code)
        text_block(c, x0, y - 28, W - qsz - 5 * mm,
                   "Наведите камеру на код или введите его на сайте: увидите номер, материал "
                   "и дату отливки, а вещь можно закрепить за собой.", "Slab", 7.6, DUST)
        c.setFillColor(DUST)
        c.setFont("SlabB", 8.5)
        c.drawString(x0, (BLEED + S + 6.5) * mm, f"{SITE_HOST}/b")
        c.setFillColor(DUST_DIM)
        c.setFont("Slab", 6.8)
        c.drawString(x0, (BLEED + S + 0.5) * mm, "Если в подставке метка — просто поднесите телефон")
        trim_marks(c, pw, ph)
        c.showPage()

    c.save()

    csv_path = os.path.join(OUT, "kartochki-byusty-spisok.csv")
    with open(csv_path, "w", encoding="utf-8-sig") as fh:
        fh.write("номер;код;вещь;материал;фраза;ссылка\n")
        for r in rows:
            fh.write(";".join(r) + "\n")
    return path


def previews(pdf, name, pages):
    doc = fitz.open(pdf)
    for i in pages:
        out = os.path.join(OUT, f"{name}-preview-{i + 1}.jpg")
        if os.path.exists(out):
            os.remove(out)
        doc[i].get_pixmap(dpi=110).save(out)


def main():
    os.makedirs(OUT, exist_ok=True)
    mark = mark_png(os.path.join(OUT, "_mark.png"))
    p1 = flag_postcard(mark)
    previews(p1, "otkrytka-flagi", [0, 1])
    p2 = bust_cards(mark)
    if p2:
        previews(p2, "kartochki-byusty", [0, 1])
    os.remove(mark)
    print("Готово:", OUT)
    for n in sorted(os.listdir(OUT)):
        print("  ", n, round(os.path.getsize(os.path.join(OUT, n)) / 1024), "КБ")


if __name__ == "__main__":
    main()
