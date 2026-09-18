# -*- coding: utf-8 -*-
"""Пересборка двух CapCut-шаблонов по схеме, которую CapCut 9.4 точно открывает.

Первые версии (build_contest_template.py, build_soundstates_template.py) собирались
библиотекой pyJianYingDraft. Она пишет драфт старой схемы (platform 5.9, new_version
110) с одним и тем же зашитым id таймлайна 91E08AC5-… у всех проектов, а в
draft_meta_info.json кладёт другой draft_id. CapCut 9.4 такой драфт не открывает.

Здесь всё клонируется из живого драфта Груша_v7_главы через grusha_lib — так же,
как собирались рабочие v6/v7 подкаста: копируются только три файла, id новый и
единый для содержимого и меты, Timelines/ CapCut создаёт сам при первом открытии.

Запуск: python tools/build_templates_v2.py [contest|soundstates|all]
"""
import os, sys, json, io, shutil, uuid, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grusha_lib import Draft, us, anim, ANIM_VIDEO_FADE_IN, uid

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
DRAFTS = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "User Data", "Projects", "com.lveditor.draft")
SRC = os.path.join(DRAFTS, "Груша_v7_главы")
FONT = os.path.join(TOOLS, "fonts", "RobotoSlab-Regular.ttf")
AUDIO = os.path.join(ROOT, "public", "audio", "soundstates.mp3")
AUDIO_US = 105012000  # длина soundstates.mp3 в микросекундах
PLACEHOLDER = os.path.join(TOOLS, "contest_placeholder.mp4")
PYL = (0xDC / 255, 0xCB / 255, 0xA0 / 255)  # «Пыль» из палитры бренда
ZAKAT = (0xD9 / 255, 0x9A / 255, 0x2B / 255)  # «Закат» — цвет подсказок

# Структура трека soundstates (по онсетам и огибающей громкости мастера, 92,7 BPM, такт 2,588 с):
#   4.38 первый удар (вход), 13.72 ДРОП, 27.44 второй подъём, 70.72 кульминация, ~90 спад, 95–105 затухание.
# В ролик музыка входит с TRACK_IN, чтобы дроп встал на DROP_AT секунде монтажа.
BPM = 92.7
BAR = 4 * 60 / BPM
DROP_SRC, HIT_SRC, PEAK_SRC = 13.72, 27.44, 70.72
DROP_AT = 8.0
TRACK_IN = DROP_SRC - DROP_AT           # 5.72 с — откуда берём музыку
HIT_AT = HIT_SRC - TRACK_IN             # 21.72 с — второй подъём в ролике


