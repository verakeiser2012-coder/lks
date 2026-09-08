// Наполнение раздела «Стиль» и черновики дневника (08.09.2026).
// Запускать на сервере из корня: node deploy/apply_2026-09-08d.js
// Идемпотентно: записи заводятся по пути файла и слагу.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

const GALLERY = [
  ['/uploads/style-walks-5y-22.jpg', 'style-walks', '2017-11-20', '', 0],
  ['/uploads/style-walks-6y-00.jpg', 'style-walks', '2018-04-14', '', 1],
  ['/uploads/style-walks-7y-18.jpg', 'style-walks', '2019-10-05', '', 2],
  ['/uploads/style-walks-9y-18.jpg', 'style-walks', '2021-09-18', '', 3],
  ['/uploads/style-walks-10y-05.jpg', 'style-walks', '2022-05-21', '', 4],
  ['/uploads/style-walks-13y-08.jpg', 'style-walks', '2025-09-27', '', 5],
  ['/uploads/style-6y-09.jpg', 'style', '', 'Первый образ, который выбрал сам', 0],
  ['/uploads/style-7y-11.jpg', 'style', '', 'Белое и красное: проще некуда', 1],
  ['/uploads/style-10y-17.jpg', 'style', '', 'Пальто не по размеру, зато по настроению', 2],
  ['/uploads/style-12y-10.jpg', 'style', '', 'Студия, серый фон, ничего лишнего', 3],
  ['/uploads/style-13y-06.jpg', 'style', '', 'Осень и рыжий — одна палитра', 4],
  ['/uploads/style-13y-18.jpg', 'style', '', 'Свитер, в котором меня чаще всего снимают', 5],
  ['/uploads/style-film-10y-01.jpg', 'style-film', '', 'Свет ставят дольше, чем снимают', 0],
  ['/uploads/style-film-9y-18.jpg', 'style-film', '', 'За спиной три камеры, а идти надо как будто их нет', 1],
  ['/uploads/style-film-11y-07.jpg', 'style-film', '', 'Кран, оператор и полчаса на один проход', 2],
  ['/uploads/style-film-13y-19.jpg', 'style-film', '', 'Между дублями', 3],
];

const find = db.prepare('SELECT id FROM gallery_items WHERE file_path = ? AND page_key = ?');
const ins = db.prepare(`INSERT INTO gallery_items (type, title, file_path, page_key, sort_order, shot_date)
                        VALUES ('photo', ?, ?, ?, ?, ?)`);
let added = 0;
for (const [file, key, shot, title, sort] of GALLERY) {
  if (find.get(file, key)) continue;
  ins.run(title, file, key, sort, shot);
  added += 1;
}
console.log('кадров добавлено:', added);

db.prepare(`INSERT INTO settings (key, value) VALUES ('style_walks_intro', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
  .run('Как я двигаюсь в кадре: с пяти лет до сейчас. Год не подписан — попробуйте угадать.');

// Записи дневника ложатся черновиками: голос Льва, ему и править.
const POSTS = [
  ['Десять лет в кадре', 'desyat-let-v-kadre',
   'Собрал в разделе «Стиль» кадры с пяти лет до сейчас. Смотреть на них подряд странно и полезно.',
   '2026-09-10 12:00:00',
   '<p>В разделе «Стиль» теперь лежат кадры с пяти лет до сейчас. Один на год, подряд. Год я специально не подписал: там игра, попробуйте угадать.</p>\n<p>Смотреть их подряд странно. Первый выход я почти не помню: помню только, что было холодно и что мне сказали идти прямо и не улыбаться. На фото я иду и не улыбаюсь.</p>\n<p>Что видно на этих кадрах, кроме того, что я вырос. Видно, что сначала меня одевали, а потом я начал выбирать сам. Момент, когда это случилось, на плёнке не отмечен, но примерно посередине.</p>\n<p>Ещё видно, что съёмка — это работа. Красивый кадр занимает секунду, всё остальное время ставят свет и переснимают. В разделе «Кино» я положил как раз такие кадры: кран, оператор, пауза между дублями. Мне они нравятся больше парадных.</p>\n<p><em>Черновик. Лев, поправь своими словами и включи публикацию.</em></p>'],
  ['Почему в моей музыке нет нейросети', 'pochemu-v-moey-muzyke-net-neyroseti',
   'Меня спрашивают, почему не пользуюсь ИИ. Отвечаю один раз и подробно.',
   '2026-09-15 12:00:00',
   '<p>У меня в статусе во ВКонтакте написано: принципиально не пользуюсь ИИ для создания моей музыки. Это спрашивают часто, отвечу один раз и подробно.</p>\n<p>Дело не в том, что нейросеть плохая. Она быстрая. Пока она пишет трек за десять секунд, я свожу бас третий день. По скорости я проиграл заранее.</p>\n<p>Но мне интересно не получить трек, а его сделать. Это разные занятия. Когда я три дня двигаю один звук, я в конце знаю про этот звук всё. Когда трек приходит готовым, я не знаю про него ничего, и слушателю это, кажется, слышно.</p>\n<p>Ещё одна причина простая. Если мою музыку можно получить за десять секунд без меня, то зачем я. А если нельзя, то у меня есть работа.</p>\n<p>Я не спорю с теми, кто пользуется. Просто у меня всё в проекте устроено одинаково: музыка руками, вещи под заказ маленькими партиями, съёмки не за один дубль. Это и есть «двигаюсь медленно в быстром мире», и в музыке это не лозунг, а способ работы.</p>\n<p><em>Черновик. Лев, поправь своими словами и включи публикацию.</em></p>'],
];
const findPost = db.prepare('SELECT id FROM diary_posts WHERE slug = ?');
const insPost = db.prepare(`INSERT INTO diary_posts (title, slug, excerpt, content, is_published, created_at)
                            VALUES (?, ?, ?, ?, 0, ?)`);
let posts = 0;
for (const [title, slug, excerpt, when, content] of POSTS) {
  if (findPost.get(slug)) continue;
  insPost.run(title, slug, excerpt, content, when);
  posts += 1;
}
console.log('черновиков дневника добавлено:', posts);

for (const key of ['style', 'style-walks', 'style-film']) {
  console.log(' ', key, db.prepare('SELECT COUNT(*) AS c FROM gallery_items WHERE page_key = ?').get(key).c);
}
