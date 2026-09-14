// Флаг «Музыка без ИИ» → «Slow in a fast world» (решение 14.09.2026).
// Карточка не удаляется, а переименовывается: слаг, название, описание, картинка,
// дроп. Ищем по старому слагу, а не по id (id на сервере другие).
// Запуск: node deploy/apply_2026-09-14b_flag_slow.js
const path = require('path');
const fs = require('fs');
const db = require('../src/db');

const FLAG_TAIL =
  'Ткань плотная и полуматовая: не просвечивает на светлой стене и не бликует под лампой. ' +
  'Края обработаны, углы усилены, по четырём углам металлические люверсы — вешается на гвозди, ' +
  'крючки или шнур, рама не нужна.\n\n' +
  'Печать сублимационная: краска уходит в волокно, а не ложится плёнкой сверху, поэтому ' +
  'изображение не трескается и переживает стирку.\n\n' +
  'На фото макет: снимок настоящего флага поставим, как только напечатаем первый.';

const description =
  'Та же фраза, что на паре флагов, но по-английски и одной строкой. Для тех, кто ' +
  'читает слоган в оригинале, и для стены, где два флага не помещаются.\n\n' +
  'Рядом с русской парой — третий голос той же мысли; сам по себе — название дропа ' +
  'на ткани.\n\n' + FLAG_TAIL;

const drop = db.prepare("SELECT id FROM collections WHERE slug = 'slow-in-a-fast-world'").get();
const row = db.prepare("SELECT id, slug FROM products WHERE slug IN ('flag-muzyka-bez-ii', 'flag-slow-in-a-fast-world')").get();
if (!row) {
  console.log('карточка не найдена — ни старого, ни нового слага');
  process.exit(1);
}
db.prepare(`UPDATE products SET slug = ?, name = ?, description = ?, image = ?, collection_id = ? WHERE id = ?`)
  .run('flag-slow-in-a-fast-world', 'Флаг Slow in a fast world', description,
       '/uploads/product-flag-slow-in-a-fast-world.jpg', drop ? drop.id : null, row.id);
console.log('карточка', row.id, row.slug, '→ flag-slow-in-a-fast-world', drop ? '' : '(дроп не найден!)');

// старая картинка и её превью
const uploads = path.join(__dirname, '..', 'public', 'uploads');
const old = path.join(uploads, 'product-flag-bez-ii.jpg');
if (fs.existsSync(old)) { fs.unlinkSync(old); console.log('удалён product-flag-bez-ii.jpg'); }
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
console.log(db.prepare("SELECT slug, name, image FROM products WHERE slug LIKE 'flag-%'").all());
