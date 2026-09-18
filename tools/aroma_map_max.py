# -*- coding: utf-8 -*-
"""Максимальная карта натуральных ароматов — плакат A0/A1 (1400×1000 мм), палитра «Дикий лев».

Источники семейств и весов: колесо ароматов Майкла Эдвардса (флораль/ориенталь/дерево/свежесть),
14 типов аромата Foodpairing, категории Flavor network (Ahn et al. 2011), дескрипторы The Good Scents,
классификация сырья натуральной парфюмерии (Зворыкина, «Ольфакторная азбука») и аромакарты сочетаемости
эфирных масел. Двенадцать семейств стоят по кругу, каждый аромат — на пересечении своих лучей.
Пишет SVG (мм, вектор) и PNG-превью тем же кодом."""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(OUT, "fonts")
W, H = 1400.0, 1120.0
CX, CY, R = 700.0, 455.0, 380.0
DUST, INK, MANE, SUNSET, RUST, ACACIA, DUSK = "#DCCBA0", "#211A12", "#B4601C", "#D99A2B", "#7A2E1B", "#6FA83C", "#6B4E7D"
SKY, SEA_C, LEAF = "#5B7FA6", "#3F7C8A", "#4E7A2E"

from aroma_i18n import FAM_RU, FAM_EN, EN as EN_NAMES, T_RU, T_EN
LANG = (os.environ.get("LANG_MAP") or "ru").lower()
FAM = FAM_RU if LANG == "ru" else FAM_EN
T = dict(T_RU if LANG == "ru" else T_EN)
# 12 различимых цветов в духе «Дикого льва»: у каждого семейства свой, чтобы дуги читались по цвету
FCOL = ["#EFC94C", "#6FA83C", "#5B8FB0", "#8A5A9E", "#B5405A", "#E08A3A",
        "#8C2F1E", "#8A5A2B", "#B8862B", "#211A12", "#5C3A2E", "#3F8C8A"]
CIT, GRN, CAM, FLR, FRT, GRM, SPC, WD, RES, ERT, ANM, SEA = range(12)