def bars_in(src_start, length):
    """Сильные доли (начала тактов) внутри окна, в секундах от начала материала."""
    k0 = int((src_start - DROP_SRC) // BAR) - 1
    out = []
    for k in range(k0, k0 + int(length / BAR) + 3):
        t = DROP_SRC + k * BAR
        if src_start <= t <= src_start + length:
            out.append(t)
    return out


def add_beats(D, seg, times_src_s):
    """Родные метки CapCut на аудиоклипе — видны как штрихи на дорожке, к ним липнут склейки."""
    b = {"ai_beats": {"beat_speed_infos": [], "beats_path": "", "beats_url": "", "melody_path": "",
                      "melody_percents": [0.0], "melody_url": ""},
         "enable_ai_beats": False, "gear": 404, "gear_count": 0, "id": str(uuid.uuid4()).upper(),
         "mode": 404, "type": "beats", "user_beats": [int(round(t * 1e6)) for t in times_src_s],
         "user_delete_ai_beats": None}
    D.m.setdefault("beats", []).append(b)
    seg["extra_material_refs"].append(b["id"])


def guide(D, track, txt, start, dur):
    """Подсказка монтажёру: мелко, цветом «Закат», у верхнего края."""
    mid = D.add_text_material(txt, FONT, 3.6, ZAKAT, align=1)
    track["segments"].append(D.new_text_segment(mid, us(start), us(dur), x=0.0, y=0.82))


def make_placeholder(path=None, title="ТВОЙ ПРОХОД", sub="Замени этот клип своим дублем",
                     hint1="вертикально · 15–30 секунд · один дубль", hint2="в конце возьми в кадр предмет",
                     length=40):
    """Заглушка под кадр: вертикальный ролик-табличка. Длина 40 с — с запасом под любые скорости."""
    path = path or PLACEHOLDER
    if os.path.exists(path):
        return path
    from PIL import Image, ImageDraw, ImageFont
    ffmpeg = os.path.join(TOOLS, "ffmpeg-9.0-essentials_build", "bin", "ffmpeg.exe")
    W, H = 1080, 1920
    smola, zakat, pyl = (0x21, 0x1A, 0x12), (0xD9, 0x9A, 0x2B), (0xDC, 0xCB, 0xA0)
    im = Image.new("RGB", (W, H), smola)
    d = ImageDraw.Draw(im)
    d.rectangle((60, 60, W - 60, H - 60), outline=zakat, width=6)
    big, small, tiny = (ImageFont.truetype(FONT, s) for s in (92, 44, 36))

    def center(t, font, y, fill):
        bb = d.textbbox((0, 0), t, font=font)
        d.text(((W - bb[2]) // 2 - bb[0], y), t, font=font, fill=fill)

    center(title, big, 780, zakat)
    center(sub, small, 920, pyl)
    center(hint1, tiny, 1000, pyl)
    center(hint2, tiny, 1060, pyl)
    frame = path[:-4] + ".png"
    im.save(frame)
    subprocess.run([ffmpeg, "-v", "error", "-y", "-loop", "1", "-i", frame, "-t", str(length), "-r", "30",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", path], check=True)
    os.remove(frame)
    return path


FLASH = os.path.join(TOOLS, "template_flash.png")
PLACEHOLDER2 = os.path.join(TOOLS, "states_placeholder.mp4")


def make_flash():
    """Кадр цвета «Пыль» для вспышки на дропе."""
    if not os.path.exists(FLASH):
        from PIL import Image
        Image.new("RGB", (1080, 1920), (0xDC, 0xCB, 0xA0)).save(FLASH)
    return FLASH


# проверенные в проектах Льва встроенные анимации CapCut (входные)
def _preset(rid, name):
    a = dict(ANIM_VIDEO_FADE_IN)
    a.update({"id": rid, "resource_id": rid, "third_resource_id": rid, "name": name, "path": ""})
    return a


ANIM_SHAKE = _preset("6781683302672634382", "Тряска 3")
ANIM_ZOOM = _preset("6740868384637850120", "Зум 1")
ANIM_PUSH = _preset("6798332733694153230", "Приближение")


def clip(D, vt, mat, src_s, tgt_s, dur_s, speed=1.0, anims=None):
    seg = D.new_video_segment(mat, us(src_s), us(dur_s), us(tgt_s), speed=speed, volume=0.0)
    if anims:
        D.set_video_anims(seg, anims)
    vt["segments"].append(seg)
    return seg


def punch(D, seg, amount=1.18, settle=BAR):
    """Толчок крупности на дропе: резко крупнее, за такт обратно; уходим в дрейф до конца клипа."""
    dur = seg["target_timerange"]["duration"]
    D.add_keyframes(seg, "KFTypeScaleX", [(0, 1.0), (us(0.15), amount), (us(settle), 1.0), (dur, 1.06)])
    D.add_keyframes(seg, "KFTypeScaleY", [(0, 1.0), (us(0.15), amount), (us(settle), 1.0), (dur, 1.06)])
    seg["uniform_scale"] = {"on": False, "value": 1.0}


def fade_black(D, seg, last_s=1.2):
    dur = seg["target_timerange"]["duration"]
    D.add_keyframes(seg, "KFTypeAlpha", [(max(0, dur - us(last_s)), 1.0), (dur, 0.0)])


def flash(D, track, mat, at_s, dur_s=0.15):
    f = D.new_video_segment(mat, 0, us(dur_s), us(at_s), volume=0.0)
    f["render_index"] = 1
    f["clip"]["alpha"] = 0.85
    D.add_keyframes(f, "KFTypeAlpha", [(0, 0.85), (us(dur_s), 0.0)])
    track["segments"].append(f)


def effects_video(D, dst_len, mat, reveal_anim):
    """Видеодорожка с эффектами по структуре: интро 0.5x → разгон 2x → дроп (толчок+тряска) →
    второй подъём 0.3x с зумом → финал с уходом в чёрное. Возвращает дорожки для finish()."""
    vt = D.video_track()
    src = 0.0
    def take(tgt, dur, speed, anims=None):
        nonlocal src
        seg = clip(D, vt, mat, src, tgt, dur, speed, anims)
        src += dur * speed
        return seg
    take(0.0, DROP_AT - 1.6, 0.5)                                       # интро: замедление
    take(DROP_AT - 1.6, 1.6, 2.0)                                       # разгон перед дропом
    drop = take(DROP_AT, HIT_AT - DROP_AT, 1.0, [anim(ANIM_SHAKE, us(0.8))])
    punch(D, drop)
    take(HIT_AT, 1.5, 0.3, [anim(reveal_anim, us(1.1))])                # кульминация: замедление + зум
    tail = take(HIT_AT + 1.5, dst_len - HIT_AT - 1.5, 1.0)
    fade_black(D, tail)
    ov = D.add_track("video", "вспышки")
    fl = D.add_video_material(make_flash(), 1080, 1920, 10800000000, False, "photo")
    flash(D, ov, fl, DROP_AT)
    flash(D, ov, fl, HIT_AT, 0.12)


def fresh(name):
    dst = os.path.join(DRAFTS, name)
    if os.path.exists(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)
    for f in ("draft_content.json", "draft_meta_info.json", "draft_cover.jpg"):
        if os.path.exists(os.path.join(SRC, f)):
            shutil.copy(os.path.join(SRC, f), os.path.join(dst, f))
    D = Draft(os.path.join(dst, "draft_content.json"))
    d = D.d
    d["canvas_config"] = {"ratio": "9:16", "width": 1080, "height": 1920, "background": None}
    # Оставляем один пустой видеотрек (главный), остальные дорожки убираем.
    vt = D.video_track()
    vt["segments"] = []
    d["tracks"] = [vt]
    return dst, D


def finish(dst, D, name):
    d = D.d
    D.finalize()
    d["name"] = name
    nid = str(uuid.uuid4()).upper()
    d["id"] = nid
    d["update_time"] = int(time.time() * 1e6)
    # Выкидываем материалы, на которые больше никто не ссылается.
    ref = set()
    for tr in d["tracks"]:
        for s in tr["segments"]:
            ref.add(s["material_id"])
            ref.update(s.get("extra_material_refs") or [])
    for cat, lst in list(d["materials"].items()):
        if isinstance(lst, list):
            d["materials"][cat] = [m for m in lst if not (isinstance(m, dict) and m.get("id")) or m["id"] in ref]
    D.save()
    mp = os.path.join(dst, "draft_meta_info.json")
    meta = json.load(io.open(mp, encoding="utf-8"))
    now = int(time.time() * 1e6)
    meta.update({"draft_id": nid, "draft_name": name, "draft_fold_path": dst.replace("\\", "/"),
                 "tm_duration": d["duration"], "tm_draft_create": now, "tm_draft_modified": now,
                 "draft_materials": [{"type": t, "value": []} for t in (0, 1, 2, 3, 6, 7, 8)]})
    json.dump(meta, io.open(mp, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"id": nid, "name": name, "duration": d["duration"], "dir": dst,
               "json": os.path.join(dst, "draft_content.json")},
              io.open(os.path.join(TOOLS, "v6_build_info.json"), "w", encoding="utf-8"), ensure_ascii=False)
    subprocess.run([sys.executable, os.path.join(TOOLS, "register_v6.py")], check=True)
    print("built", name, "%.1f s" % (d["duration"] / 1e6), "id", nid)


def text(D, track, txt, start, dur, size, y):
    mid = D.add_text_material(txt, FONT, size, PYL, align=1)
    track["segments"].append(D.new_text_segment(mid, us(start), us(dur), x=0.0, y=y))


def build_contest():
    """«Твой выход под трек»: заглушка 25 с на 0.5x, трек с первой сильной доли, подпись 2 с."""
    name = "contest_vyhod_pod_trek_TEMPLATE"
    make_placeholder()
    dst, D = fresh(name)
    vid = D.add_video_material(PLACEHOLDER, 1080, 1920, us(40.0), has_audio=False)
    effects_video(D, 25.0, vid, ANIM_ZOOM)
    at = D.add_track("audio", "музыка")
    aid = D.add_audio_material(AUDIO, AUDIO_US)
    seg = D.new_audio_segment(aid, us(TRACK_IN), us(25.0), 0, fade_out_us=us(1.5))
    add_beats(D, seg, bars_in(TRACK_IN, 25.0))
    at["segments"].append(seg)
    tt = D.add_track("text", "подпись")
    text(D, tt, "soundstates · DJ Levka", 0, 2.0, 5.0, -0.72)
    gt = D.add_track("text", "СТРУКТУРА ТРЕКА — удалить перед экспортом")
    guide(D, gt, "интро · проход к камере", 0, DROP_AT)
    guide(D, gt, "▲ ДРОП 0:08 — шаг в кадр, смена ракурса", DROP_AT, HIT_AT - DROP_AT)
    guide(D, gt, "▲ КУЛЬМИНАЦИЯ 0:21.7 — предмет в кадр", HIT_AT, 25.0 - HIT_AT)
    finish(dst, D, name)


def build_soundstates():
    """«States of Mind»: трек 30 с и три реплики по раскадровке, видеодорожка пустая под съёмку."""
    name = "soundstates_states_of_mind_TEMPLATE"
    make_placeholder(PLACEHOLDER2, "ТВОЙ КАДР", "Замени этот клип своим дублем",
                     "вертикально · три состояния — три дубля", "на дропе смени состояние")
    dst, D = fresh(name)
    vid = D.add_video_material(PLACEHOLDER2, 1080, 1920, us(40.0), has_audio=False)
    effects_video(D, 30.0, vid, ANIM_PUSH)
    at = D.add_track("audio", "музыка")
    aid = D.add_audio_material(AUDIO, AUDIO_US)
    seg = D.new_audio_segment(aid, us(TRACK_IN), us(30.0), 0, fade_out_us=us(1.0))
    add_beats(D, seg, bars_in(TRACK_IN, 30.0))
    at["segments"].append(seg)
    # реплики ложатся на музыку: первая — на тихое вступление, вторая — с дропа, третья — на второй подъём
    tt = D.add_track("text", "реплики")
    text(D, tt, "Вселенная не выбирает, какой ты сегодня.\nОна просто позволяет быть всем сразу.", 0.6, DROP_AT - 1.2, 9.0, 0.0)
    text(D, tt, "Ты не обязан быть одним.\nУ каждой версии тебя — своя причина существовать.", DROP_AT, HIT_AT - DROP_AT - 0.6, 7.0, 0.0)
    text(D, tt, "Все они настоящие.", HIT_AT, 30.0 - HIT_AT - 1.0, 10.0, 0.0)
    gt = D.add_track("text", "СТРУКТУРА ТРЕКА — удалить перед экспортом")
    guide(D, gt, "интро · тихо, статичный план", 0, DROP_AT)
    guide(D, gt, "▲ ДРОП 0:08 — движение, смена состояния", DROP_AT, HIT_AT - DROP_AT)
    guide(D, gt, "▲ КУЛЬМИНАЦИЯ 0:21.7 — все версии в одном кадре", HIT_AT, 30.0 - HIT_AT)
    finish(dst, D, name)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("contest", "all"):
        build_contest()
    if what in ("soundstates", "all"):
        build_soundstates()
