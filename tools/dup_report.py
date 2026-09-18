# -*- coding: utf-8 -*-
"""Map every timeline segment onto the camera-B recording and report duplicated dialogue around verticals."""
import json, io, os, sys
ROOT = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
TR = r"C:\Users\User\Desktop\site\tools\grusha_transcript"
src = json.load(io.open(os.path.join(ROOT, "Груша_v5_правки", "draft_content.json"), encoding="utf-8"))
gsync = json.load(open(os.path.join(AUD, "sync_offsets.json")))
vsync = json.load(open(os.path.join(AUD, "sync_vert.json")))
tr = {}
for f in os.listdir(TR):
    tr[f[2:-5]] = json.load(io.open(os.path.join(TR, f), encoding="utf-8"))
mats = {m["id"]: m for m in src["materials"]["videos"]}
vt = [t for t in src["tracks"] if t["type"] == "video"][0]


def binfo(s):
    b = os.path.basename(mats[s["material_id"]]["path"]).rsplit(".", 1)[0]
    ss = s["source_timerange"]["start"]/1e6
    du = s["target_timerange"]["duration"]/1e6
    if b in gsync:
        return gsync[b]["B"], ss+gsync[b]["offset"], ss+gsync[b]["offset"]+du, "GOPRO", b
    if b in vsync and vsync[b].get("B"):
        return vsync[b]["B"], ss+vsync[b]["offset"], ss+vsync[b]["offset"]+du, "VERT", b
    return None, None, None, ("VERT" if mats[s["material_id"]]["height"] > mats[s["material_id"]]["width"] else "OTHER"), b


def words(B, a, b_):
    if B not in tr: return ""
    return " ".join(x["text"] for x in tr[B] if x["end"] > a and x["start"] < b_)[:150]


segs = vt["segments"]
out = []
for i, s in enumerate(segs):
    B, b0, b1, kind, name = binfo(s)
    if kind != "VERT" or B is None: continue
    out.append("\n=== [%d] %s  tl %.2f +%.2f   B=%s %.2f–%.2f" % (i, name, s["target_timerange"]["start"]/1e6, s["target_timerange"]["duration"]/1e6, B, b0, b1))
    out.append("    ВЕРТ говорит: " + words(B, b0, b1))
    for j in (i-1, i+1):
        if not (0 <= j < len(segs)): continue
        B2, c0, c1, k2, n2 = binfo(segs[j])
        if B2 != B or c0 is None:
            out.append("    [%d] %s %s  — другой источник, дубля нет" % (j, n2, k2)); continue
        ov0, ov1 = max(b0, c0), min(b1, c1)
        if ov1 > ov0 + 0.3:
            out.append("    [%d] %s %s  B %.2f–%.2f  ⚠ ДУБЛЬ %.2f с: %s" % (j, n2, k2, c0, c1, ov1-ov0, words(B, ov0, ov1)))
        else:
            out.append("    [%d] %s %s  B %.2f–%.2f  ok" % (j, n2, k2, c0, c1))
io.open(sys.argv[1], "w", encoding="utf-8").write("\n".join(out))
print("written", len(out), "lines")
