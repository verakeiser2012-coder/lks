# -*- coding: utf-8 -*-
"""Груша v7 — rebuilt ON TOP of the user's hand-edited 'Груша_v6_кино' draft (her cuts/moves are kept).

Everything generated is re-derived from the current main track, anchored by camera-B time so it
follows the footage wherever it was moved:
- opening: aromatic-tablet mockup card (ГРУША / mark / DJ LEVKA fading in one by one) → pouch shot
  with the typed line «натуральные ароматные истории»
- chapter cards (full frame, same style), credits as full-frame cards between the outtakes, no music there
- big cinematic camera moves (corner → both heroes, slow push-ins, lateral dollies) on every talking shot
- quotes on painterly brush strokes, Roboto Slab (LEVKEYSER brand font), slow typewriter
- camera-B clear audio under every GoPro shot, Dream under the montage + logo/end cards only
"""
import os, sys, json, io, shutil, uuid, time, copy
sys.path.insert(0, os.path.dirname(__file__))
from grusha_lib import Draft, us, uid, anim, ANIM_TYPEWRITER, ANIM_TEXT_OUT, ANIM_VIDEO_FADE_IN
from make_plates2 import caption_plate, neon_backdrop, caption_scrim

ROOT = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
SRC_NAME, DST_NAME = "Груша_v7_главы", "Груша_v7_главы"   # rebuild in place over her edits
SRC, DST = os.path.join(ROOT, SRC_NAME), os.path.join(ROOT, DST_NAME)
TOOLS = r"C:\Users\User\Desktop\site\tools"
AUD = os.path.join(TOOLS, "grusha_audio")
PODCAST_DIR = r"C:\Users\User\Desktop\ИП КЕЙСЕР Л.М\ТОВАРЫ и БРЕНДЫ\подкаст Груша 31 июля 2026"   # переехали с E: 12.09.2026
DREAM = r"C:\Users\User\Desktop\Музыка\Релизы\2026 - Soundstates (EP)\MP3\02 d r e a m.mp3"   # папка альбома разобрана 11.09
DREAM_DUR = us(194.15)
FONT_B = os.path.join(TOOLS, "fonts", "RobotoSlab-Bold.ttf")
FONT_R = os.path.join(TOOLS, "fonts", "RobotoSlab-Regular.ttf")
# diagnostic variants: VARIANT=nofont|nokf|nocards|bare  (bare = all three)
VARIANT = os.environ.get("VARIANT", "")
NOFONT, NOKF, NOCARDS = [(VARIANT == "bare") or (VARIANT == v) for v in ("nofont", "nokf", "nocards")]
if VARIANT:
    DST_NAME = "Груша_v7_" + {"nofont": "a_шрифт", "nokf": "b_камера", "nocards": "c_карточки", "bare": "d_голый"}[VARIANT]
    DST = os.path.join(ROOT, DST_NAME)
if NOFONT:
    from grusha_lib import FONT_PLAYFAIR
    FONT_B = FONT_R = FONT_PLAYFAIR
INK = (30/255, 24/255, 18/255)
NEON = (0xE8/255, 0xFF/255, 0xD0/255)          # pale core of the LEVKEYSER neon
NEON_RIM = ("#8FC65C", "#2F5A16")             # rim colour, glow colour
GOLD = (0xBD/255, 0x7F/255, 0x31/255)
PLATE = {1: "plate_q1.png", 2: "plate_q2.png", 3: "plate_q3.png"}
PHOTO_DUR = 10800000000

# ------------------------------------------------------------------ 0. copy the user's draft, strip my old tracks
IN_PLACE = os.path.abspath(SRC) == os.path.abspath(DST)
if IN_PLACE:                                   # keep her project entry, id and CapCut sidecars
    shutil.copy(os.path.join(DST, "draft_content.json"),
                os.path.join(TOOLS, "backups", "v7_%s.json" % time.strftime("%m%d_%H%M%S")))
elif os.path.exists(DST):
    shutil.rmtree(DST)
# Copy ONLY the two files a draft really owns. CapCut 9.4-beta crashes on open when the copied
# sidecars (timeline_layout.json, draft_biz_config.json, key_value.json, Timelines\…) still carry
# the source project's timeline ids; it regenerates all of them itself on first open.
if not IN_PLACE:
    os.makedirs(DST)
    for f in ("draft_content.json", "draft_meta_info.json", "draft_cover.jpg"):
        if os.path.exists(os.path.join(SRC, f)):
            shutil.copy(os.path.join(SRC, f), os.path.join(DST, f))
D = Draft(os.path.join(DST, "draft_content.json"))
d = D.d
MINE = ("Плашки", "Имя ·", "Цитаты", "Титры", "Музыка ·", "Звук ·", "Заставка", "Карточки", "Главы")   # ДОСЪЁМКИ — ниже, отдельно
d["tracks"] = [t for t in d["tracks"] if not any((t.get("name") or "").startswith(p) for p in MINE)]
# куски B-звука, которые она подкладывала руками на безымянные дорожки (16.09 на 16:53 — со сдвигом 9 с):
# после пересборки они задваивают мой звук, убираем
_amats = {m["id"]: m for m in d["materials"]["audios"]}
for t in d["tracks"]:
    if t["type"] == "audio" and not t.get("name"):
        t["segments"] = [s for s in t["segments"]
                         if not os.path.basename(_amats[s["material_id"]]["path"]).startswith("B_2026")]
