# -*- coding: utf-8 -*-
"""Правки по просмотру 14.09:
- заставка: ГРУША и DJ LEVKA одного размера, знак ровно посередине плашки;
- знак посередине по высоте и на главах;
- бахур → первое упоминание (1:27), пало санто → 11:17, где его сравнивают с удом;
- проезд камеры на 136-секундном плане, где нюхают уд (9:33–11:49);
- титры в приколах — печатным текстом поверх кадра, без карточек; текст — крючки на полный выпуск,
  выровнены по центру и коротки, чтобы пережить вертикальную нарезку."""
import io
import json
import os

T = os.path.dirname(os.path.abspath(__file__))


def sub(path, old, new):
    s = io.open(path, encoding="utf-8").read()
    assert old in s, "не найдено в %s: %s" % (os.path.basename(path), old[:60])
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))


# ---------------------------------------------------------------- 1. карточки
MP = os.path.join(T, "make_plates2.py")
sub(MP, '''    b1 = place(lambda dy: text_layer("ГРУША", REG, 80, BEIGE, 960, 828 + dy, spacing=0.32), 700, "title_grusha.png")
    b2 = place(lambda dy: mark_layer(905 + dy, 66), b1[3] + 26, "title_mark.png")
    # the neon glow is tall; measure it clear of the frame edge, then keep it off the bottom
    mk_levka = lambda dy: text_layer("DJ LEVKA", BOLD, 96, NEON, 960, 992 + dy, spacing=0.12, glow=GLOW)
    probe = mk_levka(-300).split()[3].getbbox()
    place(mk_levka, min(b2[3] + 28, 1062 - (probe[3] - probe[1])), "title_levka.png")''',
    '''    # плашка 676–1080: знак ровно в её середине (878), имена одного размера симметрично вверх и вниз
    MID = (676 + 1080) // 2
    b2 = place(lambda dy: mark_layer(MID + dy, 66), MID - 33, "title_mark.png")
    mk_grusha = lambda dy: text_layer("ГРУША", BOLD, 84, BEIGE, 960, 780 + dy, spacing=0.22)
    pg = mk_grusha(-300).split()[3].getbbox()
    place(mk_grusha, b2[1] - 26 - (pg[3] - pg[1]), "title_grusha.png")
    mk_levka = lambda dy: text_layer("DJ LEVKA", BOLD, 84, NEON, 960, 980 + dy, spacing=0.12, glow=GLOW)
    pl = mk_levka(-300).split()[3].getbbox()
    core_top = 20                                    # свечение выше ядра букв примерно на столько
    place(mk_levka, b2[3] + 26 - core_top, "title_levka.png")''')
sub(MP, '''        l.alpha_composite(text_layer("глава " + ORD[i], REG, 44, BEIGE, 960, 430, spacing=0.4))
        l.alpha_composite(mark_layer(520, 70))
        l.alpha_composite(text_layer(name, BOLD, 96 if len(name) < 16 else 78, BEIGE, 960, 640, spacing=0.10))''',
    '''        l.alpha_composite(text_layer("глава " + ORD[i], REG, 44, BEIGE, 960, 448, spacing=0.4))
        l.alpha_composite(mark_layer(540, 70))                                   # знак — в середине кадра
        l.alpha_composite(text_layer(name, BOLD, 96 if len(name) < 16 else 78, BEIGE, 960, 654, spacing=0.10))''')
sub(MP, '''        l.alpha_composite(text_layer(h, REG, 44, BEIGE, 960, 400, spacing=0.4))
        l.alpha_composite(mark_layer(490, 70))''',
    '''        l.alpha_composite(text_layer(h, REG, 44, BEIGE, 960, 448, spacing=0.4))
        l.alpha_composite(mark_layer(540, 70))''')

# ---------------------------------------------------------------- 2. справки
A = os.path.join(T, "grusha_audio", "caption_anchors.json")
a = json.load(io.open(A, encoding="utf-8"))
for n in a["notes"]:
    if n[2] == "бахур":
        n[0], n[1] = "20260731_110808", 323.4        # «бахуры и благовония на продажу» — 1:27
    if n[2] == "пало санто":
        n[0], n[1] = "20260731_112704", 424.7        # «пало санто, как и уд, священное дерево» — 11:17
