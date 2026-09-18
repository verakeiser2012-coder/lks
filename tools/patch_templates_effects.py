# -*- coding: utf-8 -*-
"""Эффекты в шаблонах, привязанные к структуре трека:
замедление на интро, разгон перед дропом, на дропе — толчок крупности, тряска и вспышка,
на втором подъёме — замедление 0.3x с зумом и вспышка, в конце — уход в чёрное."""
import io
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_templates_v2.py")
s = io.open(P, encoding="utf-8").read()


def sub(old, new):
    global s
    assert old in s, "не найдено: " + old[:60]
    s = s.replace(old, new, 1)


sub("from grusha_lib import Draft, us",
    "from grusha_lib import Draft, us, anim, ANIM_VIDEO_FADE_IN, uid")

# --- заглушка: любой текст, любая длина (нужно 40 с, чтобы хватило на все скорости)
sub('''def make_placeholder():
    """Заглушка под кадр участника: вертикальный ролик 12.5 с с подписью, что делать.
    На таймлайне растягивается замедлением 0.5x до 25 с."""
    if os.path.exists(PLACEHOLDER):
        return PLACEHOLDER''',
    '''def make_placeholder(path=None, title="ТВОЙ ПРОХОД", sub="Замени этот клип своим дублем",
                     hint1="вертикально · 15–30 секунд · один дубль", hint2="в конце возьми в кадр предмет",
                     length=40):
    """Заглушка под кадр: вертикальный ролик-табличка. Длина 40 с — с запасом под любые скорости."""
    path = path or PLACEHOLDER
    if os.path.exists(path):
        return path''')
sub('''    center("ТВОЙ ПРОХОД", big, 780, zakat)
    center("Замени этот клип своим дублем", small, 920, pyl)
    center("вертикально · 15–30 секунд · один дубль", tiny, 1000, pyl)
    center("в конце возьми в кадр предмет", tiny, 1060, pyl)
    frame = PLACEHOLDER[:-4] + ".png"
    im.save(frame)
    subprocess.run([ffmpeg, "-v", "error", "-y", "-loop", "1", "-i", frame, "-t", "12.5", "-r", "30",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", PLACEHOLDER], check=True)
    os.remove(frame)
    return PLACEHOLDER''',
    '''    center(title, big, 780, zakat)
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
    flash(D, ov, fl, HIT_AT, 0.12)''')

# --- конкурс: вместо одного клипа 0.5x — раскадровка с эффектами
sub('''    vt = D.video_track()
    vid = D.add_video_material(PLACEHOLDER, 1080, 1920, us(12.5), has_audio=False)
    vt["segments"].append(D.new_video_segment(vid, 0, us(25.0), 0, speed=0.5, volume=0.0))
    at = D.add_track("audio", "музыка")''',
    '''    vid = D.add_video_material(PLACEHOLDER, 1080, 1920, us(40.0), has_audio=False)
    effects_video(D, 25.0, vid, ANIM_ZOOM)
    at = D.add_track("audio", "музыка")''')

# --- states of mind: своя заглушка + те же эффекты
sub('''    name = "soundstates_states_of_mind_TEMPLATE"
    dst, D = fresh(name)
    at = D.add_track("audio", "музыка")''',
    '''    name = "soundstates_states_of_mind_TEMPLATE"
    make_placeholder(PLACEHOLDER2, "ТВОЙ КАДР", "Замени этот клип своим дублем",
                     "вертикально · три состояния — три дубля", "на дропе смени состояние")
    dst, D = fresh(name)
    vid = D.add_video_material(PLACEHOLDER2, 1080, 1920, us(40.0), has_audio=False)
    effects_video(D, 30.0, vid, ANIM_PUSH)
    at = D.add_track("audio", "музыка")''')

io.open(P, "w", encoding="utf-8").write(s)
print("эффекты добавлены")