d["tracks"] = [t for t in d["tracks"] if t["segments"] or t is d["tracks"][0]]
gsync = json.load(open(os.path.join(AUD, "sync_offsets.json")))
vsync = json.load(open(os.path.join(AUD, "sync_vert.json")))
anchors = json.load(io.open(os.path.join(AUD, "caption_anchors.json"), encoding="utf-8"))
mats = {m["id"]: m for m in D.m["videos"]}
for mm in D.m["videos"]:
    if mm.get("type") != "photo" and not os.path.exists(mm["path"]):
        for root_, _, files in os.walk(PODCAST_DIR):
            if os.path.basename(mm["path"]) in files:
                mm["path"] = os.path.join(root_, os.path.basename(mm["path"])).replace("\\", "/")
                break
vt = D.video_track()


def base(seg):
    return os.path.basename(mats[seg["material_id"]]["path"]).rsplit(".", 1)[0]


def kind(seg):
    m = mats[seg["material_id"]]
    if m.get("type") == "photo":
        return "card"
    if m["height"] > m["width"]:
        return "vert"
    return "gopro" if base(seg) in gsync else "other"


def brange(seg):
    b = base(seg)
    ss = seg["source_timerange"]["start"]/1e6
    du = seg["target_timerange"]["duration"]/1e6*(seg.get("speed", 1.0) or 1.0)
    if b in gsync:
        return gsync[b]["B"], ss+gsync[b]["offset"], ss+gsync[b]["offset"]+du
    if b in vsync and vsync[b].get("B"):
        return vsync[b]["B"], ss+vsync[b]["offset"], ss+vsync[b]["offset"]+du
    return None, None, None


def generated(s):
    """a shot this script inserted on an earlier run — must be dropped, or it piles up every rebuild"""
    if (s.get("desc") or "").startswith("grusha:"):
        return True
    return (base(s) == "VID_20260731_111149" and s["source_timerange"]["start"] == 0      # legacy, untagged
            and abs(s["target_timerange"]["duration"] - us(4.5)) < us(0.2) and not s.get("volume"))


old = [s for s in vt["segments"]                       # drop old title/black cards and my own inserts
       if kind(s) != "card" and base(s) != "title_card" and not generated(s)]
# мешочек ставим туда же, где он стоял у неё (перед тем же её планом), а не сразу за заставкой
pouch_before = None
_seen = False
for s in vt["segments"]:
    if (s.get("desc") or "") == "grusha:pouch":
        _seen = True
    elif _seen and s in old:
        pouch_before = id(s); break
# плейсхолдеры досъёмок она убирает руками по мере готовности — восстанавливаем только оставшиеся
_pick = [t for t in D.d["tracks"] if (t.get("name") or "").startswith("ДОСЪЁМКИ")]
_tm = {m["id"]: m for m in D.m["texts"]}
pickups_left = None
if _pick:
    pickups_left = {json.loads(_tm[s["material_id"]]["content"])["text"] for s in _pick[0]["segments"]}