N = {
    # --- цитрус
    "бергамот": {CIT: .7, FLR: .2, GRN: .1}, "лимон": {CIT: .9, GRN: .1}, "лайм": {CIT: .85, GRN: .15},
    "мандарин": {CIT: .75, FRT: .2, FLR: .05}, "апельсин сладкий": {CIT: .75, FRT: .25}, "горький апельсин": {CIT: .7, FLR: .2, GRN: .1},
    "грейпфрут": {CIT: .8, FRT: .1, GRN: .1}, "юдзу": {CIT: .8, FRT: .1, GRN: .1}, "лемонграсс": {CIT: .6, GRN: .3, SPC: .1},
    "литсея": {CIT: .7, FRT: .2, GRN: .1}, "цитронелла": {CIT: .6, GRN: .3, FLR: .1}, "мелисса": {CIT: .5, GRN: .4, FLR: .1},
    "петитгрейн": {CIT: .4, GRN: .4, FLR: .2}, "вербена": {CIT: .6, GRN: .3, FLR: .1},
    # --- зелень · травы
    "базилик": {GRN: .6, SPC: .3, CAM: .1}, "розмарин": {GRN: .5, CAM: .3, SPC: .2}, "тимьян": {GRN: .5, SPC: .4, CAM: .1},
    "шалфей": {GRN: .55, CAM: .2, ERT: .25}, "мускатный шалфей": {GRN: .4, FLR: .3, GRM: .3}, "лаванда": {FLR: .4, GRN: .4, CAM: .2},
    "лавандин": {GRN: .5, CAM: .3, FLR: .2}, "полынь": {GRN: .5, ERT: .3, SPC: .2}, "эстрагон": {GRN: .5, SPC: .4, GRM: .1},
    "укроп": {GRN: .7, SPC: .3}, "фенхель": {GRN: .4, SPC: .5, GRM: .1}, "гальбанум": {GRN: .8, RES: .2},
    "фиалковый лист": {GRN: .6, FLR: .2, SEA: .2}, "томатный лист": {GRN: .8, FRT: .2}, "чай зелёный": {GRN: .5, FLR: .2, ERT: .3},
    "мате": {GRN: .6, ERT: .3, GRM: .1}, "сено": {GRN: .4, ERT: .3, GRM: .3}, "трава скошенная": {GRN: .9, ERT: .1},
    "ромашка": {GRN: .4, FLR: .4, FRT: .2}, "иссоп": {GRN: .6, CAM: .3, SPC: .1}, "майоран": {GRN: .6, SPC: .3, CAM: .1},
    # --- холод · камфора
    "мята перечная": {CAM: .7, GRN: .3}, "мята кудрявая": {CAM: .6, GRN: .3, GRM: .1}, "эвкалипт": {CAM: .7, GRN: .2, WD: .1},
    "чайное дерево": {CAM: .6, GRN: .2, WD: .2}, "каяпут": {CAM: .7, GRN: .2, SPC: .1}, "равинцара": {CAM: .7, WD: .2, GRN: .1},
    "камфора": {CAM: .9, WD: .1}, "пихта": {CAM: .4, WD: .4, GRN: .2}, "ель": {WD: .5, CAM: .3, RES: .2},
    "сосна": {WD: .5, CAM: .3, RES: .2}, "можжевельник": {CAM: .4, WD: .4, SPC: .2}, "кипарис": {WD: .5, CAM: .3, GRN: .2},
    # --- цветы
    "роза": {FLR: .8, SPC: .1, GRM: .1}, "жасмин": {FLR: .8, ANM: .2}, "тубероза": {FLR: .7, ANM: .2, GRM: .1},
    "нероли": {FLR: .6, CIT: .3, GRN: .1}, "иланг-иланг": {FLR: .7, SPC: .2, FRT: .1}, "герань": {FLR: .6, GRN: .3, CIT: .1},
    "фиалка": {FLR: .6, GRM: .2, GRN: .2}, "ирис": {FLR: .5, GRM: .2, WD: .3}, "мимоза": {FLR: .6, GRN: .2, GRM: .2},
    "нарцисс": {FLR: .6, GRN: .3, ANM: .1}, "османтус": {FLR: .5, FRT: .4, ANM: .1}, "гардения": {FLR: .8, FRT: .1, GRN: .1},
    "цветок апельсина": {FLR: .7, CIT: .2, GRM: .1}, "чампака": {FLR: .7, FRT: .2, SPC: .1}, "лотос": {FLR: .7, SEA: .2, GRN: .1},
    "жимолость": {FLR: .7, FRT: .2, GRM: .1}, "липа": {FLR: .6, GRM: .3, GRN: .1}, "ландыш": {FLR: .8, GRN: .2},
    "пион": {FLR: .7, FRT: .2, GRN: .1}, "сирень": {FLR: .8, GRN: .1, GRM: .1}, "франжипани": {FLR: .6, FRT: .2, GRM: .2},
    # --- фрукты · ягоды
    "яблоко": {FRT: .8, GRN: .2}, "груша": {FRT: .8, FLR: .1, GRM: .1}, "персик": {FRT: .7, FLR: .2, GRM: .1},
    "абрикос": {FRT: .7, FLR: .1, GRM: .2}, "малина": {FRT: .8, FLR: .1, GRM: .1}, "чёрная смородина": {FRT: .6, GRN: .3, ANM: .1},
    "инжир": {FRT: .5, GRN: .3, WD: .2}, "кокос": {FRT: .5, GRM: .4, WD: .1}, "манго": {FRT: .7, RES: .1, FLR: .2},
    "виноград": {FRT: .8, FLR: .1, GRM: .1}, "вишня": {FRT: .7, GRM: .2, SPC: .1}, "слива": {FRT: .7, GRM: .2, ERT: .1},
    "финик": {FRT: .5, GRM: .4, ERT: .1}, "изюм": {FRT: .5, GRM: .4, ANM: .1},
    # --- сладкое · гурман
    "ваниль": {GRM: .7, RES: .2, SPC: .1}, "бобы тонка": {GRM: .6, RES: .2, SPC: .2}, "мёд": {GRM: .6, FLR: .3, ANM: .1},
    "какао": {GRM: .6, ERT: .3, SPC: .1}, "кофе": {ERT: .5, GRM: .3, SPC: .2}, "карамель": {GRM: .8, ERT: .2},
    "миндаль": {GRM: .6, FRT: .2, SPC: .2}, "фундук": {GRM: .5, WD: .3, ERT: .2}, "молоко": {GRM: .7, ANM: .3},
    "хлеб": {GRM: .5, ERT: .3, GRN: .2}, "ром": {GRM: .6, FRT: .2, SPC: .2}, "солод · пиво": {GRM: .4, ERT: .3, FRT: .3},
    "вино красное": {FRT: .5, ERT: .3, SPC: .2}, "кленовый сироп": {GRM: .8, WD: .2}, "пчелиный воск": {GRM: .5, FLR: .2, ANM: .3},
    # --- пряности
    "чёрный перец": {SPC: .8, WD: .2}, "розовый перец": {SPC: .6, FRT: .2, FLR: .2}, "корица": {SPC: .7, GRM: .3},
    "кассия": {SPC: .8, GRM: .2}, "гвоздика": {SPC: .7, FLR: .2, WD: .1}, "кардамон": {SPC: .6, CIT: .2, CAM: .2},
    "имбирь": {SPC: .6, CIT: .3, CAM: .1}, "мускатный орех": {SPC: .6, WD: .3, GRM: .1}, "анис": {SPC: .5, GRM: .3, GRN: .2},
    "бадьян": {SPC: .6, GRM: .3, GRN: .1}, "кориандр": {SPC: .5, CIT: .3, FLR: .2}, "тмин": {SPC: .7, GRN: .3},
    "куркума": {SPC: .6, ERT: .3, WD: .1}, "шафран": {SPC: .5, ANM: .3, GRM: .2}, "перец сычуаньский": {SPC: .6, CIT: .3, CAM: .1},
    "душистый перец": {SPC: .7, GRM: .2, WD: .1}, "лавровый лист": {SPC: .5, GRN: .4, CAM: .1},
    # --- дерево
    "сандал": {WD: .7, RES: .15, GRM: .15}, "уд": {WD: .5, ANM: .25, ERT: .25}, "гималайский кедр": {WD: .8, GRM: .1, RES: .1},
    "атласский кедр": {WD: .8, SPC: .1, RES: .1}, "виргинский кедр": {WD: .9, ERT: .1}, "пало санто": {WD: .6, RES: .25, CIT: .15},
    "гваяк": {WD: .6, ERT: .3, GRM: .1}, "ветивер": {ERT: .5, WD: .4, ANM: .1}, "пачули": {ERT: .55, WD: .3, RES: .15},
    "хиноки": {WD: .7, CAM: .2, GRN: .1}, "хо-дерево": {WD: .5, FLR: .3, CAM: .2}, "розовое дерево": {WD: .5, FLR: .4, CIT: .1},
    "берёза": {WD: .6, ERT: .3, GRN: .1}, "дуб": {WD: .7, ERT: .3}, "морёный дуб": {ERT: .55, WD: .45},
    "кашмеран · сухое дерево": {WD: .6, SPC: .2, ANM: .2},
    # --- смолы · бальзамы
    "ладан": {RES: .6, CIT: .2, ERT: .2}, "мирра": {RES: .6, ERT: .25, SPC: .15}, "бензоин": {RES: .7, GRM: .3},
    "стиракс": {RES: .6, SPC: .3, ANM: .1}, "лабданум": {RES: .5, ANM: .3, ERT: .2}, "копал": {RES: .7, CIT: .2, WD: .1},
    "элеми": {RES: .6, CIT: .3, SPC: .1}, "перуанский бальзам": {RES: .6, GRM: .4}, "толуанский бальзам": {RES: .6, GRM: .3, FLR: .1},
    "опопонакс": {RES: .6, GRM: .2, ANM: .2}, "мастика": {RES: .6, GRN: .3, WD: .1}, "еловая смола": {RES: .5, WD: .4, CAM: .1},
    "канифоль": {RES: .7, WD: .3}, "амбра серая": {ANM: .5, SEA: .3, RES: .2},
    # --- дым · земля · мох
    "дубовый мох": {ERT: .7, WD: .2, SEA: .1}, "берёзовый дёготь": {ERT: .7, ANM: .2, WD: .1}, "кожа": {ANM: .6, ERT: .3, WD: .1},
    "табак": {ERT: .4, GRM: .3, ANM: .3}, "чёрный чай": {ERT: .5, FLR: .2, GRM: .3}, "костёр": {ERT: .8, WD: .2},
    "торф": {ERT: .8, SEA: .2}, "грибы": {ERT: .8, GRM: .2}, "мокрая земля": {ERT: .8, SEA: .2},
    "бахур": {ERT: .4, WD: .3, RES: .3},
    # --- животное · кожа
    "мускус растительный": {ANM: .7, GRM: .3}, "амбретта": {ANM: .6, FLR: .2, GRM: .2}, "цибет": {ANM: .9, FLR: .1},
    "кастореум": {ANM: .7, ERT: .2, GRM: .1}, "хирацеум": {ANM: .8, ERT: .2}, "шерсть": {ANM: .7, ERT: .3},
    # --- море · минерал
    "водоросли": {SEA: .8, GRN: .2}, "соль · бриз": {SEA: .9, CIT: .1}, "устричная раковина": {SEA: .8, ANM: .2},
    "дождь · озон": {SEA: .7, GRN: .3}, "камень тёплый": {SEA: .6, ERT: .4}, "снег": {SEA: .6, CAM: .4},
}
NODES = [((nm if LANG == "ru" else EN_NAMES[nm]), w) for nm, w in N.items()]
T["howto"] = [ln % len(NODES) if "%d" in ln else ln for ln in T["howto"]]
LINE_MIN = .3


