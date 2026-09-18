# -*- coding: utf-8 -*-
import json, uuid, time, os

ROOT_META = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\root_meta_info.json"
NEW_DIR = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Груша_v5_правки"
NEW_NAME = "Груша_v5_правки"
DRAFT_JSON = os.path.join(NEW_DIR, "draft_content.json")
META_JSON = os.path.join(NEW_DIR, "draft_meta_info.json")

d = json.load(open(DRAFT_JSON, encoding="utf-8"))
new_duration = d["duration"]

new_id = str(uuid.uuid4()).upper()
now_us = int(time.time() * 1_000_000)

meta = json.load(open(META_JSON, encoding="utf-8"))
meta["draft_id"] = new_id
meta["draft_name"] = NEW_NAME
meta["draft_fold_path"] = NEW_DIR.replace("\\", "/")
meta["draft_root_path"] = os.path.dirname(NEW_DIR).replace("\\", "/")
meta["tm_duration"] = new_duration
meta["tm_draft_create"] = now_us
meta["tm_draft_modified"] = now_us
json.dump(meta, open(META_JSON, "w", encoding="utf-8"), ensure_ascii=False)
print("Updated draft_meta_info.json, new id:", new_id)

root = json.load(open(ROOT_META, encoding="utf-8"))
entry = {
    "cloud_draft_cover": False, "cloud_draft_sync": False,
    "draft_cloud_last_action_download": False, "draft_cloud_purchase_info": "",
    "draft_cloud_template_id": "", "draft_cloud_tutorial_info": "",
    "draft_cloud_videocut_purchase_info": "",
    "draft_cover": os.path.join(NEW_DIR, "draft_cover.jpg").replace("/", "\\"),
    "draft_fold_path": NEW_DIR.replace("\\", "/"),
    "draft_id": new_id, "draft_is_ai_shorts": False, "draft_is_cloud_temp_draft": False,
    "draft_is_invisible": False, "draft_is_pippit_draft": False, "draft_is_web_article_video": False,
    "draft_json_file": DRAFT_JSON.replace("/", "\\"),
    "draft_name": NEW_NAME, "draft_new_version": "",
    "draft_root_path": os.path.dirname(NEW_DIR).replace("\\", "/"),
    "draft_timeline_materials_size": os.path.getsize(DRAFT_JSON),
    "draft_type": "", "draft_web_article_video_enter_from": "",
    "pippit_avatar_url": "", "pippit_extra_info": "", "pippit_id": "", "pippit_user_name": "",
    "streaming_edit_draft_ready": True,
    "tm_draft_cloud_completed": "", "tm_draft_cloud_entry_id": -1, "tm_draft_cloud_modified": 0,
    "tm_draft_cloud_parent_entry_id": -1, "tm_draft_cloud_space_id": -1, "tm_draft_cloud_user_id": -1,
    "tm_draft_create": now_us, "tm_draft_modified": now_us, "tm_draft_removed": 0,
    "tm_duration": new_duration,
}
root["all_draft_store"].insert(0, entry)
if isinstance(root.get("draft_ids"), list):
    root["draft_ids"].insert(0, new_id)
json.dump(root, open(ROOT_META, "w", encoding="utf-8"), ensure_ascii=False)
print("Updated root_meta_info.json, added entry for:", NEW_NAME)
