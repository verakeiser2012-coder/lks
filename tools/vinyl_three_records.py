# -*- coding: utf-8 -*-
"""Пластинки по схеме 17.09.2026 (решение владельца: альбом не делим на две стороны).

  «2024»                — A: Ikigai целиком (4 трека), B: синглы 2024 (7 треков; Game Over — соавторство
                          с openedruf, соглашение не подписано, поэтому не кладём; Mystery Shack — производная).
  «Flowers / Soundstates» — A: Flowers, B: Soundstates.
  «Три альбома»         — A: Ikigai + Soundstates (21:36 с паузами 3 с — на 36 с больше лимита Vinylium,
                          нужно их подтверждение), B: Flowers. Панели трифолда прежние.

Делает из готовых PDF новые: vinylium-2024-final.pdf и vinylium-flowers-soundstates-final.pdf
(строки закрашиваем фоном, пишем тем же шрифтом), правит строку сторон в трифолде.
Затем vinylium_prep.py собирает аудио и треклисты по этой же схеме."""
import os, shutil
import pymupdf

V = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\пластинки"
P = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\Печать 2026-09-11\2-обложки-пластинок"
F = {"cons": r"C:\Windows\Fonts\consola.ttf", "consb": r"C:\Windows\Fonts\consolab.ttf",
     "arial": r"C:\Windows\Fonts\arial.ttf", "arialb": r"C:\Windows\Fonts\arialbd.ttf"}
NBSP, DOTS = chr(0xA0), ("·", chr(0x2219), chr(0xA78F))
LIST, LISTB, TOTAL, TITLE, SUB, LABEL = (0xe6, 0xe0, 0xd6), (0xe0, 0xd9, 0xcc), (0xcc, 0x66, 0x33), (0xf2, 0xed, 0xe0), (0xbf, 0xb5, 0xa1), (0xf2, 0xed, 0xde)

# 17.09 вечер, решение владельца: Bill Cipher — трек альбома, возвращён на сторону A; на стороне B —
# Game Over (согласие соавтора подписано), BERSERK и Welcome сняты.
SIDES_2024 = {"A": ['The Sleepiest Beatmaker', 'Ikigai', 'Cozy Place', 'Bill Cipher', 'Fog'],
              "B": ['Hotline', 'Game Over', 'Ruins', 'Spooky Month', 'At The Jazz Club', 'Deep Sleep']}
SIDES_FS = {"A": ["Flowers", "Memory", "U", "Riff Raff", "Lullaby"],
            "B": ["Soundstates", "d r e a m", "2AM", "Cloudflute", "Back to the Future"]}
DUR = {"The Sleepiest Beatmaker": 96.9, "Ikigai": 121.0, "Cozy Place": 145.2, "Fog": 131.6, "Welcome": 98, "Hotline": 175,
       "BERSERK": 108, "Ruins": 150, "Spooky Month": 144, "At The Jazz Club": 122, "Deep Sleep": 178, "Bill Cipher": 123.0, "Game Over": 132,
       "Flowers": 154.3, "Memory": 223.3, "U": 159.8, "Riff Raff": 154.6, "Lullaby": 143.1,
       "Soundstates": 105.0, "d r e a m": 194.2, "2AM": 147.0, "Cloudflute": 165.5, "Back to the Future": 165.9}


def rgb(c):
    return tuple(v / 255 for v in c)


