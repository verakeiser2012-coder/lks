# -*- coding: utf-8 -*-
"""Картинка карточки «Аудит каталога» (1200×1200) в палитре «Дикий лев»: чек-лист на бумаге.
Шрифты с кириллицей — Georgia (Rockwell кириллицы не имеет). Запуск: python tools/build_audit_card.py"""
from PIL import Image, ImageDraw, ImageFont
W = 1200
DUST, INK, MANE, RUST = '#DCCBA0', '#211A12', '#B4601C', '#7A2E1B'
F = lambda name, size: ImageFont.truetype(rf'C:\Windows\Fonts\{name}', size)
h1, h2, body, small = F('georgiab.ttf', 92), F('georgiab.ttf', 92), F('georgia.ttf', 44), F('georgia.ttf', 36)

im = Image.new('RGB', (W, W), DUST)
d = ImageDraw.Draw(im)
d.rectangle([72, 72, W - 72, W - 72], outline=INK, width=6)
d.rectangle([92, 92, W - 92, W - 92], outline=INK, width=2)

d.text((130, 150), 'Аудит', font=h1, fill=INK)
d.text((130, 262), 'каталога', font=h2, fill=MANE)
d.text((130, 400), 'Что уже оформлено — и чего не хватает', font=body, fill=INK)

items = [(True, 'Релизы по площадкам'), (True, 'ISRC и UPC по всем трекам'), (True, 'Чужие сэмплы и цитаты'), (False, 'Документ: что делать и в каком порядке')]
y = 520
for done, text in items:
    d.rectangle([130, y, 190, y + 60], outline=INK, width=6)
    if done:
        d.line([(142, y + 30), (160, y + 50), (182, y + 8)], fill=MANE, width=10, joint='curve')
    d.text((225, y + 2), text, font=body, fill=INK)
    y += 120
d.line([(120, 1010), (W - 120, 1010)], fill=INK, width=3)
d.text((130, 1030), 'ИП Кейсер Л. М. · levkeiser.com/services', font=small, fill=RUST)
im.save('public/uploads/product-audit-kataloga.jpg', quality=90)
print('ok')
