// «2024»: Ikigai целиком (пять треков, с Bill Cipher) + синглы 2024 с Game Over; BERSERK и Welcome сняты.
// Решение владельца 17.09.2026 вечером, согласие соавтора Game Over подписано.
// Локально:   node deploy/apply_2026-09-17_vinyl_2024_final.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_vinyl_2024_final.js
const db = require('../src/db');
const PRESS =
  'Печатаем поштучно, а не тиражом на склад: студия режет диск под конкретный заказ. ' +
  'Поэтому пластинка стоит дороже магазинной и делается дольше — зато она существует ровно потому, что её кто-то захотел.';
const NOTE = 'На фото макет: снимок настоящей пластинки поставим, когда напечатаем первую.';
const description =
  'Сторона A — Ikigai целиком, пять треков, с которых началась вся линия. Сторона B — шесть синглов ' +
  'того же года: Hotline, Game Over, Ruins, Spooky Month, At The Jazz Club, Deep Sleep. ' +
  'Двадцать пять минут, весь 2024-й на одном диске.\n\n' +
  'Альбом не делится между сторонами: поставил — дослушал, перевернул — другая история. ' +
  'Game Over — совместная работа с openedruf, на этикетке указаны оба автора.\n\n' +
  PRESS + '\n\n' + NOTE;
const r = db.prepare("UPDATE products SET description = ? WHERE slug = 'plastinka-ikigai'").run(description);
console.log('plastinka-ikigai описание:', r.changes);
