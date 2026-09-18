# -*- coding: utf-8 -*-
import json
import re
import subprocess
import uuid
import os
import copy

FFPROBE = r"C:\Users\User\Desktop\site\tools\ffmpeg-9.0-essentials_build\bin\ffprobe.exe"
FFMPEG = r"C:\Users\User\Desktop\site\tools\ffmpeg-9.0-essentials_build\bin\ffmpeg.exe"
DRAFT_DIR = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Груша_v5_правки"
DRAFT_JSON = os.path.join(DRAFT_DIR, "draft_content.json")
ROOT = r"E:\КАРЬЕРА!!!!!\2026\подкаст Груша 31 июля 2026"
CAPCUT_EXPORT = os.path.join(ROOT, "gopro", "груша gopro capcut.mp4")
DREAM_MP3 = r"C:\Users\User\Desktop\soundstates album\mp3\d-r-e-a-m-DJ-Levka.mp3"
SILENCE_LOG = r"C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-site\2220ce80-4677-4e46-8b17-9aecf1fa7ae7\scratchpad\silence.log"

US = 1_000_000  # microseconds per second

def new_id():
    return str(uuid.uuid4()).upper()

def make_extra_refs(mats):
    """create the 7 default per-segment auxiliary material entries, return their ids"""
    ids = {}
    e = {"id": new_id(), "type": "speed", "mode": 0, "speed": 1.0, "curve_speed": None}
    mats["speeds"].append(e); ids["speed"] = e["id"]
    e = {"id": new_id(), "type": "placeholder_info", "meta_type": "none", "res_path": "", "res_text": "", "error_path": "", "error_text": ""}
    mats["placeholder_infos"].append(e); ids["ph"] = e["id"]
    e = {"id": new_id(), "type": "canvas_color", "color": "", "blur": 0.0, "image": "", "album_image": "", "image_id": "", "image_name": "", "source_platform": 0, "team_id": ""}
    mats["canvases"].append(e); ids["canvas"] = e["id"]
    e = {"id": new_id(), "type": "sticker_animation", "animations": [], "multi_language_current": "none"}
    mats["material_animations"].append(e); ids["anim"] = e["id"]
    e = {"id": new_id(), "type": "none", "audio_channel_mapping": 0, "is_config_open": False}
    mats["sound_channel_mappings"].append(e); ids["sound"] = e["id"]
    e = {"id": new_id(), "is_color_clip": False, "is_gradient": False, "solid_color": "", "gradient_colors": [], "gradient_percents": [], "gradient_angle": 90.0, "width": 0.0, "height": 0.0}
    mats["material_colors"].append(e); ids["color"] = e["id"]
    e = {"id": new_id(), "type": "vocal_separation", "choice": 0, "removed_sounds": [], "time_range": None, "production_path": "", "final_algorithm": "", "enter_from": ""}
    mats["vocal_separations"].append(e); ids["vocal"] = e["id"]
    return [ids["anim"], ids["ph"], ids["canvas"], ids["color"], ids["sound"], ids["speed"], ids["vocal"]]

