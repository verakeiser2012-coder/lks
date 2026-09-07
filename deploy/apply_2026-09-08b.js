// Убираем «плёнку»: Лев снимается в кино и рекламе, а не на фотоплёнку. Идемпотентно.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const up = db.prepare('UPDATE settings SET value = ? WHERE key = ? AND value = ?');
up.run('Как я выгляжу и почему. Рыжий, без фильтров и нейросетей, вещи маленькими тиражами.', 'style_intro', 'Как я выгляжу и почему. Рыжий, плёнка вместо фильтров, вещи маленькими тиражами.');
up.run('Кино и реклама, в которых снимаюсь, и то, что остаётся за кадром: площадка, свет, дубли.', 'style_film_intro', 'Снимаем на плёнку. Не ради ретро: плёнка не даёт переснять сто дублей, поэтому каждый кадр решают до нажатия.');
const md = db.prepare("SELECT value FROM settings WHERE key = 'meta_description'").get();
if (md && md.value.includes('съёмки на плёнку')) db.prepare("UPDATE settings SET value = ? WHERE key = 'meta_description'").run(md.value.replace('съёмки на плёнку', 'кино и реклама'));
const d = db.prepare("SELECT id, content FROM diary_posts WHERE content LIKE '%Снимаюсь на плёнку.%'").all();
for (const p of d) db.prepare('UPDATE diary_posts SET content = ? WHERE id = ?').run(p.content.replace('Снимаюсь на плёнку.', 'Снимаюсь в кино и рекламе, где один дубль стоит дороже десяти.'), p.id);
console.log(db.prepare("SELECT key, value FROM settings WHERE key IN ('style_intro','style_film_intro','meta_description')").all(), 'diary fixed:', d.length);
console.log('left:', db.prepare("SELECT count(*) c FROM settings WHERE value LIKE '%плёнк%'").get().c, db.prepare("SELECT count(*) c FROM diary_posts WHERE content LIKE '%плёнк%'").get().c);
