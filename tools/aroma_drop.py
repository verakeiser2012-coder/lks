# -*- coding: utf-8 -*-
"""Таблетка «Груша × Лев» становится дропом, карта переезжает в «Ароматы»."""
import os
import sqlite3

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db = sqlite3.connect(os.path.join(SITE, "data", "shop.db"))
SLUG = "grusha-x-lev"

DESC = ("Совместный дроп с мастерской «Груша» (Екатеринбург): Юлия делает благовония и керамику "
        "по семейным рецептам, из натуральных смол, масел и дерева. Дроп вырос из подкаста, "
        "который мы записали у неё в мастерской 31 июля: разговор о том, что аромат собирается "
        "так же, как трек — сначала основа, потом слои, и нельзя торопить, пока всё не сойдётся.\n\n"
        "В дропе — ароматическая таблетка в конверте с обложкой альбома Soundstates и карта "
        "натуральных ароматов: 166 материалов парфюмерии и благовоний на двенадцати семействах.")

row = db.execute("SELECT id FROM collections WHERE slug = ?", (SLUG,)).fetchone()
if row:
    coll = row[0]
    db.execute("UPDATE collections SET name=?, subtitle=?, description=?, season_label=?, is_published=1 WHERE id=?",
               ("Груша × Лев", "Благовония и керамика — коллаборация с мастерской «Груша»", DESC, "Осень 2026", coll))
    print("дроп обновлён, id", coll)
else:
    cur = db.execute("""INSERT INTO collections (name, slug, subtitle, description, season_label, is_published, sort_order)
                        VALUES (?,?,?,?,?,?,?)""",
                     ("Груша × Лев", SLUG, "Благовония и керамика — коллаборация с мастерской «Груша»",
                      DESC, "Осень 2026", 1, 1))
    coll = cur.lastrowid
    print("дроп создан, id", coll)

# таблетка — в дроп; карта — в «Ароматы» и туда же, чтобы дроп был из двух вещей
aromaty = db.execute("SELECT id FROM categories WHERE slug = 'aromaty'").fetchone()[0]
db.execute("UPDATE products SET collection_id = ? WHERE slug = 'aromaticheskaya-tabletka-grusha-lev'", (coll,))
db.execute("UPDATE products SET category_id = ?, collection_id = ? WHERE slug = 'karta-naturalnyh-aromatov'",
           (aromaty, coll))
db.commit()

for r in db.execute("""SELECT p.id, p.name, c.name, p.collection_id, p.is_digital
                       FROM products p JOIN categories c ON c.id = p.category_id
                       WHERE p.collection_id = ?""", (coll,)):
    print(" ", r)
