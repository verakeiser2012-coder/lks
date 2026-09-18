# -*- coding: utf-8 -*-
"""Make a draft folder's sidecar files agree with draft_content.json's id.

CapCut keeps the timeline id in three places: draft_content.json `id`, draft_biz_config.json
`timeline_settings` and timeline_layout.json `timelineIds`. A folder copied from another draft
carries the OLD ids in the sidecars; CapCut 9.4-beta8 crashes on open when they disagree
(the user's v6 also picked up two phantom timeline ids from a 9.2 session).
Usage: python fix_sidecars.py <draft folder> [...]"""
import json, io, os, sys, shutil


def fix(folder):
    jp = os.path.join(folder, "draft_content.json")
    did = json.load(io.open(jp, encoding="utf-8"))["id"]
    changed = []
    bp = os.path.join(folder, "draft_biz_config.json")
    biz = {"timeline_settings": {did: {"adsorb_enabled": True, "linkage_enabled": True}}}
    if os.path.exists(bp):
        try:
            old = json.load(io.open(bp, encoding="utf-8"))
            if list(old.get("timeline_settings", {}).keys()) == [did]:
                biz = None
        except Exception:
            pass
    if biz is not None:
        json.dump(biz, io.open(bp, "w", encoding="utf-8"), indent=4); changed.append("draft_biz_config.json")
    lp = os.path.join(folder, "timeline_layout.json")
    lay = {"dockItems": [{"dockIndex": 0, "ratio": 1, "timelineIds": [did], "timelineNames": ["Timeline 01"]}], "layoutOrientation": 1}
    cur = None
    if os.path.exists(lp):
        try:
            cur = json.load(io.open(lp, encoding="utf-8"))
        except Exception:
            cur = None
    if cur != lay:
        json.dump(lay, io.open(lp, "w", encoding="utf-8")); changed.append("timeline_layout.json")
    for junk in ("draft_content.json.pre_fontfix", "template-2.tmp", "draft_content.json.bak"):
        p = os.path.join(folder, junk)
        if os.path.exists(p) and folder.rstrip("\\/").endswith(("_главы", "_картинка", "_гопро", "_шрифт", "_камера", "_голый")):
            os.remove(p); changed.append("rm " + junk)
    mp = os.path.join(folder, "draft_meta_info.json")
    meta = json.load(io.open(mp, encoding="utf-8"))
    if meta.get("draft_id") != did:
        meta["draft_id"] = did
        json.dump(meta, io.open(mp, "w", encoding="utf-8"), ensure_ascii=False); changed.append("draft_meta_info.draft_id")
    print(os.path.basename(folder), "->", did[:8], "|", ", ".join(changed) or "already consistent")


if __name__ == "__main__":
    for f in sys.argv[1:]:
        fix(f)
