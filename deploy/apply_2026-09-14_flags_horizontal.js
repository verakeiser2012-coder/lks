// Флаги: горизонталь 150 × 100 и капитель (решение 14.09.2026).
// Надписи на полотне теперь ДВИГАЮСЬ МЕДЛЕННО / В БЫСТРОМ МИРЕ / МУЗЫКА БЕЗ ИИ,
// поэтому «в быстром мире» в названии и описаниях пишем с заглавной,
// а размер в карточках — 150 × 100 (второй 90 × 60). Картинки макетов
// пересобраны tools/build_product_mockups.py; их кеш в storage/thumbs
// надо снести руками, thumbs.js проверяет только наличие файла.
//
// Запуск: node deploy/apply_2026-09-14_flags_horizontal.js
const path = require('path');
const fs = require('fs');
const db = require('../src/db');

const FLAG_SIZE = '150 × 100 см, горизонтальный. Второй размер — 90 × 60 см, под заказ';

const upd = db.prepare('UPDATE products SET dimensions = ? WHERE slug LIKE ?');
console.log('размер: обновлено', upd.run(FLAG_SIZE, 'flag-%').changes);

const rename = db.prepare('UPDATE products SET name = ? WHERE slug = ?');
console.log('название: обновлено', rename.run('Флаг «В быстром мире»', 'flag-v-bystrom-mire').changes);

const fix = db.prepare('UPDATE products SET description = replace(replace(description, ?, ?), ?, ?) WHERE slug LIKE ?');
console.log('описания: обновлено', fix.run(
  '— «в быстром мире» —', '— «В быстром мире» —',
  'метр на полтора', 'полтора метра на метр',
  'flag-%').changes);

// кеш превью старых (вертикальных) макетов
const thumbs = path.join(__dirname, '..', 'storage', 'thumbs');
let removed = 0;
if (fs.existsSync(thumbs)) {
  for (const w of fs.readdirSync(thumbs)) {
    const dir = path.join(thumbs, w);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('product-flag-')) { fs.unlinkSync(path.join(dir, f)); removed++; }
    }
  }
}
console.log('превью снесено:', removed);

for (const r of db.prepare("SELECT slug, name, dimensions FROM products WHERE slug LIKE 'flag-%'").all()) {
  console.log(' ', r.slug, '|', r.name, '|', r.dimensions);
}
