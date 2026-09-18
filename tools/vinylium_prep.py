# -*- coding: utf-8 -*-
"""Пакет для Vinylium по каждой пластинке: аудио под резку, «бумага» с треклистом
по сторонам в их формате (см. vinulium/photo_… — пример), PNG конвертов и этикеток 300 dpi.

Аудио — по требованиям vinylium.ru: WAV 48 кГц 24 бит, два канала, уровень не выше 0 дБ
(держим −0,3), низкие частоты в моно (сторонний канал ниже 150 Гц убран). Файлы по трекам,
имя = сторона+номер_название_длительность, как в их примере. Паузы между треками 5 с —
как в примере; сторона 12″ на 33⅓ — не больше 21 минуты.

Bill Cipher на пластинке Ikigai нет (производная работа). Riff Raff — официальное название.
Результат: ТОВАРЫ и БРЕНДЫ\пластинки\для-Vinylium\<пластинка>\ (аудио, треклист.pdf, макеты)."""
import os
import numpy as np
import soundfile as sf
import pymupdf
from scipy.signal import butter, sosfiltfilt, resample_poly

MASTERS = os.path.join(os.path.expanduser("~"), "Desktop", "Музыка", "IPEX загрузка")
V = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\пластинки"
OUT = os.path.join(V, "для-Vinylium")
PAUSE = 5  # секунд между треками, как в примере Vinylium
ARIAL, ARIALB = r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"

# Схема 17.09.2026: альбом не делится на две стороны. «2024»: Ikigai целиком (с Bill Cipher) + синглы
# с Game Over (согласие соавтора подписано 17.09). Mystery Shack не идёт. BERSERK и Welcome сняты владельцем.
R2024 = ("2024", 2024, "DJL-001", "vinylium-2024-final.pdf",
         {"A": ['The Sleepiest Beatmaker', 'Ikigai', 'Cozy Place', 'Bill Cipher', 'Fog'],
          "B": ['Hotline', 'Game Over', 'Ruins', 'Spooky Month', 'At The Jazz Club', 'Deep Sleep']})
RFS = ("FLOWERS / SOUNDSTATES", "2025–2026", "DJL-002", "vinylium-flowers-soundstates-final.pdf",
       {"A": ["Flowers", "Memory", "U", "Riff Raff", "Lullaby"],
        "B": ["Soundstates", "d r e a m", "2AM", "Cloudflute", "Back to the Future"]})
TRI = ("TRI ALBOMA (Ikigai · Flowers · Soundstates)", "2024–2026", "DJL-004", "djlevka-trifold-dieline.pdf",
       {"A": ["The Sleepiest Beatmaker", "Ikigai", "Cozy Place", "Fog", "Soundstates", "d r e a m", "2AM", "Cloudflute", "Back to the Future"],
        "B": ["Flowers", "Memory", "U", "Riff Raff", "Lullaby"]})
RECORDS = {"2024": R2024, "flowers-soundstates": RFS, "tri-alboma": TRI}
# у «Трёх альбомов» паузы 3 с: сторона A и так на 36 с длиннее лимита 21:00 — просим Vinylium подтвердить
PAUSES = {"tri-alboma": 3}