D.d["tracks"] = [t for t in D.d["tracks"] if t not in _pick]
for s in old:                                   # wipe my v6 camera moves; they get rebuilt below
    s["common_keyframes"] = []
    s["keyframe_refs"] = []
    if kind(s) in ("gopro", "other"):
        s["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        s["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        s["uniform_scale"] = {"on": True, "value": 1.0}
print("main segments kept from the user's draft:", len(old))

# chapter starts — (B file, B time) of the first shot of each chapter in the user's current cut
# Cards are anchored to a camera-B moment, so they survive any re-cut she does in CapCut.
CARDS = json.load(io.open(os.path.join(AUD, "card_anchors.json"), encoding="utf-8"))
# «возжигание» и «мужское и женское» 14.09 переехали на новые точки — прежние куски она вырезала,
# но темы в записи ещё звучат. 17.09: «возжигание» — на 6:44 по её просьбе, план про морёный дуб
# режется на «…такие сокровища» (112704@476.3, cut), дальше показ возжигания;
# «мужское и женское» на «мужской женской истории» (112704@328.4)
CH_NAMES = ["знакомство", "почему так долго", "возжигание", "мужское и женское", "как ты пришёл",
            "выбираем эфиры", "смешиваем", "ольфакторная схема"]
CHAPTERS = [(c["n"], CH_NAMES[c["n"]-1]) for c in CARDS["chapters"]]
ORD_RU = ["первая", "вторая", "третья", "четвёртая", "пятая", "шестая", "седьмая", "восьмая", "девятая"]


def seg_at(B, t):
    """the shot in the current cut that shows camera-B second t of file B"""
    best = None
    for x in old:
        Bs, b0, b1 = brange(x)
        if Bs == B and b0 is not None and b0 - 0.6 <= t < b1 + 0.6:
            if best is None or abs(b0 - t) < best[1]:
                best = (x, abs(b0 - t))
    return best[0] if best else None


def split_at(x, B, t):
    """cut shot x at camera-B second t (the chapter card then lands exactly there, not at the shot's start)"""
    Bs, b0, b1 = brange(x)
    if t - b0 < 1.0 or b1 - t < 1.0:
        return x
    spd = x.get("speed", 1.0) or 1.0
    head_us = int(us(t - b0) / spd)
    tail = D.clone_video_segment(x, src_start_us=x["source_timerange"]["start"] + int(us(t - b0)),
                                 dur_us=x["target_timerange"]["duration"] - head_us,
                                 tgt_start_us=x["target_timerange"]["start"] + head_us)
    x["target_timerange"]["duration"] = head_us
    x["source_timerange"]["duration"] = int(round(head_us * spd))
    old.insert(old.index(x) + 1, tail)
    return tail


chap_keys, closing_key = {}, None
for c in CARDS["chapters"]:
    x = seg_at(c["B"], c["t"])
    if x is not None and c.get("cut"):
        x = split_at(x, c["B"], c["t"])
    if x is not None:
        chap_keys[id(x)] = (c["n"], CH_NAMES[c["n"]-1])
    else:
        print("!! глава %d потеряла точку привязки" % c["n"])
_cl = seg_at(CARDS["credits_after"]["B"], CARDS["credits_after"]["t"])
closing_key = id(_cl) if _cl is not None else None

# ------------------------------------------------------------------ 1. materials for cards / overlays
def photo(name):
    return D.add_video_material(os.path.join(TOOLS, name), 1920, 1080, PHOTO_DUR, False, "photo")


title_bg, chapter_bg = photo("title_bg.png"), photo("chapter_bg.png")
ov_mats = {n: photo(n) for n in ["title_grusha.png", "title_mark.png", "title_levka.png", "card_logo.png", "card_end.png",
           "chapter_mark.png", "qr_end.png", "end_mark.png"] + ["credit_%02d.png" % i for i in range(1, 5)]}
plate_ids = {}                      # filled on demand — every caption gets a stroke cut to its own text

# pouch shot for the second title frame: the unused first 4.5 s of VID_20260731_111149 (tray of incense)
pouch_src = next(s for s in old if base(s) == "VID_20260731_111149")

# CHAP чуть длиннее (было 4.0): "глава N" + название печатаются посимвольно и должны успеть дочитаться
TITLE, POUCH, CHAP, CRED, LOGO, END = us(6.0), us(4.5), us(5.5), us(4.5), us(6.0), us(7.0)
new, overlays = [], []      # overlays: (material name, start, dur, fade)


def card(mat_id, dur, tag):
    if NOCARDS:
        return None
    s = D.new_video_segment(mat_id, 0, dur, 0, volume=0.0)
    D.set_video_anims(s, [anim(ANIM_VIDEO_FADE_IN, us(0.8))])
    new.append([s, tag]); return s


title = card(title_bg, TITLE, "title")
pouch = None
if not NOCARDS:
    pouch = D.clone_video_segment(pouch_src, src_start_us=0, dur_us=POUCH, speed=1.0)
    pouch["volume"] = 0.0
    pouch["desc"] = "grusha:pouch"
    if pouch_before is None:
        new.append([pouch, "pouch"])

end_card = None
chapter_cards = []     # (n, name, card segment) — текст глав печатается позже, когда caption() уже определена
for i, s in enumerate(old):
    if pouch is not None and id(s) == pouch_before:
        new.append([pouch, "pouch"])
    if id(s) in chap_keys:
        n, name = chap_keys[id(s)]
        c = card(chapter_bg, CHAP, "chapter")
        if c:
            overlays.append(("chapter_mark.png", c, 0.9))
            chapter_cards.append((n, name, c))
    new.append([s, kind(s)])
    if id(s) == closing_key:
        c = card(chapter_bg, LOGO, "logo")
        if c: overlays.append(("card_logo.png", c, 1.2))
        rest = old[i+1:]
        outtakes = []                                  # приколы: титры пойдут текстом поверх них
        for k, ot in enumerate(rest):
            new.append([ot, kind(ot)])
            outtakes.append(ot)
        c = card(chapter_bg, END, "end")
        if c: overlays.append(("end_mark.png", c, 1.0))     # финал — в стиле главы, две колонки: текст слева, QR справа
        end_card = c
        break

vt["segments"] = [x[0] for x in new]
D.finalize()
tags = {id(s): t for s, t in new}

# ------------------------------------------------------------------ 2. overlay tracks (cards' text layers, title names)
ovtrack = D.add_track("video", "Карточки · текст")
for name, c, fade in overlays:
    st, du = c["target_timerange"]["start"], c["target_timerange"]["duration"]
    o = D.new_video_segment(ov_mats[name], 0, du - us(0.3), st + us(0.3), volume=0.0)
    o["render_index"] = 1
    D.set_video_anims(o, [anim(ANIM_VIDEO_FADE_IN, us(fade))])
    ovtrack["segments"].append(o)
if end_card:                                   # QR на сайт — справа от знака, проявляется после «подпишись»
    qt = D.add_track("video", "Карточки · QR")
    st, du = end_card["target_timerange"]["start"], end_card["target_timerange"]["duration"]
    o = D.new_video_segment(ov_mats["qr_end.png"], 0, du - us(2.6), st + us(2.6), volume=0.0)
    o["render_index"] = 2
    D.set_video_anims(o, [anim(ANIM_VIDEO_FADE_IN, us(0.9))])
    qt["segments"].append(o)
t0 = title["target_timerange"]["start"] if title else 0
for k, (name, off) in enumerate((("title_grusha.png", 0.9), ("title_mark.png", 2.0), ("title_levka.png", 3.0)) if title else ()):
    tr = D.add_track("video", "Заставка · %d" % (k+1))
    o = D.new_video_segment(ov_mats[name], 0, TITLE - us(off), t0 + us(off), volume=0.0)
    o["render_index"] = 2 + k
    D.set_video_anims(o, [anim(ANIM_VIDEO_FADE_IN, us(1.4))])
    tr["segments"].append(o)


def place(B, t):
    """timeline time (us) where camera-B second t of file B is shown, or None if that moment was cut."""
    for s in vt["segments"]:
        if tags[id(s)] not in ("gopro", "vert"):
            continue
        Bs, b0, b1 = brange(s)
        if Bs == B and b0 is not None and b0 - 0.05 <= t < b1:
            return s["target_timerange"]["start"] + us((t-b0)/(s.get("speed", 1.0) or 1.0))
    return None


# ------------------------------------------------------------------ 3. camera-B audio + Dream
atrack = D.add_track("audio", "Звук · камера B (оригинал)")
BDUR = {"20260731_110808": 544.07, "20260731_112043": 273.04, "20260731_112704": 677.46,
        "20260731_114814": 1741.48, "20260731_122810": 281.85, "20260731_124949": 741.98}
bmat = {}
for gx, info in gsync.items():
    p = os.path.join(AUD, "B_%s.clear.m4a" % info["B"])
    if not os.path.exists(p):
        p = os.path.join(AUD, "B_%s.norm.m4a" % info["B"])
    bmat[gx] = D.add_audio_material(p, us(BDUR[info["B"]]))
montage = []
for s in vt["segments"]:
    if tags[id(s)] == "gopro" and abs((s.get("speed", 1.0) or 1.0) - 1.0) < 1e-3:
        bstart = s["source_timerange"]["start"] + us(gsync[base(s)]["offset"])
        if bstart >= 0:
            atrack["segments"].append(D.new_audio_segment(
                bmat[base(s)], bstart, s["target_timerange"]["duration"], s["target_timerange"]["start"],
                volume=1.0, fade_in_us=40000, fade_out_us=40000))
            s["volume"] = 0.0; s["last_nonzero_volume"] = 1.0
    if abs((s.get("speed", 1.0) or 1.0) - 1.0) > 1e-3:
        montage.append(s); s["volume"] = 0.0

mtrack = D.add_track("audio", "Музыка · d r e a m")
dream_id = None
for a_ in D.m["audios"]:                       # старый материал Dream переводим на новый путь, а не плодим второй
    if os.path.basename(a_["path"]).lower() in ("d-r-e-a-m-dj-levka.mp3", "02 d r e a m.mp3"):
        a_["path"] = DREAM.replace("\\", "/")          # все копии материала, не только первая
        dream_id = dream_id or a_["id"]
dream_id = dream_id or D.add_audio_material(DREAM, DREAM_DUR)
if montage:
    m0 = min(s["target_timerange"]["start"] for s in montage)
    m1 = max(s["target_timerange"]["start"] + s["target_timerange"]["duration"] for s in montage)
    mtrack["segments"].append(D.new_audio_segment(dream_id, us(24.0), m1-m0, m0, volume=0.9, fade_in_us=us(1.2), fade_out_us=us(2.5)))
for s in vt["segments"]:
    if tags[id(s)] in ("logo", "end"):
        st, du = s["target_timerange"]["start"], s["target_timerange"]["duration"]
        mtrack["segments"].append(D.new_audio_segment(dream_id, us(36.0), du, st, volume=0.5, fade_in_us=us(1.0), fade_out_us=us(2.5)))
mtrack["segments"].append(D.new_audio_segment(dream_id, us(0.0), TITLE + POUCH, 0, volume=0.6, fade_in_us=us(0.8), fade_out_us=us(2.0)))

# ------------------------------------------------------------------ 4. cinematic camera moves
def ease(a, b, n=5):
    """smoothstep-sampled values between a and b, n keyframes."""
    out = []
    for i in range(n):
        u = i/(n-1); w = u*u*(3-2*u)
        out.append((u, a+(b-a)*w))
    return out


def move(seg, S, X, Y, phases=None):
    if NOKF or seg is None:
        return
    dur = seg["target_timerange"]["duration"]
    pts = []
    if phases is None:
        phases = [(0.0, S[0], X[0], Y[0]), (1.0, S[1], X[1], Y[1])]
    for (u0, s0, x0, y0), (u1, s1, x1, y1) in zip(phases, phases[1:]):
        for k, (u, _) in enumerate(ease(0, 1)):
            w = u*u*(3-2*u)
            t = int(dur*(u0+(u1-u0)*u))
            pts.append((t, s0+(s1-s0)*w, x0+(x1-x0)*w, y0+(y1-y0)*w))
    seen = set(); pts = [p for p in pts if not (p[0] in seen or seen.add(p[0]))]
    D.add_keyframes(seg, "KFTypeScaleX", [(t, s) for t, s, x, y in pts])
    D.add_keyframes(seg, "KFTypeScaleY", [(t, s) for t, s, x, y in pts])
    D.add_keyframes(seg, "KFTypePositionX", [(t, x) for t, s, x, y in pts])
    D.add_keyframes(seg, "KFTypePositionY", [(t, y) for t, s, x, y in pts])
    # KFTypeScaleX/Y and uniform_scale are mutually exclusive — leaving uniform on makes CapCut
    # apply only the X keyframes and the picture comes out squashed.
    seg["uniform_scale"] = {"on": False, "value": 1.0}
    seg["clip"]["scale"] = {"x": pts[0][1], "y": pts[0][1]}
    seg["clip"]["transform"] = {"x": pts[0][2], "y": pts[0][3]}


# Груша sits left, Лев right. x>0 slides the picture right → we look at the LEFT side (Груша).
MOVES = [
    lambda s: move(s, (1.55, 1.0), (0.26, 0.0), (-0.12, 0.0)),          # from Груша's corner out to both
    lambda s: move(s, (1.0, 1.32), (0.0, -0.12), (0.0, -0.04)),          # slow push in toward Лев
    lambda s: move(s, (1.55, 1.0), (-0.26, 0.0), (-0.12, 0.0)),         # from Лев's corner out to both
    lambda s: move(s, (1.28, 1.28), (0.13, -0.13), (-0.03, -0.03)),     # lateral dolly
    lambda s: move(s, (1.0, 1.32), (0.0, 0.12), (0.0, -0.04)),           # slow push in toward Груша
    lambda s: move(s, (1.7, 1.15), (0.0, 0.0), (0.28, 0.02)),            # tilt up from the table
]
# A move is an accent, not a default: the opening gets its full run, then roughly one every five
# minutes, and only on a shot long enough to carry it. Everything else stays locked off.
OPENING_UNTIL = us(45)
MOVE_GAP = us(300)
MIN_LEN = us(8.0)
k, last_move, moved = 0, None, []
for s in vt["segments"]:
    if tags[id(s)] not in ("gopro", "other") or s in montage:
        continue
    st, dur = s["target_timerange"]["start"], s["target_timerange"]["duration"]
    if dur < us(3.0):
        continue
    opening = st < OPENING_UNTIL
    due = last_move is None or st - last_move >= MOVE_GAP
    if not (opening or (due and dur >= MIN_LEN)):
        continue
    if dur > us(75):        # long talk: push in, hold with a drift, settle back
        move(s, None, None, None, phases=[(0.0, 1.0, 0.0, 0.0), (0.38, 1.3, -0.1, -0.03), (0.72, 1.3, 0.1, -0.03), (1.0, 1.05, 0.0, 0.0)])
    else:
        MOVES[k % len(MOVES)](s)
    last_move = st
    moved.append(st/1e6)
    k += 1
# принудительные проезды по моментам разговора (файл камеры B, секунда, фазы в секундах от момента)
FORCED = [
    # уд: медленный наезд, пока нюхают и говорят «самое дорогое», уход в сторону на истории про аквиларию,
    # возврат на пало санто
    ("20260731_112704", [(321.0, 1.00, 0.00, 0.00), (332.0, 1.00, 0.00, 0.00), (346.0, 1.26, -0.06, -0.04),
                         (392.0, 1.18, -0.02, -0.03), (405.0, 1.22, 0.12, -0.02), (424.0, 1.22, 0.12, -0.02),
                         (440.0, 1.06, 0.00, 0.00), (457.0, 1.00, 0.00, 0.00)]),
    # 01:11 — Груша про «провести аромат через глину»: медленный наезд на неё
    ("20260731_110808", [(299.3, 1.00, 0.00, 0.00), (313.4, 1.30, 0.10, -0.04)]),
]
for Bf, ph in FORCED:
    for s in vt["segments"]:
        if tags[id(s)] != "gopro": continue
        Bs, b0, b1 = brange(s)
        if Bs != Bf or not (b0 <= ph[0][0] + 0.5 and b1 >= ph[-1][0] - 0.5): continue
        if s.get("common_keyframes"):
            s["common_keyframes"] = []                    # свой проезд важнее дежурного
        span = b1 - b0
        move(s, None, None, None, phases=[((t - b0) / span, sc, x, y) for t, sc, x, y in ph])
        moved.append(s["target_timerange"]["start"] / 1e6)
        break
move(title, (1.0, 1.07), (0.0, 0.0), (0.0, 0.0))
if pouch:
    pm = mats[pouch["material_id"]]
    FILL = 1920.0 / (pm["width"] * 1080.0 / pm["height"])        # вертикалка во весь горизонтальный кадр
    pouch["clip"]["scale"] = {"x": FILL, "y": FILL}
    pouch["clip"]["transform"] = {"x": 0.0, "y": 0.0}
    move(pouch, None, None, None, phases=[(0.0, FILL*1.12, 0.0, 0.03), (1.0, FILL, 0.0, 0.0)])

# ------------------------------------------------------------------ 5. captions
def type_ms(text):
    return int(min(7.0e6, max(1.8e6, 110000*len(text))))


plates = D.add_track("video", "Плашки (мазки)")
plates2 = D.add_track("video", "Плашки (мазки) · 2")


_plate_seq = [0]


def caption(track, text, start, dur, size, color, x=0.0, y=-0.62, plate=None, styles=None, ls=0.03,
            line_spacing=0.12, tw=None, plate_track=None, font=FONT_R, out=True, neon=None, pad=(130, 64)):
    if plate is True:          # feathered dark scrim cut to fit exactly this caption
        _plate_seq[0] += 1
        plate = "scrim_auto_%02d.png" % _plate_seq[0]
        # подложку меряем по реальным стилям строк (жирный термин крупнее тела справки)
        spec, pos = [], 0
        for ln in text.split("\n"):
            a, b = pos, pos + len(ln)
            runs = [(sz, fp) for (s0, s1, sz, fp, _c) in (styles or []) if s0 < b and s1 > a]
            sz = max((r[0] for r in runs), default=size)
            fp = next((r[1] for r in runs if r[0] == sz), font)
            spec.append((ln, sz, fp)); pos = b + 1
        caption_scrim(text, size, 960 + x*960, 540 - y*540, plate, font_path=font, letter_spacing=ls,
                      peak=235, pad_x=pad[0], pad_y=pad[1], spec=spec)
        plate_ids[plate] = photo(plate)
    mid = D.add_text_material(text, font, size, color, align=1, letter_spacing=ls, line_spacing=line_spacing,
                              shadow=False, styles=styles, neon=neon)
    an = [anim(ANIM_TYPEWRITER, tw or type_ms(text))]
    if out:
        an.append(anim(ANIM_TEXT_OUT, 600000))
    s = D.new_text_segment(mid, start, dur, x=x, y=y, anims=an, render_index=14000)
    track["segments"].append(s)
    if plate:
        p = D.new_video_segment(plate_ids[plate], 0, dur, start, volume=0.0)
        p["render_index"] = 1
        D.set_video_anims(p, [anim(ANIM_VIDEO_FADE_IN, us(0.5))])
        (plate_track or plates)["segments"].append(p)
    return s


if pouch:
    intro = D.add_track("text", "Заставка · подпись")
    caption(intro, "натуральные ароматные истории", pouch["target_timerange"]["start"] + us(0.4), POUCH - us(0.4), 6.4, NEON,
            tw=us(2.6), ls=0.06, neon=NEON_RIM, plate=True)

first = next(s for s in vt["segments"] if tags[id(s)] == "gopro")
t0 = first["target_timerange"]["start"] + us(0.3)
for trk, name, sub, x, pl, st, ptr in (
        ("Имя · Груша", "ГРУША", "благовония · керамика · сказки", -0.5, True, t0, None),
        ("Имя · Лев", "ЛЕВ КЕЙСЕР", "DJ Levka · мода · кино", 0.5, True, t0 + us(2.0), plates2)):
    txt = name + "\n" + sub
    caption(D.add_track("text", trk), txt, st, us(7.0) if x < 0 else us(5.0), 8, NEON, x=x, plate=pl, plate_track=ptr,
            styles=[(0, len(name), 8, FONT_B, NEON), (len(name), len(txt), 5.4, FONT_R, NEON)], ls=0.06, tw=us(2.2),
            line_spacing=0.02,
            neon=NEON_RIM)

# label и name — на разных дорожках: name начинает печататься, пока label ещё дочитывается
chap_text = D.add_track("text", "Главы · печатная анимация")
chap_text2 = D.add_track("text", "Главы · печатная анимация · 2")


def chapter_text(c, label, name, x=0.0):
    st, du = c["target_timerange"]["start"], c["target_timerange"]["duration"]
    lbl_tw = min(type_ms(label), us(1.3))
    lbl_start = st + us(0.35)
    lbl_dur = lbl_tw + us(1.0)
    caption(chap_text, label, lbl_start, lbl_dur, 5.4, NEON, x=x, y=0.19, tw=lbl_tw, neon=NEON_RIM, ls=0.25,
           font=FONT_R, out=False)
    name_start = lbl_start + lbl_tw + us(0.25)
    name_dur = st + du - name_start - us(0.3)
    name_tw = min(type_ms(name), name_dur - us(1.0))
    name_size = 11.5 if len(name) < 16 else 9.4
    caption(chap_text2, name, name_start, name_dur, name_size, NEON, x=x, y=-0.23, tw=name_tw, neon=NEON_RIM,
           ls=0.10, font=FONT_B)
    return name_start


for n, name, c in chapter_cards:
    chapter_text(c, "глава " + ORD_RU[n-1], name)
if end_card:                                   # геометрия колонок — make_qr_end.py (SHIFT=240, QR в 1300×560)
    ns = chapter_text(end_card, "глава последняя", "подпишись", x=-240/960)
    caption(intro, "levkeiser.com/podcast", ns + us(1.6), end_card["target_timerange"]["start"] + END - ns - us(1.9),
            3.5, NEON, x=(1300-960)/960, y=-(728-540)/540, tw=us(1.2), neon=NEON_RIM, ls=0.06, font=FONT_R)

quotes = D.add_track("text", "Цитаты (печатная машинка)")
planned, skipped = [], []
for B, t, txt in anchors["quotes"]:
    st = place(B, t)
    (planned if st is not None else skipped).append((st, txt, "quote") if st is not None else txt)
for Bn, tn, term, definition in anchors.get("notes", []):
    st = place(Bn, tn)
    if st is None:
        skipped.append(term); continue
    planned.append((st, term + "\n" + definition, "note"))
planned.sort()
READ = us(3.5)
cards_tl = [(s["target_timerange"]["start"], s["target_timerange"]["start"] + s["target_timerange"]["duration"])
            for s in vt["segments"] if tags[id(s)] in ("chapter", "logo", "end")]
# надпись не должна лечь на карточку главы: если термин прозвучал прямо перед ней — печатаем сразу после,
# иначе обрываем до карточки (так «мацерация» уезжала под заставку восьмой главы)
for i, item in enumerate(planned):
    for cs, ce in cards_tl:
        if item[0] < cs < item[0] + type_ms(item[1]) + READ and cs - item[0] < us(4.0):
            planned[i] = (ce + us(0.3),) + tuple(item[1:])
planned.sort()
for i, item in enumerate(planned):
    start, txt = item[0], item[1]
    kind_ = item[2] if len(item) > 2 else "quote"
    slot = (planned[i+1][0] - start - us(0.4)) if i+1 < len(planned) else us(12.0)
    for cs, ce in cards_tl:
        if start < cs:
            slot = min(slot, cs - start - us(0.3))
    dur = max(us(2.2), min(type_ms(txt) + READ + (us(1.5) if kind_ == "note" else 0), slot))
    tw = max(us(0.8), min(type_ms(txt), dur - us(1.4)))
    if kind_ == "note":
        head = txt.split("\n", 1)[0]
        caption(quotes, txt, start, dur, 5.2, NEON, tw=tw, neon=NEON_RIM, plate=True,
                styles=[(0, len(head), 6.2, FONT_B, NEON), (len(head), len(txt), 5.0, FONT_R, NEON)])
    else:
        caption(quotes, txt, start, dur, 5.6, NEON, tw=tw, neon=NEON_RIM, plate=True)

# ---- крючки для промо-вертикалок из приколов (в основном выпуске не используются — зритель его уже смотрит);
#      пригодятся, когда будем резать тизеры: CREDITS = PROMO_HOOKS
PROMO_HOOKS = [
    "почему уд дороже золота\nи за ним ездят в таиланд — в полном выпуске",
    "аромат собирается как трек:\nоснова, слои, время — в полном выпуске",
    "что такое бахур и зачем он тлеет\nна угле — в полном выпуске",
    "карта 166 ароматов и своя смесь\nlevkeiser.com/aroma",
]
# ---- титры основного выпуска поверх приколов: кто, что, спасибо
CREDITS = [
    "в кадре — груша\nблаговония · керамика · сказки",
    "лев кейсер\nмузыка · dj levka",
    "снято в мастерской «груша»",
    "музыка — d r e a m · dj levka\nальбом soundstates",
    "монтаж и звук — лев кейсер",
    "ароматная таблетка и карта ароматов\nгруша × лев · levkeiser.com",
    "своя смесь из 166 ароматов\nlevkeiser.com/aroma",
    "спасибо груше —\nза дом, ароматы и терпение",
    "спасибо, что досмотрели\nновые выпуски — levkeiser.com",
]
credits_t = D.add_track("text", "Титры (поверх приколов)")
for k, ot in enumerate(outtakes if "outtakes" in dir() else []):
    if k >= len(CREDITS):
        break
    st, du = ot["target_timerange"]["start"], ot["target_timerange"]["duration"]
    if du < us(2.5):
        continue
    txt = CREDITS[k]
    lead = us(0.5)
    tw = max(us(0.8), min(type_ms(txt), du - lead - us(1.5)))
    dur = min(du - lead - us(0.3), tw + us(5.0))          # прочитали — и прикол дальше без надписи
    caption(credits_t, txt, st + lead, dur, 5.4, NEON, y=-0.30, tw=tw, neon=NEON_RIM, plate=True, ls=0.02)

# ---- плашка с адресом: с разговора про магазин Льва (17:42) до финального логотипа, угол кадра
site_t = D.add_track("text", "Плашки · адрес")
site_p = D.add_track("video", "Плашки · адрес (подложка)")
site_from = place("20260731_110808", 430.0)
logo_at = next((s["target_timerange"]["start"] for s in vt["segments"] if tags[id(s)] == "logo"), None)
if site_from is not None and logo_at:
    pieces, cur = [], site_from
    for cs, ce in sorted(cards_tl):
        if cur < cs < logo_at:
            pieces.append((cur, cs)); cur = ce
    pieces.append((cur, logo_at))
    for k, (a, b) in enumerate(pieces):
        caption(site_t, "levkeiser.com", a + us(0.2), b - a - us(0.4), 3.4, NEON, x=0.66, y=-0.86, tw=us(1.2),
                neon=NEON_RIM, ls=0.08, plate=True, plate_track=site_p, pad=(60, 30), out=(k == len(pieces) - 1))

ph = D.add_track("text", "ДОСЪЁМКИ — плейсхолдеры (удалить)")
for B, t, txt in anchors["pickups"]:
    if pickups_left is not None and txt not in pickups_left:
        continue
    st = place(B, t)
    if st is None:
        skipped.append(txt); continue
    mid = D.add_text_material(txt, FONT_R, 3.6, GOLD, align=1, letter_spacing=0.0, shadow=True)
    ph["segments"].append(D.new_text_segment(mid, st, us(4.0), x=0.0, y=0.82, anims=[], render_index=14000))

# ------------------------------------------------------------------ 6. save + meta
D.finalize()
ref = set()                                     # drop materials orphaned by the removed v6 tracks
for tr in d["tracks"]:
    for s in tr["segments"]:
        ref.add(s["material_id"]); ref.update(s.get("extra_material_refs") or [])
PRUNE = ("videos", "audios", "texts", "canvases", "audio_fades", "material_animations", "placeholder_infos",
         "speeds", "sound_channel_mappings", "material_colors", "loudnesses", "vocal_separations")
for cat in PRUNE:
    lst = d["materials"].get(cat)
    if isinstance(lst, list):
        d["materials"][cat] = [m for m in lst if not (isinstance(m, dict) and m.get("id")) or m["id"] in ref]
for tr in d["tracks"]:
    if tr["type"] == "video" and tr is not vt:
        for s in tr["segments"]:
            s["render_index"] = max(1, s.get("render_index", 1))
d["name"] = DST_NAME
new_id = d["id"] if IN_PLACE else str(uuid.uuid4()).upper()   # in place: keep her project's identity
d["id"] = new_id
d["update_time"] = int(time.time()*1000000)
D.save()
# CapCut updated itself (2026-09-03) and deleted its old Apps/<ver>/ folder; any font path still pointing
# there makes the player refuse to start. Rewrite every Apps/<ver>/ reference to the installed version.
import re
APPS = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "Apps")
CAPCUT_APP_VER = sorted(x for x in os.listdir(APPS) if re.match(r"^\d+(\.\d+)+$", x))[-1]
jp = os.path.join(DST, "draft_content.json")
txt = io.open(jp, encoding="utf-8").read()
txt2 = re.sub(r"Apps/\d+(?:\.\d+)+/", "Apps/%s/" % CAPCUT_APP_VER, txt)
if txt2 != txt:
    io.open(jp, "w", encoding="utf-8").write(txt2)
    print("font paths rewritten to CapCut", CAPCUT_APP_VER)
