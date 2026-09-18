# -*- coding: utf-8 -*-
"""Two tiny diagnostic drafts cut from v7: (1) only the photo title card, (2) only one GoPro clip."""
import os, sys, json, io, shutil, uuid, time, re
sys.path.insert(0, os.path.dirname(__file__))
from grusha_lib import Draft
ROOT = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "User Data", "Projects", "com.lveditor.draft")
SRC = os.path.join(ROOT, "Груша_v7_главы")
TOOLS = os.path.dirname(os.path.abspath(__file__))
for name, pick in (("Груша_тест_2_гопро", "gopro"),):
    DST = os.path.join(ROOT, name)
    if os.path.exists(DST): shutil.rmtree(DST)
    shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns(".locked", "*.bak", "*.tmp"))
    D = Draft(os.path.join(DST, "draft_content.json")); d = D.d
    mats = {m["id"]: m for m in D.m["videos"]}
    vt = d["tracks"][0]
    if pick == "card":
        seg = next(s for s in vt["segments"] if mats[s["material_id"]].get("type") == "photo")
    else:
        seg = next(s for s in vt["segments"] if mats[s["material_id"]].get("type") != "photo"
                   and mats[s["material_id"]]["width"] > mats[s["material_id"]]["height"]
                   and s["target_timerange"]["duration"] > 8000000)
        if seg is None: raise SystemExit("no plain gopro seg")
    seg["common_keyframes"] = []; seg["volume"] = 1.0
    seg["target_timerange"] = {"start": 0, "duration": min(seg["target_timerange"]["duration"], 10000000)}
    seg["source_timerange"]["duration"] = seg["target_timerange"]["duration"]
    vt["segments"] = [seg]
    d["tracks"] = [vt]
    D.finalize()
    ref = {seg["material_id"], *seg["extra_material_refs"]}
    for cat, lst in list(d["materials"].items()):
        if isinstance(lst, list):
            d["materials"][cat] = [m for m in lst if not (isinstance(m, dict) and m.get("id")) or m["id"] in ref]
    d["name"] = name; nid = str(uuid.uuid4()).upper(); d["id"] = nid; d["update_time"] = int(time.time()*1e6)
    D.save()
    meta_p = os.path.join(DST, "draft_meta_info.json"); meta = json.load(io.open(meta_p, encoding="utf-8")); now = int(time.time()*1e6)
    meta.update({"draft_id": nid, "draft_name": name, "draft_fold_path": DST.replace("\\", "/"), "tm_duration": d["duration"], "tm_draft_create": now, "tm_draft_modified": now})
    json.dump(meta, io.open(meta_p, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"id": nid, "name": name, "duration": d["duration"], "dir": DST, "json": os.path.join(DST, "draft_content.json")},
              io.open(os.path.join(TOOLS, "v6_build_info.json"), "w", encoding="utf-8"), ensure_ascii=False)
    os.system('python "%s"' % os.path.join(TOOLS, "register_v6.py"))
    print(name, "->", os.path.basename(mats[seg["material_id"]]["path"]), "%.1f s" % (d["duration"]/1e6))
