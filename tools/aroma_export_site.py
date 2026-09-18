# -*- coding: utf-8 -*-
"""Данные карты для сайта: public/data/aroma-map.json.

У каждого аромата есть устойчивый код (латиницей, из английского названия) —
по нему состав кодируется в ссылке. Порядок в файле меняться может, коды — нет,
иначе разосланные ссылки на составы разъехались бы после обновления карты."""
import io
import json
import math
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
from aroma_i18n import FAM_RU, FAM_EN, EN  # noqa: E402

OUT = os.path.join(os.path.dirname(TOOLS), "public", "data", "aroma-map.json")
COL = ["#EFC94C", "#6FA83C", "#5B8FB0", "#8A5A9E", "#B5405A", "#E08A3A",
       "#8C2F1E", "#8A5A2B", "#B8862B", "#211A12", "#5C3A2E", "#3F8C8A"]
W, H, CX, CY, R, PULL = 1400.0, 1000.0, 700.0, 470.0, 380.0, 1.7

src = io.open(os.path.join(TOOLS, "aroma_map_max.py"), encoding="utf-8").read()
ns = {}
exec("CIT, GRN, CAM, FLR, FRT, GRM, SPC, WD, RES, ERT, ANM, SEA = range(12)\n"
     + "N = {" + src.split("N = {", 1)[1].split("\nNODES", 1)[0], ns)
N = ns["N"]


def code(en):
    c = re.sub(r"[^a-z0-9]+", "-", en.lower()).strip("-")
    return c or "x"


codes, seen = {}, {}
for name in N:
    c = code(EN[name])
    if c in seen:                       # на всякий случай: дублей быть не должно
        seen[c] += 1
        c = "%s%d" % (c, seen[c])
    else:
        seen[c] = 1
    codes[name] = c

HUBS = [(CX + R*math.cos(-math.pi/2 + i*2*math.pi/12), CY + R*math.sin(-math.pi/2 + i*2*math.pi/12))
        for i in range(12)]
names = list(N)
pos = []
for n in names:
    sh = {i: v**PULL for i, v in N[n].items()}
    tot = sum(sh.values())
    pos.append([CX + sum(v/tot*(HUBS[i][0]-CX) for i, v in sh.items())*0.94,
                CY + sum(v/tot*(HUBS[i][1]-CY) for i, v in sh.items())*0.94])
home = [list(p) for p in pos]
FS = 9.5
box = [(max(40, FS*0.62*len(n)+12), 25) for n in names]
for _ in range(1500):
    for i in range(len(pos)):
        for j in range(i+1, len(pos)):
            dx, dy = pos[j][0]-pos[i][0], pos[j][1]-pos[i][1]
            nx, ny = (box[i][0]+box[j][0])/2, (box[i][1]+box[j][1])/2
            ox, oy = nx-abs(dx), ny-abs(dy)
            if ox > 0 and oy > 0:
                if ox/nx < oy/ny:
                    s = (1 if dx >= 0 else -1)*ox/2*0.6
                    pos[i][0] -= s
                    pos[j][0] += s
                else:
                    s = (1 if dy >= 0 else -1)*oy/2*0.6
                    pos[i][1] -= s
                    pos[j][1] += s
        pos[i][0] += (home[i][0]-pos[i][0])*0.015
        pos[i][1] += (home[i][1]-pos[i][1])*0.015
        pos[i][0] = min(max(pos[i][0], 120), W-120)
        pos[i][1] = min(max(pos[i][1], 40), H-60)
        for hx, hy in HUBS:
            dx, dy = pos[i][0]-hx, pos[i][1]-hy
            d = math.hypot(dx, dy)
            if d < 64:
                f = (64-d)/max(d, 1e-6)
                pos[i][0] += dx*f
                pos[i][1] += dy*f

data = {"w": W, "h": H, "cx": CX, "cy": CY,
        "hubs": [[round(x, 1), round(y, 1)] for x, y in HUBS],
        "families": [{"ru": r, "en": e, "c": c} for r, e, c in zip(FAM_RU, FAM_EN, COL)],
        "nodes": [{"id": codes[n], "ru": n, "en": EN[n],
                   "w": {str(k): v for k, v in N[n].items()},
                   "x": round(p[0], 1), "y": round(p[1], 1)} for n, p in zip(names, pos)]}
io.open(OUT, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
print("узлов", len(data["nodes"]), "| дублей кодов:", sum(1 for v in seen.values() if v > 1),
      "| кб", round(os.path.getsize(OUT)/1024, 1))
print("примеры кодов:", ", ".join("%s=%s" % (n, codes[n]) for n in list(names)[:3]))