def hub(i):
    a = -math.pi/2 + i*2*math.pi/len(FAM)
    return CX + R*math.cos(a), CY + R*math.sin(a)


def label_anchor(hx, hy):
    """подпись семейства снаружи круга, по направлению луча"""
    ang = math.atan2(hy-CY, hx-CX)
    lx, ly = hx + 44*math.cos(ang), hy + 44*math.sin(ang)
    anc = "start" if math.cos(ang) > .3 else "end" if math.cos(ang) < -.3 else "middle"
    ly += 8 if math.sin(ang) > .3 else (-2 if math.sin(ang) < -.3 else 6)
    return lx, ly, anc


HUBS = [hub(i) for i in range(len(FAM))]
pos = []
PULL = 1.7
for name, w in NODES:
    sh = {i: wt**PULL for i, wt in w.items()}
    tot = sum(sh.values()) or 1
    x = CX + sum(v/tot*(HUBS[i][0]-CX) for i, v in sh.items())*0.94
    y = CY + sum(v/tot*(HUBS[i][1]-CY) for i, v in sh.items())*0.94
    pos.append([x, y])
home = [list(p_) for p_ in pos]
# FS_MAP — размер подписей материалов (мм в макете 1400×1120); 9.5 для A1, для A3 нужно ~16,
# иначе на 420 мм подписи выходят 2,5 мм. SUFFIX_MAP — хвост имени файла, чтобы не затирать A1.
FS = float(os.environ.get("FS_MAP") or 9.5)   # мм подписи
KS = FS / 9.5                                   # во сколько раз крупнее A1-раскладки: точки, отступы, зона вокруг семейств
SUFFIX = os.environ.get("SUFFIX_MAP") or ""
# «коробка» узла — точка плюс подпись под ней; подпись ниже точки, поэтому центр коробки
# смещён вниз на LOFF, иначе подписи вылезают из коробок и ложатся на чужие точки
# базовая линия подписи: сразу под ободком точки — так видно, чья это подпись
LBL_BASE = 6.2*KS + 1.6 + 0.73*FS
BOX_TOP, BOX_BOT = 6.5*KS, LBL_BASE + 0.32*FS + 3
LOFF = (BOX_BOT - BOX_TOP) / 2
# ширину подписи меряем самим шрифтом: на глаз «столько-то на знак» врёт на длинных
# словах («мускус растительный»), и подпись вылезала из своей коробки на чужие точки
_MEAS = ImageFont.truetype(os.path.join(FONTS, "RobotoSlab-Regular.ttf"), 200)


def text_w(name, size=None):
    return _MEAS.getlength(name) * (size or FS) / 200.0


