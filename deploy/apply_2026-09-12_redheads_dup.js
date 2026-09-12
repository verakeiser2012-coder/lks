// Новость и запись дневника про фестиваль рыжих были одним и тем же текстом с
// одинаковым заголовком — поисковик видит дубль. Новость становится коротким
// анонсом со ссылкой на дневник, у записи дневника — свой заголовок.
// Ищем по slug, повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const SLUG = 'poka-v-niderlandah-festival-ryzhih-u-nas-novyy-razdel';

const NEWS_TEXT = [
  'С 28 по 30 августа в Тилбурге (Нидерланды) проходит Redhead Days — крупнейший в мире фестиваль рыжих: тысячи участников из 80+ стран и общее фото в цвете года.',
  'В честь этого на сайте открылся раздел [«Рыжие, которые вдохновляют»](/redheads) — подборка рыжих людей, которые мне нравятся, и заявка для тех, кто хочет в неё попасть.',
  `Почему рыжие для меня не «особенность», а часть стиля, и как собирается подборка — [в дневнике](/diary/${SLUG}).`,
].join('\n\n');

const n = db.prepare('UPDATE news SET title = ?, content = ? WHERE slug = ? AND lang = ?')
  .run('Открылся раздел «Рыжие, которые вдохновляют»', NEWS_TEXT, SLUG, 'ru');
console.log('новость переписана в анонс:', n.changes);

const d = db.prepare('UPDATE diary_posts SET title = ? WHERE slug = ?')
  .run('Redhead Days в Нидерландах и мой раздел «Рыжие, которые вдохновляют»', SLUG);
console.log('заголовок записи дневника обновлён:', d.changes);