def make_video_segment(material_id, src_start_us, dur_us, target_start_us, extra_refs, render_index=0,
                        volume=1.0, rotation=0.0, scale=1.0, tx=0.0, ty=0.0):
    return {
        "id": new_id(),
        "source_timerange": {"start": int(src_start_us), "duration": int(dur_us)},
        "target_timerange": {"start": int(target_start_us), "duration": int(dur_us)},
        "render_timerange": {"start": 0, "duration": 0},
        "desc": "", "state": 0, "speed": 1.0, "is_loop": False, "is_tone_modify": False,
        "reverse": False, "intensifies_audio": False, "cartoon": False,
        "volume": volume, "last_nonzero_volume": 1.0,
        "clip": {
            "scale": {"x": scale, "y": scale}, "rotation": rotation,
            "transform": {"x": tx, "y": ty},
            "flip": {"vertical": False, "horizontal": False}, "alpha": 1.0
        },
        "uniform_scale": {"on": True, "value": scale},
        "material_id": material_id,
        "extra_material_refs": extra_refs,
        "render_index": render_index, "keyframe_refs": [], "enable_lut": True, "enable_adjust": True,
        "enable_hsl": False, "visible": True, "group_id": "", "enable_color_curves": True,
        "enable_hsl_curves": True, "track_render_index": render_index,
        "hdr_settings": {"mode": 1, "intensity": 1.0, "nits": 1000},
        "enable_color_wheels": True, "track_attribute": 0, "is_placeholder": False, "template_id": "",
        "enable_smart_color_adjust": False, "template_scene": "default", "common_keyframes": [],
        "caption_info": None,
        "responsive_layout": {"enable": False, "target_follow": "", "size_layout": 0, "horizontal_pos_layout": 0, "vertical_pos_layout": 0},
        "enable_color_match_adjust": False, "enable_color_correct_adjust": False, "enable_adjust_mask": False,
        "raw_segment_id": "", "lyric_keyframes": None, "enable_video_mask": True,
        "digital_human_template_group_id": "", "color_correct_alg_result": "", "source": "segmentsourcenormal",
        "enable_mask_stroke": False, "enable_mask_shadow": False, "enable_color_adjust_pro": False,
        "segment_color_tag": "",
    }

def make_video_material(path, duration_us, width, height, name):
    return {
        "id": new_id(), "unique_id": new_id(), "type": "video", "duration": int(duration_us),
        "path": path, "media_path": "", "local_id": "", "has_audio": True,
        "reverse_path": "", "intensifies_path": "", "reverse_intensifies_path": "",
        "intensifies_audio_path": "", "cartoon_path": "", "width": width, "height": height,
        "category_id": "", "category_name": "local", "material_id": "", "material_name": name,
        "material_url": "", "crop": {"upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0,
        "upper_right_y": 0.0, "lower_left_x": 0.0, "lower_left_y": 1.0, "lower_right_x": 1.0, "lower_right_y": 1.0},
        "crop_ratio": "free", "audio_fade": None, "crop_scale": 1.0, "extra_type_option": 0,
        "stable": None, "matting": {"flag": 0, "has_use_quick_brush": False, "has_use_quick_eraser": False,
        "interactiveTime": [], "path": "", "strokes": []}, "source": 0, "source_platform": 0,
        "formula_id": "", "check_flag": 63487, "video_algorithm": {"algorithms": [], "deflicker": None,
        "motion_blur_config": None, "noise_reduction": None, "path": "", "quality_enhance": None,
        "time_range": None}, "is_unified_beauty_mode": False, "is_set_beauty_mode": False,
        "object_locked": None, "smart_motion": None, "freeze": None, "picture_from": "", "team_id": "",
        "local_material_id": "", "origin_material_id": "", "request_id": "", "has_sound_separated": False,
        "is_text_edit_overdub": False, "is_ai_generate_content": False, "aigc_type": "none",
        "is_copyright": False, "local_material_from": "", "smart_match_info": None,
        "content_feature_info": None, "corner_pin": None, "surface_trackings": [],
        "video_mask_stroke": None, "video_mask_shadow": None, "pre_applied_vip_materials": [],
    }

def make_audio_material(path, duration_us, name):
    return {
        "id": new_id(), "type": "extract_music", "path": path, "duration": int(duration_us),
        "name": name, "local_material_id": "", "category_id": "", "category_name": "local",
        "check_flag": 1, "source_platform": 0, "team_id": "", "music_id": "", "app_id": 0,
        "query": "", "request_id": "", "audio_fade": None, "wave_points": [], "waveform_bright": [],
    }

def probe_dur_us(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                        capture_output=True, text=True)
    return round(float(r.stdout.strip()) * US)