box = [(max(40*KS, text_w(n)+16*KS), BOX_TOP + BOX_BOT + 4) for n, _ in NODES]
# прямоугольник самой подписи (без точки) — для правила «подпись не лезет на чужую точку»
LBL_MID = LBL_BASE - 0.30*FS       # центр строки относительно точки
LBL_H = 1.05*FS                    # высота строки с запасом
LBL_UP = 7                         # пустая полоса над строкой: чужой точке там не место
DOT_R = 6.2*KS + 2                 # точка со светлым ободком плюс воздух
# подписи семейств (жирные, 17) — неподвижные препятствия: узлы их обходят
HUB_BOX = []
for i_, (hx, hy) in enumerate(HUBS):
    lx, ly, anc = label_anchor(hx, hy)
    bw = 17*0.68*len(FAM[i_]) + 16
    bx = lx + bw/2 if anc == "start" else lx - bw/2 if anc == "end" else lx
    HUB_BOX.append((bx, ly - 7, bw, 26))
# 2500 шагов с притяжением к «дому», потом 400 шагов чистого расталкивания, чтобы добить
# остаточные наложения подписей (притяжение всё время чуть стягивает соседей обратно)
for it in range(4500):
    pull = 0.015 if it < 2500 else 0.0
    # сила толчка: 0,6 при притяжении, в чистой фазе плавно 0,6 → 0,25 (сильные толчки раскачивают)
    kp = 0.6 if pull else 0.6 - 0.35*(it-2500)/2000.0
    for i in range(len(pos)):
        # круг семейства: обходим по-настоящему (r=30 + половина коробки узла), а не
        # фиксированной зоной, которая на крупных подписях выдавливала узлы в тесное кольцо
        # круг семейства (r=30) против прямоугольника узла (точка + подпись): ищем ближайшую
        # к центру круга точку прямоугольника — широкая подпись иначе въезжала в кольцо боком,
        # хотя её центр был далеко
        for hx, hy in HUBS:
            cx_, cy_ = pos[i][0], pos[i][1]+LOFF
            hw, hh = box[i][0]/2, box[i][1]/2
            qx = min(max(hx, cx_-hw), cx_+hw); qy = min(max(hy, cy_-hh), cy_+hh)
            dx, dy = qx-hx, qy-hy
            d = math.hypot(dx, dy)
            need = 30 + 8
            if d < need:
                if d < 1e-6:
                    dx, dy = cx_-hx, cy_-hy; d = math.hypot(dx, dy) or 1.0
                f = (need-d)/d*kp   # мягко, как и соседей: жёсткий толчок от кольца всё расшатывал
                pos[i][0] += dx*f; pos[i][1] += dy*f
        for (bx, by_, bw, bh) in HUB_BOX:
            dx, dy = pos[i][0]-bx, pos[i][1]+LOFF-by_
            nx, ny = (box[i][0]+bw)/2, (box[i][1]+bh)/2
            ox, oy = nx-abs(dx), ny-abs(dy)
            if ox > 0 and oy > 0:
                if ox/nx < oy/ny: pos[i][0] += (1 if dx >= 0 else -1)*ox*kp
                else: pos[i][1] += (1 if dy >= 0 else -1)*oy*kp
        for j in range(i+1, len(pos)):
            dx, dy = pos[j][0]-pos[i][0], pos[j][1]-pos[i][1]
            nx, ny = (box[i][0]+box[j][0])/2, (box[i][1]+box[j][1])/2
            ox, oy = nx-abs(dx), ny-abs(dy)
            if ox > 0 and oy > 0:
                if ox/nx < oy/ny:
                    s = (1 if dx >= 0 else -1)*ox/2*kp; pos[i][0] -= s; pos[j][0] += s
                else:
                    s = (1 if dy >= 0 else -1)*oy/2*kp; pos[i][1] -= s; pos[j][1] += s
            # строка i против точки j и наоборот: коробка прячет обе, но после толчков
            # от семейств подпись всё равно может наехать на соседнюю точку
            for a, b in ((i, j), (j, i)):
                dx2 = pos[b][0]-pos[a][0]
                dy2 = pos[b][1]-(pos[a][1]+LBL_MID-LBL_UP/2)
                nx2, ny2 = box[a][0]/2 + DOT_R, (LBL_H+LBL_UP)/2 + DOT_R
                ox2, oy2 = nx2-abs(dx2), ny2-abs(dy2)
                if ox2 > 0 and oy2 > 0:
                    if ox2/nx2 < oy2/ny2:
                        s = (1 if dx2 >= 0 else -1)*ox2/2*kp; pos[a][0] -= s; pos[b][0] += s
                    else:
                        s = (1 if dy2 >= 0 else -1)*oy2/2*kp; pos[a][1] -= s; pos[b][1] += s
        pos[i][0] += (home[i][0]-pos[i][0])*pull; pos[i][1] += (home[i][1]-pos[i][1])*pull
        pos[i][0] = min(max(pos[i][0], 100), W-100); pos[i][1] = min(max(pos[i][1], 40), H-245)


