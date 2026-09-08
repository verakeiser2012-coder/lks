// «Без ИИ» убрано из коротких описаний (решение 08.09, notes/headers-audit.md).
//
// Правим только «шапочные» тексты — описание для поисковиков и вводную «Музыки».
// Тело страниц не трогаем: в «Обо мне», в заметке о подкасте и во вводной «Стиля»
// упоминание нейросетей — факт о процессе, а не лозунг, и там оно уместно.
//
// Запускать на сервере из корня проекта: node deploy/apply_texts_2026-09-08.js
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const get = db.prepare('SELECT value FROM settings WHERE key = ?');
const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

const edits = [
  ['meta_description', 'Создаю кастомные вещи и музыку без ИИ.', 'Создаю кастомные вещи и музыку.'],
  ['music_intro', 'Вдохновительная музыка без ИИ.', 'Вдохновительная музыка.'],
];

for (const [key, from, to] of edits) {
  const row = get.get(key);
  if (!row || !row.value || !row.value.includes(from)) {
    console.log(`${key}: пропуск — искомой строки нет`);
    continue;
  }
  upsert.run(key, row.value.replace(from, to));
  console.log(`${key}: обновлено`);
}

console.log(db.prepare("SELECT key, substr(value, 1, 90) AS v FROM settings WHERE key IN ('meta_description', 'music_intro')").all());
