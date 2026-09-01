// Пост-анонс статьи про Popularity Score со связкой на Дзен.
// Создаётся неподтверждённым (approved = 0): публикация только после кнопки в календаре.
// Запускать на сервере: cd /var/www/site && node deploy/create_spotify_score_post.js
const db = require('/var/www/site/src/db');

const text = `Мы потратили 25 тысяч на продвижение музыки. Вот число, которое объяснило всё.

За год мы отправили 81 заявку кураторам плейлистов и получили 21 размещение. Звучит неплохо — пока не открываешь статистику по-настоящему.

У Spotify есть внутренний показатель Popularity Score, от 0 до 100. Чем он выше, тем охотнее сервис сам подмешивает трек в Discover Weekly и Release Radar. То есть продвигает бесплатно.

Мой трек Bubblegum отправлялся 12 раз и попал в 5 плейлистов. Его счёт сегодня — ноль.
Трек Soundstates отправлялся дважды. Его счёт — 12.

Двенадцать заявок против двух, пять плейлистов против одного, и результат ровно наоборот.

Почему так вышло, при чём тут вокал, которого у меня нет, и какая ошибка в настройках скрывала от нас половину подходящих кураторов — написал подробно в Дзене.

Со всеми суммами и без прикрас: там же про то, как мы полгода платили за вежливые объяснения, что принесли не то и не туда.`;

const newsHook = 'Разбор: почему 12 заявок дали ноль, а две — двенадцать';

const info = db.prepare(`
  INSERT INTO social_posts (text, media_path, media_type, scheduled_at, status, news_hook, link_url, approved)
  VALUES (?, '', '', ?, 'scheduled', ?, ?, 0)
`).run(text, '2026-09-15 19:00:00', newsHook, 'https://dzen.ru/djlevka');

const postId = info.lastInsertRowid;
for (const network of ['telegram', 'vk', 'news']) {
  db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)').run(postId, network);
}

const row = db.prepare('SELECT id, scheduled_at, approved, status, news_hook FROM social_posts WHERE id = ?').get(postId);
console.log('СОЗДАН ПОСТ:', JSON.stringify(row));
console.log('Цели:', JSON.stringify(db.prepare('SELECT network_key FROM social_post_targets WHERE post_id = ?').all(postId)));
console.log('\nПост неподтверждённый — публикация только после кнопки «Подтвердить» в /admin/calendar.');
console.log('Ссылку на статью в Дзене подставить точную, когда статья будет опубликована.');