if os.environ.get("AROMA_DIAG"):
    bad_dot = bad_lbl = 0
    for i in range(len(pos)):
        li = (pos[i][0]-box[i][0]/2+8*KS, pos[i][1]+LBL_MID-LBL_H/2,
              pos[i][0]+box[i][0]/2-8*KS, pos[i][1]+LBL_MID+LBL_H/2)
        for j in range(len(pos)):
            if i == j: continue
            if li[0] < pos[j][0]+6.2*KS and li[2] > pos[j][0]-6.2*KS and \
               li[1] < pos[j][1]+6.2*KS and li[3] > pos[j][1]-6.2*KS:
                bad_dot += 1
            if j > i:
                lj = (pos[j][0]-box[j][0]/2+8*KS, pos[j][1]+LBL_MID-LBL_H/2,
                      pos[j][0]+box[j][0]/2-8*KS, pos[j][1]+LBL_MID+LBL_H/2)
                if li[0] < lj[2] and li[2] > lj[0] and li[1] < lj[3] and li[3] > lj[1]:
                    bad_lbl += 1
    print("DIAG подпись-на-точке:", bad_dot, " подпись-на-подписи:", bad_lbl)
    pie = 0
    for i in range(len(pos)):
        li = (pos[i][0]-box[i][0]/2+8*KS, pos[i][1]+LBL_MID-LBL_H/2,
              pos[i][0]+box[i][0]/2-8*KS, pos[i][1]+LBL_MID+LBL_H/2)
        for j in range(len(pos)):
            if i != j and li[0] < pos[j][0]+5.2*KS and li[2] > pos[j][0]-5.2*KS and                li[1] < pos[j][1]+5.2*KS and li[3] > pos[j][1]-5.2*KS:
                pie += 1
    print("DIAG подпись-на-цветной-точке:", pie)
    hub_hit = 0
    for i in range(len(pos)):
        li = (pos[i][0]-box[i][0]/2+8*KS, pos[i][1]+LBL_MID-LBL_H/2,
              pos[i][0]+box[i][0]/2-8*KS, pos[i][1]+LBL_MID+LBL_H/2)
        for hx, hy in HUBS:
            if li[0] < hx+31 and li[2] > hx-31 and li[1] < hy+31 and li[3] > hy-31:
                hub_hit += 1
    print("DIAG подпись-на-круге-семейства:", hub_hit)
    deep = []
    for i in range(len(pos)):
        li = (pos[i][0]-box[i][0]/2+8*KS, pos[i][1]+LBL_MID-LBL_H/2,
              pos[i][0]+box[i][0]/2-8*KS, pos[i][1]+LBL_MID+LBL_H/2)
        for j in range(len(pos)):
            if i == j: continue
            ox = min(li[2], pos[j][0]+6.2*KS) - max(li[0], pos[j][0]-6.2*KS)
            oy = min(li[3], pos[j][1]+6.2*KS) - max(li[1], pos[j][1]-6.2*KS)
            if ox > 0 and oy > 0:
                hub = min(math.hypot(pos[j][0]-hx, pos[j][1]-hy) for hx, hy in HUBS)
                deep.append((round(min(ox, oy), 1), NODES[i][0], NODES[j][0], round(hub)))
    deep.sort(reverse=True)
    for d in deep[:12]:
        print("   глубина %s: подпись «%s» на точке «%s» (до семейства %s)" % d)
    if os.environ.get("AROMA_DIAG") == "stop":
        sys.exit(0)


# После раскладки точки стоят; но нескольким подписям под своей точкой всё равно тесно
# (столбик узлов у семейства, чужая точка ровно под словом). Такие подписи переставляем
# вправо, влево или вверх от своей точки — первое место, где они не задевают ни чужую
# точку, ни чужую подпись, ни круг и подпись семейства. Точки при этом не трогаем: подпись
# вплотную к своей точке, и видно, чья она.
LBL_GAP = 3.0                                   # зазор между точкой и подписью сбоку
LBL_POS = ["below"] * len(NODES)


def lbl_rect(i, mode):
    """прямоугольник строки подписи узла i при данном положении"""
    x, y = pos[i]
    w = text_w(NODES[i][0])
    asc, desc = 0.75*FS, 0.25*FS
    if mode == "below":
        base = y + LBL_BASE
        return (x - w/2, base - asc, x + w/2, base + desc)
    if mode == "above":
        base = y - 6.2*KS - 2.5 - desc
        return (x - w/2, base - asc, x + w/2, base + desc)
    if mode in ("ne", "nw", "se", "sw"):
        # по диагонали от точки: строка начинается (или кончается) у края точки, базовая
        # линия — над верхом точки или под её низом; углы чаще всего свободны
        x0 = x + 4.2*KS + LBL_GAP if mode[1] == "e" else x - 4.2*KS - LBL_GAP
        base = y - 6.2*KS - 1.5 if mode[0] == "n" else y + 6.2*KS + 1.5 + asc
        if mode[1] == "e":
            return (x0, base - asc, x0 + w, base + desc)
        return (x0 - w, base - asc, x0, base + desc)
    base = y + 0.36*FS
    if mode == "right":
        x0 = x + 6.2*KS + LBL_GAP
        return (x0, base - asc, x0 + w, base + desc)
    x1 = x - 6.2*KS - LBL_GAP
    return (x1 - w, base - asc, x1, base + desc)


def lbl_anchor(i, mode):
    """точка и text-anchor для рисования подписи узла i"""
    x, y = pos[i]
    if mode == "below":
        return x, y + LBL_BASE, "middle"
    if mode == "above":
        return x, y - 6.2*KS - 2.5 - 0.25*FS, "middle"
    if mode in ("ne", "nw", "se", "sw"):
        x0 = x + 4.2*KS + LBL_GAP if mode[1] == "e" else x - 4.2*KS - LBL_GAP
        base = y - 6.2*KS - 1.5 if mode[0] == "n" else y + 6.2*KS + 1.5 + 0.75*FS
        return x0, base, "start" if mode[1] == "e" else "end"
    if mode == "right":
        return x + 6.2*KS + LBL_GAP, y + 0.36*FS, "start"
    return x - 6.2*KS - LBL_GAP, y + 0.36*FS, "end"


def _hit(a, b, m=0.0):
    return a[0] < b[2]+m and a[2] > b[0]-m and a[1] < b[3]+m and a[3] > b[1]-m


