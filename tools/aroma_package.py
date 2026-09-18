# -*- coding: utf-8 -*-
"""Сборка цифрового товара «Карта натуральных ароматов».

Кладёт в архив: вектор SVG (для печати любого размера), PNG высокого разрешения
и PDF под A1 — на русском и английском, плюс короткий readme. PDF A1 собирается
из растра (так было с первой версии), A2 и A3 — вектором через Chrome
(aroma_pdf_vector.py): текст остаётся текстом, шрифт встроен.
A2 — тот же макет, что A1. A3 — своя раскладка: подписи 13 мм в макете вместо 9,5,
иначе на 420 мм они выходят 2,5 мм; расталкивание подписей в aroma_map_max.py
это учитывает (FS_MAP / SUFFIX_MAP)."""
import os
import subprocess
import sys
import zipfile

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from aroma_pdf_vector import build as vector_pdf

TOOLS = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(TOOLS)
OUT = os.path.join(SITE, "storage", "digital")
BUILD = os.path.join(TOOLS, "aroma_build")
MM = 72.0 / 25.4                      # мм -> пункты PDF
A1 = (841.0, 594.0)                   # мм, альбомная

os.makedirs(OUT, exist_ok=True)
os.makedirs(BUILD, exist_ok=True)


def render(lang, k, fs=None, suffix=""):
    """Перерисовать карту с нужной плотностью пикселей (k пикселей на миллиметр).
    fs — размер подписей в макете (по умолчанию 9,5 под A1), suffix — хвост имени файла."""
    env = dict(os.environ, LANG_MAP=lang, PYTHONIOENCODING="utf-8", AROMA_K=str(k), SUFFIX_MAP=suffix)
    if fs: env["FS_MAP"] = str(fs)
    subprocess.run([sys.executable, os.path.join(TOOLS, "aroma_map_max.py"), BUILD],
                   check=True, cwd=TOOLS, env=env)
    base = ("aroma_map_max" if lang == "ru" else "aroma_map_max_en") + suffix
    return os.path.join(TOOLS, base + ".png"), os.path.join(TOOLS, base + ".svg")


DUST = (0xDC/255.0, 0xCB/255.0, 0xA0/255.0)   # фон карты, им же заливаем поля


def to_pdf(png, pdf, title):
    """Лист A1, карта вписана целиком: пропорции у неё свои (1400x1120), тянуть нельзя."""
    im = Image.open(png)
    pw, ph = A1[0]*MM, A1[1]*MM
    c = canvas.Canvas(pdf, pagesize=(pw, ph))
    c.setTitle(title)
    c.setAuthor("LEVKEYSER")
    c.setFillColorRGB(*DUST)
    c.rect(0, 0, pw, ph, stroke=0, fill=1)
    k = min(pw/im.width, ph/im.height)
    w, h = im.width*k, im.height*k
    c.drawImage(ImageReader(im), (pw-w)/2, (ph-h)/2, width=w, height=h)
    c.showPage()
    c.save()
    return round(os.path.getsize(pdf)/1048576, 1)


