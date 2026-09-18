# -*- coding: utf-8 -*-
"""Шаблоны получают структуру трека: дроп и кульминация — точки, к которым подстраивается
видео. Музыка стартует так, чтобы дроп пришёлся на 8-ю секунду ролика, а второй подъём —
на момент, когда в кадр берут предмет. На аудио ставятся метки тактов (родные «биты»
CapCut), сверху — дорожка-подсказка со структурой, которую удаляют перед экспортом."""
import io
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_templates_v2.py")
s = io.open(P, encoding="utf-8").read()


def sub(old, new):
    global s
    assert old in s, "не найдено: " + old[:60]
    s = s.replace(old, new, 1)


sub('''PYL = (0xDC / 255, 0xCB / 255, 0xA0 / 255)  # «Пыль» из палитры бренда''',
    '''PYL = (0xDC / 255, 0xCB / 255, 0xA0 / 255)  # «Пыль» из палитры бренда
ZAKAT = (0xD9 / 255, 0x9A / 255, 0x2B / 255)  # «Закат» — цвет подсказок

# Структура трека soundstates (по онсетам и огибающей громкости мастера, 92,7 BPM, такт 2,588 с):
#   4.38 первый удар (вход), 13.72 ДРОП, 27.44 второй подъём, 70.72 кульминация, ~90 спад, 95–105 затухание.
# В ролик музыка входит с TRACK_IN, чтобы дроп встал на DROP_AT секунде монтажа.
BPM = 92.7
BAR = 4 * 60 / BPM
DROP_SRC, HIT_SRC, PEAK_SRC = 13.72, 27.44, 70.72
DROP_AT = 8.0
TRACK_IN = DROP_SRC - DROP_AT           # 5.72 с — откуда берём музыку
HIT_AT = HIT_SRC - TRACK_IN             # 21.72 с — второй подъём в ролике


def bars_in(src_start, length):
    """Сильные доли (начала тактов) внутри окна, в секундах от начала материала."""
    k0 = int((src_start - DROP_SRC) // BAR) - 1
    out = []
    for k in range(k0, k0 + int(length / BAR) + 3):
        t = DROP_SRC + k * BAR
        if src_start <= t <= src_start + length:
            out.append(t)
    return out


def add_beats(D, seg, times_src_s):
    """Родные метки CapCut на аудиоклипе — видны как штрихи на дорожке, к ним липнут склейки."""
    b = {"ai_beats": {"beat_speed_infos": [], "beats_path": "", "beats_url": "", "melody_path": "",
                      "melody_percents": [0.0], "melody_url": ""},
         "enable_ai_beats": False, "gear": 404, "gear_count": 0, "id": str(uuid.uuid4()).upper(),
         "mode": 404, "type": "beats", "user_beats": [int(round(t * 1e6)) for t in times_src_s],
         "user_delete_ai_beats": None}
    D.m.setdefault("beats", []).append(b)
    seg["extra_material_refs"].append(b["id"])


def guide(D, track, txt, start, dur):
    """Подсказка монтажёру: мелко, цветом «Закат», у верхнего края."""
    mid = D.add_text_material(txt, FONT, 3.6, ZAKAT, align=1)
    track["segments"].append(D.new_text_segment(mid, us(start), us(dur), x=0.0, y=0.82))''')

# ---- конкурс
sub('''    at = D.add_track("audio", "музыка")
    aid = D.add_audio_material(AUDIO, AUDIO_US)
    at["segments"].append(D.new_audio_segment(aid, us(8.0), us(25.0), 0, fade_out_us=us(1.5)))
    tt = D.add_track("text", "подпись")
    text(D, tt, "soundstates · DJ Levka", 0, 2.0, 5.0, -0.72)
    finish(dst, D, name)''',
    '''    at = D.add_track("audio", "музыка")
    aid = D.add_audio_material(AUDIO, AUDIO_US)
    seg = D.new_audio_segment(aid, us(TRACK_IN), us(25.0), 0, fade_out_us=us(1.5))
    add_beats(D, seg, bars_in(TRACK_IN, 25.0))
    at["segments"].append(seg)
    tt = D.add_track("text", "подпись")
    text(D, tt, "soundstates · DJ Levka", 0, 2.0, 5.0, -0.72)
    gt = D.add_track("text", "СТРУКТУРА ТРЕКА — удалить перед экспортом")
    guide(D, gt, "интро · проход к камере", 0, DROP_AT)
    guide(D, gt, "▲ ДРОП 0:08 — шаг в кадр, смена ракурса", DROP_AT, HIT_AT - DROP_AT)
    guide(D, gt, "▲ КУЛЬМИНАЦИЯ 0:21.7 — предмет в кадр", HIT_AT, 25.0 - HIT_AT)
    finish(dst, D, name)''')

# ---- states of mind
sub('''    at["segments"].append(D.new_audio_segment(aid, 0, us(30.0), 0, fade_out_us=us(1.0)))
    tt = D.add_track("text", "реплики")
    text(D, tt, "Вселенная не выбирает, какой ты сегодня.\\nОна просто позволяет быть всем сразу.", 0, 3.0, 9.0, 0.0)
    text(D, tt, "Ты не обязан быть одним.\\nУ каждой версии тебя — своя причина существовать.", 8.0, 12.0, 7.0, 0.0)
    text(D, tt, "Все они настоящие.", 25.0, 5.0, 10.0, 0.0)
    finish(dst, D, name)''',
    '''    seg = D.new_audio_segment(aid, us(TRACK_IN), us(30.0), 0, fade_out_us=us(1.0))
    add_beats(D, seg, bars_in(TRACK_IN, 30.0))
    at["segments"].append(seg)
    # реплики ложатся на музыку: первая — на тихое вступление, вторая — с дропа, третья — на второй подъём
    tt = D.add_track("text", "реплики")
    text(D, tt, "Вселенная не выбирает, какой ты сегодня.\\nОна просто позволяет быть всем сразу.", 0.6, DROP_AT - 1.2, 9.0, 0.0)
    text(D, tt, "Ты не обязан быть одним.\\nУ каждой версии тебя — своя причина существовать.", DROP_AT, HIT_AT - DROP_AT - 0.6, 7.0, 0.0)
    text(D, tt, "Все они настоящие.", HIT_AT, 30.0 - HIT_AT - 1.0, 10.0, 0.0)
    gt = D.add_track("text", "СТРУКТУРА ТРЕКА — удалить перед экспортом")
    guide(D, gt, "интро · тихо, статичный план", 0, DROP_AT)
    guide(D, gt, "▲ ДРОП 0:08 — движение, смена состояния", DROP_AT, HIT_AT - DROP_AT)
    guide(D, gt, "▲ КУЛЬМИНАЦИЯ 0:21.7 — все версии в одном кадре", HIT_AT, 30.0 - HIT_AT)
    finish(dst, D, name)''')

io.open(P, "w", encoding="utf-8").write(s)
print("шаблоны получили структуру трека")
