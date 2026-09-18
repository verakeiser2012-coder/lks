# -*- coding: utf-8 -*-
"""Финальная плашка подкаста в две колонки: слева текст и знак (сдвинуты на SHIFT влево),
справа QR на страницу выпуска. Светлая плитка в цвете неона, тёмные модули — стандартная полярность,
читается любой камерой. Слои 1920×1080 с прозрачностью поверх chapter_bg."""
import io
import os

import segno
from PIL import Image, ImageDraw

T = os.path.dirname(os.path.abspath(__file__))
URL = "https://levkeiser.com/podcast/grusha-aromat-sobiraetsya-kak-trek"
NEON = (232, 255, 208)
INK = (30, 24, 18)
SHIFT = 240                     # текстовая колонка: 960 - SHIFT; в сборке это x = -SHIFT/960
TILE, CX, CY = 300, 1300, 528   # QR: центр плитки; подпись адреса под ней (728) рисует сборка

q = segno.make(URL, error="m")
buf = io.BytesIO()
q.save(buf, kind="png", scale=10, border=0, dark=INK, light=None)
code = Image.open(buf).convert("RGBA")
inner = TILE - 2*26
code = code.resize((inner, inner), Image.NEAREST)

layer = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
ImageDraw.Draw(layer).rounded_rectangle([CX-TILE//2, CY-TILE//2, CX+TILE//2, CY+TILE//2], radius=22, fill=NEON+(255,))
layer.alpha_composite(code, (CX-inner//2, CY-inner//2))
layer.save(os.path.join(T, "qr_end.png"))

mark = Image.open(os.path.join(T, "chapter_mark.png")).convert("RGBA")
shifted = Image.new("RGBA", mark.size, (0, 0, 0, 0))
shifted.alpha_composite(mark, (-SHIFT, 0))
shifted.save(os.path.join(T, "end_mark.png"))
print("qr_end.png + end_mark.png", URL)
