# -*- coding: utf-8 -*-
"""Build the 'Груша_v6_кино' CapCut draft from the user's own 'Груша_v5_правки' draft.

- camera-B original audio (loudness-normalised + speech-clarity chain) under every GoPro shot,
  verticals keep their raw phone sound
- where a vertical repeats dialogue that also sits in the neighbouring GoPro shot, the GoPro side is trimmed
- removes the 0.03 s sliver, punch-in on jump cuts, slow Ken Burns drift on talking shots
- title card fade-in + hero name captions, slow typewriter quotes on torn-paper plates
- Dream-track speed-ramp montage on the grinding sequence
- Jackie-Chan style ending: outtakes run back to back with their own sound, credits typed over them, no music
"""
import os, sys, json, io, shutil, uuid, time, copy
sys.path.insert(0, os.path.dirname(__file__))
from grusha_lib import Draft, us, uid, anim, ANIM_TYPEWRITER, ANIM_TEXT_OUT, ANIM_VIDEO_FADE_IN, FONT_PLAYFAIR

ROOT = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
SRC_NAME, DST_NAME = "Груша_v5_правки", "Груша_v6_кино"
SRC, DST = os.path.join(ROOT, SRC_NAME), os.path.join(ROOT, DST_NAME)
TOOLS = r"C:\Users\User\Desktop\site\tools"
AUD = os.path.join(TOOLS, "grusha_audio")
PODCAST_DIR = r"E:\КАРЬЕРА!!!!!\2026\подкаст Груша 31 июля 2026"
DREAM = r"C:\Users\User\Desktop\soundstates album\mp3\d-r-e-a-m-DJ-Levka.mp3"
DREAM_DUR = us(194.15)
FONT = FONT_PLAYFAIR

# text now sits on torn off-white paper (soundstates-cover style), so it is printed dark
BEIGE = (0x1A / 255, 0x16 / 255, 0x12 / 255)      # ink on paper
GOLD = (0x91 / 255, 0x45 / 255, 0x21 / 255)       # Груша brown, for headings on paper
WHITE = (1.0, 1.0, 1.0)
PLATE = {1: "plate_q1.png", 2: "plate_q2.png", 3: "plate_q3.png"}

# ------------------------------------------------------------------ 0. copy project
if os.path.exists(DST):
    shutil.rmtree(DST)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns(".locked", "*.bak", "*.tmp"))
D = Draft(os.path.join(DST, "draft_content.json"))
d = D.d
gsync = json.load(open(os.path.join(AUD, "sync_offsets.json")))
vsync = json.load(open(os.path.join(AUD, "sync_vert.json")))
mats = {m["id"]: m for m in D.m["videos"]}
for mm in D.m["videos"]:                       # one material points at a file that was moved
    if mm.get("type") != "photo" and not os.path.exists(mm["path"]):
        for root_, _, files in os.walk(PODCAST_DIR):
            if os.path.basename(mm["path"]) in files:
                mm["path"] = os.path.join(root_, os.path.basename(mm["path"])).replace("\\", "/")
                break
vt = D.video_track()
old = vt["segments"]


def base(seg):
    return os.path.basename(mats[seg["material_id"]]["path"]).rsplit(".", 1)[0]


def is_vert(seg):
    m = mats[seg["material_id"]]
    return m["height"] > m["width"]


def is_gopro(seg):
    return base(seg) in gsync


def brange(seg):
    """(camera-B file, start, end) that this segment's picture corresponds to."""
    b = base(seg)
    ss = seg["source_timerange"]["start"] / 1e6
    du = seg["target_timerange"]["duration"] / 1e6
    if b in gsync:
        return gsync[b]["B"], ss + gsync[b]["offset"], ss + gsync[b]["offset"] + du
    if b in vsync and vsync[b].get("B"):
        return vsync[b]["B"], ss + vsync[b]["offset"], ss + vsync[b]["offset"] + du
    return None, None, None


