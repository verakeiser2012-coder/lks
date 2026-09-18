# -*- coding: utf-8 -*-
"""Six ways to move the camera on the same shot — user tells me which ones actually move."""
import os, sys, json, io, shutil, uuid, time, copy
sys.path.insert(0, os.path.dirname(__file__))
from grusha_lib import Draft, us, uid, anim
ROOT = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "User Data", "Projects", "com.lveditor.draft")
SRC, TOOLS = os.path.join(ROOT, "Груша_v7_главы"), os.path.dirname(os.path.abspath(__file__))
NAME = "Груша_ТЕСТ_камера"; DST = os.path.join(ROOT, NAME)
DUR = us(8.0)
# proven-good animation resources taken from the user's own past projects
ANIMS = {"Зум 1": "6740868384637850120", "Приближение": "6798332733694153230", "Скольжение влево": "6798332871267324423"}

if os.path.exists(DST): shutil.rmtree(DST)
os.makedirs(DST)
for f in ("draft_content.json", "draft_meta_info.json", "draft_cover.jpg"):
    if os.path.exists(os.path.join(SRC, f)): shutil.copy(os.path.join(SRC, f), os.path.join(DST, f))
D = Draft(os.path.join(DST, "draft_content.json")); d = D.d
mats = {m["id"]: m for m in D.m["videos"]}
vt = d["tracks"][0]
src = next(s for s in vt["segments"] if mats[s["material_id"]].get("type") != "photo"
           and mats[s["material_id"]]["width"] > mats[s["material_id"]]["height"]
           and s["target_timerange"]["duration"] > us(9))
d["tracks"] = [vt]
label_ids = {}
for i in range(1, 7):
    p = os.path.join(TOOLS, "camtest_%d.png" % i)
    label_ids[i] = D.add_video_material(p, 1920, 1080, 10800000000, False, "photo")

segs = []
for i in range(1, 7):
    s = D.clone_video_segment(src, src_start_us=src["source_timerange"]["start"], dur_us=DUR, tgt_start_us=0, speed=1.0)
    s["volume"] = 0.0
    s["clip"] = {"scale": {"x": 1.0, "y": 1.0}, "rotation": 0.0, "transform": {"x": 0.0, "y": 0.0},
                 "flip": {"vertical": False, "horizontal": False}, "alpha": 1.0}
    s["uniform_scale"] = {"on": True, "value": 1.0}
    if i == 1:                                   # scale X+Y keyframes, uniform ON
        D.add_keyframes(s, "KFTypeScaleX", [(0, 1.0), (DUR, 1.35)])
        D.add_keyframes(s, "KFTypeScaleY", [(0, 1.0), (DUR, 1.35)])
    elif i == 2:                                 # scale X+Y keyframes, uniform OFF
        D.add_keyframes(s, "KFTypeScaleX", [(0, 1.0), (DUR, 1.35)])
        D.add_keyframes(s, "KFTypeScaleY", [(0, 1.0), (DUR, 1.35)])
        s["uniform_scale"] = {"on": False, "value": 1.0}
    elif i == 3:                                 # scale X only + a position pan, uniform ON
        D.add_keyframes(s, "KFTypeScaleX", [(0, 1.0), (DUR, 1.35)])
        D.add_keyframes(s, "KFTypePositionX", [(0, -0.12), (DUR, 0.12)])
    else:                                        # built-in entry animations, stretched long
        nm = list(ANIMS)[i-4]
        D.set_video_anims(s, [{"id": ANIMS[nm], "name": nm, "type": "in", "duration": us(6.0),
                               "resource_id": ANIMS[nm], "material_type": "video", "panel": "video",
                               "category_id": "6753", "category_name": "Ввод", "start": 0,
                               "path": "", "platform": "all", "anim_adjust_params": None}])
    segs.append(s)
vt["segments"] = segs
lab = D.add_track("video", "номер")
D.finalize()
t = 0
for i, s in enumerate(vt["segments"], 1):
    lb = D.new_video_segment(label_ids[i], 0, DUR, s["target_timerange"]["start"], volume=0.0)
    lb["render_index"] = 1
    lab["segments"].append(lb)
D.finalize()
d["name"] = NAME; nid = str(uuid.uuid4()).upper(); d["id"] = nid; d["update_time"] = int(time.time()*1e6)
ref = set()
for tr in d["tracks"]:
    for s in tr["segments"]:
        ref.add(s["material_id"]); ref.update(s.get("extra_material_refs") or [])
for cat, lst in list(d["materials"].items()):
    if isinstance(lst, list):
        d["materials"][cat] = [m for m in lst if not (isinstance(m, dict) and m.get("id")) or m["id"] in ref]
D.save()
mp = os.path.join(DST, "draft_meta_info.json"); meta = json.load(io.open(mp, encoding="utf-8")); now = int(time.time()*1e6)
meta.update({"draft_id": nid, "draft_name": NAME, "draft_fold_path": DST.replace("\\", "/"),
             "tm_duration": d["duration"], "tm_draft_create": now, "tm_draft_modified": now})
json.dump(meta, io.open(mp, "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"id": nid, "name": NAME, "duration": d["duration"], "dir": DST, "json": os.path.join(DST, "draft_content.json")},
          io.open(os.path.join(TOOLS, "v6_build_info.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("built", NAME, "%.0f s" % (d["duration"]/1e6))