def mmss(sec, sep=":"):
    s = int(round(sec))
    return ("%02d%s%02d" if sep == "." else "%d%s%02d") % (s // 60, sep, s % 60)


def prepare(track):
    """Мастер 44,1/16 → 48/24, бас в моно ниже 150 Гц, пик не выше −0,3 дБ."""
    x, sr = sf.read(os.path.join(MASTERS, "DJ Levka - %s.wav" % track), dtype="float64")
    dur = len(x) / sr
    mid, side = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2
    side = sosfiltfilt(butter(2, 150, btype="high", fs=sr, output="sos"), side)
    y = np.stack([mid + side, mid - side], axis=1)
    y = resample_poly(y, 160, 147, axis=0)  # 44 100 → 48 000
    peak = np.max(np.abs(y))
    if peak > 10 ** (-0.3 / 20):
        y *= 10 ** (-0.3 / 20) / peak
    return y.astype(np.float32), dur


def tracklist_pdf(path, title, year, cat, sides, durations, PAUSE=PAUSE):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4
    y = 70
    page.insert_text((60, y), "%s — DJ Levka, %s" % (title, year), fontname="ab", fontfile=ARIALB, fontsize=15)
    y += 22
    page.insert_text((60, y), 'Cat. No. %s · пластинка 12", 33⅓ об/мин · WAV 48 кГц 24 бит · паузы между треками %d с' % (cat, PAUSE), fontname="a", fontfile=ARIAL, fontsize=10)
    y += 40
    x0 = {"A": 60, "B": 320}
    for side in ("A", "B"):
        page.insert_text((x0[side], y), "Сторона %s" % side, fontname="ab", fontfile=ARIALB, fontsize=14)
        yy = y + 26
        total = 0
        for i, t in enumerate(sides[side], 1):
            d = durations[t]
            total += d
            page.insert_text((x0[side], yy), "%d. %s_%s%d_%s" % (i, t, side, i, mmss(d, ".")), fontname="a", fontfile=ARIAL, fontsize=10)
            yy += 15
            if i < len(sides[side]):
                page.insert_text((x0[side] + 40, yy), "Пауза_%s_00.%02d" % (side, PAUSE), fontname="a", fontfile=ARIAL, fontsize=10)
                yy += 15
                total += PAUSE
        page.insert_text((x0[side], yy + 12), "Общее время %s" % mmss(total, "."), fontname="ab", fontfile=ARIALB, fontsize=10)
    over = [sd for sd in ("A", "B") if sum(durations[t] for t in sides[sd]) + PAUSE * (len(sides[sd]) - 1) > 21 * 60]
    if over:
        page.insert_text((60, 680), "Сторона %s длиннее 21:00 — просим подтвердить, что резка возможна (уровень можно снизить)." % "/".join(over), fontname="ab", fontfile=ARIALB, fontsize=9)
    page.insert_text((60, 700), "Файлы: папка audio рядом, имена файлов совпадают со строками выше.", fontname="a", fontfile=ARIAL, fontsize=9)
    page.insert_text((60, 714), "Game Over — авторы DJ Levka, openedruf. Riff Raff — так и пишется.", fontname="a", fontfile=ARIAL, fontsize=9)
    page.insert_text((60, 728), "ИП Кейсер Лев Максимович · ИНН 667900879141 · levkeiser.shop", fontname="a", fontfile=ARIAL, fontsize=9)
    doc.save(path)


for key, (title, year, cat, pdf, sides) in RECORDS.items():
    PAUSE = PAUSES.get(key, 5)
    folder = os.path.join(OUT, key)
    audio = os.path.join(folder, "audio")
    os.makedirs(audio, exist_ok=True)
    durations = {}
    for side, tracks in sides.items():
        for i, t in enumerate(tracks, 1):
            y, dur = prepare(t)
            durations[t] = dur
            sf.write(os.path.join(audio, "%s%d_%s_%s.wav" % (side, i, t, mmss(dur, "."))), y, 48000, subtype="PCM_24")
    for side, tracks in sides.items():
        total = sum(durations[t] for t in tracks) + PAUSE * (len(tracks) - 1)
        print(key, "сторона", side, mmss(total), "(лимит 21:00)", "ПРЕВЫШЕН" if total > 21 * 60 else "ok")
    tracklist_pdf(os.path.join(folder, "треклист-по-сторонам.pdf"), title, year, cat, sides, durations, PAUSE)
    d = pymupdf.open(os.path.join(V, pdf))
    names = {0: "konvert-637x320", 1: "etiketka-storona-A", 2: "etiketka-storona-B"}
    for i, p in enumerate(d):
        if key == "tri-alboma" or i in names:
            name = names.get(i, "trifold-p%d" % i)
            p.get_pixmap(dpi=300, alpha=False).save(os.path.join(folder, "%s-%s.png" % (key, name)))
    print(key, "готово:", folder)
