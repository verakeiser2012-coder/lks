# -*- coding: utf-8 -*-
"""Макеты худи для QPRINT: варианты нанесения знака «Печать» и wordmark LEVKEYSER.

Три метода из их прайса и как они выглядят на вещи:
  вышивка металлизированной нитью — объём, штриховка стежков, тёплый блеск;
  шелкография фольгой — плоское зеркальное золото;
  термофлекс металлизированной плёнкой — ровный матово-золотой слой.

Худи рисуется силуэтом (оверсайз, капюшон, карман кенгуру) — это макет для
разговора с печатником, не фотореализм. Отдельно кладём print-ready файлы:
знак и надпись на прозрачном фоне в 300 dpi, с размерами в мм.
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from beatport_assets import qbez  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab-Bold.ttf')
OUT = os.path.join(ROOT, 'content', 'merch', 'qprint')
SCR = os.environ.get('SCR', OUT)
os.makedirs(OUT, exist_ok=True)

MANE = (0xB4, 0x60, 0x1C)
DUST = (0xDC, 0xCB, 0xA0)
RESIN = (0x21, 0x1A, 0x12)
GOLD_LO = (0xB8, 0x86, 0x2B)
GOLD_HI = (0xF3, 0xD9, 0x8A)
BLACK_HOODIE = (0x1C, 0x1A, 0x18)
WHITE_HOODIE = (0xF1, 0xEC, 0xE2)

# ---------------------------------------------------------------- материалы

def gold_gradient(size, angle_seed=0):
    """Зеркальное золото: диагональный градиент с бликом."""
    w, h = size
    im = Image.new('RGB', size)
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = ((x + y * 0.6) / (w + h * 0.6))
            k = 0.5 + 0.5 * math.sin((t * 3.2 + angle_seed) * math.pi)
            px[x, y] = tuple(int(a + (b - a) * k) for a, b in zip(GOLD_LO, GOLD_HI))
    return im


def stitch_texture(size, color_lo, color_hi):
    """Вышивка: чередующиеся диагональные стежки, чуть разный тон."""
    w, h = size
    im = Image.new('RGB', size, color_lo)
    d = ImageDraw.Draw(im)
    for i in range(-h, w + h, 4):
        c = color_hi if (i // 4) % 2 == 0 else color_lo
        d.line((i, 0, i + h, h), fill=c, width=2)
    return im


def flex_flat(size):
    """Термофлекс: ровный металлик без блика."""
    return Image.new('RGB', size, (0xCF, 0xA6, 0x4A))


def masked(texture, mask, shadow=True):
    """Наложить материал по маске; для вышивки — лёгкая тень объёма."""
    layer = Image.new('RGBA', mask.size, (0, 0, 0, 0))
    layer.paste(texture.convert('RGBA'), (0, 0), mask)
    if shadow:
        sh = Image.new('RGBA', mask.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 110), (0, 0), mask)
        sh = sh.filter(ImageFilter.GaussianBlur(3))
        base = Image.new('RGBA', mask.size, (0, 0, 0, 0))
        base.alpha_composite(sh, (2, 3))
        base.alpha_composite(layer)
        return base
    return layer

# ---------------------------------------------------------------- маски знака и надписи

def mark_mask(size, with_rings=True):
    """Знак «Печать» как маска (белое = нанесение). Координаты брендборда 150×150."""
    k = size / 150.0
    ss = 3
    im = Image.new('L', (size * ss, size * ss), 0)
    d = ImageDraw.Draw(im)
    K = lambda pts: [(x * k * ss, y * k * ss) for x, y in pts]
    w = lambda v: max(1, int(v * k * ss))
    if with_rings:
        d.ellipse(K([(5, 5), (145, 145)]), outline=255, width=w(4))
    poly = [(45, 118)]
    for a, b, c in [((45, 118), (45, 84), (55, 72)), ((55, 72), (48, 60), (52, 47)), ((52, 47), (56, 32), (75, 30)),
                    ((75, 30), (94, 32), (98, 47)), ((98, 47), (102, 60), (95, 72)), ((95, 72), (105, 84), (105, 118))]:
        poly += qbez(a, b, c)[1:]
    d.polygon(K(poly), fill=255)
    for pts in ([(40, 62)] + qbez((40, 62), (40, 55), (47, 54))[1:] + [(47, 74)] + qbez((47, 74), (40, 73), (40, 66))[1:],
                [(110, 62)] + qbez((110, 62), (110, 55), (103, 54))[1:] + [(103, 74)] + qbez((103, 74), (110, 73), (110, 66))[1:]):
        d.polygon(K(pts), fill=255)
    d.line(K(qbez((44, 56), (75, 12), (106, 56))), fill=255, width=w(5), joint='curve')
    return im.resize((size, size), Image.LANCZOS)


def curls_mask(size):
    """Кудри отдельной маской — они всегда цвета Гривы, вторая нить."""
    k = size / 150.0
    ss = 3
    im = Image.new('L', (size * ss, size * ss), 0)
    d = ImageDraw.Draw(im)
    for cx, cy, r in [(52, 38, 7), (65, 28, 8), (82, 26, 8), (96, 34, 7), (102, 47, 6)]:
        d.ellipse([((cx - r) * k * ss, (cy - r) * k * ss), ((cx + r) * k * ss, (cy + r) * k * ss)], fill=255)
    return im.resize((size, size), Image.LANCZOS)


def text_mask(text, height_px):
    f = ImageFont.truetype(FONT, height_px)
    tmp = ImageDraw.Draw(Image.new('L', (10, 10)))
    bb = tmp.textbbox((0, 0), text, font=f)
    im = Image.new('L', (bb[2] - bb[0] + 8, bb[3] - bb[1] + 8), 0)
    ImageDraw.Draw(im).text((4 - bb[0], 4 - bb[1]), text, font=f, fill=255)
    return im

# ---------------------------------------------------------------- силуэт худи

def hoodie(color, back=False, W=700, H=820):
    """Оверсайз-худи фронт/спина. Возвращает (картинка, прямоугольник груди/спины)."""
    im = Image.new('RGB', (W, H), (0xEC, 0xE7, 0xDE))
    d = ImageDraw.Draw(im)
    dark = tuple(max(0, c - 22) for c in color)
    cx = W // 2
    # тело
    body = [(cx - 190, 210), (cx + 190, 210), (cx + 205, 700), (cx - 205, 700)]
    d.polygon(body, fill=color)
    # рукава
    d.polygon([(cx - 190, 215), (cx - 320, 330), (cx - 285, 560), (cx - 200, 545)], fill=color)
    d.polygon([(cx + 190, 215), (cx + 320, 330), (cx + 285, 560), (cx + 200, 545)], fill=color)
    d.line([(cx - 190, 215), (cx - 200, 545)], fill=dark, width=3)
    d.line([(cx + 190, 215), (cx + 200, 545)], fill=dark, width=3)
    # манжеты и пояс
    d.rectangle([cx - 205, 700, cx + 205, 740], fill=dark)
    d.polygon([(cx - 320, 330), (cx - 285, 560), (cx - 300, 590), (cx - 335, 360)], fill=dark)
    d.polygon([(cx + 320, 330), (cx + 285, 560), (cx + 300, 590), (cx + 335, 360)], fill=dark)
    # капюшон
    if back:
        d.rounded_rectangle([cx - 150, 120, cx + 150, 300], radius=90, fill=dark)
        d.rounded_rectangle([cx - 135, 135, cx + 135, 290], radius=80, fill=color)
    else:
        d.polygon([(cx - 120, 210), (cx - 60, 120), (cx + 60, 120), (cx + 120, 210), (cx + 40, 250), (cx - 40, 250)], fill=dark)
        d.polygon([(cx - 95, 205), (cx - 50, 140), (cx + 50, 140), (cx + 95, 205), (cx + 30, 240), (cx - 30, 240)], fill=color)
        # карман кенгуру
        d.polygon([(cx - 150, 520), (cx + 150, 520), (cx + 135, 690), (cx - 135, 690)], outline=dark, width=3)
        # шнурки
        d.line([(cx - 20, 240), (cx - 28, 330)], fill=dark, width=3)
        d.line([(cx + 20, 240), (cx + 28, 330)], fill=dark, width=3)
    return im


def place(im, layer, center):
    x = center[0] - layer.width // 2
    y = center[1] - layer.height // 2
    im.paste(layer, (x, y), layer)


def render_mark(size, method, on_light):
    """Знак нужным методом. on_light — на белом худи основной цвет Смола, не золото."""
    m = mark_mask(size)
    c = curls_mask(size)
    if method == 'embroidery':
        base = stitch_texture(m.size, GOLD_LO, GOLD_HI) if not on_light else stitch_texture(m.size, RESIN, (0x3A, 0x30, 0x26))
        layer = masked(base, m, shadow=True)
        curls = masked(stitch_texture(m.size, MANE, (0xD0, 0x7A, 0x2E)), c, shadow=True)
    elif method == 'foil':
        layer = masked(gold_gradient(m.size), m, shadow=False)
        curls = masked(gold_gradient(m.size, 0.7), c, shadow=False)
    else:  # flex
        layer = masked(flex_flat(m.size), m, shadow=False)
        curls = masked(Image.new('RGB', m.size, MANE), c, shadow=False)
    layer.alpha_composite(curls)
    return layer


def render_text(text, width_px, method, on_light):
    """Ширина надписи в px — размер в см у надписи всегда означает ширину."""
    m = text_mask(text, 200)
    m = m.resize((width_px, max(1, int(m.height * width_px / m.width))), Image.LANCZOS)
    if method == 'embroidery':
        base = stitch_texture(m.size, GOLD_LO, GOLD_HI) if not on_light else stitch_texture(m.size, RESIN, (0x3A, 0x30, 0x26))
        return masked(base, m, shadow=True)
    if method == 'foil':
        return masked(gold_gradient(m.size), m, shadow=False)
    return masked(flex_flat(m.size), m, shadow=False)


METHOD_RU = {'embroidery': 'вышивка металлизированной нитью', 'foil': 'шелкография фольгой', 'flex': 'термофлекс металлик'}

# ---------------------------------------------------------------- варианты

def variant(name, color, front_spec, back_spec, caption):
    """front_spec/back_spec: список (что, метод, размер_см, позиция) — позиция 'chest-left'|'chest-center'|'back-big'|'back-small'|'sleeve'."""
    on_light = color == WHITE_HOODIE
    PX_PER_CM = 10  # ширина тела худи 380 px ≈ 38 см
    pages = []
    for back, spec in ((False, front_spec), (True, back_spec)):
        im = hoodie(color, back=back)
        cx = im.width // 2
        for what, method, size_cm, pos in spec:
            px = int(size_cm * PX_PER_CM)
            layer = render_mark(px, method, on_light) if what == 'mark' else render_text('LEVKEYSER', px, method, on_light)
            center = {
                'chest-left': (cx - 95, 330), 'chest-center': (cx, 360),
                'back-big': (cx, 400), 'back-small': (cx, 300), 'sleeve': (cx - 258, 445),
            }[pos]
            if pos == 'sleeve':
                layer = layer.rotate(-72, expand=True, resample=Image.BICUBIC)
            place(im, layer, center)
        pages.append(im)
    sheet = Image.new('RGB', (pages[0].width * 2 + 30, pages[0].height + 120), (0xEC, 0xE7, 0xDE))
    sheet.paste(pages[0], (10, 10))
    sheet.paste(pages[1], (pages[0].width + 20, 10))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(FONT, 26)
    fs = ImageFont.truetype(os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab-Regular.ttf'), 20)
    d.text((14, pages[0].height + 18), name, font=f, fill=RESIN)
    words, lines, cur = caption.split(' '), [], ''
    for w_ in words:
        if d.textbbox((0, 0), cur + ' ' + w_, font=fs)[2] > sheet.width - 28:
            lines.append(cur); cur = w_
        else:
            cur = (cur + ' ' + w_).strip()
    lines.append(cur)
    for i, ln in enumerate(lines[:2]):
        d.text((14, pages[0].height + 54 + i * 26), ln, font=fs, fill=(0x55, 0x4E, 0x44))
    d.text((14, 14), 'перед', font=fs, fill=(0x55, 0x4E, 0x44))
    d.text((pages[0].width + 24, 14), 'спина', font=fs, fill=(0x55, 0x4E, 0x44))
    return sheet


VARIANTS = [
    ('А. Знак на груди, надпись на спине', BLACK_HOODIE,
     [('mark', 'embroidery', 8, 'chest-left')], [('text', 'flex', 30, 'back-big')],
     'Чёрное худи · знак «Печать» Ø 8 см — вышивка золотой нитью, кудри нитью Гривы · спина LEVKEYSER 30 см — термофлекс металлик. Комбинация из прайса: вышивка от 10 шт + флекс от 10 шт.'),
    ('Б. Только вышивка, по центру', BLACK_HOODIE,
     [('text', 'embroidery', 18, 'chest-center')], [('mark', 'embroidery', 6, 'back-small')],
     'Чёрное худи · LEVKEYSER 18 см вышивкой на груди, маленький знак Ø 6 см под капюшоном на спине. Самый «тихий» вариант, одна техника.'),
    ('В. Белое худи, тёмная нить + фольга', WHITE_HOODIE,
     [('mark', 'embroidery', 8, 'chest-left')], [('text', 'foil', 30, 'back-big')],
     'Белое худи · знак вышит нитью цвета Смолы (кудри Гривой), спина — зеркальное золото шелкографией фольгой. Фольга от 20 шт, минимум 5000 ₽.'),
    ('Г. Большой знак на спине', BLACK_HOODIE,
     [('text', 'embroidery', 9, 'chest-left')], [('mark', 'foil', 26, 'back-big')],
     'Чёрное худи · маленький LEVKEYSER 9 см вышивкой на груди, знак Ø 26 см фольгой во всю спину. Громкий режим бренда.'),
    ('Д. Проба идеи — только флекс', BLACK_HOODIE,
     [('mark', 'flex', 8, 'chest-left')], [('text', 'flex', 30, 'back-big')],
     'То же расположение, что в А, но обе позиции термофлексом: самый дешёвый вход (от 1500 ₽), чтобы примерить размеры и места до вышивки.'),
    ('Е. Рукав', BLACK_HOODIE,
     [('mark', 'embroidery', 7, 'chest-left'), ('text', 'flex', 12, 'sleeve')], [],
     'Чёрное худи · знак на груди вышивкой, LEVKEYSER 12 см вдоль левого рукава флексом, спина чистая. Для тех, кому спина — слишком.'),
]


def print_ready():
    """Файлы для печатника: 300 dpi, прозрачный фон, размер в имени файла."""
    made = []
    for cm in (6, 8, 26):
        px = int(cm / 2.54 * 300)
        m = mark_mask(px)
        c = curls_mask(px)
        im = Image.new('RGBA', m.size, (0, 0, 0, 0))
        im.paste((0, 0, 0, 255), (0, 0), m)      # знак — один цвет (золото/нить по спецификации)
        im.paste(MANE + (255,), (0, 0), c)        # кудри — второй цвет, Грива
        n = f'mark-print-{cm}cm-300dpi.png'
        im.save(os.path.join(OUT, n), dpi=(300, 300))
        made.append(n)
    for cm in (9, 12, 18, 30):
        px = int(cm / 2.54 * 300)
        m = text_mask('LEVKEYSER', int(px * 0.62))
        # ширина надписи = cm; масштабируем по ширине
        scale = px / m.width
        m = m.resize((px, int(m.height * scale)), Image.LANCZOS)
        im = Image.new('RGBA', m.size, (0, 0, 0, 0))
        im.paste((0, 0, 0, 255), (0, 0), m)
        n = f'wordmark-print-{cm}cm-300dpi.png'
        im.save(os.path.join(OUT, n), dpi=(300, 300))
        made.append(n)
    return made


if __name__ == '__main__':
    sheets = []
    for name, color, front, back, cap in VARIANTS:
        s = variant(name, color, front, back, cap)
        fn = 'hoodie-' + name[0].lower().replace('а', 'a').replace('б', 'b').replace('в', 'v').replace('г', 'g').replace('д', 'd').replace('е', 'e') + '.png'
        s.save(os.path.join(OUT, fn), optimize=True)
        sheets.append(s)
        print('вариант:', fn)
    # общий лист
    cols = 2
    rows = (len(sheets) + 1) // 2
    w, h = sheets[0].size
    scale = 0.5
    board = Image.new('RGB', (int(w * scale) * cols + 30, int(h * scale) * rows + 30), (0xD8, 0xD2, 0xC6))
    for i, s in enumerate(sheets):
        t = s.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        board.paste(t, (10 + (i % cols) * (t.width + 10), 10 + (i // cols) * (t.height + 10)))
    board.save(os.path.join(OUT, 'hoodie-variants-board.jpg'), quality=88)
    board.save(os.path.join(SCR, '_hoodie_board.jpg'), quality=85)
    print('лист:', 'hoodie-variants-board.jpg')
    print('print-ready:', print_ready())
