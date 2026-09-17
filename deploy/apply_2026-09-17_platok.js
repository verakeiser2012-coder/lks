// Флаг Soundstates → платок Soundstates (решение 17.09.2026).
// Карточка переименовывается по слагу (id на сервере другие), заводится раздел
// «Аксессуары», старая картинка флага и превью убираются.
// Запуск: node deploy/apply_2026-09-17_platok.js
const path = require('path');
const fs = require('fs');
const db = require('../src/db');

function categoryId(slug, name) {
  const found = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (found) return found.id;
  return db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug).lastInsertRowid;
}
const accessories = categoryId('aksessuary', 'Аксессуары');

const description =
  'Обложка Soundstates на платке: бумажный коллаж отсканирован целиком, с рваными краями, ' +
  'и посажен в тёмно-синюю кайму с тонким кантом — как у классического каре.\n\n' +
  'Унисекс. Основной размер 70 × 70 — на шею, на ручку сумки, в карман пиджака. ' +
  'Под заказ есть 90 × 90 (на голову и плечи) и бандана 55 × 55.\n\n' +
  'Ткань — полиэстеровый шёлк («шёлк Армани»): лёгкий, с мягким блеском, держит узел. ' +
  'Печать сублимационная: краска уходит в волокно, рисунок не трескается и не линяет. ' +
  'Край подвёрнут и прострочен.\n\n' +
  'Альбом можно послушать целиком на странице релиза.\n\n' +
  'На фото макет: снимок настоящего платка поставим, как только напечатаем первый.';

const row = db.prepare("SELECT id, slug FROM products WHERE slug IN ('flag-soundstates', 'platok-soundstates')").get();
if (!row) { console.log('карточка не найдена'); process.exit(1); }
db.prepare(`UPDATE products SET slug=?, name=?, description=?, image=?, category_id=?, collection_id=NULL,
  dimensions=?, material=?, care=?, includes=?, package_size=? WHERE id=?`).run(
  'platok-soundstates', 'Платок Soundstates', description, '/uploads/product-platok-soundstates.jpg', accessories,
  '70 × 70 см. Под заказ — 90 × 90 см и бандана 55 × 55 см',
  'Полиэстеровый шёлк («шёлк Армани»), сублимационная печать, край подвёрнут и прострочен',
  'Деликатная стирка при 30 °C или вручную, без отбеливателя, не выкручивать. Гладить с изнанки на низкой температуре',
  'Платок с подвёрнутым краем\nКонверт\nОткрытка',
  '18 × 12 × 2', row.id);
console.log('карточка', row.id, row.slug, '→ platok-soundstates, раздел', accessories);

const uploads = path.join(__dirname, '..', 'public', 'uploads');
const old = path.join(uploads, 'product-flag-soundstates.jpg');
if (fs.existsSync(old)) { fs.unlinkSync(old); console.log('удалён product-flag-soundstates.jpg'); }
const thumbs = path.join(__dirname, '..', 'storage', 'thumbs');
let removed = 0;
if (fs.existsSync(thumbs)) for (const w of fs.readdirSync(thumbs)) {
  const dir = path.join(thumbs, w);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) if (/^product-(flag|platok)-soundstates/.test(f)) { fs.unlinkSync(path.join(dir, f)); removed++; }
}
console.log('превью снесено:', removed);
console.log(db.prepare("SELECT slug, name, image FROM products WHERE slug LIKE 'flag-%' OR slug LIKE 'platok-%'").all().map(r => r.slug + ' | ' + r.name).join('\n'));
