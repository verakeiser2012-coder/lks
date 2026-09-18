# -*- coding: utf-8 -*-
import json, io, os, sys
info = json.load(io.open(r"C:\Users\User\Desktop\site\tools\v6_build_info.json", encoding="utf-8"))
d = json.load(io.open(info["json"], encoding="utf-8"))
m = d["materials"]
allmat = {}
for cat, arr in m.items():
    if isinstance(arr, list):
        for x in arr:
            if isinstance(x, dict) and "id" in x:
                allmat[x["id"]] = (cat, x)
errs = []
for ti, t in enumerate(d["tracks"]):
    segs = sorted(t["segments"], key=lambda s: s["target_timerange"]["start"])
    prev_end = -1
    for s in segs:
        st, du = s["target_timerange"]["start"], s["target_timerange"]["duration"]
        if du <= 0: errs.append(f"track{ti} {t['type']} '{t.get('name')}': non-positive duration at {st/1e6:.2f}")
        if st < prev_end: errs.append(f"track{ti} {t['type']} '{t.get('name')}': OVERLAP at {st/1e6:.2f} (prev end {prev_end/1e6:.2f})")
        prev_end = st + du
        if s["material_id"] not in allmat: errs.append(f"track{ti}: missing material {s['material_id']}")
        else:
            cat, mat = allmat[s["material_id"]]
            if cat in ("videos", "audios") and s.get("source_timerange"):
                ss = s["source_timerange"]["start"]; sd = s["source_timerange"]["duration"]
                if ss < 0 or ss + sd > mat["duration"] + 1000:
                    errs.append(f"track{ti} {cat} {os.path.basename(mat.get('path',''))}: source {ss/1e6:.2f}+{sd/1e6:.2f} beyond {mat['duration']/1e6:.2f}")
                if cat == "videos" and mat["type"] != "photo" and not os.path.exists(mat["path"]):
                    errs.append(f"missing file {mat['path']}")
                if cat == "audios" and not os.path.exists(mat["path"]):
                    errs.append(f"missing file {mat['path']}")
        for r in s["extra_material_refs"]:
            if r not in allmat: errs.append(f"track{ti}: dangling extra ref {r}")
    if t["type"] == "video" and ti == 0:
        tt = 0
        for s in t["segments"]:
            if s["target_timerange"]["start"] != tt: errs.append(f"main track gap at {tt/1e6:.2f}")
            tt = s["target_timerange"]["start"] + s["target_timerange"]["duration"]
# every animated caption must finish typing before it leaves the screen
anims = {x["id"]: x for x in m.get("material_animations", [])}
for t in d["tracks"]:
    if t["type"] != "text": continue
    for s_ in t["segments"]:
        du = s_["target_timerange"]["duration"]
        ai = ao = 0
        for r in s_["extra_material_refs"]:
            for a in (anims.get(r) or {}).get("animations", []):
                if a["type"] == "in": ai = a["duration"]
                if a["type"] == "out": ao = a["duration"]
        if ai and ai + ao > du - 300000:
            errs.append("track '%s' @%.2f: typing does not fit (in %.2f + out %.2f > dur %.2f)" %
                        (t.get("name"), s_["target_timerange"]["start"]/1e6, ai/1e6, ao/1e6, du/1e6))
print("tracks:", [(t["type"], t.get("name"), len(t["segments"])) for t in d["tracks"]])
print("duration %.1f" % (d["duration"] / 1e6))
print("ERRORS:", len(errs))
for e in errs[:40]: print(" ", e)
