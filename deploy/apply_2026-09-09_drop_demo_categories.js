// Убирает разделы каталога «Новинки» и «Хиты продаж».
//
// Это остатки демо-набора из seed.js: товаров в них никогда не было, а в боковом
// меню каталога они висели пустыми. Решение владельца 09.09.2026 — не актуальны.
//
// Скрипт безопасен для повторного запуска и удаляет раздел только если он пуст:
// если к разделу вдруг привязали товар, скрипт остановится и ничего не тронет.
//
// Локально:   node deploy/apply_2026-09-09_drop_demo_categories.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-09_drop_demo_categories.js

const db = require('../src/db');

const SLUGS = ['novinki', 'hity-prodazh'];

for (const slug of SLUGS) {
  const cat = db.prepare('SELECT id, name FROM categories WHERE slug = ?').get(slug);
  if (!cat) {
    console.log(slug, '— уже удалён');
    continue;
  }
  const used = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(cat.id).c;
  if (used > 0) {
    console.log(slug, '— НЕ УДАЛЁН: в разделе', used, 'товар(ов), сначала перенесите их');
    continue;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  console.log(slug, '— удалён («' + cat.name + '»)');
}

console.log('\nРазделы каталога сейчас:');
for (const r of db
  .prepare(
    `SELECT c.name, c.slug, COUNT(p.id) AS n
     FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id ORDER BY c.name`
  )
  .all()) {
  console.log('  ', r.name.padEnd(22), r.n, 'товар(ов)');
}