def probe_wh(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                         "-of", "csv=p=0", path], capture_output=True, text=True)
    w, h = r.stdout.strip().split(",")[:2]
    return int(w), int(h)

def probe_rotation(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0",
                         "-show_entries", "stream_side_data=rotation:stream_tags=rotate",
                         "-of", "csv=p=0", path], capture_output=True, text=True)
    txt = r.stdout.strip()
    if "-90" in txt or "270" in txt:
        return -90
    if "90" in txt:
        return 90
    return 0

print("Loading draft...")
d = json.load(open(DRAFT_JSON, encoding="utf-8"))
mats = d["materials"]
old_segs = d["tracks"][0]["segments"]
canvas_w, canvas_h = d["canvas_config"]["width"], d["canvas_config"]["height"]
print(f"Canvas: {canvas_w}x{canvas_h}, base segments: {len(old_segs)}")

# ---------------------------------------------------------------------------
# helper: given orig-time (seconds, matches export/target_timerange), find the
# original (material_id, source_start_us) at that point by scanning old_segs
# ---------------------------------------------------------------------------
def locate_in_old_segs(t_sec):
    t_us = round(t_sec * US)
    for s in old_segs:
        tr = s["target_timerange"]
        if tr["start"] <= t_us < tr["start"] + tr["duration"]:
            offset = t_us - tr["start"]
            return s["material_id"], s["source_timerange"]["start"] + offset
    # end of timeline edge case
    last = old_segs[-1]
    return last["material_id"], last["source_timerange"]["start"] + last["source_timerange"]["duration"]

def slice_old_segs(a_sec, b_sec):
    """return list of (material_id, src_start_us, dur_us) covering [a,b) seconds, split at old-seg boundaries"""
    a_us, b_us = round(a_sec * US), round(b_sec * US)
    out = []
    for s in old_segs:
        tr = s["target_timerange"]
        seg_a, seg_b = tr["start"], tr["start"] + tr["duration"]
        ov_a, ov_b = max(a_us, seg_a), min(b_us, seg_b)
        if ov_b > ov_a:
            offset = ov_a - seg_a
            out.append((s["material_id"], s["source_timerange"]["start"] + offset, ov_b - ov_a))
    return out

print("Cut-list logic ready.")

# ---------------------------------------------------------------------------
# build automatic-body keep list (orig 222.6 .. end), reusing earlier decisions
# ---------------------------------------------------------------------------
TOTAL_DUR = 3069.381995
CONTENT_CUTS = [
    (0.0, 222.6),
    (610.0, 670.0), (1230.0, 1290.0), (312.6, 317.8), (1073.0, 1091.0),
    (273.0, 290.0), (936.0, 995.0), (1706.0, 1743.0), (2418.4, 2463.4),
]
PROTECTED_ZONES = [(1110.0, 1175.0), (2710.0, 3014.0)]
PAUSE_THRESH, PAUSE_KEEP = 2.0, 0.35

text = open(SILENCE_LOG, encoding="utf-8", errors="ignore").read()
starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", text)]
ends, durs = [], []
for m in re.finditer(r"silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)", text):
    ends.append(float(m.group(1))); durs.append(float(m.group(2)))
pauses = [p for p in zip(starts, ends, durs) if p[2] >= PAUSE_THRESH]

def overlaps_any(a, b, zones):
    return any(a < ce and b > cs for cs, ce in zones)

removals = list(CONTENT_CUTS)
for s, e, dd in pauses:
    if overlaps_any(s, e, CONTENT_CUTS) or overlaps_any(s, e, PROTECTED_ZONES):
        continue
    ms, me = s + PAUSE_KEEP / 2, e - PAUSE_KEEP / 2
    if me > ms:
        removals.append((ms, me))
removals.sort()
merged = []
for s, e in removals:
    if merged and s <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], e))
    else:
        merged.append((s, e))
