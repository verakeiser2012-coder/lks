# -*- coding: utf-8 -*-
"""Helpers for editing a CapCut draft_content.json (version 360000 / 179.x) in place.

Everything is cloned from records that already exist in the user's own draft, so the
schema is always the one CapCut itself wrote.  Times are microseconds.
"""
import json, io, uuid, copy, os

US = 1_000_000


def uid():
    return str(uuid.uuid4()).upper()


def us(sec):
    return int(round(sec * US))


class Draft:
    def __init__(self, path):
        self.path = path
        self.d = json.load(io.open(path, encoding="utf-8"))
        self.m = self.d["materials"]
        # templates taken from the existing draft
        def pick(track, want):
            """a segment to clone as a template — `want`th if the track is long enough"""
            return copy.deepcopy(track["segments"][min(want, len(track["segments"]) - 1)])

        vt = self.video_track()
        self._tpl_vseg = pick(vt, 5)
        self._tpl_vmat = copy.deepcopy(self.find_material("videos", self._tpl_vseg["material_id"]))
        self._tpl_refs = {}
        for cat in ("canvases", "material_animations", "placeholder_infos", "speeds",
                    "sound_channel_mappings", "material_colors", "vocal_separations"):
            for m in self.m[cat]:
                if m["id"] in self._tpl_vseg["extra_material_refs"]:
                    self._tpl_refs[cat] = copy.deepcopy(m)
        at = next(t for t in self.d["tracks"] if t["type"] == "audio" and t["segments"])
        self._tpl_aseg = pick(at, 0)
        self._tpl_amat = copy.deepcopy(self.find_material("audios", self._tpl_aseg["material_id"]))
        tt = next(t for t in self.d["tracks"] if t["type"] == "text" and t["segments"])
        self._tpl_tseg = pick(tt, 1)
        self._tpl_tmat = copy.deepcopy(self.find_material("texts", self._tpl_tseg["material_id"]))
        self._tpl_track = {k: v for k, v in tt.items() if k != "segments"}

    # ---------------------------------------------------------------- basics
    def save(self, path=None):
        path = path or self.path
        json.dump(self.d, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    def track(self, ttype, name=None):
        for t in self.d["tracks"]:
            if t["type"] == ttype and (name is None or t.get("name") == name):
                return t
        return None

    def video_track(self):
        return self.track("video")

    def find_material(self, cat, mid):
        for m in self.m[cat]:
            if m["id"] == mid:
                return m
        return None

    def add_track(self, ttype, name):
        t = copy.deepcopy(self._tpl_track)
        t.update({"id": uid(), "type": ttype, "name": name, "is_default_name": False, "segments": []})
        self.d["tracks"].append(t)
        return t

    def finalize(self):
        """Recompute duration, track_render_index, keep main track contiguous."""
        vt = self.video_track()
        t = 0
        for s in vt["segments"]:
            s["target_timerange"]["start"] = t
            t += s["target_timerange"]["duration"]
        end = t
        for i, tr in enumerate(self.d["tracks"]):
            for s in tr["segments"]:
                s["track_render_index"] = i
                end = max(end, s["target_timerange"]["start"] + s["target_timerange"]["duration"])
        self.d["duration"] = end
        return end

    # ------------------------------------------------------------- materials
    def _new_refs(self, speed=1.0):
        ids = []
        for cat, tpl in self._tpl_refs.items():
            m = copy.deepcopy(tpl)
            m["id"] = uid()
            if cat == "speeds":
                m["speed"] = speed
                m["curve_speed"] = None
            if cat == "material_animations":
                m["animations"] = []
            self.m[cat].append(m)
            ids.append(m["id"])
        return ids

    def add_video_material(self, path, width, height, duration_us, has_audio=True, mtype="video"):
        m = copy.deepcopy(self._tpl_vmat)
        m.update({"id": uid(), "path": path.replace("\\", "/"), "media_path": "", "width": width, "height": height,
                  "duration": duration_us, "has_audio": has_audio, "type": mtype,
                  "material_name": os.path.basename(path), "local_material_id": ""})
        self.m["videos"].append(m)
        return m["id"]

    def add_audio_material(self, path, duration_us):
        m = copy.deepcopy(self._tpl_amat)
        m.update({"id": uid(), "path": path.replace("\\", "/"), "name": os.path.basename(path),
                  "duration": duration_us, "type": "extract_music", "category_name": "local"})
        self.m["audios"].append(m)
        return m["id"]

    def add_animation_material(self, anims):
        """anims: list of animation dicts copied verbatim from a real draft (id/resource_id/path...)."""
        m = {"id": uid(), "type": "sticker_animation", "multi_language_current": "none",
             "animations": [copy.deepcopy(a) for a in anims]}
        self.m["material_animations"].append(m)
        return m["id"]

    def add_audio_fade(self, fade_in_us, fade_out_us):
        m = {"id": uid(), "type": "audio_fade", "fade_type": 0,
             "fade_in_duration": int(fade_in_us), "fade_out_duration": int(fade_out_us)}
        self.m.setdefault("audio_fades", []).append(m)
        return m["id"]

    def add_text_material(self, text, font_path, size, color=(1, 1, 1), align=1, letter_spacing=0.0,
                          line_spacing=0.02, bold=False, shadow=False, bg=None, styles=None, neon=None):
        """styles: optional list of (start, end, size, font_path, color) ranges overriding the single style."""
        m = copy.deepcopy(self._tpl_tmat)
        m["id"] = uid()

        def st(a, b, sz, fp, col):
            return {"fill": {"content": {"render_type": "solid", "solid": {"color": list(col)}}},
                    "font": {"path": fp.replace("\\", "/"), "id": ""}, "size": sz, "range": [a, b]}
        if styles:
            content = {"text": text, "styles": [st(a, b, sz, fp or font_path, col or color) for a, b, sz, fp, col in styles]}
        else:
            content = {"text": text, "styles": [st(0, len(text), size, font_path, color)]}
        if bold:
            content["styles"][0]["bold"] = True
        m["content"] = json.dumps(content, ensure_ascii=False)
        m["font_path"] = font_path.replace("\\", "/")
        # CapCut-cached fonts are referenced by resource id (copied from a real draft's text material)
        f = CAPCUT_FONTS.get(font_path.replace("\\", "/"))
        if f:
            for s in content["styles"]:
                s["font"]["id"] = f["rid"]
            m["content"] = json.dumps(content, ensure_ascii=False)
            m["font_resource_id"] = f["rid"]
            m["font_source_platform"] = 1
            m["font_title"] = "none"
            m["fonts"] = [{"id": uid(), "resource_id": f["rid"], "third_resource_id": "", "category_id": "preset",
                           "category_name": "Presets", "source_platform": 1, "path": font_path.replace("\\", "/"),
                           "effect_id": f["rid"], "title": f["title"], "team_id": "", "file_uri": "", "request_id": ""}]
        m["font_size"] = size
        m["alignment"] = align
        m["letter_spacing"] = letter_spacing
        m["line_spacing"] = line_spacing
        m["text_color"] = "#%02X%02X%02X" % tuple(int(c * 255) for c in color)
        m["has_shadow"] = bool(shadow) or bool(neon)
        if neon:
            # LEVKEYSER neon: pale core, mid-green rim, wide soft glow behind it
            rim, glow = (neon if isinstance(neon, tuple) else ("#8FC65C", "#3E6B1F"))
            m["border_color"], m["border_alpha"], m["border_width"] = rim, 0.95, 0.055
            m["border_mode"] = 0
            m["shadow_color"], m["shadow_alpha"] = glow, 1.0
            m["shadow_distance"], m["shadow_smoothing"], m["shadow_angle"] = 0.0, 1.0, -90.0
            m["shadow_point"] = {"x": 0.0, "y": 0.0}
        elif shadow:
            m["shadow_color"] = "#000000"
            m["shadow_alpha"] = 0.6
            m["shadow_distance"] = 6.0
            m["shadow_smoothing"] = 0.5
        if bg:
            m["background_color"] = bg
            m["background_alpha"] = 0.55
            m["background_style"] = 1
            m["background_round_radius"] = 0.1
        self.m["texts"].append(m)
        return m["id"]

    # -------------------------------------------------------------- segments
    def new_video_segment(self, material_id, src_start_us, dur_us, tgt_start_us, speed=1.0, volume=1.0,
                          clip=None, uniform_scale=1.0, template=None, anims=None):
        s = copy.deepcopy(template or self._tpl_vseg)
        s["id"] = uid()
        s["material_id"] = material_id
        s["speed"] = speed
        s["source_timerange"] = {"start": int(src_start_us), "duration": int(round(dur_us * speed))}
        s["target_timerange"] = {"start": int(tgt_start_us), "duration": int(dur_us)}
        s["volume"] = volume
        s["last_nonzero_volume"] = volume if volume > 0 else 1.0
        s["common_keyframes"] = []
        s["keyframe_refs"] = []
        if clip is not None:
            s["clip"] = copy.deepcopy(clip)
        if uniform_scale is not None:
            s["uniform_scale"] = {"on": True, "value": uniform_scale}
        s["extra_material_refs"] = self._new_refs(speed)
        if anims:
            for m in self.m["material_animations"]:
                if m["id"] in s["extra_material_refs"]:
                    m["animations"] = [copy.deepcopy(a) for a in anims]
        return s

    def clone_video_segment(self, seg, src_start_us=None, dur_us=None, tgt_start_us=None, speed=None):
        """Clone an existing timeline segment (keeps its clip/crop settings) with new timing."""
        s = copy.deepcopy(seg)
        s["id"] = uid()
        spd = speed if speed is not None else seg.get("speed", 1.0)
        s["speed"] = spd
        st = src_start_us if src_start_us is not None else seg["source_timerange"]["start"]
        du = dur_us if dur_us is not None else seg["target_timerange"]["duration"]
        tg = tgt_start_us if tgt_start_us is not None else seg["target_timerange"]["start"]
        s["source_timerange"] = {"start": int(st), "duration": int(round(du * spd))}
        s["target_timerange"] = {"start": int(tg), "duration": int(du)}
        s["common_keyframes"] = []
        s["keyframe_refs"] = []
        s["extra_material_refs"] = self._new_refs(spd)
        return s

    def set_speed(self, seg, speed):
        seg["speed"] = speed
        seg["source_timerange"]["duration"] = int(round(seg["target_timerange"]["duration"] * speed))
        for m in self.m["speeds"]:
            if m["id"] in seg["extra_material_refs"]:
                m["speed"] = speed
                m["curve_speed"] = None

    def set_video_anims(self, seg, anims):
        for m in self.m["material_animations"]:
            if m["id"] in seg["extra_material_refs"]:
                m["animations"] = [copy.deepcopy(a) for a in anims]
                return
        mid = self.add_animation_material(anims)
        seg["extra_material_refs"].append(mid)

    def new_audio_segment(self, material_id, src_start_us, dur_us, tgt_start_us, volume=1.0,
                          fade_in_us=0, fade_out_us=0):
        s = copy.deepcopy(self._tpl_aseg)
        s["id"] = uid()
        s["material_id"] = material_id
        s["speed"] = 1.0
        s["source_timerange"] = {"start": int(src_start_us), "duration": int(dur_us)}
        s["target_timerange"] = {"start": int(tgt_start_us), "duration": int(dur_us)}
        s["volume"] = volume
        s["last_nonzero_volume"] = volume if volume > 0 else 1.0
        s["common_keyframes"] = []
        s["keyframe_refs"] = []
        refs = []
        for cat in ("speeds", "placeholder_infos", "sound_channel_mappings", "vocal_separations"):
            m = copy.deepcopy(self._tpl_refs[cat])
            m["id"] = uid()
            if cat == "speeds":
                m["speed"] = 1.0
                m["curve_speed"] = None
            self.m[cat].append(m)
            refs.append(m["id"])
        if fade_in_us or fade_out_us:
            refs.append(self.add_audio_fade(fade_in_us, fade_out_us))
        s["extra_material_refs"] = refs
        return s

    def new_text_segment(self, text_mat_id, tgt_start_us, dur_us, x=0.0, y=0.0, scale=1.0,
                         anims=None, render_index=14000):
        s = copy.deepcopy(self._tpl_tseg)
        s["id"] = uid()
        s["material_id"] = text_mat_id
        s["target_timerange"] = {"start": int(tgt_start_us), "duration": int(dur_us)}
        s["clip"] = {"scale": {"x": scale, "y": scale}, "rotation": 0.0, "transform": {"x": x, "y": y},
                     "flip": {"vertical": False, "horizontal": False}, "alpha": 1.0}
        s["uniform_scale"] = {"on": True, "value": scale}
        s["common_keyframes"] = []
        s["keyframe_refs"] = []
        s["render_index"] = render_index
        s["extra_material_refs"] = [self.add_animation_material(anims or [])]
        return s

    # -------------------------------------------------------------- keyframes
    @staticmethod
    def add_keyframes(seg, prop, points):
        """prop: KFTypeScaleX / KFTypePositionX / KFTypePositionY / KFTypeAlpha / KFTypeVolume ...
        points: [(time_offset_us, value), ...] relative to the segment start.

        CapCut stores time_offset in MATERIAL time (source_timerange.start + offset*speed), not
        segment time — verified on a user draft (0622: src start 12.87 s, 15 s clip, keys at 26.7–27.9 s).
        Keys placed at 0..dur on a clip whose source starts later all land before the clip and the
        value just sits static, which is why nothing moved before."""
        base = int((seg.get("source_timerange") or {}).get("start", 0))
        spd = float(seg.get("speed", 1.0) or 1.0)
        kl = {"id": uid(), "material_id": "", "property_type": prop, "keyframe_list": []}
        for t, v in sorted(points):
            kl["keyframe_list"].append({
                "curveType": "Line", "graphID": "", "id": uid(),
                "left_control": {"x": 0.0, "y": 0.0}, "right_control": {"x": 0.0, "y": 0.0},
                "string_value": "", "time_offset": int(base + t * spd), "values": [float(v)]})
        seg.setdefault("common_keyframes", []).append(kl)
        return kl


# fonts already cached by CapCut on this machine (all have Cyrillic); key = path
_FC = "C:/Users/User/AppData/Local/CapCut/User Data/Cache/effect/"
FONT_PLAYFAIR = _FC + "7202530229263274497/9a076418e7b5b1d8bdeb6e7eed12a6c2/Playfair Display-Regular.ttf"
FONT_OSWALD = _FC + "7182504807289065985/3166ab5a6c0d07e54f157290d93d160d/Oswald-Bold.ttf"
FONT_RUBIK = _FC + "7148699606082130433/d9b01b0f3c2256a42fbf4ba926aaeeb8/Rubik-Bold.ttf"
CAPCUT_FONTS = {
    FONT_PLAYFAIR: {"rid": "7202530229263274497", "title": "Playfair Display"},
    FONT_OSWALD: {"rid": "7182504807289065985", "title": "Oswald"},
    FONT_RUBIK: {"rid": "7148699606082130433", "title": "Rubik"},
}

# animation presets harvested from the user's own drafts (resources are cached locally)
ANIM_TYPEWRITER = {"id": "7210980292243231233", "type": "in", "start": 0, "duration": 1500000,
                   "path": "C:/Users/User/AppData/Local/CapCut/User Data/Cache/effect/7210980292243231233/6828d67634e66ace1e76c4eb7cc2f8e6",
                   "platform": "all", "resource_id": "7210980292243231233", "third_resource_id": "7210980292243231233",
                   "source_platform": 1, "name": "Typewriter", "category_id": "ruchang", "category_name": "text",
                   "panel": "", "material_type": "sticker", "anim_adjust_params": None, "request_id": ""}
ANIM_TYPE1 = {"id": "6724920249654710791", "type": "in", "start": 0, "duration": 1500000,
              "path": "C:/Users/User/AppData/Local/CapCut/User Data/Cache/effect/6724920249654710791/c539514fc398e05a6cf4d7c196f78305",
              "platform": "all", "resource_id": "6724920249654710791", "third_resource_id": "6724920249654710791",
              "source_platform": 1, "name": "Type 1", "category_id": "ruchang", "category_name": "text",
              "panel": "", "material_type": "sticker", "anim_adjust_params": None, "request_id": ""}
ANIM_TEXT_OUT = {"id": "6724919382104871427", "type": "out", "start": 0, "duration": 600000,
                 "path": "C:/Users/User/AppData/Local/CapCut/User Data/Cache/effect/6724919382104871427/6ecc8fa1d956c3e14c84cdc0679982a9",
                 "platform": "all", "resource_id": "6724919382104871427", "third_resource_id": "6724919382104871427",
                 "source_platform": 1, "name": "Fade Out", "category_id": "chuchang", "category_name": "Out",
                 "panel": "", "material_type": "sticker", "anim_adjust_params": {"anim_mode": "all", "direction": ""},
                 "request_id": ""}
ANIM_VIDEO_FADE_IN = {"id": "6798320778182922760", "type": "in", "start": 0, "duration": 1500000,
                      "path": "C:/Users/User/AppData/Local/CapCut/User Data/Cache/effect/6798320778182922760/883ad04bd79b502aaa55b5d9b87175ea",
                      "platform": "all", "resource_id": "6798320778182922760", "third_resource_id": "6798320778182922760",
                      "source_platform": 1, "name": "Fade In", "category_id": "6753", "category_name": "In",
                      "panel": "video", "material_type": "video", "anim_adjust_params": None, "request_id": ""}


def anim(preset, duration_us, start_us=0):
    a = copy.deepcopy(preset)
    a["duration"] = int(duration_us)
    a["start"] = int(start_us)
    return a