def lbl_conflict(i, rect):
    """сколько «плохого» у подписи в этом прямоугольнике: чужие точки, подписи, семейства"""
    bad = 0.0
    r_dot = 6.2*KS
    for j in range(len(pos)):
        if j == i: continue
        dj = (pos[j][0]-r_dot, pos[j][1]-r_dot, pos[j][0]+r_dot, pos[j][1]+r_dot)
        if _hit(rect, dj, 1.0): bad += 3
        if _hit(rect, lbl_rect(j, LBL_POS[j]), 1.5): bad += 2
    for hx, hy in HUBS:
        if _hit(rect, (hx-31, hy-31, hx+31, hy+31), 1.0): bad += 3
    for (bx, by_, bw, bh) in HUB_BOX:
        if _hit(rect, (bx-bw/2, by_-bh/2, bx+bw/2, by_+bh/2), 1.0): bad += 2
    if rect[0] < 20 or rect[2] > W-20 or rect[1] < 10 or rect[3] > H-232: bad += 5
    return bad


for _round in range(3):
    moved = 0
    for i in range(len(NODES)):
        cur = lbl_conflict(i, lbl_rect(i, LBL_POS[i]))
        if cur <= 0: continue
        best, best_mode = cur, LBL_POS[i]
        for mode in ("below", "right", "left", "above", "se", "sw", "ne", "nw"):
            c = lbl_conflict(i, lbl_rect(i, mode))
            if c < best - 1e-9: best, best_mode = c, mode
        if best_mode != LBL_POS[i]:
            LBL_POS[i] = best_mode; moved += 1
    if not moved: break


def dot_conflict(i):
    """чужие точки, подписи и круги семейств под самой точкой узла i"""
    x, y = pos[i]; r = 6.2*KS
    me = (x-r, y-r, x+r, y+r)
    bad = 0.0
    for j in range(len(pos)):
        if j == i: continue
        if math.hypot(pos[j][0]-x, pos[j][1]-y) < 2*r + 2: bad += 3
        if _hit(me, lbl_rect(j, LBL_POS[j]), 1.0): bad += 3
    for hx, hy in HUBS:
        if math.hypot(hx-x, hy-y) < 30 + r + 2: bad += 3
    for (bx, by_, bw, bh) in HUB_BOX:
        if _hit(me, (bx-bw/2, by_-bh/2, bx+bw/2, by_+bh/2), 1.0): bad += 2
    return bad


# Кому и после перестановки подписи тесно — чуть сдвигаем саму точку (до 16 мм макета
# по восьми направлениям) и заново выбираем сторону подписи; берём вариант, где меньше
# всего конфликтов и у подписи, и у точки.
MODES = ("below", "right", "left", "above", "se", "sw", "ne", "nw")
for _round in range(3):
    moved = 0
    for i in range(len(NODES)):
        cur = lbl_conflict(i, lbl_rect(i, LBL_POS[i])) + dot_conflict(i)
        if cur <= 0: continue
        x0, y0 = pos[i]
        best = (cur, x0, y0, LBL_POS[i])
        for rad in (6, 11, 16):
            for a in range(8):
                ang = a*math.pi/4
                pos[i] = [x0 + rad*math.cos(ang), y0 + rad*math.sin(ang)]
                dc = dot_conflict(i)
                for mode in MODES:
                    c = lbl_conflict(i, lbl_rect(i, mode)) + dc
                    if c < best[0] - 1e-9: best = (c, pos[i][0], pos[i][1], mode)
        pos[i] = [best[1], best[2]]
        if best[3] != LBL_POS[i] or (best[1], best[2]) != (x0, y0):
            LBL_POS[i] = best[3]; moved += 1
    if not moved: break

if os.environ.get("AROMA_DIAG"):
    left = [(NODES[i][0], LBL_POS[i], lbl_conflict(i, lbl_rect(i, LBL_POS[i]))) for i in range(len(NODES)) if lbl_conflict(i, lbl_rect(i, LBL_POS[i])) > 0]
    print("DIAG подписей не под точкой:", sum(1 for m in LBL_POS if m != "below"), " с остаточным конфликтом:", len(left), left)



def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))


def curve(x, y, hx, hy):
    """мягкая дуга от точки к семейству: контрольная точка сдвинута к центру карты, чтобы
    линии одного семейства ложились пучком, а не спицами"""
    mx, my = (x+hx)/2, (y+hy)/2
    cx_, cy_ = mx + (CX-mx)*0.22, my + (CY-my)*0.22
    return cx_, cy_


def curve_pts(x, y, hx, hy, n=24):
    cx_, cy_ = curve(x, y, hx, hy)
    return [((1-t)**2*x + 2*(1-t)*t*cx_ + t*t*hx, (1-t)**2*y + 2*(1-t)*t*cy_ + t*t*hy) for t in [i/n for i in range(n+1)]]


def secondary(w):
    """семейства, к которым тянется линия: всё кроме главного, весом от 0.2 — главное и так видно по месту"""
    tot = sum(w.values()) or 1
    top = max(w, key=w.get)
    return [(i, wt/tot) for i, wt in w.items() if i != top and wt/tot >= 0.2]


def pie_svg(x, y, r, w):
    tot = sum(w.values()) or 1; out = []; a0 = -math.pi/2
    for i, wt in sorted(w.items(), key=lambda kv: -kv[1]):
        a1 = a0 + 2*math.pi*wt/tot
        if wt/tot >= 0.999:
            return ['<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, r, FCOL[i])]
        out.append('<path d="M%.1f,%.1f L%.1f,%.1f A%.1f,%.1f 0 %d 1 %.1f,%.1f Z" fill="%s"/>' % (
            x, y, x+r*math.cos(a0), y+r*math.sin(a0), r, r, 1 if a1-a0 > math.pi else 0, x+r*math.cos(a1), y+r*math.sin(a1), FCOL[i]))
        a0 = a1
    return out



svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="%dmm" height="%dmm" viewBox="0 0 %d %d">' % (W, H, W, H),
       '<rect width="%d" height="%d" fill="%s"/>' % (W, H, DUST)]
