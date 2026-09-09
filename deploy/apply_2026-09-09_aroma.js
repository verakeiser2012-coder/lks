// Выкладка карты ароматов: дроп «Груша × Лев», цифровой товар «Карта натуральных ароматов»,
// таблетка переезжает в тот же дроп, карта — в раздел «Ароматы».
//
// Записи ищем по слагу, а не по id: id на сервере и локально не совпадают.
// Скрипт можно запускать повторно — он обновляет, а не плодит дубли.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'shop.db'));
const ZIP = path.join(__dirname, '..', 'storage', 'digital', 'karta-aromatov.zip');

const COLL_SLUG = 'grusha-x-lev';
const MAP_SLUG = 'karta-naturalnyh-aromatov';
const TABLET_SLUG = 'aromaticheskaya-tabletka-grusha-lev';

const COLL_DESC =
  'Совместный дроп с мастерской «Груша» (Екатеринбург): Юлия делает благовония и керамику ' +
  'по семейным рецептам, из натуральных смол, масел и дерева. Дроп вырос из подкаста, ' +
  'который мы записали у неё в мастерской 31 июля: разговор о том, что аромат собирается ' +
  'так же, как трек — сначала основа, потом слои, и нельзя торопить, пока всё не сойдётся.\n\n' +
  'В дропе — ароматическая таблетка в конверте с обложкой альбома Soundstates и карта ' +
  'натуральных ароматов: 166 материалов парфюмерии и благовоний на двенадцати семействах.';

const MAP_DESC =
  'Карта натуральных ароматов: 166 материалов парфюмерии и благовоний на двенадцати семействах. ' +
  'Уд, лабданум, бахур, морёный дуб, ладан, сандал, амбра — рядом с цитрусами, травами, пряностями и цветами.\n\n' +
  'Наша разработка. Прямого аналога мы не нашли. Есть колесо ароматов Эдвардса — но это круг из одних ' +
  'семейств, без самих материалов. Есть карты готовых духов — но не сырья. Есть научный граф вкусов — ' +
  'но про еду. Здесь другое:\n\n' +
  '— на одной карте стоят натуральные материалы парфюмерии и благовоний, а не абстрактные категории ' +
  'и не готовые ароматы;\n' +
  '— место точки вычисляется из состава, а не расставляется на глаз: чем сильнее семейство звучит ' +
  'в аромате, тем ближе он к нему, поэтому положение на карте — это уже формула;\n' +
  '— состав виден прямо в точке круговой диаграммой: сразу считывается, из чего аромат собран;\n' +
  '— рядом работает верстак, который ставит вашу собственную смесь на ту же карту.\n\n' +
  'Скажем честно, как есть: мы искали, но весь интернет не перелопатили. Утверждать «нигде такого нет» ' +
  'не будем — а вот «прямого аналога не нашли» скажем твёрдо.\n\n' +
  'В архиве\n' +
  'Вектор SVG — печатается в любом размере без потери качества. PDF под A1 (841 × 594 мм) — можно нести ' +
  'в типографию как есть. PNG 8400 × 6720 px — для экрана и печати до A1. Всё это на русском и на ' +
  'английском, плюс памятка по печати. Доли семейств уточняются, обновления архива бесплатные.\n\n' +
  'Собрано по колесу ароматов М. Эдвардса, категориям Foodpairing и Flavor Network, дескрипторам ' +
  'The Good Scents и классификации натурального сырья.\n\n' +
  'Интерактивная версия — на странице levkeiser.com/aroma: соберите свой состав и посмотрите, ' +
  'где он встанет на карте.';

const MAP_INCLUDES = [
  'SVG на русском и английском',
  'PDF под A1, готов для типографии',
  'PNG 8400 × 6720 px',
  'Памятка по печати',
  'Бесплатные обновления',
].join('\n');

// --- дроп
let coll = db.prepare('SELECT id FROM collections WHERE slug = ?').get(COLL_SLUG);
if (coll) {
  db.prepare(
    `UPDATE collections SET name = ?, subtitle = ?, description = ?, season_label = ?, is_published = 1
     WHERE id = ?`
  ).run('Груша × Лев', 'Благовония и керамика — коллаборация с мастерской «Груша»', COLL_DESC, 'Осень 2026', coll.id);
  console.log('дроп обновлён, id', coll.id);
} else {
  const info = db.prepare(
    `INSERT INTO collections (name, slug, subtitle, description, season_label, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, 1)`
  ).run('Груша × Лев', COLL_SLUG, 'Благовония и керамика — коллаборация с мастерской «Груша»', COLL_DESC, 'Осень 2026');
  coll = { id: info.lastInsertRowid };
  console.log('дроп создан, id', coll.id);
}

// --- цифровой товар
const aromaty = db.prepare("SELECT id FROM categories WHERE slug = 'aromaty'").get();
if (!aromaty) throw new Error('нет категории «Ароматы» — проверьте базу');
if (!fs.existsSync(ZIP)) throw new Error('архив не доехал: ' + ZIP);
const size = fs.statSync(ZIP).size;

const map = db.prepare('SELECT id FROM products WHERE slug = ?').get(MAP_SLUG);
const fields = [
  'Карта натуральных ароматов', MAP_DESC, 690.0, aromaty.id, coll.id,
  '/uploads/product-karta-aromatov.jpg', 0, 1, 1,
  'karta-aromatov.zip', 'Карта натуральных ароматов.zip', size, MAP_INCLUDES,
];
if (map) {
  db.prepare(
    `UPDATE products SET name=?, description=?, price=?, category_id=?, collection_id=?, image=?,
     stock=?, is_active=?, is_digital=?, digital_file=?, digital_filename=?, digital_size=?, includes=?
     WHERE slug=?`
  ).run(...fields, MAP_SLUG);
  console.log('карта обновлена, id', map.id);
} else {
  const info = db.prepare(
    `INSERT INTO products (name, slug, description, price, category_id, collection_id, image,
     stock, is_active, is_digital, digital_file, digital_filename, digital_size, includes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(fields[0], MAP_SLUG, ...fields.slice(1));
  console.log('карта добавлена, id', info.lastInsertRowid);
}

// --- таблетка в тот же дроп
const t = db.prepare('UPDATE products SET collection_id = ? WHERE slug = ?').run(coll.id, TABLET_SLUG);
console.log('таблетка в дропе:', t.changes ? 'да' : 'НЕ НАЙДЕНА — проверьте слаг');

for (const r of db.prepare(
  `SELECT p.id, p.name, c.name AS cat, p.price, p.is_digital, p.digital_size
   FROM products p JOIN categories c ON c.id = p.category_id WHERE p.collection_id = ?`
).all(coll.id)) {
  console.log('  ', r.id, r.name, '|', r.cat, '|', r.price, '₽', r.is_digital ? '| цифровой ' + Math.round(r.digital_size / 1048576) + ' Мб' : '');
}
