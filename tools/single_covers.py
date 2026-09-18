# -*- coding: utf-8 -*-
"""Обложки трёх синглов, которых нет на площадках: своих артворков не сохранилось,
а карточка релиза без картинки в сетке выглядит дырой. Типографика в палитре
«Дикий лев» — тот же приём, что и для плашек «Чем вдохновляюсь»."""
import os, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab.ttf')
OUT = os.path.join(ROOT, 'public', 'uploads')
SMOLA = (0x21, 0x1A, 0x12); ZAKAT = (0xD9, 0x9A, 0x2B); PYL = (0xDC, 0xCB, 0xA0)
GRIVA = (0xB4, 0x60, 0x1C); AKACIA = (0x6F, 0xA8, 0x3C); SUMER = (0x8A, 0x69, 0x9E)
S = 900


def cover(name, title, accent, draw_mark):
    im = Image.new('RGB', (S, S), SMOLA)
    d = ImageDraw.Draw(im)
    d.ellipse((-260, S - 340, 460, S + 300), fill=tuple(int(a * 0.28 + s * 0.72) for a, s in zip(accent, SMOLA)))
    draw_mark(d, accent)
    f = ImageFont.truetype(FONT, 76)
    while d.textbbox((0, 0), title, font=f)[2] > S - 140 and f.size > 34:
        f = ImageFont.truetype(FONT, f.size - 4)
    bb = d.textbbox((0, 0), title, font=f)
    d.text(((S - bb[2]) // 2 - bb[0], S - 190), title, font=f, fill=PYL)
    fs = ImageFont.truetype(FONT, 30)
    sub = 'DJ LEVKA'
    bs = d.textbbox((0, 0), sub, font=fs)
    d.text(((S - bs[2]) // 2 - bs[0], S - 96), sub, font=fs, fill=accent)
    im.save(os.path.join(OUT, name), quality=88, optimize=True)
    return name


def mark_cozy(d, c):
    # окно с тёплым светом
    d.rounded_rectangle((300, 190, 600, 470), radius=16, outline=c, width=12)
    d.line((450, 190, 450, 470), fill=c, width=10)
    d.line((300, 330, 600, 330), fill=c, width=10)
    d.arc((250, 480, 650, 620), 200, 340, fill=c, width=10)


def mark_shack(d, c):
    # домик
    d.polygon([(450, 170), (250, 330), (650, 330)], outline=c, width=12)
    d.rectangle((290, 330, 610, 500), outline=c, width=12)
    d.rectangle((410, 400, 490, 500), outline=c, width=10)


def mark_ruins(d, c):
    # три обломанные колонны
    for i, h in enumerate((150, 250, 200)):
        x = 300 + i * 110
        d.rectangle((x, 480 - h, x + 60, 480), outline=c, width=10)
        d.line((x, 480 - h, x + 60, 480 - h + (18 if i % 2 else -18)), fill=c, width=10)
    d.line((260, 490, 700, 490), fill=c, width=10)


made = [
    cover('release-cozy-place.jpg', 'Cozy Place', ZAKAT, mark_cozy),
    cover('release-mystery-shack.jpg', 'Mystery Shack', SUMER, mark_shack),
    cover('release-ruins.jpg', 'Ruins', GRIVA, mark_ruins),
]
print('готово:', made)
sheet = Image.new('RGB', (3 * 310 + 20, 320), (150, 190, 150))
for i, n in enumerate(made):
    t = Image.open(os.path.join(OUT, n)); t.thumbnail((290, 290))
    sheet.paste(t, (10 + i * 310, 15))
sheet.save(os.path.join(os.environ.get('SCR', OUT), '_singles.jpg'), quality=85)
