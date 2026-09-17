// Пластинки: фиксированные цены вместо «Под заказ», вес и изготовитель.
//
// Решение владельца 17.09.2026. Себестоимость по счёту Vinylium: три пластинки
// с конвертами — 36 000 ₽, то есть 12 000 ₽ за диск; плюс доставка до нас и
// почтовый конверт ≈ 13 300 ₽. С продажи уходит 6 % УСН и ≈ 5 % Robokassa,
// поэтому ниже 15 000 продавать нельзя. Одиночные — 17 900 ₽. «Три альбома» —
// это ОДИН диск 12″ с тремя альбомами (себестоимость та же), 19 900 ₽ за
// «главную вещь» с разворотным конвертом.
//
// Локально:   node deploy/apply_2026-09-17_vinyl_prices.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_vinyl_prices.js

const db = require('../src/db');

const MAKER = 'Vinylium, Санкт-Петербург, Россия — резка по заказу ИП Кейсер';
const LEAD = 'Режется под заказ, 3–4 недели: студия ставит диск в очередь, потом печать конверта и доставка к нам';

const ROWS = [
  { slug: 'plastinka-tri-alboma', price: 19900, weight: '≈ 450 г с разворотным конвертом' },
  { slug: 'plastinka-ikigai', price: 17900, weight: '≈ 350 г с конвертом' },
  { slug: 'plastinka-flowers', price: 17900, weight: '≈ 350 г с конвертом' },
  { slug: 'plastinka-soundstates', price: 17900, weight: '≈ 350 г с конвертом' },
];

const upd = db.prepare('UPDATE products SET price = ?, weight = ?, manufacturer = ?, lead_time = ? WHERE slug = ?');
for (const r of ROWS) {
  const res = upd.run(r.price, r.weight, MAKER, LEAD, r.slug);
  console.log(r.slug, res.changes ? `→ ${r.price} ₽` : 'НЕ НАЙДЕН');
}
