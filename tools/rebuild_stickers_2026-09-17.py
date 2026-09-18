# -*- coding: utf-8 -*-
"""Пересборка стикеров по замечаниям 17.09.2026.

1-Лев Кейсер: плашки наезжали на лицо. Берём чистые вырезки (site/content/stickers/faces:
   portrait, cake, runway, bust), плашку с текстом снимаем с текущего стикера как спрайт
   (типографика и цвет остаются прежними) и ставим внизу; фигура над ней, перекрытие 18 px.
   Полноростовые (jacket, bw-walk, unreal, fw-*) не трогаем — там плашка на ногах.
2/3/4-Реакции и Неон: исходных фото нет. Снимаем «туман» внизу фигуры (альфа восстанавливается
   построчно, цвет под ней сохранён), режем ровно под плашкой, плашку центрируем и ставим на одну
   высоту для всего пака (у длинных — по нижнему краю).
5-Состояния: название трека уже в кадре — плашку убираем, кадр берём заново из видео релиза.
Исходные файлы остаются в _backup-2026-09-17.zip (сделан утром) и в _backup-before-rebuild.zip."""
import os, re, zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

E = os.path.join(os.path.expanduser("~"), "Desktop", "Эмодзи")
FACES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content", "stickers", "faces")
FRAMES = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "claude", "C--Users-User-Desktop-site",
                     "ef7451ae-e8cb-4ba4-b6ec-f32a3668fd99", "scratchpad", "frames")
P1, P2, P3, P4, P5 = [os.path.join(E, d) for d in (
    "1-Telegram-пак «Лев Кейсер»", "2-Telegram-пак «Реакции»", "3-MAX-пак «Реакции»",
    "4-Сторис-накладки «Неон»", "5-Бонус по коду «Состояния»")]
PALETTE = [(36, 28, 19), (33, 26, 18), (200, 100, 30), (180, 96, 28), (217, 154, 43), (107, 78, 125),
           (111, 168, 60), (233, 221, 192), (220, 203, 160), (122, 46, 27), (20, 16, 12)]

bak = os.path.join(E, "_backup-before-rebuild.zip")
if not os.path.exists(bak):
    with zipfile.ZipFile(bak, "w", zipfile.ZIP_STORED) as z:
        for d in (P1, P2, P3, P4, P5):
            for f in os.listdir(d):
                z.write(os.path.join(d, f), os.path.join(os.path.basename(d), f))
    print("бэкап:", bak)


def load(path):
    return np.array(Image.open(path).convert("RGBA")).astype(np.int16)


def find_plate(im, y_min=0, bottom_min=0):
    """Плашка = крупная компонента однотонных (палитра) непрозрачных пикселей, с высоким заполнением bbox."""
    rgb, a = im[..., :3], im[..., 3]
    dist = np.min([np.abs(rgb - np.array(c)).sum(axis=2) for c in PALETTE], axis=0)
    mask = (a == 255) & (dist < 45)
    mask[:y_min] = False
    lab, n = ndimage.label(mask)
    best = None
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if w < 90 or h < 40 or h > 260:
            continue
        area = (lab[sl] == i).sum()
        fill = area / (w * h)
        if fill < 0.45 or sl[0].stop < bottom_min:
            continue
        score = area
        if best is None or score > best[0]:
            best = (score, sl[0].start, sl[0].stop, sl[1].start, sl[1].stop)
    if not best:
        return None
    _, y0, y1, x0, x1 = best
    m = 4  # захватываем обводку плашки
    return max(0, y0 - m), min(512, y1 + m), max(0, x0 - m), min(512, x1 + m)


def unfade(im, cut_row):
    """Восстановить альфу в зоне «тумана» над срезом: каждую строку нормируем на её максимум."""
    out = im.copy()
    a = out[..., 3].astype(np.float32)
    for r in range(max(0, cut_row - 160), cut_row):
        row = a[r]
        m = row.max()
        if 40 < m < 250:
            a[r] = np.clip(row * (255.0 / m), 0, 255)
    out[..., 3] = a.astype(np.int16)
    out[cut_row:, :, 3] = 0
    return out