README = """КАРТА НАТУРАЛЬНЫХ АРОМАТОВ
166 ароматов · 12 семейств · LEVKEYSER

Что в архиве (ru — русский, en — английский)
  karta-aromatov-ru.pdf / -en.pdf         готовый файл под A1 (841 x 594 мм)
  karta-aromatov-ru-a2.pdf / -en-a2.pdf   тот же макет под A2 (594 x 420 мм), вектор
  karta-aromatov-ru-a3.pdf / -en-a3.pdf   A3 (420 x 297 мм), вектор — своя раскладка
                                          с крупными подписями, чтобы читалось и в малом формате
  karta-aromatov-ru.svg / -en.svg         вектор, печатается в любом размере без потери качества
  karta-aromatov-ru-a3.svg / -en-a3.svg   вектор раскладки A3
  karta-aromatov-ru.png / -en.png         растр 8400 x 6720 px под экран и печать до A1
  karta-aromatov-ru-a3.png / -en-a3.png   растр раскладки A3, 5600 x 4480 px

Какой формат брать
  A1 или A2 — на стену: подписи 5,7 и 3,6 мм, читаются с шага-двух.
  A3 — на стол или в рамку у рабочего места: подписи 3,4 мм, читать вблизи.

Как читать
  Двенадцать семейств стоят по кругу. Чем сильнее семейство звучит в аромате,
  тем ближе аромат к нему, поэтому место на карте — это уже состав.
  Круговая диаграмма в точке показывает доли семейств внутри аромата.
  Цветная дуга ведёт ко второму семейству, к которому аромат тянется.

Печать
  Бумага: матовая 200-250 г/м2 или дизайнерская тёплого оттенка.
  Вектор (SVG) отдавайте в типографию, если печатаете больше A1.
  Шрифт Roboto Slab (лицензия Apache 2.0) при необходимости встраивается в кривые.

Лицензия
  Файлы для личного использования и для работы вашей мастерской: печатайте,
  вешайте, показывайте клиентам. Перепродажа файлов и печатных копий тиражом
  запрещена. По вопросам сотрудничества: booking@levkeiser.com

Доли семейств собраны по колесу ароматов М. Эдвардса, категориям Foodpairing
и Flavor Network, дескрипторам The Good Scents и классификации натурального
сырья, и продолжают уточняться. Обновления архива — бесплатно.

levkeiser.com/aroma — интерактивная карта: соберите состав и посмотрите,
где он встанет.
"""

if __name__ == "__main__":
    files = []
    for lang, suf in (("ru", "ru"), ("en", "en")):
        png, svg = render(lang, 6)
        pdf = os.path.join(BUILD, "karta-aromatov-%s.pdf" % suf)
        size = to_pdf(png, pdf, "Карта натуральных ароматов" if lang == "ru" else "A Map of Natural Aromas")
        for src, dst in ((svg, "karta-aromatov-%s.svg" % suf), (png, "karta-aromatov-%s.png" % suf)):
            d = os.path.join(BUILD, dst)
            if os.path.abspath(src) != os.path.abspath(d):
                with open(src, "rb") as a, open(d, "wb") as b:
                    b.write(a.read())
            files.append(d)
        files.append(pdf)
        print("  %s: pdf %s Мб" % (lang, size))
        # A2 — вектором с того же макета
        title = "Карта натуральных ароматов" if lang == "ru" else "A Map of Natural Aromas"
        pdf2 = os.path.join(BUILD, "karta-aromatov-%s-a2.pdf" % suf)
        vector_pdf(svg, pdf2, 594, 420, title + " — A2")
        files.append(pdf2)
        # A3 — своя раскладка с крупными подписями, вектором
        png3, svg3 = render(lang, 4, fs=13, suffix="_a3")
        for src, dst in ((svg3, "karta-aromatov-%s-a3.svg" % suf), (png3, "karta-aromatov-%s-a3.png" % suf)):
            d = os.path.join(BUILD, dst)
            with open(src, "rb") as a, open(d, "wb") as b:
                b.write(a.read())
            files.append(d)
        pdf3 = os.path.join(BUILD, "karta-aromatov-%s-a3.pdf" % suf)
        vector_pdf(os.path.join(BUILD, "karta-aromatov-%s-a3.svg" % suf), pdf3, 420, 297, title + " — A3")
        files.append(pdf3)
        print("  %s: a2 %s Мб, a3 %s Мб" % (lang, round(os.path.getsize(pdf2)/1048576, 2), round(os.path.getsize(pdf3)/1048576, 2)))

    readme = os.path.join(BUILD, "как-печатать.txt")
    with open(readme, "w", encoding="utf-8-sig") as f:
        f.write(README)
    files.append(readme)

    zpath = os.path.join(OUT, "karta-aromatov.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, os.path.basename(f))
    print("архив:", zpath, round(os.path.getsize(zpath)/1048576, 1), "Мб")
