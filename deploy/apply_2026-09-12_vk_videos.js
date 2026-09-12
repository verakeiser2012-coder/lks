// Ролики из VK Видео сообщества (vkvideo.ru/@levkeiser, 12.09.2026) — в галереи сайта:
// реклама → style-ads (раздел «В кадре → Реклама»), кино → style-film.
// Шоурил и видеовизитка удаляются (решение Льва 12.09): их не показываем.
// Ищем по адресу встраивания, повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const OWNER = '-224216740';
const vk = (id, owner = OWNER) => `https://vk.com/video_ext.php?oid=${owner}&id=${id}&hd=2`;

const ADS = [
  [vk('456239088'), 'Киоскёр — рекламный ролик'],
  [vk('456239063'), '#модельлевкейсер — рекламные съёмки'],
  [vk('456239059'), '«Кудряшки сами прям так держатся» — ролик под трек Hotline, 2024'],
];
const FILM = [
  [vk('456239711', '-16171805'), 'Фильм «Как Дёма Баклушкин Бажова прочёл», студия «Мастер», 2024'],
  [vk('456239139'), '«Дёма Баклушкин» с тифлокомментариями'],
  [vk('456239019'), 'Премьера фильма, 2024'],
  [vk('456239056'), '«Кошмар в лифте», 2022'],
];

const exists = db.prepare('SELECT id FROM gallery_items WHERE page_key = ? AND file_path = ?');
const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM gallery_items WHERE page_key = ?');
const insert = db.prepare("INSERT INTO gallery_items (type, title, file_path, page_key, sort_order) VALUES ('video', ?, ?, ?, ?)");
function put(key, list) {
  let sort = maxSort.get(key).m;
  for (const [url, title] of list) {
    if (exists.get(key, url)) continue;
    sort += 1;
    insert.run(title, url, key, sort);
    console.log(`${key}: + ${title}`);
  }
}
put('style-ads', ADS);
put('style-film', FILM);

const removed = db.prepare("DELETE FROM gallery_items WHERE page_key = 'style-portfolio' AND type = 'video' AND (title LIKE '%Шоурил%' OR title LIKE '%Видеовизитка%')").run();
console.log('шоурил/видеовизитка удалены:', removed.changes);
for (const k of ['style-ads', 'style-film', 'style-portfolio']) {
  console.log(k, db.prepare('SELECT COUNT(*) c FROM gallery_items WHERE page_key = ?').get(k).c);
}
