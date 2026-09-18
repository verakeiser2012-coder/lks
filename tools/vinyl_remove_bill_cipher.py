# -*- coding: utf-8 -*-
"""Bill Cipher снимается с пластинки Ikigai (производная работа — не распространяем).
Правим готовые PDF в двух папках: конверт и этикетки Ikigai, трифолд «Три альбома»;
заодно «rifraf» → «riff raff» (официальное название) на конверте и этикетке Flowers.
Строки закрашиваем цветом фона и пишем заново тем же шрифтом (Consolas/Arial из Windows)."""
import os, shutil
import pymupdf

V = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\пластинки"
P = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\Печать 2026-09-11\2-обложки-пластинок"
SCR = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "claude", "C--Users-User-Desktop-site",
                   "ef7451ae-e8cb-4ba4-b6ec-f32a3668fd99", "scratchpad")
F = {"cons": r"C:\Windows\Fonts\consola.ttf", "consb": r"C:\Windows\Fonts\consolab.ttf",
     "arial": r"C:\Windows\Fonts\arial.ttf", "arialb": r"C:\Windows\Fonts\arialbd.ttf"}
NBSP = chr(0xA0)
DOTS = ("·", chr(0x2219), chr(0xA78F))  # в PDF встречаются разные точки-разделители


def rgb(hexv):
    return tuple(int(hexv[i:i + 2], 16) / 255 for i in (0, 2, 4))


def bg_color(page, box):
    probe = pymupdf.Rect(box.x0 - 14, box.y0, box.x0 - 4, box.y1)
    px = page.get_pixmap(dpi=72, clip=probe)
    return tuple(c / 255 for c in px.pixel(px.width // 2, px.height // 2)[:3])


def find(page, text):
    for sp in (" ", NBSP):
        for dot in DOTS:
            hits = page.search_for(text.replace(" ", sp).replace("·", dot))
            if hits:
                return hits[0]
    raise AssertionError("не нашёл %r" % text)


def erase(page, text):
    box = find(page, text)
    page.add_redact_annot(box, fill=bg_color(page, box))
    page.apply_redactions()
    return box


def write(page, text, box, font, size, color, align="left", cx=None):
    w = pymupdf.Font(fontfile=F[font]).text_length(text, fontsize=size)
    x = (cx - w / 2) if align == "center" else box.x0
    page.insert_text((x, box.y1 - size * 0.2), text, fontname=font, fontfile=F[font], fontsize=size, color=color)


def save(d, path):
    tmp = path + ".tmp"
    d.save(tmp, garbage=3, deflate=True)
    d.close()
    os.replace(tmp, path)


def fix_ikigai(path):
    d = pymupdf.open(path)
    p = d[0]  # конверт: список слева, левое выравнивание
    b4 = erase(p, "04 bill cipher")
    erase(p, "05 fog")
    write(p, "04 fog", b4, "cons", 12, rgb("e6e0d6"))
    bt = erase(p, "5 tracks · 10:18")
    write(p, "4 tracks · 8:15", bt, "consb", 10.5, rgb("cc6633"))
    erase(d[1], "03 cozy place")  # этикетка A: остаются две дорожки
    b = d[2]  # этикетка B, список по центру
    l1 = erase(b, "01 bill cipher")
    l2 = erase(b, "02 fog")
    write(b, "01 cozy place", l1, "cons", 7.5, rgb("e0d9cc"), "center", cx=150.2)
    write(b, "02 fog", l2, "cons", 7.5, rgb("e0d9cc"), "center", cx=150.2)
    save(d, path)


def fix_flowers(path):
    d = pymupdf.open(path)
    b = erase(d[0], "04 rifraf")
    write(d[0], "04 riff raff", b, "cons", 12, rgb("e6e0d6"))
    b = erase(d[2], "01 rifraf")
    write(d[2], "01 riff raff", b, "cons", 7.5, rgb("e0d9cc"), "center", cx=150.2)
    save(d, path)


def fix_trifold(path):
    d = pymupdf.open(path)
    p = d[4]  # панель IKIGAI, всё по центру 453.5
    b4 = erase(p, "4. Bill Cipher")
    erase(p, "5. Fog")
    write(p, "4. Fog", b4, "arial", 13, rgb("f2edde"), "center", cx=453.5)
    bt = erase(p, "5 треков · 10:18")
    write(p, "4 трека · 8:15", bt, "arialb", 12, rgb("d16b33"), "center", cx=453.5)
    q = d[9]  # последняя панель: списки слева, итог и разбивка по центру
    b4 = erase(q, "4. Bill Cipher")
    erase(q, "5. Fog")
    write(q, "4. Fog", b4, "arial", 8.7, rgb("d9d1c2"))
    br = erase(q, "4. Rifraf")
    write(q, "4. Riff Raff", br, "arial", 8.7, rgb("d9d1c2"))
    bt = erase(q, '15 треков · 37:10 · 12" · 33⅓ об/мин')
    write(q, '14 треков · 35:07 · 12" · 33⅓ об/мин', bt, "arial", 9.5, rgb("b8ad99"), "center", cx=453.5)
    bs = erase(q, "Разбивка по сторонам A/Б — поровну, ≈ 18:30 каждая, точная разбивка по трекам — на мастеринге.")
    write(q, "Сторона A — Ikigai и Flowers 1–3 (17:12), сторона B — Flowers 4–5 и Soundstates (17:55).",
          bs, "arial", 8, rgb("998f7a"), "center", cx=453.5)
    save(d, path)


fix_ikigai(os.path.join(V, "vinylium-ikigai-final.pdf"))
fix_flowers(os.path.join(V, "vinylium-flowers-final.pdf"))
fix_trifold(os.path.join(V, "djlevka-trifold-dieline.pdf"))
for f in ("vinylium-ikigai-final.pdf", "vinylium-flowers-final.pdf", "djlevka-trifold-dieline.pdf"):
    shutil.copyfile(os.path.join(V, f), os.path.join(P, f))

KEYS = ("fog", "cipher", "tracks", "треков", "трека", "riff", "rifraf", "cozy", "сторона")
for f, pages in (("vinylium-ikigai-final.pdf", (0, 1, 2)), ("vinylium-flowers-final.pdf", (0, 2)),
                 ("djlevka-trifold-dieline.pdf", (4, 9))):
    d = pymupdf.open(os.path.join(V, f))
    for i in pages:
        print(f, "p", i, [l for l in d[i].get_text().split("\n") if any(k in l.lower() for k in KEYS)])
        d[i].get_pixmap(dpi=45).save(os.path.join(SCR, "chk_%s_p%d.png" % (f[:-4], i)))