# ------------------------------------------------------------------ 1. de-duplicate around verticals
MONTAGE_OLD = (67, 68, 69, 70)
CREDITS_AFTER = 97
OUTTAKES = (98, 99, 100, 101, 102, 104, 105)
DROP = {103}
trims = []
for i, s in enumerate(old):
    if not is_vert(s) or i in DROP or i in MONTAGE_OLD:
        continue
    Bv, v0, v1 = brange(s)
    if Bv is None:
        continue
    for j in range(max(0, i - 3), min(len(old), i + 4)):
        if j == i or j in DROP or j in MONTAGE_OLD or not is_gopro(old[j]):
            continue
        Bg, g0, g1 = brange(old[j])
        if Bg != Bv:
            continue
        ov = min(v1, g1) - max(v0, g0)
        if ov <= 0.3:
            continue
        t = old[j]
        dur = t["target_timerange"]["duration"] / 1e6
        cut = min(ov, dur - 0.6)
        if cut <= 0.2:
            continue
        if j < i:                       # vertical comes after -> trim the tail of the horizontal
            t["target_timerange"]["duration"] = us(dur - cut)
            t["source_timerange"]["duration"] = us(dur - cut)
        else:                           # vertical came before -> trim the head of the horizontal
            t["source_timerange"]["start"] += us(cut)
            t["target_timerange"]["duration"] = us(dur - cut)
            t["source_timerange"]["duration"] = us(dur - cut)
        trims.append((j, "tail" if j < i else "head", round(cut, 2), base(old[i])))

# ------------------------------------------------------------------ 2. main track rebuild
new, newmap = [], {}


def push(seg, tag, oi):
    new.append([seg, tag, oi])
    newmap.setdefault(oi, seg)


card_id = D.add_video_material(os.path.join(TOOLS, "plate_card.png"), 1920, 1080, 10800000000, False, "photo")
black_id = D.add_video_material(os.path.join(TOOLS, "black.png"), 1920, 1080, 10800000000, False, "photo")
CARD = us(6.0)
cards = []
for i, s in enumerate(old):
    if i in DROP:
        continue
    if i in MONTAGE_OLD:
        if i == MONTAGE_OLD[0]:
            plan = [(67, 0.0, 4.0, 1.0), (67, 4.0, 3.0, 0.5), (67, 7.0, 13.7, 3.0),
                    (68, 0.0, 3.0, 1.0), (68, 3.0, 3.0, 0.45), (68, 6.0, 7.27, 3.0),
                    (69, 0.0, 8.97, 2.5),
                    (70, 0.0, 3.0, 0.55), (70, 3.0, 4.43, 2.0)]
            for oi, off, ln, spd in plan:
                src = old[oi]
                seg = D.clone_video_segment(src, src_start_us=src["source_timerange"]["start"] + us(off),
                                            dur_us=us(ln / spd), speed=spd)
                seg["volume"] = 0.0
                push(seg, "montage", oi)
        continue
    push(copy.deepcopy(s), "vert" if is_vert(s) else ("gopro" if is_gopro(s) else "other"), i)
    if i == CREDITS_AFTER:                       # ending starts here
        c = D.new_video_segment(black_id, 0, CARD, 0, volume=0.0)
        push(c, "card", -1)
        cards.append(c)
closing = D.new_video_segment(black_id, 0, CARD, 0, volume=0.0)
push(closing, "card", -1)
cards.append(closing)

vt["segments"] = [x[0] for x in new]
D.finalize()
T = lambda oi, off=0.0: newmap[oi]["target_timerange"]["start"] + us(off)

# ------------------------------------------------------------------ 3. camera-B audio
atrack = D.add_track("audio", "Звук · камера B (оригинал)")
BDUR = {"20260731_110808": 544.07, "20260731_112043": 273.04, "20260731_112704": 677.46,
        "20260731_114814": 1741.48, "20260731_122810": 281.85, "20260731_124949": 741.98}
bmat = {}
for gx, info in gsync.items():
    p = os.path.join(AUD, "B_%s.clear.m4a" % info["B"])
    if not os.path.exists(p):
        p = os.path.join(AUD, "B_%s.norm.m4a" % info["B"])
    bmat[gx] = D.add_audio_material(p, us(BDUR[info["B"]]))
