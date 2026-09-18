# -*- coding: utf-8 -*-
"""Карта натуральных ароматов для флага магазина (135×90 см) — палитра «Дикий лев», Roboto Slab.

Шесть семейств стоят лучами; каждый аромат ложится «на пересечение лучей» по своим весам
(барицентр семейств), потом точки слегка расталкиваются, чтобы подписи не слипались.
Пишет SVG (мм, вектор для типографии) и PNG-превью тем же кодом координат."""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(OUT, "fonts")
W, H = 1350.0, 900.0                     # мм
CX, CY, R = 675.0, 440.0, 315.0          # центр и радиус звезды
# «Дикий лев»
DUST, INK, MANE, SUNSET, RUST, ACACIA, DUSK = "#DCCBA0", "#211A12", "#B4601C", "#D99A2B", "#7A2E1B", "#6FA83C", "#6B4E7D"

FAM = ["СМОЛЫ", "ДЫМ · ЗЕМЛЯ", "ПРЯНОСТИ", "ЦВЕТЫ", "ЦИТРУС · ЗЕЛЕНЬ", "ДЕРЕВО"]
FCOL = [SUNSET, RUST, RUST, DUSK, ACACIA, MANE]
S, Z, P, C, G, D = range(6)
# (название, {семейство: вес}) — веса в сумме ≈ 1
NODES = [
    ("уд", {D: .55, Z: .25, S: .20}), ("сандал", {D: .70, S: .15, C: .15}), ("гималайский кедр", {D: .80, G: .20}),
    ("ветивер", {Z: .55, D: .45}), ("пачули", {Z: .60, D: .25, S: .15}), ("пало санто", {D: .60, S: .25, G: .15}),
    ("ладан", {S: .60, G: .25, Z: .15}), ("мирра", {S: .60, Z: .25, P: .15}), ("бензоин", {S: .80, D: .20}),
    ("лабданум", {S: .55, Z: .30, D: .15}), 
    ("ваниль", {S: .70, P: .30}), ("бобы тонка", {S: .60, P: .40}),
    ("амбра", {Z: .50, S: .40, D: .10}), ("морёный дуб", {Z: .60, D: .40}), ("дубовый мох", {Z: .70, G: .30}),
    ("берёзовый дёготь", {Z: .90, D: .10}), ("табак", {Z: .45, S: .35, P: .20}), 
    ("какао", {S: .50, P: .30, Z: .20}), ("чёрный перец", {P: .80, D: .20}), ("корица", {P: .75, S: .25}),
    ("гвоздика", {P: .70, C: .30}), ("кардамон", {P: .60, G: .40}), ("имбирь", {P: .60, G: .40}),
    ("роза", {C: .80, P: .20}),
    ("жасмин", {C: .85, Z: .15}), ("нероли", {C: .60, G: .40}), ("иланг-иланг", {C: .70, P: .30}),
    ("лаванда", {C: .40, G: .60}), ("мандарин", {G: .80, C: .20}),
    ("бергамот", {G: .70, C: .30}), ("лемонграсс", {G: .85, P: .15}), ("мята", {G: .90, P: .10}),
    ("эвкалипт", {G: .80, D: .20}), ("пихта", {G: .50, D: .50}), ("можжевельник", {G: .50, D: .40, P: .10}),
    ("шалфей", {G: .60, Z: .20, P: .20}), ("полынь", {G: .55, Z: .30, P: .15}), 
    ("мёд", {S: .50, C: .50}), 
]
LINE_MIN = 0.30                          # линия к лучу рисуется, если семейство весит хотя бы столько


def hub(i):
    a = i*2*math.pi/6           # 0 = вправо
    return CX + R*math.cos(a), CY + R*math.sin(a)


HUBS = [hub(i) for i in range(6)]
pos = []
for name, w in NODES:
    x = CX + sum(wt*(HUBS[i][0]-CX) for i, wt in w.items())*0.92
    y = CY + sum(wt*(HUBS[i][1]-CY) for i, wt in w.items())*0.92
    pos.append([x, y])
# расталкивание: подпись ≈ 7 мм на символ в ширину, 26 мм в высоту
home = [list(p_) for p_ in pos]
box = [(max(70, 9.0*len(n)+22), 40) for n, _ in NODES]
for _ in range(600):
    for i in range(len(pos)):
        for j in range(i+1, len(pos)):
            dx, dy = pos[j][0]-pos[i][0], pos[j][1]-pos[i][1]
            need_x, need_y = (box[i][0]+box[j][0])/2, (box[i][1]+box[j][1])/2
            ox, oy = need_x-abs(dx), need_y-abs(dy)
            if ox > 0 and oy > 0:
                if ox/need_x < oy/need_y:
                    s = (1 if dx >= 0 else -1)*ox/2*0.6; pos[i][0] -= s; pos[j][0] += s
                else:
                    s = (1 if dy >= 0 else -1)*oy/2*0.6; pos[i][1] -= s; pos[j][1] += s
        pos[i][0] += (home[i][0]-pos[i][0])*0.02; pos[i][1] += (home[i][1]-pos[i][1])*0.02
        pos[i][0] = min(max(pos[i][0], 150), W-150); pos[i][1] = min(max(pos[i][1], 60), H-150)
        for k, (hx, hy) in enumerate(HUBS):        # не залезать на кольцо семейства
            dx, dy = pos[i][0]-hx, pos[i][1]-hy
            d = math.hypot(dx, dy)
            if d < 78:
                f = (78-d)/max(d, 1e-6); pos[i][0] += dx*f; pos[i][1] += dy*f

