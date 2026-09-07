// Данные к выкладке раздела «Стиль» (08.09.2026): тексты блоков и чистка ссылок.
// Запускать из корня проекта: node deploy/apply_2026-09-08.js  (идемпотентно)
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS style_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    story TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    link_label TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS look_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
    voter TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(item_id, voter)
  );
`);

const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
const current = (k) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(k) || {}).value || '';

// Вводный текст меняем только если стоит старый служебный.
if (current('style_intro') === '' || /Актёрство и моделинг/.test(current('style_intro'))) {
  upsert.run('style_intro', 'Как я выгляжу и почему. Рыжий, плёнка вместо фильтров, вещи маленькими тиражами.');
}
const texts = {
  style_looks_intro: 'Какой образ снимать следующим? Отметьте: один голос с устройства на образ, итог виден всем.',
  style_walks_intro: 'Подиум с четырёх лет до сейчас. Год не подписан: угадайте его по ролику.',
  style_wear_intro: 'Вещи, которые со мной не первый год. Откуда и почему именно они.',
  style_redhead_note: 'Цвет волос у 1–2% людей на планете. Я не крашу и не прячу: это часть стиля, а не особенность. Тут же собираю [рыжих, на которых смотрю сам](/redheads).',
  style_film_intro: 'Снимаем на плёнку. Не ради ретро: плёнка не даёт переснять сто дублей, поэтому каждый кадр решают до нажатия.',
};
for (const [k, v] of Object.entries(texts)) if (!current(k)) upsert.run(k, v);

// Ссылки раздела: оставляем Pinterest (архив с четырёх лет) и Telegram, остальное есть в подвале.
const removed = db.prepare(`
  DELETE FROM page_links WHERE section = 'style'
  AND url NOT LIKE '%pinterest%' AND url NOT LIKE '%t.me%'
`).run().changes;
db.prepare("UPDATE page_links SET group_name = '' WHERE section = 'style'").run();
console.log('links removed:', removed, '| left:', db.prepare("SELECT label FROM page_links WHERE section = 'style'").all().map((r) => r.label));
console.log('style_intro:', current('style_intro'));
