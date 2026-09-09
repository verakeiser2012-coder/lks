// Карточки виниловых пластинок — печать под заказ.
//
// Основано на разборе 17.08.2026 (память проекта, «DJ Levka vinyl-record merch»):
// три альбома с реальными хронометражами — Ikigai 2024 (10:17), Flowers 2025 (13:55),
// Soundstates 2026 (12:57), вместе 37:09 — и концепт разворотного конверта, где
// каждая панель открывает свой альбом. Подрядчики печатают от одной штуки
// (instaholst, Vinylium, Vinyl-Record.ru), поэтому тираж и цена считаются
// под конкретный заказ: цена в карточке — «Под заказ» (price = 0 у нецифрового
// товара, см. src/utils/price.js), в корзину такой товар не кладётся.
//
// Картинки — макеты из tools/build_product_mockups.py с пометкой «макет» в углу
// и той же оговоркой в описании: настоящих снимков ещё нет.
//
// Записи ищем по слагу: id на сервере и локально не совпадают. Скрипт можно
// запускать повторно — он обновляет, а не плодит дубли.
//
// Локально:   node deploy/apply_2026-09-09_vinyl.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-09_vinyl.js

const db = require('../src/db');

function categoryId(slug, name) {
  const found = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (found) return found.id;
  return db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug).lastInsertRowid;
}

function releaseId(slug) {
  const row = db.prepare('SELECT id FROM releases WHERE slug = ?').get(slug);
  return row ? row.id : null;
}

const vinylCat = categoryId('plastinki', 'Пластинки');

// Про цену в описании не пишем: «Под заказ» и приглашение написать нам
// карточка показывает сама, повторять это текстом — шум.
const NOTE = 'На фото макет: снимок настоящей пластинки поставим, когда напечатаем первую.';

const PRESS =
  'Печатаем поштучно, а не тиражом на склад: студия режет диск под конкретный заказ. ' +
  'Поэтому пластинка стоит дороже магазинной и делается дольше — зато она существует ' +
  'ровно потому, что её кто-то захотел.';

const LEAD = 'Под заказ. Срок называем при подтверждении: единичная резка занимает недели, а не дни';
const MATERIAL = 'Винил, печать от одной копии';
const CARE = 'Хранить вертикально, вдали от солнца и батарей. Протирать мягкой щёткой вдоль дорожек';

const items = [
  {
    slug: 'plastinka-tri-alboma',
    name: 'Пластинка «Три альбома», 12″',
    image: '/uploads/product-vinyl-trifold.jpg',
    release_id: null,
    dimensions: '12″ (30 см). Конверт-разворот, панель 314 × 314 мм',
    includes:
      'Пластинка 12″ с тремя альбомами\nРазворотный конверт: панель на каждый альбом\n' +
      'Треклист и год на последней панели',
    description:
      'Все три альбома DJ Levka на одной пластинке: Ikigai (2024), Flowers (2025) и ' +
      'Soundstates (2026) — тридцать семь минут, по восемнадцать с половиной на сторону.\n\n' +
      'Конверт раскладывается гармошкой, и каждая панель открывает свой альбом по порядку ' +
      'выхода. Получается не обложка, а маленькая хронология: видно, как менялся звук ' +
      'за три года.\n\n' +
      'Одна пластинка со всеми альбомами выходит почти вдвое дешевле трёх отдельных: ' +
      'каждый диск платит свою стоимость резки независимо от длины.\n\n' + PRESS + '\n\n' + NOTE,
  },
  {
    slug: 'plastinka-ikigai',
    name: 'Пластинка Ikigai, 7″',
    image: '/uploads/product-vinyl-ikigai.jpg',
    release_id: releaseId('ikigai'),
    dimensions: '7″ (17,5 см)',
    includes: 'Пластинка 7″\nКонверт с обложкой альбома',
    description:
      'Ikigai целиком: пять треков, десять минут семнадцать секунд — по пять минут ' +
      'на сторону. Первый альбом, с которого началась вся линия.\n\n' + PRESS + '\n\n' + NOTE,
  },
  {
    slug: 'plastinka-flowers',
    name: 'Пластинка Flowers, 10″',
    image: '/uploads/product-vinyl-flowers.jpg',
    release_id: releaseId('flowers'),
    dimensions: '10″ (25 см)',
    includes: 'Пластинка 10″\nКонверт с обложкой альбома',
    description:
      'Flowers целиком: пять треков, тринадцать минут пятьдесят пять секунд — по семь ' +
      'минут на сторону.\n\n' + PRESS + '\n\n' + NOTE,
  },
  {
    slug: 'plastinka-soundstates',
    name: 'Пластинка Soundstates, 10″',
    image: '/uploads/product-vinyl-soundstates.jpg',
    release_id: releaseId('soundstates'),
    dimensions: '10″ (25 см)',
    includes: 'Пластинка 10″\nКонверт с обложкой альбома',
    description:
      'Soundstates целиком: пять треков, двенадцать минут пятьдесят семь секунд. Тот самый ' +
      'альбом, который на следующий день после выхода попал в кураторский плейлист.\n\n' +
      PRESS + '\n\n' + NOTE,
  },
];

const SELECT = db.prepare('SELECT id FROM products WHERE slug = ?');
const UPDATE = db.prepare(`
  UPDATE products SET name=?, description=?, price=?, category_id=?, collection_id=?, release_id=?,
    image=?, stock=?, is_active=?, is_digital=?, lead_time=?, includes=?, dimensions=?,
    weight=?, material=?, care=?
  WHERE slug=?
`);
const INSERT = db.prepare(`
  INSERT INTO products (name, slug, description, price, category_id, collection_id, release_id,
    image, stock, is_active, is_digital, lead_time, includes, dimensions, weight, material, care)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

for (const it of items) {
  const v = [
    it.name, it.description, 0, vinylCat, null, it.release_id,
    it.image, 999, 1, 0, LEAD, it.includes, it.dimensions, '', MATERIAL, CARE,
  ];
  const row = SELECT.get(it.slug);
  if (row) {
    UPDATE.run(...v, it.slug);
    console.log('обновлён', row.id, '—', it.name);
  } else {
    const info = INSERT.run(v[0], it.slug, ...v.slice(1));
    console.log('создан', info.lastInsertRowid, '—', it.name);
  }
}

console.log('\nРаздел «Пластинки»:');
for (const r of db
  .prepare(
    `SELECT p.slug, p.name, p.price, p.is_active, r.title AS rel
     FROM products p LEFT JOIN releases r ON r.id = p.release_id
     WHERE p.category_id = ? ORDER BY p.id`
  )
  .all(vinylCat)) {
  console.log(
    '  ',
    (r.is_active ? 'в каталоге ' : 'черновик  ') + r.slug.padEnd(24),
    r.price === 0 ? 'Под заказ' : r.price + ' ₽',
    r.rel ? '| релиз ' + r.rel : ''
  );
}
