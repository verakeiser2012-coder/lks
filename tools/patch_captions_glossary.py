# -*- coding: utf-8 -*-
"""Надписи в подкасте: цитаты-повторы уходят, вместо них — короткие справки на первом
упоминании термина (бахур, уд, ладан, атар…). Остаются только цитаты-тезисы."""
import io
import json
import os

T = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(T, "grusha_audio", "caption_anchors.json")
a = json.load(io.open(A, encoding="utf-8"))

# цитаты, которые несут мысль, а не повторяют сказанное
KEEP = {
    "груша — фамилия моего женского рода",
    "у каждой семьи на востоке",
    "люди перестали чувствовать тонкости",
    "каждый аромат — история",
    "дерево ранится и масло залечивает",
    "афина охраняет все эфиры",
    "схема это 2d",
    "музыка и благовония очень близки",
}
before = len(a["quotes"])
a["quotes"] = [q for q in a["quotes"] if any(q[2].startswith(k) for k in KEEP)]

# справки: (файл камеры B, секунда первого упоминания, термин, пояснение)
B = lambda s: "20260731_" + s
a["notes"] = [
    [B("124949"), 289.5, "благовония",
     "то, что тлеет или греется ради запаха: смолы, дерево, травы.\nладан, бахур, палочки — всё это благовония"],
    [B("124949"), 392.3, "ладан",
     "смола дерева босвеллия из Омана, Йемена, Сомали. собирают, надрезая кору.\nлучший — светлый, почти прозрачный"],
    [B("124949"), 398.0, "бензоин",
     "смола стиракса из Юго-Восточной Азии, пахнет ванилью.\nдешёвая основа того, что продают как «ладан»"],
    [B("124949"), 413.9, "уд",
     "агаровое дерево: аквилария в ответ на рану выделяет тёмную смолу.\nсамое дорогое масло в парфюмерии, добывают в Таиланде и Индии"],
    [B("124949"), 511.5, "бахур",
     "арабское благовоние: щепа дерева, пропитанная маслами и смолами.\nтлеет на угле, не горит"],
    [B("124949"), 197.0, "уголь для благовоний",
     "быстроразжигаемая таблетка: поджёг, дождался седого пепла,\nсверху щепотка смеси — тлеет 10–15 минут"],
    [B("112704"), 437.0, "сандал",
     "древесина сандалового дерева, Индия и Индонезия.\nмолочный, мягкий запах — основа многих составов"],
    [B("112704"), 150.9, "атар",
     "масляная вытяжка: аромат растворяют в базовом масле, чаще сандаловом,\nи долго выдерживают. персидская и арабская традиция"],
    [B("112704"), 270.7, "эфирное масло",
     "летучая вытяжка из растения, чаще паром.\nароматерапия — работа с состоянием через такие масла: дыхание и кожа"],
    [B("114814"), 80.0, "копал",
     "смола тропических деревьев, «молодой янтарь».\nв Мексике жгут на угле, как ладан"],
    [B("114814"), 662.8, "пало санто",
     "«святое дерево» из Перу и Эквадора: сухие щепки тлеют сами, без угля.\nсладкий дымный запах"],
    [B("114814"), 780.6, "ольфакторный",
     "относящийся к обонянию.\nольфакторная схема — карта запахов по семействам"],
    [B("114814"), 158.3, "амбра",
     "вещество из кашалота, годами носимое морем; в натуральной парфюмерии —\nрастительная замена. связывает и держит аромат"],
    [B("114814"), 843.3, "мацерация",
     "смесь неделями стоит в закрытой банке, компоненты сдруживаются.\nв музыке это сведение: слои должны улечься"],
]
json.dump(a, io.open(A, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("цитат было %d, осталось %d; справок %d" % (before, len(a["quotes"]), len(a["notes"])))

# --- сборка: справки рисуются тем же верстаком, термин жирным
P = os.path.join(T, "build_v7.py")
s = io.open(P, encoding="utf-8").read()
old = "planned = sorted([T(oi, off), txt] for oi, off, txt in Q)" if "planned = sorted([T(oi, off), txt]" in s else None
anchor = "planned.sort()\nREAD = us(3.5)"
assert anchor in s, "не нашёл место планирования цитат"
s = s.replace(anchor, """for Bn, tn, term, definition in anchors.get("notes", []):
    st = place(Bn, tn)
    if st is None:
        skipped.append(term); continue
    planned.append((st, term + "\\n" + definition, "note"))
planned.sort()
READ = us(3.5)""", 1)
old_loop = """for i, (start, txt) in enumerate(planned):
    slot = (planned[i+1][0] - start - us(0.4)) if i+1 < len(planned) else us(12.0)
    dur = max(us(2.2), min(type_ms(txt) + READ, slot))
    tw = max(us(0.8), min(type_ms(txt), dur - us(1.4)))
    caption(quotes, txt, start, dur, 5.6, NEON, tw=tw, neon=NEON_RIM, plate=True)"""
assert old_loop in s
s = s.replace(old_loop, """for i, item in enumerate(planned):
    start, txt = item[0], item[1]
    kind_ = item[2] if len(item) > 2 else "quote"
    slot = (planned[i+1][0] - start - us(0.4)) if i+1 < len(planned) else us(12.0)
    dur = max(us(2.2), min(type_ms(txt) + READ + (us(1.5) if kind_ == "note" else 0), slot))
    tw = max(us(0.8), min(type_ms(txt), dur - us(1.4)))
    if kind_ == "note":
        head = txt.split("\\n", 1)[0]
        caption(quotes, txt, start, dur, 5.2, NEON, tw=tw, neon=NEON_RIM, plate=True,
                styles=[(0, len(head), 6.2, FONT_B, NEON), (len(head), len(txt), 5.0, FONT_R, NEON)])
    else:
        caption(quotes, txt, start, dur, 5.6, NEON, tw=tw, neon=NEON_RIM, plate=True)""", 1)
# planned собирается из кортежей (start, txt) — приводим к тому же виду
s = s.replace("    (planned if st is not None else skipped).append((st, txt) if st is not None else txt)",
              "    (planned if st is not None else skipped).append((st, txt, \"quote\") if st is not None else txt)", 1)
io.open(P, "w", encoding="utf-8").write(s)
print("сборка умеет справки")
