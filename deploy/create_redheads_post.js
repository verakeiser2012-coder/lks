const db = require('/var/www/site/src/db');

const text = `Рыжий — это редкость, а не недостаток.

Рыжие волосы — не стиль и не случайность, а редкая генетика: рецессивный вариант гена MC1R, всего 1–2% людей на планете. Больше всего рыжих в Шотландии и Ирландии.

С 28 по 30 августа в нидерландском Тилбурге прошёл Redhead Days — крупнейший в мире фестиваль рыжих: участники из 80+ стран, три дня программы и общее фото всех натуральных рыжих, в этом году в бордовом — цвете года.

Я сам рыжий, и по такому поводу запустил у себя на сайте раздел «Рыжие, которые вдохновляют» — курируемую подборку моделей, музыкантов, актёров. Написал об этом подробно в Дзене: https://dzen.ru/a/apGibB0nKGBunFyF

Редкость стоит того, чтобы её замечали.

#рыжие #деньрыжих #redheaddays #фестиваль #рыжиеволосы #генетика #тилбург`;

const newsHook = 'В Тилбурге прошёл Redhead Days — крупнейший в мире фестиваль рыжих';

const info = db.prepare(`
  INSERT INTO social_posts (text, media_path, media_type, scheduled_at, status, news_hook, link_url, approved)
  VALUES (?, ?, 'photo', '2026-08-31 10:00:00', 'scheduled', ?, 'https://levkeiser.com/redheads', 0)
`).run(text, '/uploads/redheads-tg-2026.jpg', newsHook);

const postId = info.lastInsertRowid;
db.prepare("INSERT INTO social_post_targets (post_id, network_key) VALUES (?, 'telegram')").run(postId);

const row = db.prepare('SELECT id, scheduled_at, approved, status, media_path, link_url FROM social_posts WHERE id = ?').get(postId);
console.log('CREATED POST:', JSON.stringify(row));
console.log('TARGETS:', JSON.stringify(db.prepare('SELECT network_key, status FROM social_post_targets WHERE post_id = ?').all(postId)));