for seg, tag, oi in new:
    if tag != "gopro":
        continue
    gx = base(seg)
    bstart = seg["source_timerange"]["start"] + us(gsync[gx]["offset"])
    if bstart < 0:
        continue
    atrack["segments"].append(D.new_audio_segment(
        bmat[gx], bstart, seg["target_timerange"]["duration"], seg["target_timerange"]["start"],
        volume=1.0, fade_in_us=40000, fade_out_us=40000))
    seg["volume"] = 0.0
    seg["last_nonzero_volume"] = 1.0

# ------------------------------------------------------------------ 4. Ken Burns + punch-in
PATTERNS = [((1.00, 1.07), (0.000, -0.020), (0.000, 0.010)),
            ((1.08, 1.01), (0.020, 0.000), (0.010, -0.005)),
            ((1.02, 1.09), (-0.020, 0.020), (-0.005, 0.005)),
            ((1.07, 1.00), (-0.015, 0.010), (0.012, 0.000))]
k, prev, punch = 0, None, False
for seg, tag, oi in new:
    if tag not in ("gopro", "other"):
        prev = None
        continue
    dur = seg["target_timerange"]["duration"]
    if prev is not None and base(prev) == base(seg) and tag == "gopro" and \
            abs(seg["source_timerange"]["start"] - (prev["source_timerange"]["start"] + prev["source_timerange"]["duration"])) < us(90):
        punch = not punch
    else:
        punch = False
    prev = seg
    if dur < us(3.5):
        if punch:
            seg["uniform_scale"] = {"on": True, "value": 1.12}
            seg["clip"]["scale"] = {"x": 1.12, "y": 1.12}
        continue
    (s0, s1), (x0, x1), (y0, y1) = PATTERNS[k % len(PATTERNS)]
    k += 1
    b = 1.12 if punch else 1.0
    if dur > us(60):
        D.add_keyframes(seg, "KFTypeScaleX", [(0, b), (dur // 2, b * 1.09), (dur, b * 1.03)])
        D.add_keyframes(seg, "KFTypePositionX", [(0, 0.0), (dur // 2, -0.02), (dur, 0.015)])
        D.add_keyframes(seg, "KFTypePositionY", [(0, 0.0), (dur // 2, 0.012), (dur, -0.006)])
    else:
        D.add_keyframes(seg, "KFTypeScaleX", [(0, b * s0), (dur, b * s1)])
        D.add_keyframes(seg, "KFTypePositionX", [(0, x0), (dur, x1)])
        D.add_keyframes(seg, "KFTypePositionY", [(0, y0), (dur, y1)])

title = new[0][0]
D.set_video_anims(title, [anim(ANIM_VIDEO_FADE_IN, us(1.5))])
D.add_keyframes(title, "KFTypeScaleX", [(0, 1.0), (title["target_timerange"]["duration"], 1.06)])

# ------------------------------------------------------------------ 5. text + torn plates
plates = D.add_track("video", "Плашки (рваные)")
plate_ids = {n: D.add_video_material(os.path.join(TOOLS, n), 1920, 1080, 10800000000, False, "photo")
             for n in ("plate_q1.png", "plate_q2.png", "plate_q3.png", "plate_name_l.png",
                       "plate_name_r.png", "plate_credit.png")}


plates2 = D.add_track("video", "Плашки (рваные) · 2")


def add_plate(name, start, dur, fade=us(0.6), track=None):
    s = D.new_video_segment(plate_ids[name], 0, dur, start, volume=0.0)
    s["render_index"] = 1
    D.set_video_anims(s, [anim(ANIM_VIDEO_FADE_IN, fade)])
    (track or plates)["segments"].append(s)
    return s


def type_ms(text):
    """Slow, deliberate typing — about 9 characters a second, never under 1.8 s."""
    return int(min(7.0e6, max(1.8e6, 110000 * len(text))))


def caption(track, text, start, dur, size, color, x=0.0, y=-0.62, plate=None, styles=None,
            ls=0.04, line_spacing=0.28, tw=None, plate_track=None):
    mid = D.add_text_material(text, FONT, size, color, align=1, letter_spacing=ls,
                              line_spacing=line_spacing, styles=styles)
    twd = tw or type_ms(text)
    s = D.new_text_segment(mid, start, dur, x=x, y=y,
                           anims=[anim(ANIM_TYPEWRITER, twd), anim(ANIM_TEXT_OUT, us(0.6))])
    track["segments"].append(s)
    if plate:
        add_plate(plate, start, dur, track=plate_track)
    return s


# the user's own two texts stay; the "тит" marker goes
utt = D.track("text")
utt["segments"] = [s for s in utt["segments"] if s["target_timerange"]["start"] < us(1000)]
utt["name"] = "Тексты (свои)"

t0 = T(3, 0.3)
for trk, name, sub, x, pl, st, ptr in (
        ("Имя · Груша", "ГРУША", "благовония · керамика · сказки", -0.5, "plate_name_l.png", t0, None),
        ("Имя · Лев", "ЛЕВ КЕЙСЕР", "DJ Levka · музыка", 0.5, "plate_name_r.png", t0 + us(2.2), plates2)):
    txt = name + "\n" + sub
    caption(D.add_track("text", trk), txt, st, us(7.4) if x < 0 else us(5.2), 8, BEIGE, x=x, plate=pl,
            plate_track=ptr,
            styles=[(0, len(name), 8, FONT, BEIGE), (len(name), len(txt), 4.0, FONT, BEIGE)], ls=0.06)

quotes = D.add_track("text", "Цитаты (печатная машинка)")
Q = [
    (5, 5.4, "космическое путешествие сквозь время"),
    (8, 3.9, "если бы я сама знала, чем занимаюсь…"),
    (12, 3.4, "как под музыку —\nты погружаешься, ты растворяешься"),
    (17, 3.3, "Груша — фамилия моего женского рода.\nи ощущение ведьмовства оттуда веет"),
    (17, 18.3, "нормальный формат жажды матриархата"),
    (18, 1.7, "у каждой семьи на Востоке —\nсвой рецепт благовония"),
    (18, 20.1, "люди перестали чувствовать тонкости.\nпривыкли к синтетике"),
    (19, 65.3, "компонентам нужно сдружиться"),
    (19, 142.4, "уральский бахур я делала полтора года"),
    (19, 149.2, "каждый аромат — история.\nя пишу к ним сказки"),
    (19, 174.5, "всё как с музыкой"),
    (32, 21.2, "уд — самое дорогое масло сейчас"),
    (32, 79.5, "дерево ранится — и масло залечивает.\nтак рождается уд"),
    (33, 21.0, "мы схожи тем,\nчто пытаемся ухватить многое"),
    (35, 0.5, "ближе к шаманской тематике"),
    (36, 43.5, "Афина охраняет все эфиры,\nдержит их в узде"),
    (46, 13.3, "атар — дистилляция через эфирное масло"),
    (51, 12.0, "через эфиры знакомишься\nсо своими состояниями"),
    (60, 3.7, "главное — чтобы ингредиенты сдружились.\nпоэтому нужно время"),
    (63, 8.2, "амбра соединяет всё и вся"),
    (66, 13.5, "измельчить. всё суперсакрально"),
    (71, 21.2, "перед приготовлением — настройка.\nсвоя личная практика"),
    (75, 12.0, "есть бит, есть бас — всё как в музыке"),
    (80, 2.8, "тут важна умеренность.\nпо чуть-чуть, по кругу"),
    (91, 0.6, "ольфакторная схема — эфирная азбука"),
    (91, 85.3, "схема — 2D. теперь представь её в 3D.\nа потом в 4D — она работает с твоим мозгом"),
    (91, 128.0, "бесконечность — не предел"),
    (91, 152.0, "музыка — бесконечное множество\nкомбинаций звуков"),
    (93, 14.4, "плыву по течению"),
    (94, 6.4, "у каждого компонента есть своя душа.\nи свой характер"),
    (97, 0.0, "музыка и благовония очень близки —\nпо течению, по искусству, по потоку"),
]
planned = sorted([T(oi, off), txt] for oi, off, txt in Q)
READ = us(3.5)                       # time to read after the last character lands
for i, (start, txt) in enumerate(planned):
    slot = (planned[i + 1][0] - start - us(0.4)) if i + 1 < len(planned) else us(12.0)
    dur = max(us(2.2), min(type_ms(txt) + READ, slot))
    tw = max(us(0.8), min(type_ms(txt), dur - us(1.4)))   # typing always finishes on screen
    n = min(3, txt.count("\n") + 1)
    caption(quotes, txt, start, dur, 6.0, BEIGE, plate=PLATE[n], tw=tw)

mt = newmap[67]
caption(quotes, "d r e a m", mt["target_timerange"]["start"] + us(0.8), us(4.5), 7.5, WHITE, y=0.0, ls=0.3)

ph = D.add_track("text", "ДОСЪЁМКИ — плейсхолдеры (удалить)")
for oi, off, txt in [
    (13, 0.0, "[ДОСЪЁМКА · Лев: «Это откликается — в музыке я делаю то же самое»]"),
    (33, 21.0, "[ДОСЪЁМКА · Лев: «Да, мы такие — пытаемся успевать многое»]"),
    (35, 0.0, "[ДОСЪЁМКА · Лев: «Напишу шаманский джингл — алхимия, не химия»]"),
    (36, 13.9, "[ДОСЪЁМКА · Лев: назвать жанры альбома в камеру]"),
    (94, 0.0, "[ДОСЪЁМКА · Лев: эхо «у каждого компонента есть душа» — про звуки]"),
    (97, 12.0, "[ДОСЪЁМКА · Лев: финальная фраза — музыка и благовония одно течение]"),
]:
    mid = D.add_text_material(txt, FONT, 3.4, (0.85, 0.55, 0.15), align=1)   # placeholder, no plate
    ph["segments"].append(D.new_text_segment(mid, T(oi, off), us(4.0), x=0.0, y=0.82, anims=[]))

# ------------------------------------------------------------------ 6. Jackie-Chan ending
cr = D.add_track("text", "Титры")
open_card, close_card = cards
oc = open_card["target_timerange"]["start"]
cc = close_card["target_timerange"]["start"]
for card, head, body in ((open_card, "ГРУША  ×  ЛЕВ КЕЙСЕР", "подкаст · мастерская «Груша» · 31 июля 2026"),
                         (close_card, "ГРУША  ×  ЛЕВ КЕЙСЕР", "новые выпуски — скоро")):
    st = card["target_timerange"]["start"]
    txt = head + "\n" + body
    mid = D.add_text_material(txt, FONT, 8, BEIGE, align=1, letter_spacing=0.1, line_spacing=0.35,
                              styles=[(0, len(head), 8, FONT, BEIGE), (len(head), len(txt), 4.2, FONT, BEIGE)])
    cr["segments"].append(D.new_text_segment(mid, st + us(0.5), CARD - us(0.7), x=0.0, y=-0.42,
                                             anims=[anim(ANIM_TYPEWRITER, us(2.6)), anim(ANIM_TEXT_OUT, us(0.6))]))
    cid = D.add_video_material(os.path.join(TOOLS, "plate_card.png"), 1920, 1080, 10800000000, False, "photo")
    s = D.new_video_segment(cid, 0, CARD, st, volume=0.0)
    s["render_index"] = 1
    D.set_video_anims(s, [anim(ANIM_VIDEO_FADE_IN, us(1.0))])
    plates["segments"].append(s)

# credit blocks typed over the outtakes, which keep their own sound
run0 = newmap[OUTTAKES[0]]["target_timerange"]["start"]
run1 = cc
BLOCKS = [("В КАДРЕ", "Груша — благовония,\nкерамика, сказки\nЛев Кейсер — музыка · DJ Levka"),
          ("МУЗЫКА", "DJ Levka — «d r e a m»\nджингл для Груши — Лев Кейсер"),
          ("СЪЁМКА", "GoPro · телефон · руки Груши"),
          ("МОНТАЖ", "Лев Кейсер"),
          ("СПАСИБО", "Груше — за дом, ароматы и терпение\nвам — за то, что досмотрели")]
BLOCK = us(7.0)
gap = (run1 - run0 - BLOCK) / max(1, len(BLOCKS) - 1)
for i, (head, body) in enumerate(BLOCKS):
    st = int(run0 + us(1.5) + i * gap)
    if st + BLOCK > run1:
        st = run1 - BLOCK
    txt = head + "\n" + body
    mid = D.add_text_material(txt, FONT, 5.2, GOLD, align=1, letter_spacing=0.12, line_spacing=0.3,
                              styles=[(0, len(head), 5.2, FONT, GOLD), (len(head), len(txt), 4.0, FONT, BEIGE)])
    cr["segments"].append(D.new_text_segment(mid, st, BLOCK, x=-0.46, y=-0.54,
                                             anims=[anim(ANIM_TYPEWRITER, us(2.8)), anim(ANIM_TEXT_OUT, us(0.6))]))
    add_plate("plate_credit.png", st, BLOCK)

# ------------------------------------------------------------------ 7. music: montage only, plus the two cards
mtrack = D.add_track("audio", "Музыка · d r e a m")
dream_id = D.m["audios"][0]["id"] if D.m["audios"][0]["path"].endswith("d-r-e-a-m-DJ-Levka.mp3") \
    else D.add_audio_material(DREAM, DREAM_DUR)
m_start = newmap[67]["target_timerange"]["start"]
m_end = max(s["target_timerange"]["start"] + s["target_timerange"]["duration"]
            for s, tag, _ in new if tag == "montage")
mtrack["segments"].append(D.new_audio_segment(dream_id, us(24.0), m_end - m_start, m_start, volume=0.9,
                                              fade_in_us=us(1.2), fade_out_us=us(2.5)))
# opening card: music in, then out as the first outtake starts — nothing under the outtakes themselves
mtrack["segments"].append(D.new_audio_segment(dream_id, us(36.0), CARD + us(2.5), oc, volume=0.55,
                                              fade_in_us=us(1.5), fade_out_us=us(2.5)))
mtrack["segments"].append(D.new_audio_segment(dream_id, us(150.0), CARD, cc, volume=0.5,
                                              fade_in_us=us(1.5), fade_out_us=us(3.0)))

# ------------------------------------------------------------------ 8. save + meta
D.finalize()
for tr in d["tracks"]:
    if tr["type"] == "video" and tr is not vt:
        for s in tr["segments"]:
            s["render_index"] = 1
d["name"] = DST_NAME
tl_id = d["id"]
assert os.path.isdir(os.path.join(DST, "Timelines", tl_id)), "Timelines/<id> folder missing"
info_p = os.path.join(TOOLS, "v6_build_info.json")
new_id = json.load(io.open(info_p, encoding="utf-8"))["id"] if os.path.exists(info_p) else str(uuid.uuid4()).upper()
D.save()
shutil.copy(os.path.join(DST, "draft_content.json"), os.path.join(DST, "Timelines", tl_id, "draft_content.json"))

meta_p = os.path.join(DST, "draft_meta_info.json")
meta = json.load(io.open(meta_p, encoding="utf-8"))
now = int(time.time() * 1000000)
meta.update({"draft_id": new_id, "draft_name": DST_NAME, "draft_fold_path": DST.replace("\\", "/"),
             "draft_root_path": ROOT.replace("\\", "/"), "tm_duration": d["duration"],
             "tm_draft_create": now, "tm_draft_modified": now})
json.dump(meta, io.open(meta_p, "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"id": new_id, "name": DST_NAME, "duration": d["duration"], "dir": DST,
           "json": os.path.join(DST, "draft_content.json")},
          io.open(info_p, "w", encoding="utf-8"), ensure_ascii=False)

print("built %s  %.1f s  main %d  B-audio %d  quotes %d  plates %d" %
      (DST_NAME, d["duration"] / 1e6, len(vt["segments"]), len(atrack["segments"]),
       len(quotes["segments"]), len(plates["segments"])))
print("дубли вырезаны в горизонталке:", trims)