keep = []
cur = 0.0
for s, e in merged:
    if s > cur:
        keep.append((cur, s))
    cur = max(cur, e)
if cur < TOTAL_DUR:
    keep.append((cur, TOTAL_DUR))
keep = [(s, e) for s, e in keep if e - s > 0.05]
print(f"Automatic body: {len(keep)} kept intervals, total {sum(e-s for s,e in keep)/60:.2f} min")

def orig_to_v1(t_orig, segs=keep):
    cum = 0.0
    for a, b in segs:
        if t_orig <= a:
            return cum
        if t_orig <= b:
            return cum + (t_orig - a)
        cum += (b - a)
    return cum

cum = 0.0
body_seg_v1 = []
for a, b in keep:
    body_seg_v1.append((cum, cum + (b - a), a, b))
    cum += (b - a)

BODY_INSERTS_ORIG = [
    (1306.83, 4.0, "VID_20260731_114738.mp4", 11.5),
    (1437.88, 4.0, "VID_20260731_115218.mp4", 3.0),
    (1520.16, 4.0, "VID_20260731_114807.mp4", 6.4),
    (1626.87, 4.0, "VID_20260731_115246.mp4", 9.2),
    (1830.92, 4.0, "VID_20260731_115315.mp4", 6.8),
    (2364.48, 4.0, "VID_20260731_121334.mp4", 2.7),
    (2563.10, 3.0, "VID_20260731_112335.mp4", 9.2),
    (3056.13, 4.0, "VID_20260731_122939.mp4", 13.0),
    (545.31, 4.0, "VID_20260731_113651.mp4", 30.0),
    (704.99, 4.0, "VID_20260731_114845.mp4", 2.8),
    (815.77, 4.0, "VID_20260731_114942.mp4", 6.0),
    (1368.78, 4.0, "VID_20260731_130021.mp4", 42.0),
    (1754.77, 4.0, "VID_20260731_120004.mp4", 32.0),
    (2055.07, 4.0, "VID_20260731_130131.mp4", 25.0),
    (2488.33, 4.0, "VID_20260731_120907.mp4", 42.0),
]
MINLEN = 8.0
resolved_body_inserts = []
used_idx = set()
for orig_t, dur, src, srcin in BODY_INSERTS_ORIG:
    target_v1 = orig_to_v1(orig_t)
    cands = sorted(((abs(((s[0]+s[1])/2)-target_v1), i, s) for i, s in enumerate(body_seg_v1) if (s[1]-s[0]) >= MINLEN))
    for _, i, s in cands:
        if i in used_idx:
            continue
        v1s, v1e, oa, ob = s
        ins_start = max(v1s + 1.5, min((v1s + v1e) / 2 - 2.0, v1e - dur - 1.5))
        used_idx.add(i)
        resolved_body_inserts.append((ins_start, dur, src, srcin))
        break
resolved_body_inserts.sort()
print(f"Body inserts resolved: {len(resolved_body_inserts)}")

# ---------------------------------------------------------------------------
# OPENING plan (hand-crafted, orig time)
# ---------------------------------------------------------------------------
opening_plan = [
    ("N", 0.50, 12.07), ("N", 18.07, 37.74), ("DREAM", 37.74, 55.65), ("N", 55.65, 58.15),
    ("N", 73.88, 96.09), ("N", 58.15, 73.88), ("N", 96.09, 119.0),
    ("I", 4.0, "VID_20260731_111149.mp4", 8.0),
    ("N", 123.0, 158.42), ("N", 158.42, 172.0),
    ("I", 4.0, "VID_20260731_111222.mp4", 6.6),
    ("N", 176.0, 222.6),
]

print("Plan built. Ready for assembly.")

# ---------------------------------------------------------------------------
# ASSEMBLY
# ---------------------------------------------------------------------------
video_material_cache = {}  # path -> material_id

