# -*- coding: utf-8 -*-
"""Собирает архивы стикерпаков для магазина и картинки карточек.

Источник — папка «Эмодзи» на рабочем столе (сквозная нумерация, см. ЧИТАЙ.txt там же).
Результат: storage/digital/*.zip (файл цифрового товара) и public/uploads/product-*.jpg
(картинка карточки — коллаж из настоящих стикеров, не рендер).
"""
import os
import zipfile
from PIL import Image

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.expanduser("~"), "Desktop", "Эмодзи")
DIGITAL = os.path.join(SITE, "storage", "digital")
UPLOADS = os.path.join(SITE, "public", "uploads")

DUST = (220, 203, 160)   # Пыль
TAR = (33, 26, 18)       # Смола

PACKS = [
    {
        "slug": "stikery-levkeiser",
        "zip": "stikery-levkeiser.zip",
        "image": "product-stickers-levkeiser.jpg",
        "dirs": ["1-Telegram-пак «Лев Кейсер»"],
        "bg": DUST,
        "readme": """СТИКЕРЫ «ЛЕВ КЕЙСЕР»

Фразы и фото — 67 стикеров 512×512 PNG с прозрачным фоном.

Как поставить себе в Telegram:
1. Открыть @Stickers, команда /newpack, придумать имя набора.
2. Отправлять файлы ФАЙЛОМ (не фото), после каждого — эмодзи.
3. /publish и короткое имя набора — получится ссылка t.me/addstickers/…

Файлы можно использовать и вне Telegram: печать, коллажи, оформление постов.
Продавать их и выдавать за своё — нельзя.

levkeiser.com""",
    },
    {
        "slug": "stikery-reakcii",
        "zip": "stikery-reakcii.zip",
        "image": "product-stickers-reakcii.jpg",
        "dirs": ["2-Telegram-пак «Реакции»", "3-MAX-пак «Реакции»", "4-Сторис-накладки «Неон»"],
        "bg": DUST,
        "readme": """СТИКЕРЫ «РЕАКЦИИ»

Одни и те же реакции в трёх оформлениях — выберите одно, а не смешивайте:
  2-Telegram-пак «Реакции»   — 34 шт., короткое слово на плашке (для Telegram);
  3-MAX-пак «Реакции»        — 34 шт., то же, но фраза целиком (для MAX);
  4-Сторис-накладки «Неон»   — 28 шт., неоновая плашка (для сторис).

512×512 PNG с прозрачным фоном.

Как поставить себе в Telegram:
1. Открыть @Stickers, команда /newpack, придумать имя набора.
2. Отправлять файлы ФАЙЛОМ (не фото), после каждого — эмодзи.
3. /publish и короткое имя набора — получится ссылка t.me/addstickers/…

levkeiser.com""",
    },
    {
        "slug": "stikery-sostoyaniya",
        "zip": "stikery-sostoyaniya.zip",
        "image": "product-stickers-sostoyaniya.jpg",
        "dirs": ["5-Бонус по коду «Состояния»"],
        "bg": TAR,
        "readme": """СТИКЕРЫ «СОСТОЯНИЯ»

26 стикеров 512×512 PNG — кадры из видеосерии «Состояния» с названиями треков:
2AM, Back to the Future, Cloudflute, d.r.e.a.m., Soundstates.

Как поставить себе в Telegram:
1. Открыть @Stickers, команда /newpack, придумать имя набора.
2. Отправлять файлы ФАЙЛОМ (не фото), после каждого — эмодзи.
3. /publish и короткое имя набора — получится ссылка t.me/addstickers/…

Треки — на levkeiser.com/music""",
    },
    {
        "slug": "emodzi-levkeiser",
        "zip": "emodzi-levkeiser.zip",
        "image": "product-stickers-emodzi.jpg",
        "dirs": ["6-Telegram-эмодзи 100px"],
        "grid": (6, 6),
        "bg": DUST,
        "readme": """ЭМОДЗИ «ЛЕВ КЕЙСЕР»

70 эмодзи 100×100 PNG с прозрачным фоном.

Как поставить себе в Telegram:
1. Открыть @Stickers, команда /newemojipack, придумать имя набора.
2. Отправлять файлы ФАЙЛОМ (не фото), после каждого — эмодзи-ассоциацию.
3. /publish и короткое имя набора.

Ставить кастомные эмодзи в сообщения может только аккаунт с Premium,
а видят их все.

levkeiser.com""",
    },
]


def files_of(pack):
    out = []
    for d in pack["dirs"]:
        folder = os.path.join(SRC, d)
        for name in sorted(os.listdir(folder)):
            if name.lower().endswith(".png"):
                out.append((d, os.path.join(folder, name)))
    return out


def build_zip(pack, files):
    path = os.path.join(DIGITAL, pack["zip"])
    if os.path.exists(path):
        os.remove(path)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for folder, full in files:
            z.write(full, "%s/%s" % (folder, os.path.basename(full)))
        z.writestr("ЧИТАЙ.txt", pack["readme"].replace("\n", "\r\n"))
    return os.path.getsize(path)


def build_image(pack, files):
    cols, rows = pack.get("grid", (3, 3))
    """Коллаж из настоящих стикеров: берём равномерно по всему набору."""
    # Квадрат: в каталоге карточка режет картинку по 1:1 (object-fit: cover),
    # из прямоугольной обложки выпали бы крайние столбцы стикеров.
    W, H = 1200, 1200
    canvas = Image.new("RGB", (W, H), pack["bg"])
    need = cols * rows
    step = max(1, len(files) // need)
    chosen = [files[i * step][1] for i in range(need) if i * step < len(files)]
    cell_w, cell_h = W // cols, H // rows
    pad = int(cell_w * 0.10)
    for i, path in enumerate(chosen):
        im = Image.open(path).convert("RGBA")
        box = min(cell_w - 2 * pad, cell_h - 2 * pad)
        # именно resize, а не thumbnail: мелкие эмодзи 100×100 нужно увеличить,
        # иначе карточка выглядит пустой
        k = box / max(im.width, im.height)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        x = (i % cols) * cell_w + (cell_w - im.width) // 2
        y = (i // cols) * cell_h + (cell_h - im.height) // 2
        canvas.paste(im, (x, y), im)
    out = os.path.join(UPLOADS, pack["image"])
    # Перезапись существующего файла на этой машине падает с EINVAL,
    # а создание нового работает: сначала удаляем.
    if os.path.exists(out):
        os.remove(out)
    canvas.save(out, "JPEG", quality=88)
    return out


for pack in PACKS:
    files = files_of(pack)
    size = build_zip(pack, files)
    img = build_image(pack, files)
    print("%-22s %3d файлов  архив %5.1f МБ  %s" % (pack["slug"], len(files), size / 1048576, os.path.basename(img)))
