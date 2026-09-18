# -*- coding: utf-8 -*-
"""Обложки плиток раздела «Поиграть».

Фотографий под игры нет и не будет: игра — это не предмет, снимать нечего.
Рисуем свои карточки в палитре «Дикий лев», по одному простому знаку на игру,
чтобы плитки читались с одного взгляда и не выглядели рядом с фотоблоками сайта
чужеродно.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'tools', 'fonts', 'RobotoSlab.ttf')
OUT = os.path.join(ROOT, 'public', 'uploads')

SMOLA = (0x21, 0x1A, 0x12)
ZAKAT = (0xD9, 0x9A, 0x2B)
PYL = (0xDC, 0xCB, 0xA0)
GRIVA = (0xB4, 0x60, 0x1C)
AKACIA = (0x6F, 0xA8, 0x3C)
SUMER = (0x8A, 0x69, 0x9E)

W, H = 800, 500


def base(accent):
    im = Image.new('RGB', (W, H), SMOLA)
    d = ImageDraw.Draw(im)
    d.ellipse((-200, H - 260, 380, H + 260), fill=tuple(int(a * 0.3 + s * 0.7) for a, s in zip(accent, SMOLA)))
    return im, d


def caption(d, text):
    f = ImageFont.truetype(FONT, 34)
    bb = d.textbbox((0, 0), text, font=f)
    d.text(((W - bb[2]) // 2 - bb[0], H - 78), text, font=f, fill=PYL)


def guess(name):
    """Угадай трек: эквалайзер, где часть столбиков скрыта вопросом."""
    im, d = base(ZAKAT)
    x0, base_y, bar = 190, 250, 34
    for i in range(9):
        h = int(90 * (0.35 + 0.65 * abs(math.sin(i * 1.1))))
        x = x0 + i * (bar + 16)
        d.rounded_rectangle((x, base_y - h, x + bar, base_y + h), radius=14, fill=ZAKAT if i % 3 else GRIVA)
    f = ImageFont.truetype(FONT, 150)
    d.text((W // 2 - 42, 90), '?', font=f, fill=PYL)
    caption(d, 'Угадай трек')
    im.save(os.path.join(OUT, name), quality=88, optimize=True)
    return name


def quiz(name):
    """Какой ты трек: четыре варианта, один отмечен."""
    im, d = base(SUMER)
    for i in range(4):
        y = 120 + i * 78
        chosen = i == 2
        d.rounded_rectangle((240, y, 620, y + 56), radius=28,
                            fill=SUMER if chosen else None, outline=PYL if not chosen else SUMER, width=4)
        d.ellipse((262, y + 16, 286, y + 40), fill=PYL if chosen else None, outline=PYL, width=3)
    caption(d, 'Какой ты трек')
    im.save(os.path.join(OUT, name), quality=88, optimize=True)
    return name


def setgame(name):
    """Собери сет: три пластинки в ряд."""
    im, d = base(AKACIA)
    for i, color in enumerate((ZAKAT, AKACIA, GRIVA)):
        cx = 220 + i * 180
        d.ellipse((cx - 78, 130, cx + 78, 286), outline=color, width=10)
        d.ellipse((cx - 16, 192, cx + 16, 224), fill=color)
    caption(d, 'Собери сет')
    im.save(os.path.join(OUT, name), quality=88, optimize=True)
    return name


def year(name):
    """Какой год: кадр плёнки с перфорацией и вопросом вместо даты."""
    im, d = base(GRIVA)
    d.rectangle((150, 110, 650, 320), outline=PYL, width=6)
    for i in range(8):
        x = 168 + i * 62
        d.rounded_rectangle((x, 122, x + 30, 150), radius=6, fill=PYL)
        d.rounded_rectangle((x, 280, x + 30, 308), radius=6, fill=PYL)
    f = ImageFont.truetype(FONT, 96)
    t = '20??'
    bb = d.textbbox((0, 0), t, font=f)
    d.text(((W - bb[2]) // 2 - bb[0], 170), t, font=f, fill=ZAKAT)
    caption(d, 'Какой год')
    im.save(os.path.join(OUT, name), quality=88, optimize=True)
    return name


made = [
    guess('game-guess.jpg'),
    quiz('game-quiz.jpg'),
    setgame('game-set.jpg'),
    year('game-year.jpg'),
]
print('готово:', made)

sheet = Image.new('RGB', (4 * 300 + 20, 210), (150, 190, 150))
for i, n in enumerate(made):
    t = Image.open(os.path.join(OUT, n))
    t.thumbnail((280, 190))
    sheet.paste(t, (10 + i * 300, 12))
sheet.save(os.path.join(os.environ.get('SCR', OUT), '_game_tiles.jpg'), quality=85)