def paste(canvas, sprite, x, y):
    canvas.alpha_composite(sprite, (int(x), int(y)))


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def rebuild_reactions(folder, mode):
    """mode: 'fixed' — плашка на одной высоте (y0 = самая верхняя из пака); 'bottom' — по нижнему краю."""
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith(".png"))
    plates = {}
    for f in files:
        im = load(os.path.join(folder, f))
        p = find_plate(im, y_min=300, bottom_min=470)  # плашки реакций сидят у нижнего края
        if p:
            plates[f] = p
    if mode == "fixed":
        y0_fixed = min(p[0] for p in plates.values())
    done = 0
    for f in files:
        im = load(os.path.join(folder, f))
        p = plates.get(f)
        if not p:
            print("  без плашки:", f)
            continue
        y0, y1, x0, x1 = p
        sprite = to_img(im[y0:y1, x0:x1])
        fig = unfade(im, y0 + 2)
        canvas = to_img(fig)
        ny0 = y0_fixed if mode == "fixed" else y0
        if mode == "fixed" and ny0 < y0:
            # плашку подняли — под ней остаётся срез фигуры; фигуру тоже подрезаем по новой линии
            arr = np.array(canvas).astype(np.int16)
            arr[ny0 + 2:, :, 3] = 0
            canvas = to_img(arr)
        paste(canvas, sprite, (512 - sprite.width) // 2, ny0)
        canvas.save(os.path.join(folder, f))
        done += 1
    print(os.path.basename(folder), "переcобрано:", done, "из", len(files), "плашка y0:", y0_fixed if mode == "fixed" else "по низу")


def rebuild_lev():
    src = {"portrait": "01-portrait.png", "cake": "06-cake.png", "runway": "09-runway.png", "bust": "12-bust.png"}
    cut = {k: Image.open(os.path.join(FACES, v)).convert("RGBA") for k, v in src.items()}
    base_of = {
        "013": "portrait", "014": "portrait", "015": "portrait", "016": "portrait", "030": "portrait", "031": "portrait",
        "032": "portrait", "033": "portrait", "034": "portrait", "044": "portrait", "045": "portrait", "046": "portrait",
        "047": "portrait", "048": "portrait",
        "017": "cake", "018": "cake", "019": "cake", "027": "cake", "037": "cake",
        "020": "runway", "021": "runway", "022": "runway", "038": "runway", "039": "runway", "040": "runway",
        "023": "bust", "024": "bust", "025": "bust", "026": "bust", "041": "bust", "042": "bust", "043": "bust",
    }
    for f in sorted(os.listdir(P1)):
        num = f[:3]
        if num not in base_of:
            continue
        im = load(os.path.join(P1, f))
        p = find_plate(im)
        if not p:
            print("  плашка не найдена:", f)
            continue
        y0, y1, x0, x1 = p
        sprite = to_img(im[y0:y1, x0:x1])
        ph = sprite.height
        plate_y0 = 500 - ph
        fig = cut[base_of[num]]
        bbox = fig.getbbox()
        fig = fig.crop(bbox)
        box_h = plate_y0 + 18  # фигура заходит под плашку на 18 px
        scale = min(box_h / fig.height, 480 / fig.width)
        fig = fig.resize((max(1, int(fig.width * scale)), max(1, int(fig.height * scale))), Image.LANCZOS)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        paste(canvas, fig, (512 - fig.width) // 2, box_h - fig.height)
        paste(canvas, sprite, (512 - sprite.width) // 2, plate_y0)
        canvas.save(os.path.join(P1, f))
    print("1-Лев Кейсер: пересобраны стикеры с плашкой на портрете/торте/подиуме/бюсте")


def rebuild_states():
    R = 40
    mask = Image.new("L", (512, 512), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 511, 511], radius=R, fill=255)
    for f in sorted(os.listdir(P5)):
        key = re.sub(r"^\d+-\d+-", "", f)[:-4]
        name = "soundstates dj levka" if key == "soundstates-teaser" else key
        cand = [c for c in os.listdir(FRAMES) if c.startswith(name + "_4.0")]
        if not cand:
            print("  нет кадра для", f)
            continue
        fr = Image.open(os.path.join(FRAMES, cand[0])).convert("RGB")
        off = (fr.height - 512) // 2
        sq = fr.crop((0, off, 512, off + 512)).convert("RGBA")
        sq.putalpha(mask)
        ring = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        ImageDraw.Draw(ring).rounded_rectangle([1, 1, 510, 510], radius=R - 1, outline=(255, 255, 255, 255), width=4)
        sq.alpha_composite(ring)
        sq.save(os.path.join(P5, f))
    print("5-Состояния: кадры без плашек")


rebuild_lev()
rebuild_reactions(P2, "fixed")
rebuild_reactions(P4, "fixed")
rebuild_reactions(P3, "bottom")
rebuild_states()
