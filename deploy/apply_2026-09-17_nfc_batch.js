// Первая партия кодов для меток: по одному на каждую пластинку и каждый флаг.
// Пластинкам — цифровая версия альбома бонусом. Повторный запуск не плодит дубли.
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_nfc_batch.js
const db = require('../src/db');
const { createBatch } = require('../src/utils/tags');
const ROWS = [
  ['vinyl', 'plastinka-tri-alboma', 'Пластинка «Три альбома», 12″', 'album-tri-alboma.zip', 'Скачать все три альбома в цифре'],
  ['vinyl', 'plastinka-ikigai', 'Пластинка Ikigai, 12″', 'album-ikigai.zip', 'Скачать Ikigai в цифре'],
  ['vinyl', 'plastinka-flowers', 'Пластинка Flowers, 12″', 'album-flowers.zip', 'Скачать Flowers в цифре'],
  ['vinyl', 'plastinka-soundstates', 'Пластинка Soundstates, 12″', 'album-soundstates.zip', 'Скачать Soundstates в цифре'],
  ['flag', 'flag-dvigayus-medlenno', 'Флаг «Двигаюсь медленно»', 'stikery-sostoyaniya.zip', 'Скачать стикеры «Состояния»'],
  ['flag', 'flag-v-bystrom-mire', 'Флаг «В быстром мире»', 'stikery-sostoyaniya.zip', 'Скачать стикеры «Состояния»'],
  ['flag', 'flag-para-slow-in-a-fast-world', 'Пара флагов «Двигаюсь медленно в быстром мире»', 'stikery-sostoyaniya.zip', 'Скачать стикеры «Состояния»'],
  ['flag', 'flag-soundstates', 'Флаг Soundstates', 'stikery-sostoyaniya.zip', 'Скачать стикеры «Состояния»'],
  ['flag', 'flag-slow-in-a-fast-world', 'Флаг Slow in a fast world', 'stikery-sostoyaniya.zip', 'Скачать стикеры «Состояния»'],
];
const NOTE = {
  vinyl: 'Этот экземпляр вырезан под заказ — таких два не бывает. Цифровая версия альбома для владельца: WAV как на мастере и MP3 для телефона.',
  flag: 'Флаг сшит под заказ. Бонус владельца — стикеры «Состояния»: кадры видеосерии с треками Soundstates.',
};
for (const [kind, slug, label, file, btn] of ROWS) {
  const p = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  const exists = db.prepare('SELECT code FROM nfc_tags WHERE kind = ? AND product_id = ?').get(kind, p ? p.id : -1);
  if (exists) { console.log(slug, 'уже есть:', exists.code); continue; }
  const [t] = createBatch({ count: 1, kind, label, productId: p && p.id, bonusFile: file, bonusLabel: btn, publicNote: NOTE[kind], note: 'первая партия 17.09.2026' });
  console.log(`${t.code}\t${label}\thttps://levkeiser.shop/n/${t.code}`);
}
