# -*- coding: utf-8 -*-
"""Макеты карточек: интерьерные флаги и виниловые пластинки.

Флаги горизонтальные (150 × 100 см), надписи капителью — решение 14.09.2026:
в вертикали «в» висела одна на строке, а разный регистр двух половин пары
читался как ошибка.

Это именно макеты, а не фотографии: снимков готовых вещей пока нет. В углу
каждой картинки стоит пометка «макет», и то же самое написано в описании
товара — покупатель не должен принять рисунок за снимок изделия.

Результат — public/uploads/product-flag-*.jpg и product-vinyl-*.jpg.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
Image.MAX_IMAGE_PIXELS = None  # скан коллажа 1200 dpi

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(SITE, "public", "uploads")
FONTS = os.path.join(SITE, "tools", "fonts")

BOLD = os.path.join(FONTS, "RobotoSlab-Bold.ttf")
REG = os.path.join(FONTS, "RobotoSlab-Regular.ttf")

# Палитра «Дикий лев»
MANE = (180, 96, 28)
SUNSET = (217, 154, 43)
DUST = (220, 203, 160)
TAR = (33, 26, 18)
WALL = (231, 221, 200)

S = 1200  # сторона картинки: карточка каталога режет по квадрату


def font(path, size):
    return ImageFont.truetype(path, size)


def wall_bg():
    """Тёплая стена: мягкий градиент сверху вниз и виньетка по краям."""
    bg = Image.new("RGB", (S, S), WALL)
    d = ImageDraw.Draw(bg)
    for y in range(S):
        k = y / S
        d.line([(0, y), (S, y)], fill=(
            int(WALL[0] - 18 * k), int(WALL[1] - 18 * k), int(WALL[2] - 16 * k)))
    vign = Image.new("L", (S, S), 0)
    ImageDraw.Draw(vign).ellipse([-S * 0.25, -S * 0.25, S * 1.25, S * 1.25], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(S * 0.12))
    dark = Image.new("RGB", (S, S), (196, 184, 163))
    return Image.composite(bg, dark, vign)


def shadow(base, box, blur=26, offset=(10, 16), alpha=90):
    """Мягкая тень под прямоугольным предметом."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.rectangle([x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]],
                fill=(0, 0, 0, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer) if base.mode == "RGBA" else base.paste(
        Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB"), (0, 0))


def wrap(draw, text, fnt, max_w):
    """Перенос по словам; явный перенос в тексте (\n) уважается как есть."""
    if "\n" in text:
        return text.split("\n")
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if draw.textlength(probe, font=fnt) <= max_w or not cur:
            cur = probe
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_text_block(canvas, box, text, color, max_size, min_size=28):
    """Вписывает текст в прямоугольник, подбирая кегль."""
    d = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = box
    for size in range(max_size, min_size - 1, -4):
        fnt = font(BOLD, size)
        lines = wrap(d, text, fnt, x1 - x0)
        lh = size * 1.18
        if lh * len(lines) <= (y1 - y0) and all(d.textlength(l, font=fnt) <= (x1 - x0) for l in lines):
            break
    total = lh * len(lines)
    y = y0 + ((y1 - y0) - total) / 2
    for line in lines:
        w = d.textlength(line, font=fnt)
        d.text((x0 + ((x1 - x0) - w) / 2, y), line, font=fnt, fill=color)
        y += lh


def flag_panel(w, h, text=None, cover=None, bg=TAR, fg=SUNSET, cover_center=0.5):
    """Само полотно флага: либо надпись, либо обложка на всю плоскость.
    cover_center — доля высоты обложки, которая встанет по центру полотна
    (Soundstates режем по лейблу, 0.46 — как в печатном файле)."""
    if cover:
        src = Image.open(cover).convert("RGB")
        k = max(w / src.width, h / src.height)
        src = src.resize((max(1, round(src.width * k)), max(1, round(src.height * k))), Image.LANCZOS)
        y0 = min(max(round(src.height * cover_center - h / 2), 0), src.height - h)
        panel = src.crop(((src.width - w) // 2, y0, (src.width - w) // 2 + w, y0 + h))
    else:
        panel = Image.new("RGB", (w, h), bg)
    if text:
        draw_text_block(panel, (int(w * 0.08), int(h * 0.14), int(w * 0.92), int(h * 0.86)),
                        text, fg, max_size=int(h * 0.22))
    # складка ткани: пара очень мягких вертикальных полос
    fold = Image.new("L", (w, h), 0)
    fd = ImageDraw.Draw(fold)
    for x in (int(w * 0.28), int(w * 0.68)):
        fd.rectangle([x, 0, x + int(w * 0.05), h], fill=38)
    fold = fold.filter(ImageFilter.GaussianBlur(w * 0.05))
    panel = Image.composite(Image.new("RGB", (w, h), (255, 255, 255)), panel, fold.point(lambda v: v // 3))
    # люверсы по углам
    d = ImageDraw.Draw(panel)
    r, m = int(w * 0.022), int(w * 0.045)
    for cx, cy in [(m, m), (w - m, m), (m, h - m), (w - m, h - m)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(214, 210, 202), outline=(120, 115, 105), width=3)
        d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=(160, 152, 140))
    return panel


def stamp(canvas, word="макет"):
    d = ImageDraw.Draw(canvas)
    fnt = font(REG, 26)
    tw = d.textlength(word, font=fnt)
    x, y = S - tw - 34, S - 52
    d.rounded_rectangle([x - 14, y - 8, x + tw + 14, y + 36], radius=10, fill=TAR)
    d.text((x, y), word, font=fnt, fill=DUST)


def save(canvas, name):
    out = os.path.join(UPLOADS, name)
    if os.path.exists(out):
        os.remove(out)
    canvas.convert("RGB").save(out, "JPEG", quality=90)
    print("  ", name)


def flag_mockup(name, text=None, cover=None, cover_center=0.5):
    bg = wall_bg()
    w, h = 780, 520
    x, y = (S - w) // 2, (S - h) // 2
    shadow(bg, (x, y, x + w, y + h))
    bg.paste(flag_panel(w, h, text=text, cover=cover, cover_center=cover_center), (x, y))
    stamp(bg)
    save(bg, name)


def flag_pair_mockup(name):
    """Пара рядом: фраза читается слева направо как одна строка."""
    bg = wall_bg()
    w, h = 540, 360
    gap = 40
    total = w * 2 + gap
    x0, y = (S - total) // 2, (S - h) // 2
    for i, text in enumerate(["ДВИГАЮСЬ МЕДЛЕННО", "В БЫСТРОМ МИРЕ"]):
        x = x0 + i * (w + gap)
        shadow(bg, (x, y, x + w, y + h))
        bg.paste(flag_panel(w, h, text=text), (x, y))
    stamp(bg)
    save(bg, name)


def vinyl_disc(size):
    """Пластинка: чёрный диск с бликом, дорожками и этикеткой."""
    ss = size * 2
    disc = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(disc)
    d.ellipse([0, 0, ss, ss], fill=(20, 18, 16, 255))
    # дорожки: не заходим за центр — этикетка начинается с 0.34
    for i in range(7):
        k = 0.30 + i * 0.024
        d.ellipse([ss * k, ss * k, ss * (1 - k), ss * (1 - k)], outline=(46, 42, 38, 255), width=2)
    lab = 0.34
    d.ellipse([ss * lab, ss * lab, ss * (1 - lab), ss * (1 - lab)], fill=MANE)
    d.ellipse([ss * 0.487, ss * 0.487, ss * 0.513, ss * 0.513], fill=(231, 221, 200, 255))
    # Подпись на этикетке не ставим: диск наполовину скрыт конвертом,
    # и от надписи виден обрубок вроде «J LEVKA».
    return disc.resize((size, size), Image.LANCZOS)


def sleeve(size, cover):
    src = Image.open(cover).convert("RGB").resize((size, size), Image.LANCZOS)
    d = ImageDraw.Draw(src)
    d.rectangle([0, 0, size - 1, size - 1], outline=(70, 62, 52), width=2)
    return src


def vinyl_mockup(name, covers):
    """Конверт (или три конверта веером) и выглядывающая пластинка."""
    bg = wall_bg().convert("RGBA")
    if len(covers) == 1:
        size = 620
        x, y = 210, (S - size) // 2
        disc = vinyl_disc(size - 30)
        shadow(bg, (x + size - 240, y + 20, x + size + 260, y + size - 10), blur=30, alpha=80)
        bg.alpha_composite(disc, (x + size - 250, y + 15))
        shadow(bg, (x, y, x + size, y + size), blur=30, alpha=110)
        bg.paste(sleeve(size, covers[0]), (x, y))
    elif len(covers) == 2:
        # Две стороны одного диска: конверт спереди, второй — за ним со сдвигом (обложка стороны B)
        size = 560
        x, y = 150, (S - size) // 2 + 20
        shadow(bg, (x + 250, y - 70, x + 250 + size, y - 70 + size), blur=28, alpha=90)
        bg.paste(sleeve(size, covers[1]), (x + 250, y - 70))
        disc = vinyl_disc(size - 30)
        shadow(bg, (x + size - 200, y + 10, x + size + 300, y + size - 10), blur=30, alpha=80)
        bg.alpha_composite(disc, (x + size - 210, y + 15))
        shadow(bg, (x, y, x + size, y + size), blur=30, alpha=110)
        bg.paste(sleeve(size, covers[0]), (x, y))
    else:
        # Трифолд разложен: три панели почти без нахлёста, как настоящий разворот
        size = 352
        step = 348
        total = size + step * (len(covers) - 1)
        x0, y = (S - total) // 2, (S - size) // 2
        # Диска здесь нет: между панелями почти нет зазора, ему негде выглянуть,
        # а три обложки в ряд и так читаются как разложенный разворот.
        for i, cover in enumerate(covers):
            x = x0 + i * step
            shadow(bg, (x, y, x + size, y + size), blur=24, alpha=100)
            bg.paste(sleeve(size, cover), (x, y))
    bg = bg.convert("RGB")
    stamp(bg)
    save(bg, name)


print("Флаги:")
flag_mockup("product-flag-medlenno.jpg", text="ДВИГАЮСЬ МЕДЛЕННО")
flag_mockup("product-flag-bystryy-mir.jpg", text="В БЫСТРОМ МИРЕ")
flag_pair_mockup("product-flag-para.jpg")
# Флаг Soundstates снят 17.09.2026 — вместо него платок (tools/build_scarf.py)
# «Музыка без ИИ» снят 14.09.2026, вместо него английская версия пары одной строкой
flag_mockup("product-flag-slow-in-a-fast-world.jpg", text="SLOW IN A\nFAST WORLD")

print("Пластинки:")
covers = [os.path.join(UPLOADS, "release-%s.jpg" % s) for s in ("ikigai", "flowers", "soundstates")]
vinyl_mockup("product-vinyl-trifold.jpg", covers)
vinyl_mockup("product-vinyl-ikigai.jpg", [covers[0]])
vinyl_mockup("product-vinyl-flowers.jpg", [covers[1], covers[2]])  # Flowers / Soundstates — два конверта
vinyl_mockup("product-vinyl-soundstates.jpg", [covers[2]])
