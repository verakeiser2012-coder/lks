# -*- coding: utf-8 -*-
"""Пакет для Vinylium: конверты и этикетки в PNG 300 dpi + треклисты по сторонам.

Хронометраж на конвертах был на 20 секунд длиннее, чем у мастеров (в каждом
файле добавлены паузы), — исправляем прямо в PDF: старую строку закрашиваем,
новую пишем тем же шрифтом (Consolas Bold из Windows) в то же место.
Длительности — из мастеров WAV, они же уйдут на резку; совпадают с Deezer."""
import os
import shutil

import pymupdf

SRC = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\Печать 2026-09-11\2-обложки-пластинок"
OUT = os.path.join(SRC, "для-Vinylium")
FONT = r"C:\Windows\Fonts\consolab.ttf"
DPI = 300

RECORDS = {
    "ikigai": {
        "title": "IKIGAI", "year": 2024, "cat": "DJL-001", "old": "10:37",
        "a": [("The Sleepiest Beatmaker", 96.85), ("Ikigai", 120.96), ("Cozy Place", 145.18)],
        "b": [("Bill Cipher", 123.01), ("Fog", 131.55)],
    },
    "flowers": {
        "title": "FLOWERS", "year": 2025, "cat": "DJL-002", "old": "14:15",
        "a": [("Flowers", 154.31), ("Memory", 223.27), ("U", 159.77)],
        "b": [("Riff Raff", 154.56), ("Lullaby", 143.08)],
    },
    "soundstates": {
        "title": "SOUNDSTATES", "year": 2026, "cat": "DJL-003", "old": "13:17",
        "a": [("Soundstates", 104.97), ("d r e a m", 194.15), ("2AM", 147.00)],
        "b": [("Cloudflute", 165.50), ("Back to the Future", 165.86)],
    },
}


def mmss(sec, rnd=False):
    s = int(round(sec)) if rnd else int(sec)
    return "%d:%02d" % (s // 60, s % 60)


os.makedirs(OUT, exist_ok=True)
for key, r in RECORDS.items():
    total = sum(d for _, d in r["a"]) + sum(d for _, d in r["b"])
    new = mmss(total, rnd=True)
    src = os.path.join(SRC, "vinylium-%s-final.pdf" % key)
    fixed = os.path.join(SRC, "vinylium-%s-final-v2.pdf" % key)

    doc = pymupdf.open(src)
    page = doc[0]
    hits = page.search_for("5 tracks · " + r["old"])
    assert hits, "не нашёл строку хронометража в " + key
    box = hits[0]
    # цвет фона берём с самой страницы, чуть левее строки — иначе под новой надписью виден прямоугольник
    probe = pymupdf.Rect(box.x0 - 12, box.y0, box.x0 - 4, box.y1)
    px = page.get_pixmap(dpi=72, clip=probe)
    rgb = px.pixel(px.width // 2, px.height // 2)
    page.add_redact_annot(box, fill=tuple(c / 255 for c in rgb[:3]))
    page.apply_redactions()
    page.insert_text((box.x0, box.y1 - 2.2), "5 tracks · " + new, fontsize=10.5,
                     fontname="ConsB", fontfile=FONT, color=(0.8, 0.4, 0.2))
    doc.save(fixed)
    doc.close()

    doc = pymupdf.open(fixed)
    names = ["konvert-637x320", "etiketka-storona-A", "etiketka-storona-B"]
    for i, p in enumerate(doc):
        pix = p.get_pixmap(dpi=DPI, alpha=False)
        pix.save(os.path.join(OUT, "%s-%s.png" % (key, names[i])))
    doc.close()

    lines = ["%s — DJ Levka, %d · Cat. No. %s" % (r["title"], r["year"], r["cat"]),
             "Пластинка 12\", 33 1/3 об/мин. Длительности — по мастерам WAV (они же уходят на резку).", ""]
    for side, tracks in (("A", r["a"]), ("B", r["b"])):
        lines.append("СТОРОНА %s" % side)
        for n, (t, d) in enumerate(tracks, 1):
            lines.append("  %s%d. %-24s %s" % (side, n, t, mmss(d)))
        lines.append("  итого сторона %s: %s" % (side, mmss(sum(d for _, d in tracks), rnd=True)))
        lines.append("")
    lines.append("Всего: %d треков, %s" % (len(r["a"]) + len(r["b"]), new))
    lines.append("Паузы между треками: стандартные, 2–3 с. Порядок сторон — как на этикетках.")
    with open(os.path.join(OUT, "%s-треклист.txt" % key), "w", encoding="utf-8-sig") as f:
        f.write("\n".join(lines) + "\n")
    print("%-12s %s -> %s | стороны %s / %s" % (key, r["old"], new,
          mmss(sum(d for _, d in r["a"]), rnd=True), mmss(sum(d for _, d in r["b"]), rnd=True)))

print("папка:", OUT)
for f in sorted(os.listdir(OUT)):
    print("  %7d KB  %s" % (os.path.getsize(os.path.join(OUT, f)) // 1024, f))