for (name, w), (x, y) in zip(NODES, pos):
    for i, wt in secondary(w):
        cx_, cy_ = curve(x, y, HUBS[i][0], HUBS[i][1])
        svg.append('<path d="M%.1f,%.1f Q%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="%.2f" stroke-opacity="%.2f" stroke-linecap="round"/>'
                   % (x, y, cx_, cy_, HUBS[i][0], HUBS[i][1], FCOL[i], (0.6+2.4*wt)*KS**0.5, 0.35+0.45*wt))
for i, (hx, hy) in enumerate(HUBS):
    svg.append('<circle cx="%.1f" cy="%.1f" r="30" fill="%s" stroke="%s" stroke-width="2.2"/>' % (hx, hy, DUST, INK))
    svg.append('<circle cx="%.1f" cy="%.1f" r="12" fill="%s"/>' % (hx, hy, FCOL[i]))
    lx, ly, anc = label_anchor(hx, hy)
    svg.append('<text x="%.1f" y="%.1f" font-family="Roboto Slab" font-weight="700" font-size="17" letter-spacing="2" text-anchor="%s" fill="%s">%s</text>'
               % (lx, ly, anc, INK, FAM[i]))
# сперва все точки, потом все подписи: иначе соседняя точка, нарисованная позже,
# ложится поверх уже написанного слова
for (name, w), (x, y) in zip(NODES, pos):
    svg.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, 6.2*KS, DUST))
    svg.extend(pie_svg(x, y, 5.2*KS, w))
for i_, ((name, w), (x, y)) in enumerate(zip(NODES, pos)):
    # обводка цветом фона под буквами (paint-order: сначала штрих, потом заливка) —
    # дуга, проходящая под словом, не режет его; положение — из LBL_POS
    ax, ay, anc = lbl_anchor(i_, LBL_POS[i_])
    svg.append('<text x="%.1f" y="%.1f" font-family="Roboto Slab" font-size="%.1f" text-anchor="%s" '
               'paint-order="stroke" stroke="%s" stroke-width="%.1f" stroke-linejoin="round" fill="%s">%s</text>'
               % (ax, ay, FS, anc, DUST, 0.30*KS + 2.1, INK, name))
# Знак «Голова» (одноцветная версия, утверждён 18.09.2026) и подпись автора — внизу слева.
MARK_SVG = os.path.join(os.path.dirname(OUT), "content", "brand", "mark-v3", "head-loops-mono.svg")
import re as _re
_mark = open(MARK_SVG, encoding="utf-8").read()
MARK_INNER = "".join(_re.findall(r"<(?:circle|path)[^>]*/>", _mark))   # круг и росчерк, viewBox 64
MARK = 34                                       # размер знака в макете
SIGN = ("LEVKEYSER", "© Лев Кейсер, 2026 · levkeiser.com" if LANG == "ru" else "© Lev Keiser, 2026 · levkeiser.com")
BY = H - 215                                   # верх подвала (было -200; 15 мм отданы под знак и подпись)
svg.append('<line x1="50" y1="%.0f" x2="%.0f" y2="%.0f" stroke="%s" stroke-width="1.2" stroke-opacity="0.35"/>' % (BY, W-50, BY, INK))
svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-weight="700" font-size="30" letter-spacing="4" fill="%s">%s</text>' % (BY+42, INK, T["title"]))
for n_, ln in enumerate(T["howto"]):
    svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s">%s</text>' % (BY+70+n_*19, INK, ln))
svg.append('<text x="%.0f" y="%.0f" font-family="Roboto Slab" font-weight="700" font-size="13" letter-spacing="3" fill="%s">%s</text>' % (W-620, BY+34, INK, T["legend"]))
for i, nm in enumerate(FAM):
    lx = W-620 + (i % 3)*205; ly = BY+70 + (i//3)*26
    svg.append('<circle cx="%.1f" cy="%.1f" r="7" fill="%s"/>' % (lx+7, ly-4, FCOL[i]))
    svg.append('<text x="%.1f" y="%.1f" font-family="Roboto Slab" font-size="12.5" fill="%s">%s</text>' % (lx+22, ly, INK, nm))
svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s"><tspan font-weight="700" fill="%s">%s</tspan>%s</text>'
           % (BY+134, INK, MANE, T["online"][0], T["online"][1]))
for n_, ln in enumerate(T["online"][2:]):
    svg.append('<text x="50" y="%.0f" font-family="Roboto Slab" font-size="12.5" fill="%s">%s</text>' % (BY+134+17*(n_+1), INK, ln))
svg.append('<g transform="translate(50,%.0f) scale(%.4f)">%s</g>' % (BY+166, MARK/64.0, MARK_INNER))
svg.append('<text x="%.0f" y="%.0f" font-family="Roboto Slab" font-weight="700" font-size="12" letter-spacing="3" fill="%s">%s</text>' % (50+MARK+10, BY+181, INK, SIGN[0]))
svg.append('<text x="%.0f" y="%.0f" font-family="Roboto Slab" font-size="10.5" fill="%s">%s</text>' % (50+MARK+10, BY+196, INK, SIGN[1]))
svg.append('<text x="%.0f" y="%.0f" font-family="Roboto Slab" font-size="11" text-anchor="end" fill="%s">%s</text>' % (W-50, BY+174, INK, T["credit"]))
svg.append("</svg>")
open(os.path.join(OUT, T["file"] + SUFFIX + ".svg"), "w", encoding="utf-8").write("\n".join(svg))

