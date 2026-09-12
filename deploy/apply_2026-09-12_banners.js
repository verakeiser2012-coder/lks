// Баннеры вместо заглушек «МЕСТО ПОД БАННЕР» (12.09.2026). Тексты — по разделам:
// на каждой странице зовём туда, куда с неё логично идти дальше.
// Заглушки удаляются, старые дубли «Рыжие, которые вдохновляют» тоже (их заменяют
// новые). Ищем по page_key + title, повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

const BANNERS = [
  ['home', 'Двигаюсь медленно в быстром мире', 'Откуда взялся слоган, при чём тут улитка и почему я пишу музыку без нейросетей — в дневнике.', 'Читать манифест', '/diary/dvigayus-medlenno-v-bystrom-mire'],
  ['music', 'Hotline и Spooky Month — теперь на сайте', 'Два сингла 2024 года, которых здесь не было: с обложками, площадками и в фоновом плеере.', 'Слушать', '/music/hotline'],
  ['music', 'Ищу вокалиста', 'Есть трек без голоса. Если поёшь — напиши, послушаем друг друга.', 'Написать', '/contact?topic=vocal'],
  ['catalog', 'Дроп «Slow in a fast world»', 'Пара флагов — «Двигаюсь медленно» и «в быстром мире». Вешаются рядом или на разные стены.', 'Смотреть дроп', '/drops/slow-in-a-fast-world'],
  ['news', 'Продолжение — в Telegram', 'Процесс, бэкстейдж и то, что не попадает на сайт.', 'Открыть канал', 'https://t.me/djlevkatg'],
  ['diary', 'Продолжение — в Telegram', 'Короткие записи между большими — там.', 'Открыть канал', 'https://t.me/djlevkatg'],
  ['style', 'Медиакит для брендов', 'Форматы съёмок, примеры и условия — одной страницей.', 'Открыть медиакит', '/brands/media-kit'],
  ['redheads', 'Присоединиться к подборке', 'Если у вас рыжие волосы — расскажите о себе. Добавим в подборку и будем предлагать брендам для съёмок.', 'Заполнить заявку', '/redheads#submit'],
  ['podcast', 'Хотите к нам в выпуск?', 'Записываем в мастерских: приезжаем со звуком, снимаем процесс, разговариваем час.', 'Предложить выпуск', '/contact?topic=brand'],
];

const removed = db.prepare("DELETE FROM promo_banners WHERE title LIKE 'МЕСТО ПОД БАННЕР%' OR title = 'Рыжие, которые вдохновляют'").run();
console.log('заглушек и старых дублей удалено:', removed.changes);

const exists = db.prepare('SELECT id FROM promo_banners WHERE page_key = ? AND title = ?');
const insert = db.prepare('INSERT INTO promo_banners (page_key, title, subtitle, cta_label, cta_url, is_published, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)');
const update = db.prepare('UPDATE promo_banners SET subtitle = ?, cta_label = ?, cta_url = ?, sort_order = ? WHERE id = ?');
BANNERS.forEach(([page, title, subtitle, cta, url], i) => {
  const row = exists.get(page, title);
  if (row) update.run(subtitle, cta, url, i, row.id);
  else insert.run(page, title, subtitle, cta, url, i);
});
console.log(db.prepare('SELECT page_key, COUNT(*) c FROM promo_banners WHERE is_published = 1 GROUP BY page_key').all().map((r) => `${r.page_key}: ${r.c}`).join(', '));
