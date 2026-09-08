// Новое расписание публикаций (08.09.2026): один текстовый пост в неделю,
// два клипа, плюс пост об открытии сайта. Клипы теперь идут и во ВКонтакте:
// это единственный формат, который площадка показывает не подписчикам.
// Запускать на сервере: node deploy/apply_2026-09-08e.js
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

// 1. Пост об открытии
const TEXT = `levkeiser.com — открыт.

Год я складывал всё в одно место, и вот оно.

Что там есть, кроме музыки:
— «Стиль»: мои кадры с пяти лет до сейчас. Год не подписан — попробуйте угадать, там игра.
— «Рыжие, которые вдохновляют»: не только я, а подборка.
— Дневник: то, что не влезает в посты.
— Вещи: бюсты к альбому Soundstates, у каждого свой номер и своя фраза, которая открывается только на сайте.
— И три игры вокруг музыки: угадать трек по пяти секундам, собрать свой сет, узнать, какой ты трек из Soundstates.

Магазин пока смотрит, а не продаёт: оплату подключаем. Всё остальное работает.

levkeiser.com`;

let launch = db.prepare("SELECT id FROM social_posts WHERE text LIKE '%levkeiser.com — открыт%'").get();
if (!launch) {
  const info = db.prepare(`INSERT INTO social_posts (text, text_en, news_hook, link_url, story, media_path,
    media_type, media_items, scheduled_at, status, approved)
    VALUES (?, '', '', 'https://levkeiser.com', 0, '', '', '[]', '2026-09-14 19:00:00', 'scheduled', 0)`).run(TEXT);
  for (const net of ['telegram', 'vk', 'news', 'ok', 'dzen']) {
    db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)').run(info.lastInsertRowid, net);
  }
  console.log('пост об открытии создан, id', info.lastInsertRowid);
  launch = { id: Number(info.lastInsertRowid) };
} else {
  console.log('пост об открытии уже есть, id', launch.id);
}

// 2. Клипы уходят и во ВКонтакте
let vkAdded = 0;
for (const row of db.prepare("SELECT id FROM social_posts WHERE text LIKE '%анимация%'").all()) {
  const has = db.prepare('SELECT 1 FROM social_post_targets WHERE post_id = ? AND network_key = ?').get(row.id, 'vk');
  if (!has) { db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)').run(row.id, 'vk'); vkAdded += 1; }
}
console.log('клипов, которым добавлен ВКонтакте:', vkAdded);

// 3. Расписание: тексты по понедельникам в 12:00, клипы во вторник и четверг в 19:00
const rows = db.prepare("SELECT id, text FROM social_posts WHERE status = 'scheduled' ORDER BY scheduled_at, id").all();
const clips = [], texts = [];
for (const r of rows) {
  if (r.id === launch.id) continue;
  (String(r.text || '').includes('анимация') ? clips : texts).push(r.id);
}
const start = new Date(Date.UTC(2026, 8, 15)); // понедельник 15 сентября
const slot = (week, day, hour) => {
  const d = new Date(start.getTime() + ((week * 7 + day) * 86400000));
  return `${d.toISOString().slice(0, 10)} ${String(hour).padStart(2, '0')}:00:00`;
};
const upd = db.prepare('UPDATE social_posts SET scheduled_at = ? WHERE id = ?');
texts.forEach((id, i) => upd.run(slot(i, 0, 12), id));
clips.forEach((id, i) => upd.run(slot(Math.floor(i / 2), i % 2 === 0 ? 1 : 3, 19), id));

// Анонс серии клипов должен выходить раньше самих клипов.
// Ищем по тексту, а не по id: на сервере и локально идентификаторы разные.
const byText = (like) => {
  const row = db.prepare('SELECT id FROM social_posts WHERE text LIKE ? ORDER BY id LIMIT 1').get(like);
  return row ? row.id : null;
};
const order = [
  ['%Запускаю серию анимаций%', '2026-09-15 12:00:00'],
  ['%Tyler the Creator%', '2026-09-22 12:00:00'],
  ['%в первый же день заглавный трек%', '2026-09-29 12:00:00'],
];
for (const [like, when] of order) {
  const id = byText(like);
  if (id) upd.run(when, id);
  else console.log('  не нашёл пост:', like);
}
// Освобождаем понедельники, которые заняли переставленные посты: сдвигаем
// остальные тексты на следующую свободную неделю.
const used = new Set(order.map((o) => o[1]));
let week = 0;
for (const id of texts) {
  if (order.some(([like]) => byText(like) === id)) continue;
  let when = slot(week, 0, 12);
  while (used.has(when)) { week += 1; when = slot(week, 0, 12); }
  upd.run(when, id);
  used.add(when);
  week += 1;
}

console.log('переставлено: текстов', texts.length, '· клипов', clips.length);
for (const r of db.prepare(`SELECT scheduled_at, substr(text, 1, 44) AS t FROM social_posts
   WHERE status = 'scheduled' AND scheduled_at < '2026-10-01' ORDER BY scheduled_at`).all()) {
  console.log(' ', r.scheduled_at.slice(0, 16), String(r.t).includes('анимация') ? 'клип' : 'пост', r.t.replace(/\n/g, ' '));
}