k = int(os.environ.get("AROMA_K") or 3)   # пикселей на миллиметр
im = Image.new("RGB", (int(W*k), int(H*k)), DUST)
dr = ImageDraw.Draw(im, "RGBA")
fb = lambda s: ImageFont.truetype(os.path.join(FONTS, "RobotoSlab-Bold.ttf"), int(s*k))
fr = lambda s: ImageFont.truetype(os.path.join(FONTS, "RobotoSlab-Regular.ttf"), int(s*k))
ink = hexrgb(INK)
for (name, w), (x, y) in zip(NODES, pos):
    for i, wt in secondary(w):
        pts = [(px*k, py*k) for px, py in curve_pts(x, y, HUBS[i][0], HUBS[i][1])]
        dr.line(pts, fill=hexrgb(FCOL[i])+(int(255*(0.35+0.45*wt)),), width=max(1, int((0.6+2.4*wt)*KS**0.5*k)), joint="curve")
for i, (hx, hy) in enumerate(HUBS):
    dr.ellipse([(hx-30)*k, (hy-30)*k, (hx+30)*k, (hy+30)*k], fill=hexrgb(DUST), outline=ink, width=int(2.2*k))
    dr.ellipse([(hx-12)*k, (hy-12)*k, (hx+12)*k, (hy+12)*k], fill=hexrgb(FCOL[i]))
    lx, ly, anc = label_anchor(hx, hy); f = fb(17); tw = dr.textlength(FAM[i], font=f)
    tx = lx*k if anc == "start" else lx*k-tw if anc == "end" else lx*k-tw/2
    dr.text((tx, (ly-13)*k), FAM[i], font=f, fill=ink)
for (name, w), (x, y) in zip(NODES, pos):
    dr.ellipse([(x-6.2*KS)*k, (y-6.2*KS)*k, (x+6.2*KS)*k, (y+6.2*KS)*k], fill=hexrgb(DUST))
    tot = sum(w.values()) or 1; a0 = -90.0
    for i, wt in sorted(w.items(), key=lambda kv: -kv[1]):
        a1 = a0 + 360.0*wt/tot
        dr.pieslice([(x-5.2*KS)*k, (y-5.2*KS)*k, (x+5.2*KS)*k, (y+5.2*KS)*k], a0, a1, fill=hexrgb(FCOL[i])); a0 = a1
# подписи — отдельным проходом поверх всех точек, с обводкой цветом фона; anchor="ms" —
# середина строки по базовой линии, ровно как в SVG
for i_, ((name, w), (x, y)) in enumerate(zip(NODES, pos)):
    ax, ay, anc = lbl_anchor(i_, LBL_POS[i_])
    dr.text((ax*k, ay*k), name, font=fr(FS), fill=ink, anchor={"middle": "ms", "start": "ls", "end": "rs"}[anc],
            stroke_width=max(1, int((0.30*KS + 2.1)/2*k)), stroke_fill=hexrgb(DUST))
BY = H - 215
dr.line([(50*k, BY*k), ((W-50)*k, BY*k)], fill=ink+(90,), width=max(1, int(1.2*k)))
dr.text((50*k, (BY+42-26)*k), T["title"], font=fb(30), fill=ink)
for n_, ln in enumerate(T["howto"]):
    dr.text((50*k, (BY+70+n_*19-10)*k), ln, font=fr(12.5), fill=ink)
dr.text(((W-620)*k, (BY+34-11)*k), T["legend"], font=fb(13), fill=ink)
for i, nm in enumerate(FAM):
    lx = W-620 + (i % 3)*205; ly = BY+70 + (i//3)*26
    dr.ellipse([lx*k, (ly-11)*k, (lx+14)*k, (ly+3)*k], fill=hexrgb(FCOL[i]))
    dr.text(((lx+22)*k, (ly-10)*k), nm, font=fr(12.5), fill=ink)
f = fb(12.5); tw = dr.textlength(T["online"][0], font=f)
dr.text((50*k, (BY+134-10)*k), T["online"][0], font=f, fill=hexrgb(MANE))
dr.text((50*k+tw, (BY+134-10)*k), T["online"][1], font=fr(12.5), fill=ink)
for n_, ln in enumerate(T["online"][2:]):
    dr.text((50*k, (BY+134+17*(n_+1)-10)*k), ln, font=fr(12.5), fill=ink)
# знак: SVG → пиксели через MuPDF (PIL векторы не рисует), с прозрачностью
import pymupdf as _mu
_doc = _mu.open(MARK_SVG); _pg = _doc[0]
_pix = _pg.get_pixmap(matrix=_mu.Matrix(MARK*k/_pg.rect.width, MARK*k/_pg.rect.height), alpha=True)
_im = Image.frombytes("RGBA", (_pix.width, _pix.height), _pix.samples)
im.paste(_im, (int(50*k), int((BY+166)*k)), _im)
dr.text(((50+MARK+10)*k, (BY+181-10)*k), SIGN[0], font=fb(12), fill=ink)
dr.text(((50+MARK+10)*k, (BY+196-9)*k), SIGN[1], font=fr(10.5), fill=ink)
f = fr(11); tw = dr.textlength(T["credit"], font=f)
dr.text(((W-50)*k-tw, (BY+174-9)*k), T["credit"], font=f, fill=ink)
im.save(os.path.join(OUT, T["file"] + SUFFIX + ".png"))
im.resize((2100, 1500)).save(os.path.join(sys.argv[1] if len(sys.argv) > 1 else OUT, T["file"] + SUFFIX + "_preview.jpg"), quality=92)
print("nodes", len(NODES))
