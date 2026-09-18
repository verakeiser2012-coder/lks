# -*- coding: utf-8 -*-
"""Знак «Печать», вторая редакция: чтобы не читался как овца.

Что делало первую редакцию овцой: пять одинаковых кружков дугой над круглой
головой (это овечья шерсть), голова без лица и широкие плечи-трапеция
(туловище). Лекарство — профиль, как на монете: у профиля есть лоб, нос,
подбородок, и он однозначно человек. Кудри — не бусы по дуге, а копна разного
размера, наползающая на лоб и затылок. Наушники — чашка на ухе и дуга поверх
волос, а не два «уха» по бокам.

Фигуры описаны один раз и рисуются и в PNG (PIL, суперсэмплинг), и в SVG —
вектор нужен вышивальщику и брендборду.
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from beatport_assets import qbez  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'content', 'brand', 'mark-v2')
SCR = os.environ.get('SCR', OUT)
os.makedirs(OUT, exist_ok=True)
FONT = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab-Regular.ttf')

MANE = '#B4601C'
DUST = '#DCCBA0'
RESIN = '#211A12'


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def curve(points):
    """Список опорных точек (p0, c1, p1, c2, p2, …) → ломаная по квадратичным Безье."""
    out = [points[0]]
    for i in range(1, len(points) - 1, 2):
        out += qbez(out[-1], points[i], points[i + 1])[1:]
    return out

# ---------------------------------------------------------------- варианты (координаты 150×150)

def variant_profile(mono=False):
    """A. Профиль влево. mono — одной нитью (для вышивки одним цветом)."""
    hair = MANE if not mono else DUST
    shapes = [('ring', 75, 75, 70, 3, DUST)]
    # голова + шея + бюст одним силуэтом
    face = curve([
        (60, 50), (57, 58), (56, 64),      # лоб → надбровье
        (58, 68), (52, 76),                # переносица → кончик носа
        (50, 80), (57, 83),                # под носом
        (55, 88), (56, 92),                # губы
        (56, 96), (61, 102),               # подбородок
        (70, 108), (78, 108),              # челюсть → шея
    ])
    face += [(80, 122), (78, 128)]
    # бюст: покатые плечи, не трапеция во всю ширину
    face += curve([(78, 128), (66, 130), (54, 138)]) + [(54, 142), (104, 142)] + curve([(104, 142), (104, 132), (94, 126)])
    face += [(92, 120), (92, 108)]
    face += curve([(92, 108), (100, 92), (99, 74), (100, 60), (92, 46), (84, 36), (72, 36), (62, 42), (60, 50)])
    shapes.append(('poly', face, DUST))
    # копна кудрей: разные радиусы, наползают на лоб, висок и затылок
    curls = [(64, 44, 10), (74, 35, 12), (87, 33, 12), (98, 40, 11), (104, 52, 10), (104, 66, 9),
             (100, 79, 8), (57, 55, 8), (62, 34, 8), (94, 28, 8), (108, 44, 7), (52, 64, 6), (107, 76, 6)]
    for cx, cy, r in curls:
        shapes.append(('circle', cx, cy, r, hair))
    # завитки — чтобы копна читалась кудрями, а не шапкой
    for cx, cy, r in [(75, 36, 6), (98, 42, 5), (60, 48, 4)]:
        shapes.append(('ring', cx, cy, r, 2, DUST if not mono else RESIN))
    # наушники: дуга поверх волос и чашка на ухе
    shapes.append(('stroke', curve([(90, 72), (108, 44), (86, 27), (76, 26), (70, 28)]), 4, DUST))
    shapes.append(('circle', 89, 80, 9, RESIN))
    shapes.append(('ring', 89, 80, 9, 3, DUST))
    return shapes


def variant_front():
    """B. Анфас, исправленный: узкая шея, копна до ушей, наушники с чашками и дугой."""
    shapes = [('ring', 75, 75, 70, 3, DUST)]
    head = curve([(75, 40), (50, 40), (50, 68), (50, 90), (75, 100), (100, 90), (100, 68), (100, 40), (75, 40)])
    shapes.append(('poly', head, DUST))
    shapes.append(('poly', [(68, 98), (82, 98), (84, 116), (66, 116)], DUST))                  # шея
    shapes.append(('poly', curve([(66, 116), (60, 118), (46, 128)]) + [(46, 142), (104, 142)]   # плечи
                   + curve([(104, 142), (104, 128), (90, 118), (86, 117), (84, 116)]), DUST))
    curls = [(52, 52, 10), (60, 40, 11), (75, 34, 12), (90, 40, 11), (98, 52, 10), (46, 66, 8), (104, 66, 8),
             (66, 32, 8), (84, 30, 8), (56, 44, 6), (94, 44, 6), (44, 78, 6), (106, 78, 6)]
    for cx, cy, r in curls:
        shapes.append(('circle', cx, cy, r, MANE))
    for cx, cy, r in [(75, 36, 6), (60, 42, 4), (90, 42, 4)]:
        shapes.append(('ring', cx, cy, r, 2, DUST))
    # наушники: дуга поверх копны, чашки на ушах
    shapes.append(('stroke', curve([(44, 74), (44, 30), (75, 24), (106, 30), (106, 74)]), 4, DUST))
    for cx in (44, 106):
        shapes.append(('circle', cx, 80, 8, RESIN))
        shapes.append(('ring', cx, 80, 8, 3, DUST))
    return shapes


def variant_old():
    """Первая редакция — для сравнения на листе."""
    shapes = [('ring', 75, 75, 70, 3, DUST), ('ring', 75, 75, 62, 1, '#7A7260')]
    poly = [(45, 118)]
    for a, b, c in [((45, 118), (45, 84), (55, 72)), ((55, 72), (48, 60), (52, 47)), ((52, 47), (56, 32), (75, 30)),
                    ((75, 30), (94, 32), (98, 47)), ((98, 47), (102, 60), (95, 72)), ((95, 72), (105, 84), (105, 118))]:
        poly += qbez(a, b, c)[1:]
    shapes.append(('poly', poly, DUST))
    for cx, cy, r in [(52, 38, 7), (65, 28, 8), (82, 26, 8), (96, 34, 7), (102, 47, 6)]:
        shapes.append(('circle', cx, cy, r, MANE))
    for pts in ([(40, 62)] + qbez((40, 62), (40, 55), (47, 54))[1:] + [(47, 74)] + qbez((47, 74), (40, 73), (40, 66))[1:],
                [(110, 62)] + qbez((110, 62), (110, 55), (103, 54))[1:] + [(103, 74)] + qbez((103, 74), (110, 73), (110, 66))[1:]):
        shapes.append(('poly', pts, RESIN))
        shapes.append(('stroke', pts + [pts[0]], 2, DUST))
    shapes.append(('stroke', qbez((44, 56), (75, 12), (106, 56)), 4, DUST))
    return shapes

# ---------------------------------------------------------------- рендер

def render_png(shapes, size, bg=RESIN):
    ss = 4
    k = size / 150.0 * ss
    im = Image.new('RGB', (size * ss, size * ss), hexrgb(bg))
    d = ImageDraw.Draw(im)
    for sh in shapes:
        t = sh[0]
        if t == 'poly':
            d.polygon([(x * k, y * k) for x, y in sh[1]], fill=hexrgb(sh[2]))
        elif t == 'circle':
            _, cx, cy, r, c = sh
            d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], fill=hexrgb(c))
        elif t == 'ring':
            _, cx, cy, r, w, c = sh
            d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], outline=hexrgb(c), width=max(1, int(w * k)))
        elif t == 'stroke':
            _, pts, w, c = sh
            d.line([(x * k, y * k) for x, y in pts], fill=hexrgb(c), width=max(1, int(w * k)), joint='curve')
    return im.resize((size, size), Image.LANCZOS)


def render_svg(shapes, bg=RESIN):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">',
             f'<rect width="150" height="150" fill="{bg}"/>']
    for sh in shapes:
        t = sh[0]
        if t == 'poly':
            pts = ' '.join(f'{x:.1f},{y:.1f}' for x, y in sh[1])
            parts.append(f'<polygon points="{pts}" fill="{sh[2]}"/>')
        elif t == 'circle':
            _, cx, cy, r, c = sh
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>')
        elif t == 'ring':
            _, cx, cy, r, w, c = sh
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{c}" stroke-width="{w}"/>')
        elif t == 'stroke':
            _, pts, w, c = sh
            pl = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
            parts.append(f'<polyline points="{pl}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    parts.append('</svg>')
    return '\n'.join(parts)


if __name__ == '__main__':
    variants = [
        ('old', 'Было: анфас', variant_old()),
        ('profile', 'A. Профиль, две нити', variant_profile()),
        ('profile-mono', 'B. Профиль, одна нить', variant_profile(mono=True)),
        ('front', 'C. Анфас, исправленный', variant_front()),
    ]
    sheet = Image.new('RGB', (len(variants) * 330 + 20, 420), (150, 190, 150))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(FONT, 20)
    for i, (key, title, shapes) in enumerate(variants):
        big = render_png(shapes, 1000)
        big.save(os.path.join(OUT, f'mark-{key}.png'))
        with open(os.path.join(OUT, f'mark-{key}.svg'), 'w', encoding='utf-8') as fh:
            fh.write(render_svg(shapes))
        t = big.resize((300, 300), Image.LANCZOS)
        sheet.paste(t, (10 + i * 330, 15))
        small = big.resize((48, 48), Image.LANCZOS)     # как выглядит в 8 см на груди / аватаром
        sheet.paste(small, (10 + i * 330, 330))
        d.text((70 + i * 330, 340), title, font=f, fill=(0, 0, 0))
        print('вариант:', key)
    sheet.save(os.path.join(SCR, '_mark_v2.jpg'), quality=88)
    sheet.save(os.path.join(OUT, 'mark-v2-compare.jpg'), quality=88)