def mmss(sec):
    s = int(round(sec))
    return "%d:%02d" % (s // 60, s % 60)


def find(page, text):
    for sp in (" ", NBSP):
        for dot in DOTS:
            hits = page.search_for(text.replace(" ", sp).replace("·", dot))
            if hits:
                return hits[0]
    raise AssertionError("не нашёл %r" % text)


def bg_at(page, x, y):
    px = page.get_pixmap(dpi=72, clip=pymupdf.Rect(x, y, x + 4, y + 4))
    return tuple(c / 255 for c in px.pixel(1, 1)[:3])


def erase_rect(page, rect, bg):
    page.add_redact_annot(rect, fill=bg)
    page.apply_redactions()


def erase(page, text):
    box = find(page, text)
    erase_rect(page, box, bg_at(page, box.x0 - 12, box.y0))
    return box


def write(page, text, x, y, font, size, color, center=False):
    if center:
        w = pymupdf.Font(fontfile=F[font]).text_length(text, fontsize=size)
        x = x - w / 2
    page.insert_text((x, y), text, fontname=font, fontfile=F[font], fontsize=size, color=rgb(color))


def cover_two_columns(page, cx, sides, head_a, head_b, y_head=342):
    """Задняя панель: две колонки треков вместо одной. cx — центр панели."""
    bg = bg_at(page, cx - 200, 600)
    erase_rect(page, pymupdf.Rect(cx - 220, 330, cx + 220, 490), bg)
    xa, xb = cx - 200, cx + 30
    write(page, head_a, xa, y_head, "consb", 10.5, TOTAL)
    write(page, head_b, xb, y_head, "consb", 10.5, TOTAL)
    for col, x in (("A", xa), ("B", xb)):
        for i, t in enumerate(sides[col], 1):
            write(page, "%02d %s" % (i, t.lower()), x, y_head + 22 + (i - 1) * 19, "cons", 11, LIST)
    n = len(sides["A"]) + len(sides["B"])
    total = sum(DUR[t] for t in sides["A"] + sides["B"])
    write(page, "%d tracks · %s" % (n, mmss(total)), cx, 503, "consb", 10.5, TOTAL, center=True)


def label_list(page, tracks, size=7.5, y0=170, step=15.6):
    """Этикетка 106×106: список по центру (150.2)."""
    bg = bg_at(page, 40, 160)
    erase_rect(page, pymupdf.Rect(60, 140, 240, 252), bg)
    if len(tracks) > 5:
        size, step, y0 = 7.0, 12.5, 168
    for i, t in enumerate(tracks, 1):
        write(page, "%02d %s" % (i, t.lower()), 150.2, y0 + 7 + (i - 1) * step, "cons", size, LISTB, center=True)


def side_marker(page, text):
    box = find(page, "SIDE A") if "SIDE A" in page.get_text() else find(page, "SIDE B")
    erase_rect(page, box, bg_at(page, box.x0 - 10, box.y0))
    write(page, text, 150.2, box.y1 - 2, "arialb", 10, LABEL, center=True)


def build_2024():
    src = os.path.join(V, "vinylium-ikigai-final.pdf")
    d = pymupdf.open(src)
    p = d[0]
    cx = 451
    b = erase(p, "2024 · first lo-fi EP")
    write(p, "2024 · first lo-fi EP + singles of the year", cx, b.y1 - 2, "arial", 11, SUB, center=True)
    cover_two_columns(p, cx, SIDES_2024, "SIDE A · IKIGAI", "SIDE B · SINGLES 2024")
    label_list(d[1], SIDES_2024["A"])
    label_list(d[2], SIDES_2024["B"])
    b = erase(d[2], "DJ Levka · 2024")
    write(d[2], "DJ Levka · singles 2024", 150.2, b.y1 - 1.5, "arial", 8.5, SUB, center=True)
    out = os.path.join(V, "vinylium-2024-final.pdf")
    d.save(out, garbage=3, deflate=True)
    d.close()
    return out


def build_flowers_soundstates():
    src = os.path.join(V, "vinylium-flowers-final.pdf")
    d = pymupdf.open(src)
    p = d[0]
    cx = 454
    b = erase(p, "FLOWERS")
    write(p, "FLOWERS · SOUNDSTATES", cx, b.y1 - 5, "arialb", 30, TITLE, center=True)
    b = erase(p, "2025")
    write(p, "2025 · 2026 — two albums, one record", cx, b.y1 - 2, "arial", 11, SUB, center=True)
    cover_two_columns(p, cx, SIDES_FS, "SIDE A · FLOWERS", "SIDE B · SOUNDSTATES")
    b = erase(p, "℗ & © 2025 DJ Levka. All rights reserved.")
    write(p, "℗ & © 2025–2026 DJ Levka. All rights reserved.", cx, b.y1 - 1.5, "arial", 8.5, SUB, center=True)
    label_list(d[1], SIDES_FS["A"])
    # этикетка B — из Soundstates, страница SIDE B
    s = pymupdf.open(os.path.join(V, "vinylium-soundstates-final.pdf"))
    d.delete_page(2)
    d.insert_pdf(s, from_page=2, to_page=2)
    label_list(d[2], SIDES_FS["B"])
    out = os.path.join(V, "vinylium-flowers-soundstates-final.pdf")
    d.save(out, garbage=3, deflate=True)
    d.close()
    return out


def fix_trifold():
    for folder in (V, P):
        path = os.path.join(folder, "djlevka-trifold-dieline.pdf")
        d = pymupdf.open(path)
        q = d[9]
        old = "Сторона A — Ikigai и Flowers 1–3 (17:12), сторона B — Flowers 4–5 и Soundstates (17:55)."
        try:
            b = erase(q, old)
        except AssertionError:
            d.close()
            continue  # строка уже заменена ранее
        write(q, "Сторона A — Ikigai и Soundstates целиком (21:36), сторона B — Flowers целиком (14:15). Альбомы не делятся.",
              453.5, b.y1 - 1.5, "arial", 8, (0x99, 0x8f, 0x7a), center=True)
        tmp = path + ".tmp"
        d.save(tmp, garbage=3, deflate=True)
        d.close()
        os.replace(tmp, path)


a = build_2024()
b = build_flowers_soundstates()
fix_trifold()
for f in (a, b):
    shutil.copyfile(f, os.path.join(P, os.path.basename(f)))
SCR = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "claude", "C--Users-User-Desktop-site",
                   "ef7451ae-e8cb-4ba4-b6ec-f32a3668fd99", "scratchpad")
for f in (a, b):
    d = pymupdf.open(f)
    for i in range(3):
        d[i].get_pixmap(dpi=60 if i == 0 else 110).save(os.path.join(SCR, "chk_%s_p%d.png" % (os.path.basename(f)[:-4], i)))
    print(os.path.basename(f), [l for l in d[0].get_text().split("\n") if "tracks" in l or "SIDE" in l])
print("готово")
