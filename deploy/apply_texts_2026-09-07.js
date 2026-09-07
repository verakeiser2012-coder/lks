// Тексты сайта приведены к эталону шапок соцсетей (notes/headers-audit.md):
//   Вдохновительный парень. Двигаюсь медленно в быстром мире.
//   Создаю кастомные вещи и музыку без ИИ.
// Запускать на сервере из корня проекта: node deploy/apply_texts_2026-09-07.js
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

upsert.run('meta_description', 'Вдохновительный парень. Двигаюсь медленно в быстром мире. Создаю кастомные вещи и музыку без ИИ. Лев Кейсер · DJ Levka: 10 релизов на всех стримингах, съёмки на плёнку, выступления и мерч.');
upsert.run('music_intro', 'Вдохновительная музыка без ИИ. Треки, релизы и все площадки в одном месте.');

const row = db.prepare("SELECT value FROM settings WHERE key = 'about_text'").get();
if (row && row.value && !row.value.includes('Создаю кастомные вещи и музыку без ИИ.')) {
  upsert.run('about_text', row.value.replace(
    'Двигаюсь медленно в быстром мире. Slow in a fast world.',
    'Двигаюсь медленно в быстром мире. Slow in a fast world. Создаю кастомные вещи и музыку без ИИ.'
  ));
  console.log('about_text updated');
}
console.log(db.prepare("SELECT key, substr(value, 1, 80) AS v FROM settings WHERE key IN ('meta_description', 'music_intro', 'about_text')").all());
