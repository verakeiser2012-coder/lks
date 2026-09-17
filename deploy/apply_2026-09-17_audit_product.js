// Аудит каталога — товар-услуга за 1 000 ₽: вход в «Коллегам за копеечку» через обычную корзину.
// Категория «Услуги», признак is_service (миграция в src/db/init.js), картинка public/uploads/product-audit-kataloga.jpg.
// Локально:   node deploy/apply_2026-09-17_audit_product.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_audit_product.js
require('../src/db/init');
const db = require('../src/db');

let cat = db.prepare("SELECT id FROM categories WHERE slug = 'uslugi'").get();
if (!cat) {
  db.prepare("INSERT INTO categories (name, slug) VALUES ('Услуги', 'uslugi')").run();
  cat = db.prepare("SELECT id FROM categories WHERE slug = 'uslugi'").get();
  console.log('категория «Услуги» создана');
}

const P = {
  name: 'Аудит каталога',
  slug: 'audit-kataloga',
  price: 1000,
  description:
    'Разбираемся, что у вашей музыки уже оформлено и чего не хватает — и отдаём документ: что нашли, что с этим делать ' +
    'и в каком порядке.\n\n' +
    'Сверяем релизы по площадкам (стриминги, Shazam, YouTube, TikTok), собираем ISRC и UPC по всем трекам сами — с площадок ' +
    'и из ваших мастеров, ищем треки с чужими цитатами и сэмплами, которые оформлять нельзя, проверяем названия, обложки ' +
    'и указание авторов.\n\n' +
    'При оформлении впишите ссылки на свои релизы и соцсети и что уже сделано: кабинет правообладателя, РАО, дистрибьютор. ' +
    'Документ приходит письмом в течение пяти рабочих дней после оплаты. Если после аудита закажете пакет «Кабинет и три ' +
    'общества» или «Всё и сразу» — эта тысяча засчитывается в его цену.\n\n' +
    'Это не юридическая услуга, а опыт коллеги, который прошёл всё это сам, плюс готовый порядок действий. Без созвонов: ' +
    'вся работа перепиской и документами. Паспортные данные не нужны.',
  includes: 'Документ с находками по каждому релизу и планом: что делать и в каком порядке\nТаблица треков с ISRC и UPC\nПометки, какие треки регистрировать нельзя',
  lead_time: 'Документ письмом в течение пяти рабочих дней после оплаты',
  dimensions: 'Каталог целиком, сколько бы в нём ни было треков',
  weight: 'Ссылки на релизы и соцсети при оформлении; соавторы и чужие сэмплы — если знаете',
  material: 'PDF на почту, таблица треков в Excel',
  care: 'Тысяча засчитывается в цену пакета, если закажете его после аудита. Отказаться можно до начала работы',
  manufacturer: 'ИП Кейсер Л. М., Екатеринбург',
  image: '/uploads/product-audit-kataloga.jpg',
};

const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(P.slug);
if (row) {
  db.prepare(`UPDATE products SET name = ?, price = ?, description = ?, includes = ?, lead_time = ?, dimensions = ?, weight = ?,
    material = ?, care = ?, manufacturer = ?, image = ?, category_id = ?, is_digital = 1, is_service = 1, digital_file = '',
    digital_filename = '', digital_size = 0, stock = 999, is_active = 1, fulfillment = 'self' WHERE id = ?`)
    .run(P.name, P.price, P.description, P.includes, P.lead_time, P.dimensions, P.weight, P.material, P.care, P.manufacturer, P.image, cat.id, row.id);
  console.log('audit-kataloga обновлён, id', row.id);
} else {
  const r = db.prepare(`INSERT INTO products (name, slug, description, price, category_id, image, stock, is_active, is_digital, is_service,
    digital_file, digital_filename, digital_size, lead_time, includes, dimensions, weight, material, care, manufacturer, package_size, fulfillment, printful_variants)
    VALUES (?, ?, ?, ?, ?, ?, 999, 1, 1, 1, '', '', 0, ?, ?, ?, ?, ?, ?, ?, '', 'self', '')`)
    .run(P.name, P.slug, P.description, P.price, cat.id, P.image, P.lead_time, P.includes, P.dimensions, P.weight, P.material, P.care, P.manufacturer);
  console.log('audit-kataloga создан, id', r.lastInsertRowid);
}