# ------------------------------------------------------------------ SVG
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="%dmm" height="%dmm" viewBox="0 0 %d %d">' % (W, H, W, H),
       '<rect width="%d" height="%d" fill="%s"/>' % (W, H, DUST)]
for (name, w), (x, y) in zip(NODES, pos):
    for i, wt in w.items():
        if wt >= LINE_MIN:
            svg.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" stroke-opacity="%.2f"/>'
                       % (x, y, HUBS[i][0], HUBS[i][1], INK, 1.2+2.2*wt, 0.22+0.4*wt))
for i, (hx, hy) in enumerate(HUBS):
    svg.append('<circle cx="%.1f" cy="%.1f" r="46" fill="%s"/>' % (hx, hy, DUST))
    svg.append('<circle cx="%.1f" cy="%.1f" r="46" fill="none" stroke="%s" stroke-width="3"/>' % (hx, hy, INK))
    svg.append('<circle cx="%.1f" cy="%.1f" r="17" fill="%s"/>' % (hx, hy, FCOL[i]))
    lx = hx + (66 if hx > CX+1 else -66)
    ly = hy + 9
    anc = "start" if hx > CX+1 else "end"
    svg.append('<text x="%.1f" y="%.1f" font-family="Roboto Slab" font-weight="700" font-size="26" letter-spacing="3" text-anchor="%s" fill="%s">%s</text>'
               % (lx, ly, anc, INK, FAM[i]))
for (name, w), (x, y) in zip(NODES, pos):
    top = max(w, key=w.get)
    svg.append('<circle cx="%.1f" cy="%.1f" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (x, y, FCOL[top], DUST))
    svg.append('<text x="%.1f" y="%.1f" font-family="Roboto Slab" font-size="17" text-anchor="middle" fill="%s">%s</text>'
               % (x, y+26, INK, name))
svg.append('<text x="60" y="%d" font-family="Roboto Slab" font-weight="700" font-size="34" letter-spacing="4" fill="%s">КАРТА НАТУРАЛЬНЫХ АРОМАТОВ</text>' % (H-70, INK))
svg.append('<text x="60" y="%d" font-family="Roboto Slab" font-size="15" fill="%s">чем ближе аромат к лучу, тем сильнее в нём это семейство · линии — из чего он состоит</text>' % (H-42, INK))
svg.append('<text x="%d" y="%d" font-family="Roboto Slab" font-weight="700" font-size="30" letter-spacing="5" text-anchor="end" fill="%s">LEVKEYSER</text>' % (W-60, H-48, MANE))
svg.append("</svg>")
open(os.path.join(OUT, "aroma_map_flag.svg"), "w", encoding="utf-8").write("\n".join(svg))

# ------------------------------------------------------------------ PNG-превью тем же кодом (3 px/мм)
k = 3
im = Image.new("RGB", (int(W*k), int(H*k)), DUST)
dr = ImageDraw.Draw(im, "RGBA")
fb = lambda s: ImageFont.truetype(os.path.join(FONTS, "RobotoSlab-Bold.ttf"), int(s*k))
fr = lambda s: ImageFont.truetype(os.path.join(FONTS, "RobotoSlab-Regular.ttf"), int(s*k))
ink = (0x21, 0x1A, 0x12)
for (name, w), (x, y) in zip(NODES, pos):
    for i, wt in w.items():
        if wt >= LINE_MIN:
            dr.line([(x*k, y*k), (HUBS[i][0]*k, HUBS[i][1]*k)], fill=ink+(int(255*(0.22+0.4*wt)),), width=int((1.2+2.2*wt)*k))
def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
for i, (hx, hy) in enumerate(HUBS):
    dr.ellipse([(hx-46)*k, (hy-46)*k, (hx+46)*k, (hy+46)*k], fill=hexrgb(DUST), outline=ink, width=3*k)
    dr.ellipse([(hx-17)*k, (hy-17)*k, (hx+17)*k, (hy+17)*k], fill=hexrgb(FCOL[i]))
    f = fb(26); tw = dr.textlength(FAM[i], font=f)
    if hx > CX: tx, ty = (hx+66)*k, (hy-10)*k
    else: tx, ty = (hx-66)*k - tw, (hy-10)*k
    dr.text((tx, ty), FAM[i], font=f, fill=ink)
for (name, w), (x, y) in zip(NODES, pos):
    top = max(w, key=w.get)
    dr.ellipse([(x-7)*k, (y-7)*k, (x+7)*k, (y+7)*k], fill=hexrgb(FCOL[top]), outline=hexrgb(DUST), width=2*k)
    f = fr(17); tw = dr.textlength(name, font=f)
    dr.text((x*k-tw/2, (y+12)*k), name, font=f, fill=ink)
dr.text((60*k, (H-70-30)*k), "КАРТА НАТУРАЛЬНЫХ АРОМАТОВ", font=fb(34), fill=ink)
dr.text((60*k, (H-42-13)*k), "чем ближе аромат к лучу, тем сильнее в нём это семейство · линии — из чего он состоит", font=fr(15), fill=ink)
f = fb(30); tw = dr.textlength("LEVKEYSER", font=f)
dr.text(((W-60)*k-tw, (H-48-26)*k), "LEVKEYSER", font=f, fill=hexrgb(MANE))
im.save(os.path.join(OUT, "aroma_map_flag.png"))
im.resize((1800, 1200)).save(os.path.join(sys.argv[1] if len(sys.argv) > 1 else OUT, "aroma_map_preview.jpg"), quality=92)
print("nodes", len(NODES), "| svg + png written")
