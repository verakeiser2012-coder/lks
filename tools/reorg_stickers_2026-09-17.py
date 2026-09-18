# -*- coding: utf-8 -*-
"""Перекладывает папку «Эмодзи» по назначению (куда идёт набор), не трогая сквозные номера.
Бэкап — _backup-2026-09-17.zip в самой папке. Пересобирает _индекс.txt и листы _превью."""
import os, shutil, zipfile
from PIL import Image, ImageDraw, ImageFont

SRC = os.path.join(os.path.expanduser("~"), "Desktop", "Эмодзи")
MAP = [  # старая папка → новая
    ("01-фразы",             "1-Telegram-пак «Лев Кейсер»"),
    ("02-фото",              "1-Telegram-пак «Лев Кейсер»"),
    ("04-реакции-короткие",  "2-Telegram-пак «Реакции»"),
    ("05-реакции-длинные",   "3-MAX-пак «Реакции»"),
    ("06-реакции-неон",      "4-Сторис-накладки «Неон»"),
    ("03-арт-треков",        "5-Бонус по коду «Состояния»"),
    ("07-эмодзи-100px",      "6-Telegram-эмодзи 100px"),
    ("08-фотобанк-Pinterest","9-фотобанк-Pinterest (источник)"),
]
# 1. бэкап
bak = os.path.join(SRC, "_backup-2026-09-17.zip")
if not os.path.exists(bak):
    with zipfile.ZipFile(bak, "w", zipfile.ZIP_STORED) as z:
        for root, _, files in os.walk(SRC):
            for f in files:
                p = os.path.join(root, f)
                if p != bak: z.write(p, os.path.relpath(p, SRC))
    print("бэкап:", bak)
# 2. перенос
for old, new in MAP:
    o = os.path.join(SRC, old); n = os.path.join(SRC, new)
    if not os.path.isdir(o): continue
    os.makedirs(n, exist_ok=True)
    for f in os.listdir(o): shutil.move(os.path.join(o, f), os.path.join(n, f))
    os.rmdir(o); print(f"{old} → {new}")
# 3. индекс
folders = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)) and d[0].isdigit() and not d.startswith("9"))
rows = []
for d in folders:
    for f in sorted(os.listdir(os.path.join(SRC, d))):
        if f.lower().endswith(".png"): rows.append((f[:3], d, f))
rows.sort(key=lambda r: int(r[0]))
with open(os.path.join(SRC, "_индекс.txt"), "w", encoding="utf-8") as fh:
    for n, d, f in rows: fh.write(f"{n}\t{d}\t{f}\n")
# 4. превью
prev = os.path.join(SRC, "_превью"); os.makedirs(prev, exist_ok=True)
for f in os.listdir(prev): os.remove(os.path.join(prev, f))
try: font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "fonts", "RobotoSlab-Bold.ttf"), 22)
except Exception: font = ImageFont.truetype("arialbd.ttf", 22)
for d in folders:
    files = [f for f in sorted(os.listdir(os.path.join(SRC, d))) if f.lower().endswith(".png")]
    cell = 120 if "100px" in d else 180; cols = 6 if cell == 180 else 10; pad = 14
    rowsn = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (cell + pad) + pad, rowsn * (cell + pad + 26) + pad + 40), (158, 201, 160))
    dr = ImageDraw.Draw(sheet); dr.text((pad, 8), d, fill=(20, 20, 20), font=font)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(SRC, d, f)).convert("RGBA"); im.thumbnail((cell, cell))
        x = pad + (i % cols) * (cell + pad); y = 40 + pad + (i // cols) * (cell + pad + 26)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
        dr.rectangle([x, y + cell + 2, x + 62, y + cell + 24], fill=(20, 20, 20)); dr.text((x + 4, y + cell + 1), "№" + f[:3], fill="white", font=font)
    sheet.save(os.path.join(prev, d + ".png")); print("превью:", d, len(files))