meta_p = os.path.join(DST, "draft_meta_info.json")
meta = json.load(io.open(meta_p, encoding="utf-8"))
now = int(time.time()*1000000)
meta.update({"draft_id": new_id, "draft_name": DST_NAME, "draft_fold_path": DST.replace("\\", "/"),
             "draft_root_path": ROOT.replace("\\", "/"), "tm_duration": d["duration"],
             "tm_draft_create": now, "tm_draft_modified": now})
json.dump(meta, io.open(meta_p, "w", encoding="utf-8"), ensure_ascii=False)
if not IN_PLACE:
    for _f in ("draft_biz_config.json", "timeline_layout.json", "key_value.json", "draft_virtual_store.json",
               "attachment_editing.json", "attachment_pc_common.json", "draft_settings", "draft.extra",
               "performance_opt_info.json", "draft_agency_config.json"):
        _p = os.path.join(DST, _f)      # CapCut writes these itself; a stale copy crashes 9.4-beta on open
        if os.path.exists(_p):
            os.remove(_p)
json.dump({"id": new_id, "name": DST_NAME, "duration": d["duration"], "dir": DST, "json": os.path.join(DST, "draft_content.json")},
          io.open(os.path.join(TOOLS, "v6_build_info.json"), "w", encoding="utf-8"), ensure_ascii=False)
chap_times = [(n, name, next(s for s, t in new if t == "chapter" and True)) for n, name in []]
print("built", DST_NAME, "%.1f s" % (d["duration"]/1e6), "main", len(vt["segments"]), "quotes", len(planned),
      "B-audio", len(atrack["segments"]), "montage segs", len(montage))
print("проездов камеры:", len(moved), "->", ["%d:%05.2f" % divmod(t, 60) for t in moved])
print("главы:", [(name, "%d:%05.2f" % divmod(c["target_timerange"]["start"]/1e6, 60)) for n, name, c in chapter_cards])
if skipped:
    print("пропущено (момент вырезан):", skipped)
