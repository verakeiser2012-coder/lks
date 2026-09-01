// Клич о поиске вокала. Режим пассивный: не ищем адресно, а собираем присланное.
// Посты создаются неподтверждёнными (approved = 0) — публикация только после кнопки в календаре.
// Запускать на сервере: cd /var/www/site && node deploy/create_vocal_call_posts.js
const db = require('/var/www/site/src/db');

const text = `Ищу вокал. Присылайте.

Я пишу инструментальную электронику — синтвейв и даунтемпо. За последний год несколько кураторов написали мне одно и то же: продакшн хороший, но нужен голос. Спорить не буду — для их формата они правы. Радио ставит песни.

Поэтому объявляю открыто: если ты поёшь и хочешь попробовать себя на моём треке — пришли свою партию. Не готовый продюсерский пакет, а именно вокал: мелодию и слова. Можно записанный на телефон, качество на этом этапе не главное.

Что предлагаю на выбор:
— выкупаю партию, плачу фиксированно, дальше трек мой;
— или оформляем соавторство: ты становишься соавтором произведения и получаешь свою долю в авторских отчислениях, как положено, с договором.

Второй вариант честнее, если партия сильная и делает трек.

Специально бегать и искать не буду, но всё, что пришлют, послушаю. Что понравится — доведём до релиза.

Присылайте в личные сообщения.`;

const textEn = `Looking for vocals. Send them over.

I make instrumental electronic music — synthwave and downtempo. Over the past year several curators told me the same thing: the production is good, but it needs a voice. Fair enough — radio plays songs.

So, openly: if you sing and want to try yourself on one of my tracks, send me your part. Not a finished production, just the vocal — melody and words. A phone recording is fine at this stage.

Two options, your choice:
— I buy the part outright, fixed fee, the track is then mine;
— or we split the credit: you become a co-author of the work and get your share of the royalties, properly, with a contract.

The second is fairer if the part really makes the track.

I'm not actively hunting, but I listen to everything that comes in. What I like, we finish and release.

Send me a DM.`;

const newsHook = 'Открытый призыв: ищу вокалиста на следующие треки';

const info = db.prepare(`
  INSERT INTO social_posts (text, text_en, media_path, media_type, scheduled_at, status, news_hook, link_url, approved)
  VALUES (?, ?, '', '', ?, 'scheduled', ?, '', 0)
`).run(text, textEn, '2026-09-03 19:00:00', newsHook);

const postId = info.lastInsertRowid;
for (const network of ['telegram', 'vk', 'news']) {
  db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)').run(postId, network);
}

const row = db.prepare('SELECT id, scheduled_at, approved, status, news_hook FROM social_posts WHERE id = ?').get(postId);
console.log('СОЗДАН ПОСТ:', JSON.stringify(row));
console.log('Цели:', JSON.stringify(db.prepare('SELECT network_key FROM social_post_targets WHERE post_id = ?').all(postId)));
console.log('\nПост неподтверждённый — публикация только после кнопки «Подтвердить» в /admin/calendar.');
console.log('Перед публикацией решить, куда присылать: личные сообщения или отдельная почта.');