def get_or_add_video_material(path):
    if path in video_material_cache:
        return video_material_cache[path]
    dur = probe_dur_us(path)
    w, h = probe_wh(path)
    m = make_video_material(path.replace("\\", "/"), dur, w, h, os.path.basename(path))
    mats["videos"].append(m)
    video_material_cache[path] = m["id"]
    return m["id"], w, h, dur

def get_or_add_video_material_full(path):
    if path in video_material_cache:
        mid = video_material_cache[path]
        mat = next(v for v in mats["videos"] if v["id"] == mid)
        return mid, mat["width"], mat["height"], mat["duration"]
    dur = probe_dur_us(path)
    w, h = probe_wh(path)
    m = make_video_material(path.replace("\\", "/"), dur, w, h, os.path.basename(path))
    mats["videos"].append(m)
    video_material_cache[path] = m["id"]
    return m["id"], w, h, dur

# --- title card: generate a short 4.5s clip via ffmpeg, then import ---
TITLE_BG = r"C:\Users\User\Desktop\site\tools\title_bg.jpg"
TITLE_CARD_MP4 = r"C:\Users\User\Desktop\site\tools\title_card.mp4"
if not os.path.exists(TITLE_CARD_MP4):
    raise SystemExit("title card render failed")
print("Title card ready (pre-built).")

# --- video track 0: base timeline (title, opening, body) ---
base_segments = []
render_idx0 = 0
timeline_cursor_us = 0

def append_base(material_id, src_start_us, dur_us):
    global timeline_cursor_us
    refs = make_extra_refs(mats)
    seg = make_video_segment(material_id, src_start_us, dur_us, timeline_cursor_us, refs, render_index=render_idx0)
    base_segments.append(seg)
    timeline_cursor_us += dur_us

# title card
mid, w, h, dur = get_or_add_video_material_full(TITLE_CARD_MP4)
append_base(mid, 0, dur)

# instrument intro: solo handpan snippet (orig 2444-2450) + duet clip (VID_20260731_131015 15-33s trimmed to e.g. 15-27, ~12s, shortened)
capcut_mid, _, _, _ = get_or_add_video_material_full(CAPCUT_EXPORT)
append_base(capcut_mid, round(2444.0 * US), round(6.0 * US))  # most dynamic solo bit
duet_path = os.path.join(ROOT, "VID_20260731_131015.mp4")
duet_mid, _, _, _ = get_or_add_video_material_full(duet_path)
append_base(duet_mid, round(15.0 * US), round(12.0 * US))  # trimmed/shortened duet

# opening plan
for item in opening_plan:
    if item[0] == "N":
        _, a, b = item
        for mid2, src_us, d_us in slice_old_segs(a, b):
            append_base(mid2, src_us, d_us)
    elif item[0] == "DREAM":
        _, a, b = item
        for mid2, src_us, d_us in slice_old_segs(a, b):
            append_base(mid2, src_us, d_us)
    elif item[0] == "I":
        _, dur, src, srcin = item
        p = os.path.join(ROOT, src)
        mid2, w2, h2, _ = get_or_add_video_material_full(p)
        rot = probe_rotation(p)
        if rot in (-90, 90):
            eff_w, eff_h = h2, w2
        else:
            eff_w, eff_h = w2, h2
        scale = max(canvas_w / eff_w, canvas_h / eff_h)
        refs = make_extra_refs(mats)
        seg = make_video_segment(mid2, round(srcin * US), round(dur * US), timeline_cursor_us, refs,
                                  render_index=render_idx0, rotation=float(rot), scale=scale)
        base_segments.append(seg)
        timeline_cursor_us += round(dur * US)

opening_end_us = timeline_cursor_us
print(f"Opening ends at {opening_end_us/US:.2f}s")

