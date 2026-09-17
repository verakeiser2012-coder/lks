// Bill Cipher снят с пластинки Ikigai (решение владельца 17.09.2026: производная работа).
// Ikigai на виниле — 4 трека, 8:15; «Три альбома» — 14 треков, 35:07,
// стороны: A — Ikigai и Flowers 1–3 (17:12), B — Flowers 4–5 и Soundstates (17:55).
// Локально:   node deploy/apply_2026-09-17_vinyl_ikigai_4tracks.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_vinyl_ikigai_4tracks.js
const db = require('../src/db');

function replaceIn(slug, pairs) {
  const row = db.prepare('SELECT description, includes FROM products WHERE slug = ?').get(slug);
  if (!row) return console.log(slug, 'НЕ НАЙДЕН');
  let desc = row.description;
  let inc = row.includes;
  for (const [from, to] of pairs) {
    desc = desc.split(from).join(to);
    inc = inc.split(from).join(to);
  }
  db.prepare('UPDATE products SET description = ?, includes = ? WHERE slug = ?').run(desc, inc, slug);
  console.log(slug, desc === row.description && inc === row.includes ? 'без изменений' : 'обновлено');
}

replaceIn('plastinka-ikigai', [
  ['пять треков, десять минут восемнадцать секунд — шесть минут на первой стороне и четыре на второй',
    'четыре трека, восемь минут пятнадцать секунд — по две вещи на сторону'],
  ['пять треков, десять минут семнадцать секунд — по пять минут на сторону',
    'четыре трека, восемь минут пятнадцать секунд — по две вещи на сторону'],
]);
replaceIn('plastinka-tri-alboma', [
  ['тридцать семь минут, по восемнадцать с половиной на сторону',
    'четырнадцать треков, тридцать пять минут — по семнадцать с небольшим на сторону'],
]);
