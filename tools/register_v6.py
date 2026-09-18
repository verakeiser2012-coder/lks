# -*- coding: utf-8 -*-
"""Add (or refresh) the Груша_v6_кино entry in CapCut's root_meta_info.json. Safe to re-run."""
import json, io, os, time, shutil
ROOT_META = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\root_meta_info.json"
info = json.load(io.open(r"C:\Users\User\Desktop\site\tools\v6_build_info.json", encoding="utf-8"))
shutil.copy(ROOT_META, ROOT_META + ".bak_v6_" + time.strftime("%Y%m%d_%H%M%S"))
root = json.load(io.open(ROOT_META, encoding="utf-8"))
root["all_draft_store"] = [e for e in root["all_draft_store"] if e.get("draft_name") != info["name"]]
if isinstance(root.get("draft_ids"), list):
    root["draft_ids"] = [x for x in root["draft_ids"] if x != info["id"]]
now = int(time.time() * 1_000_000)
d = info["dir"]
entry = {
    "cloud_draft_cover": False, "cloud_draft_sync": False, "draft_cloud_last_action_download": False,
    "draft_cloud_purchase_info": "", "draft_cloud_template_id": "", "draft_cloud_tutorial_info": "",
    "draft_cloud_videocut_purchase_info": "", "draft_cover": os.path.join(d, "draft_cover.jpg"),
    "draft_fold_path": d.replace("\\", "/"), "draft_id": info["id"], "draft_is_ai_shorts": False,
    "draft_is_cloud_temp_draft": False, "draft_is_invisible": False, "draft_is_pippit_draft": False,
    "draft_is_web_article_video": False, "draft_json_file": info["json"], "draft_name": info["name"],
    "draft_new_version": "", "draft_root_path": os.path.dirname(d).replace("\\", "/"),
    "draft_timeline_materials_size": os.path.getsize(info["json"]), "draft_type": "",
    "draft_web_article_video_enter_from": "", "pippit_avatar_url": "", "pippit_extra_info": "",
    "pippit_id": "", "pippit_user_name": "", "streaming_edit_draft_ready": True,
    "tm_draft_cloud_completed": "", "tm_draft_cloud_entry_id": -1, "tm_draft_cloud_modified": 0,
    "tm_draft_cloud_parent_entry_id": -1, "tm_draft_cloud_space_id": -1, "tm_draft_cloud_user_id": -1,
    "tm_draft_create": now, "tm_draft_modified": now, "tm_draft_removed": 0, "tm_duration": info["duration"],
}
root["all_draft_store"].insert(0, entry)
if isinstance(root.get("draft_ids"), list):
    root["draft_ids"].insert(0, info["id"])
json.dump(root, io.open(ROOT_META, "w", encoding="utf-8"), ensure_ascii=False)
print("registered", info["name"], "entries:", len(root["all_draft_store"]))