# automatic body (with its own inserts spliced directly into the SAME base track,
# since CapCut base-track segments fully replace video at that point - matches
# the "full screen replacement, no PIP" style requested)
insert_i = 0
for si, (v1s, v1e, ov_s, ov_e) in enumerate(body_seg_v1):
    cursor = v1s
    while insert_i < len(resolved_body_inserts) and resolved_body_inserts[insert_i][0] >= v1s and resolved_body_inserts[insert_i][0] + resolved_body_inserts[insert_i][1] <= v1e:
        ins_start, ins_dur, src, srcin = resolved_body_inserts[insert_i]
        if ins_start > cursor:
            oa = ov_s + (cursor - v1s)
            ob = ov_s + (ins_start - v1s)
            for mid2, src_us, d_us in slice_old_segs(oa, ob):
                append_base(mid2, src_us, d_us)
        p = os.path.join(ROOT, src)
        mid2, w2, h2, _ = get_or_add_video_material_full(p)
        rot = probe_rotation(p)
        eff_w, eff_h = (h2, w2) if rot in (-90, 90) else (w2, h2)
        scale = max(canvas_w / eff_w, canvas_h / eff_h)
        refs = make_extra_refs(mats)
        seg = make_video_segment(mid2, round(srcin * US), round(ins_dur * US), timeline_cursor_us, refs,
                                  render_index=render_idx0, rotation=float(rot), scale=scale)
        base_segments.append(seg)
        timeline_cursor_us += round(ins_dur * US)
        cursor = ins_start + ins_dur
        insert_i += 1
    if cursor < v1e:
        oa = ov_s + (cursor - v1s)
        ob = ov_e
        for mid2, src_us, d_us in slice_old_segs(oa, ob):
            append_base(mid2, src_us, d_us)

total_duration_us = timeline_cursor_us
print(f"Total timeline: {total_duration_us/US/60:.2f} min, {len(base_segments)} base segments")

d["tracks"][0]["segments"] = base_segments
d["duration"] = total_duration_us

# --- Dream track audio (separate audio track), positioned at same time as
#     the "N" DREAM opening piece (which starts right at the beginning of the
#     opening plan's DREAM entry -> compute its timeline start) ---
dream_start_us = None
cursor2 = base_segments[2]["target_timerange"]["start"] + base_segments[2]["target_timerange"]["duration"]
# recompute properly: walk opening_plan again tracking timeline pos from where opening starts
pos = base_segments[2]["target_timerange"]["start"] + base_segments[2]["target_timerange"]["duration"]
for item in opening_plan:
    if item[0] == "DREAM":
        dream_start_us = pos
        _, a, b = item
        dream_len_us = round((b - a) * US)
        break
    elif item[0] == "N":
        _, a, b = item
        pos += round((b - a) * US)
    elif item[0] == "I":
        _, dur, _, _ = item
        pos += round(dur * US)

dream_dur_us = probe_dur_us(DREAM_MP3)
dream_use_us = min(dream_len_us, dream_dur_us)
dream_mat = make_audio_material(DREAM_MP3.replace("\\", "/"), dream_dur_us, os.path.basename(DREAM_MP3))
mats["audios"].append(dream_mat)

audio_track = {
    "attribute": 0, "flag": 0, "id": new_id(), "is_default_name": True, "name": "",
    "segments": [], "type": "audio",
}
refs = make_extra_refs(mats)
audio_seg = make_video_segment(dream_mat["id"], 0, dream_use_us, dream_start_us, refs, render_index=0, volume=0.35)
# audio segments don't need clip/rotation/scale fields but harmless to leave defaults
audio_track["segments"].append(audio_seg)
d["tracks"].append(audio_track)
print(f"Dream track at {dream_start_us/US:.2f}s for {dream_use_us/US:.2f}s")

json.dump(d, open(DRAFT_JSON, "w", encoding="utf-8"), ensure_ascii=False)
print("SAVED:", DRAFT_JSON)
print(f"FINAL DURATION: {total_duration_us/US/60:.2f} min")


