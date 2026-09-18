# -*- coding: utf-8 -*-
"""Заводит цифровой товар «Карта натуральных ароматов» в магазине."""
import io
import os
import sqlite3

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(SITE, "storage", "digital", "karta-aromatov.zip")
SLUG = "karta-naturalnyh-aromatov"

DESC = """Карта натуральных ароматов: 166 материалов парфюмерии и благовоний на двенадцати семействах. Уд, лабданум, бахур, морёный дуб, ладан, сандал, амбра — рядом с цитрусами, травами, пряностями и цветами.

Наша разработка. Прямого аналога мы не нашли. Есть колесо ароматов Эдвардса — но это круг из одних семейств, без самих материалов. Есть карты готовых духов — но не сырья. Есть научный граф вкусов — но про еду. Здесь другое:

— на одной карте стоят натуральные материалы парфюмерии и благовоний, а не абстрактные категории и не готовые ароматы;
— место точки вычисляется из состава, а не расставляется на глаз: чем сильнее семейство звучит в аромате, тем ближе он к нему, поэтому положение на карте — это уже формула;
— состав виден прямо в точке круговой диаграммой: сразу считывается, из чего аромат собран;
— рядом работает верстак, который ставит вашу собственную смесь на ту же карту.

Скажем честно, как есть: мы искали, но весь интернет не перелопатили. Утверждать «нигде такого нет» не будем — а вот «прямого аналога не нашли» скажем твёрдо.

В архиве
Вектор SVG — печатается в любом размере без потери качества. PDF под A1 (841 × 594 мм) — можно нести в типографию как есть. PNG 8400 × 6720 px — для экрана и печати до A1. Всё это на русском и на английском, плюс памятка по печати. Доли семейств уточняются, обновления архива бесплатные.

Собрано по колесу ароматов М. Эдвардса, категориям Foodpairing и Flavor Network, дескрипторам The Good Scents и классификации натурального сырья.

Интерактивная версия — на странице levkeiser.com/aroma: соберите свой состав и посмотрите, где он встанет на карте."""

INCLUDES = """SVG на русском и английском
PDF под A1, готов для типографии
PNG 8400 × 6720 px
Памятка по печати
Бесплатные обновления"""

db = sqlite3.connect(os.path.join(SITE, "data", "shop.db"))
cat = db.execute("SELECT id FROM categories WHERE slug = 'cifrovye-tovary'").fetchone()[0]
size = os.path.getsize(ZIP)
row = db.execute("SELECT id FROM products WHERE slug = ?", (SLUG,)).fetchone()
vals = ("Карта натуральных ароматов", SLUG, DESC, 690.0, cat,
        "/uploads/product-karta-aromatov.jpg", 0, 1, 1,
        "karta-aromatov.zip", "Карта натуральных ароматов.zip", size, INCLUDES)
if row:
    db.execute("""UPDATE products SET name=?, description=?, price=?, category_id=?, image=?,
                  stock=?, is_active=?, is_digital=?, digital_file=?, digital_filename=?,
                  digital_size=?, includes=? WHERE slug=?""",
               (vals[0], vals[2], vals[3], vals[4], vals[5], vals[6], vals[7], vals[8],
                vals[9], vals[10], vals[11], vals[12], SLUG))
    print("товар обновлён, id", row[0])
else:
    cur = db.execute("""INSERT INTO products (name, slug, description, price, category_id, image,
                        stock, is_active, is_digital, digital_file, digital_filename, digital_size, includes)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", vals)
    print("товар добавлен, id", cur.lastrowid)
db.commit()

r = db.execute("SELECT id, name, price, is_digital, digital_size, is_active FROM products WHERE slug=?", (SLUG,)).fetchone()
print("проверка:", r, "| архив %.1f Мб" % (size/1048576))