json.dump(a, io.open(A, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- 3. проезд на уде + титры поверх приколов
BV = os.path.join(T, "build_v7.py")
sub(BV, '''move(title, (1.0, 1.07), (0.0, 0.0), (0.0, 0.0))''',
    '''# принудительные проезды по моментам разговора (файл камеры B, секунда, фазы в секундах от момента)
FORCED = [
    # уд: медленный наезд, пока нюхают и говорят «самое дорогое», уход в сторону на истории про аквиларию,
    # возврат на пало санто
    ("20260731_112704", [(321.0, 1.00, 0.00, 0.00), (332.0, 1.00, 0.00, 0.00), (346.0, 1.26, -0.06, -0.04),
                         (392.0, 1.18, -0.02, -0.03), (405.0, 1.22, 0.12, -0.02), (424.0, 1.22, 0.12, -0.02),
                         (440.0, 1.06, 0.00, 0.00), (457.0, 1.00, 0.00, 0.00)]),
]
for Bf, ph in FORCED:
    for s in vt["segments"]:
        if tags[id(s)] != "gopro": continue
        Bs, b0, b1 = brange(s)
        if Bs != Bf or not (b0 <= ph[0][0] + 0.5 and b1 >= ph[-1][0] - 0.5): continue
        if s.get("common_keyframes"):
            s["common_keyframes"] = []                    # свой проезд важнее дежурного
        span = b1 - b0
        move(s, None, None, None, phases=[((t - b0) / span, sc, x, y) for t, sc, x, y in ph])
        moved.append(s["target_timerange"]["start"] / 1e6)
        break
move(title, (1.0, 1.07), (0.0, 0.0), (0.0, 0.0))''')

# карточки титров между приколами не вставляем — только логотип в начале и финал
sub(BV, '''        rest = old[i+1:]
        for k, ot in enumerate(rest):
            new.append([ot, kind(ot)])
            if k in (1, 2, 3, 5):
                ci = [1, 2, 3, 4][[1, 2, 3, 5].index(k)]
                c = card(chapter_bg, CRED, "credit")
                if c: overlays.append(("credit_%02d.png" % ci, c, 0.9))
        c = card(chapter_bg, END, "end")''',
    '''        rest = old[i+1:]
        outtakes = []                                  # приколы: титры пойдут текстом поверх них
        for k, ot in enumerate(rest):
            new.append([ot, kind(ot)])
            outtakes.append(ot)
        c = card(chapter_bg, END, "end")''')

sub(BV, '''ph = D.add_track("text", "ДОСЪЁМКИ — плейсхолдеры (удалить)")''',
    '''# ---- титры поверх приколов: короткие строки по центру, чтобы пережить вертикальную нарезку;
#      каждая — крючок на полный выпуск
CREDITS = [
    "в кадре — груша\\nблаговония · керамика · сказки",
    "лев кейсер\\nмузыка · dj levka",
    "почему уд дороже золота\\nи за ним ездят в таиланд — в полном выпуске",
    "снято в мастерской «груша»\\nекатеринбург · 31 июля",
    "аромат собирается как трек:\\nоснова, слои, время — в полном выпуске",
    "музыка — d r e a m · dj levka\\nмонтаж и звук — лев кейсер",
    "что такое бахур и зачем он тлеет\\nна угле — в полном выпуске",
    "карта 166 ароматов и своя смесь\\nlevkeiser.com/aroma",
    "спасибо груше —\\nза дом, ароматы и терпение",
]
credits_t = D.add_track("text", "Титры (поверх приколов)")
for k, ot in enumerate(outtakes if "outtakes" in dir() else []):
    if k >= len(CREDITS):
        break
    st, du = ot["target_timerange"]["start"], ot["target_timerange"]["duration"]
    if du < us(2.5):
        continue
    txt = CREDITS[k]
    lead = us(0.5)
    dur = du - lead - us(0.3)
    tw = max(us(0.8), min(type_ms(txt), dur - us(1.2)))
    caption(credits_t, txt, st + lead, dur, 5.4, NEON, y=-0.30, tw=tw, neon=NEON_RIM, plate=True, ls=0.02)

ph = D.add_track("text", "ДОСЪЁМКИ — плейсхолдеры (удалить)")''')
print("правки внесены")
