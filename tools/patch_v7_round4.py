# -*- coding: utf-8 -*-
"""14.09 правки:
- главы: "глава N" и название теперь печатаются посимвольно (как цитаты), не запечены в PNG;
  карточка чуть длиннее (5.5 с вместо 4.0), чтобы текст успевал напечататься и было время прочитать;
- титры в приколах: убраны «31 июля» и «Екатеринбург» из строки про мастерскую."""
import io
import os

T = os.path.dirname(os.path.abspath(__file__))


def sub(path, old, new):
    s = io.open(path, encoding="utf-8").read()
    assert old in s, "не найдено в %s: %s" % (os.path.basename(path), old[:70])
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))


# ---------------------------------------------------------------- 1. карточки глав: убрать запечённый текст
MP = os.path.join(T, "make_plates2.py")
sub(MP, '''    # same voice as the captions: all lowercase, no periods
    ORD = ["первая", "вторая", "третья", "четвёртая", "пятая", "шестая", "седьмая", "восьмая", "девятая"]
    CH = ["знакомство", "почему так долго", "возжигание", "мужское и женское", "как ты пришёл",
          "выбираем эфиры", "смешиваем", "ольфакторная схема"]
    for i, name in enumerate(CH):
        l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
        l.alpha_composite(text_layer("глава " + ORD[i], REG, 44, BEIGE, 960, 448, spacing=0.4))
        l.alpha_composite(mark_layer(540, 70))                                   # знак — в середине кадра
        l.alpha_composite(text_layer(name, BOLD, 96 if len(name) < 16 else 78, BEIGE, 960, 654, spacing=0.10))
        save(l, "chapter_%02d.png" % (i+1))''',
    '''    # текст глав теперь печатается посимвольно live-надписью (build_v7.py); картинка несёт только знак
    l = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    l.alpha_composite(mark_layer(540, 70))                                       # знак — в середине кадра
    save(l, "chapter_mark.png")''')

# ---------------------------------------------------------------- 2. build_v7.py: типографика вместо PNG
BV = os.path.join(T, "build_v7.py")
sub(BV, '''CHAPTERS = [(c["n"], CH_NAMES[c["n"]-1]) for c in CARDS["chapters"]]''',
    '''CHAPTERS = [(c["n"], CH_NAMES[c["n"]-1]) for c in CARDS["chapters"]]
ORD_RU = ["первая", "вторая", "третья", "четвёртая", "пятая", "шестая", "седьмая", "восьмая", "девятая"]''')

sub(BV, '''ov_mats = {n: photo(n) for n in ["title_grusha.png", "title_mark.png", "title_levka.png", "card_logo.png", "card_end.png"]
           + ["chapter_%02d.png" % i for i in range(1, 9)] + ["credit_%02d.png" % i for i in range(1, 5)]}''',
    '''ov_mats = {n: photo(n) for n in ["title_grusha.png", "title_mark.png", "title_levka.png", "card_logo.png", "card_end.png",
           "chapter_mark.png"] + ["credit_%02d.png" % i for i in range(1, 5)]}''')

sub(BV, '''TITLE, POUCH, CHAP, CRED, LOGO, END = us(6.0), us(4.5), us(4.0), us(4.5), us(6.0), us(5.0)''',
    '''# CHAP чуть длиннее (было 4.0): "глава N" + название печатаются посимвольно и должны успеть дочитаться
TITLE, POUCH, CHAP, CRED, LOGO, END = us(6.0), us(4.5), us(5.5), us(4.5), us(6.0), us(5.0)''')

sub(BV, '''outtake_credit = {}   # id(seg) -> credit card index to insert AFTER that outtake
for i, s in enumerate(old):
    if id(s) in chap_keys:
        n, name = chap_keys[id(s)]
        c = card(chapter_bg, CHAP, "chapter")
        if c: overlays.append(("chapter_%02d.png" % n, c, 0.9))
    new.append([s, kind(s)])''',
    '''outtake_credit = {}   # id(seg) -> credit card index to insert AFTER that outtake
chapter_cards = []     # (n, name, card segment) — текст глав печатается позже, когда caption() уже определена
for i, s in enumerate(old):
    if id(s) in chap_keys:
        n, name = chap_keys[id(s)]
        c = card(chapter_bg, CHAP, "chapter")
        if c:
            overlays.append(("chapter_mark.png", c, 0.9))
            chapter_cards.append((n, name, c))
    new.append([s, kind(s)])''')

sub(BV, '''print("главы:", [(name, "%d:%05.2f" % divmod(c["target_timerange"]["start"]/1e6, 60)) for (nm, c, f), (_, name) in zip([o for o in overlays if o[0].startswith("chapter")], CHAPTERS)])''',
    '''print("главы:", [(name, "%d:%05.2f" % divmod(c["target_timerange"]["start"]/1e6, 60)) for n, name, c in chapter_cards])''')

# печатная анимация: "глава N" короткой строкой, затем название крупнее — обе дотипятся и есть время прочитать
sub(BV, '''quotes = D.add_track("text", "Цитаты (печатная машинка)")''',
    '''chap_text = D.add_track("text", "Главы · печатная анимация")
for n, name, c in chapter_cards:
    st, du = c["target_timerange"]["start"], c["target_timerange"]["duration"]
    label = "глава " + ORD_RU[n-1]
    lbl_tw = min(type_ms(label), us(1.3))
    lbl_start = st + us(0.35)
    lbl_dur = lbl_tw + us(1.0)
    caption(chap_text, label, lbl_start, lbl_dur, 4.3, NEON, y=0.17, tw=lbl_tw, neon=NEON_RIM, ls=0.25,
           font=FONT_R, out=False)
    name_start = lbl_start + lbl_tw + us(0.25)
    name_dur = st + du - name_start - us(0.3)
    name_tw = min(type_ms(name), name_dur - us(1.0))
    name_size = 9.2 if len(name) < 16 else 7.6
    caption(chap_text, name, name_start, name_dur, name_size, NEON, y=-0.21, tw=name_tw, neon=NEON_RIM,
           ls=0.10, font=FONT_B)

quotes = D.add_track("text", "Цитаты (печатная машинка)")''')

# ---------------------------------------------------------------- 3. титры: убрать дату и город
sub(BV, '''    "снято в мастерской «груша»\nекатеринбург · 31 июля",''',
    '''    "снято в мастерской «груша»",''')

print("правки внесены")
