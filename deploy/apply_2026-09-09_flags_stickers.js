// Карточки флагов и стикерпаков.
//
// Флаги — по техзаданию notes/flags-tz.md (решение 08.09.2026: вместо гирлянд
// интерьерные флаги 100 × 150 см, сублимация, люверсы по углам). Показываются
// в каталоге с 09.09: по решению владельца вместо цены стоит «Под заказ»
// (price = 0 у нецифрового товара, см. src/utils/price.js), а на карточке —
// макет из tools/build_product_mockups.py с пометкой «макет» в углу и той же
// оговоркой в описании. Настоящие снимки ставим, когда напечатаем первый флаг.
//
// Стикерпаки — бесплатные цифровые товары. Архивы собираются скриптом
// tools/build_sticker_packs.py из папки «Эмодзи» на рабочем столе владельца
// и лежат в storage/digital.
//
// Записи ищем по слагу, а не по id: id на сервере и локально не совпадают.
// Скрипт можно запускать повторно — он обновляет, а не плодит дубли.
//
// Локально:  node deploy/apply_2026-09-09_flags_stickers.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-09_flags_stickers.js

const path = require('path');
const fs = require('fs');
const db = require('../src/db');

const DIGITAL = path.join(__dirname, '..', 'storage', 'digital');

function categoryId(slug, name) {
  const found = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (found) return found.id;
  return db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug).lastInsertRowid;
}

function collectionId(slug) {
  const row = db.prepare('SELECT id FROM collections WHERE slug = ?').get(slug);
  return row ? row.id : null;
}

function releaseId(slug) {
  const row = db.prepare('SELECT id FROM releases WHERE slug = ?').get(slug);
  return row ? row.id : null;
}

const decor = categoryId('predmety-interera', 'Предметы интерьера');
const digital = categoryId('cifrovye-tovary', 'Цифровые товары');
const slowDrop = collectionId('slow-in-a-fast-world');
const soundstates = releaseId('soundstates');

if (!slowDrop) console.log('ВНИМАНИЕ: дроп slow-in-a-fast-world не найден — флаги останутся без дропа');
if (!soundstates) console.log('ВНИМАНИЕ: релиз soundstates не найден — флаг альбома останется без релиза');

// ---------------------------------------------------------------- флаги

// Общее для всей линейки — из техзадания. Срок формулируем так, чтобы он был
// честен и до подтверждения подрядчиком: карточка покажет «Изготавливается под заказ».
const FLAG_LEAD = 'Изготавливается под заказ. Точный срок подтвердим, когда подрядчик подтвердит тираж';
const FLAG_MATERIAL = 'Плотный полуматовый полиэстер, сублимационная печать';
const FLAG_CARE = 'Деликатная стирка при 30 °C, без отбеливателя. Гладить с изнанки на низкой температуре';
const FLAG_SIZE = '100 × 150 см. Второй размер — 60 × 90 см, под заказ';
const FLAG_INCLUDES = 'Флаг с обработанными краями\nМеталлические люверсы по четырём углам\nКонверт\nОткрытка с инструкцией';

// Оговорка про макет — в конце каждого описания флага. Про цену здесь не пишем:
// «Под заказ» и приглашение написать нам карточка показывает сама.
const FLAG_NOTE =
  'На фото макет: снимок настоящего флага поставим, как только напечатаем первый.';

const FLAG_TAIL =
  'Ткань плотная и полуматовая: не просвечивает на светлой стене и не бликует под лампой. ' +
  'Края обработаны, углы усилены, по четырём углам металлические люверсы — вешается на гвозди, ' +
  'крючки или шнур, рама не нужна.\n\n' +
  'Печать сублимационная: краска уходит в волокно, а не ложится плёнкой сверху, поэтому ' +
  'изображение не трескается и переживает стирку.\n\n' + FLAG_NOTE;

const flags = [
  {
    slug: 'flag-dvigayus-medlenno',
    image: '/uploads/product-flag-medlenno.jpg',
    name: 'Флаг «Двигаюсь медленно»',
    collection_id: slowDrop,
    release_id: null,
    description:
      'Первая половина фразы, с которой всё началось. На стене над кроватью, диваном или ' +
      'столом — напоминание, что медленно это выбор, а не отставание.\n\n' +
      'Читается сам по себе. Рядом со вторым флагом — «в быстром мире» — складывается ' +
      'в целую строку.\n\n' + FLAG_TAIL,
  },
  {
    slug: 'flag-v-bystrom-mire',
    image: '/uploads/product-flag-bystryy-mir.jpg',
    name: 'Флаг «в быстром мире»',
    collection_id: slowDrop,
    release_id: null,
    description:
      'Вторая половина фразы. Отдельно — про мир вокруг, вместе с флагом «Двигаюсь медленно» — ' +
      'про то, как в нём жить.\n\n' +
      'Вешают по-разному: два флага рядом на одной стене или на двух стенах в разных ' +
      'комнатах, чтобы фраза собиралась по дороге.\n\n' + FLAG_TAIL,
  },
  {
    slug: 'flag-para-slow-in-a-fast-world',
    image: '/uploads/product-flag-para.jpg',
    name: 'Пара флагов «Двигаюсь медленно в быстром мире»',
    collection_id: slowDrop,
    release_id: null,
    includes:
      'Два флага с обработанными краями\nМеталлические люверсы по четырём углам каждого\n' +
      'Конверт\nОткрытка с инструкцией',
    description:
      'Оба флага вместе, дешевле, чем по одному. Главная вещь дропа: фраза целиком, ' +
      'разложенная на две плоскости.\n\n' +
      'Вешать можно рядом, друг под другом или в разных комнатах — смысл не ломается ' +
      'ни при каком порядке.\n\n' + FLAG_TAIL,
  },
  {
    slug: 'flag-soundstates',
    image: '/uploads/product-flag-soundstates.jpg',
    name: 'Флаг Soundstates',
    collection_id: null,
    release_id: soundstates,
    description:
      'Обложка альбома Soundstates на всю плоскость флага, метр на полтора. Не постер под ' +
      'стеклом, а ткань: не бликует, не бьётся и переезжает свёрнутой в конверте.\n\n' +
      'Альбом можно послушать целиком на странице релиза.\n\n' + FLAG_TAIL,
  },
  {
    slug: 'flag-muzyka-bez-ii',
    image: '/uploads/product-flag-bez-ii.jpg',
    name: 'Флаг «Музыка без ИИ»',
    collection_id: null,
    release_id: null,
    description:
      'Одна строка слаб-серифом, без картинок и пояснений. Позиция, а не украшение: ' +
      'треки пишутся руками, а не генерируются.\n\n' + FLAG_TAIL,
  },
];

// ------------------------------------------------------------ стикерпаки

const STICKER_LEAD = 'Сразу после оформления: ссылка откроется на экране и придёт на почту';
const STICKER_CARE = 'Для личного использования. Перепродавать и выдавать за своё нельзя';
const STICKER_FORMAT = 'PNG с прозрачным фоном, в ZIP-архиве';

const TG_HOWTO =
  'Как поставить набор себе: отправить файлы боту @Stickers командой /newpack — ' +
  'файлы отправляются документом, не фотографией. Инструкция целиком лежит в архиве.';

const packs = [
  {
    slug: 'stikery-levkeiser',
    name: 'Стикеры «Лев Кейсер»',
    image: '/uploads/product-stickers-levkeiser.jpg',
    zip: 'stikery-levkeiser.zip',
    filename: 'Стикеры Лев Кейсер.zip',
    dimensions: '512 × 512 px',
    release_id: null,
    includes: '11 стикеров-фраз\n56 стикеров с фото\nПамятка по загрузке в Telegram',
    description:
      '67 стикеров: фразы на плашках и фотографии, вырезанные по контуру. Те самые, ' +
      'которыми удобно отвечать вместо текста — «Не танец. Проход.», «Процесс важнее ' +
      'скорости», «Рыжий недели».\n\n' +
      'Бесплатно. Это не мерч, а способ утащить кусочек бренда в свою переписку.\n\n' + TG_HOWTO,
  },
  {
    slug: 'stikery-reakcii',
    name: 'Стикеры «Реакции»',
    image: '/uploads/product-stickers-reakcii.jpg',
    zip: 'stikery-reakcii.zip',
    filename: 'Стикеры Реакции.zip',
    dimensions: '512 × 512 px',
    release_id: null,
    includes:
      '34 реакции с коротким словом\n34 реакции с фразой целиком\n28 реакций с неоновой плашкой\n' +
      'Памятка по загрузке в Telegram',
    description:
      'Реакции на каждый день: «Ха-ха», «Ого», «Ок. Но сначала допишу трек», «Эй! Кто ' +
      'выключил метроном?!». Чёрно-белые вырезки, цветная плашка со словом.\n\n' +
      'В архиве одни и те же реакции в трёх оформлениях — коротком, длинном и неоновом. ' +
      'В свой набор берите одно: три варианта подряд превращают пак в кашу.\n\n' + TG_HOWTO,
  },
  {
    slug: 'stikery-sostoyaniya',
    name: 'Стикеры «Состояния»',
    image: '/uploads/product-stickers-sostoyaniya.jpg',
    zip: 'stikery-sostoyaniya.zip',
    filename: 'Стикеры Состояния.zip',
    dimensions: '512 × 512 px',
    release_id: soundstates,
    includes: '26 стикеров с кадрами видеосерии\nПамятка по загрузке в Telegram',
    description:
      '26 кадров из видеосерии «Состояния» с названиями треков: 2AM, Back to the Future, ' +
      'Cloudflute, d.r.e.a.m., Soundstates. Не подписи к музыке, а сами состояния, ради ' +
      'которых эти треки писались.\n\n' + TG_HOWTO,
  },
  {
    slug: 'emodzi-levkeiser',
    name: 'Эмодзи «Лев Кейсер»',
    image: '/uploads/product-stickers-emodzi.jpg',
    zip: 'emodzi-levkeiser.zip',
    filename: 'Эмодзи Лев Кейсер.zip',
    dimensions: '100 × 100 px',
    release_id: null,
    includes: '70 эмодзи 100 × 100\nПамятка по загрузке в Telegram',
    description:
      '70 маленьких эмодзи: лица, бюсты, обложки треков, значки. Ставятся прямо в строку ' +
      'текста, а не отдельным сообщением.\n\n' +
      'Загружаются командой /newemojipack. Вставлять кастомные эмодзи в свои сообщения ' +
      'может только аккаунт с Telegram Premium, а видят их все.',
  },
];

// ------------------------------------------------------------------ запись

const SELECT = db.prepare('SELECT id FROM products WHERE slug = ?');
const UPDATE = db.prepare(`
  UPDATE products SET name=?, description=?, price=?, category_id=?, collection_id=?, release_id=?,
    image=?, stock=?, is_active=?, is_digital=?, digital_file=?, digital_filename=?, digital_size=?,
    lead_time=?, includes=?, dimensions=?, weight=?, material=?, care=?
  WHERE slug=?
`);
const INSERT = db.prepare(`
  INSERT INTO products (name, slug, description, price, category_id, collection_id, release_id,
    image, stock, is_active, is_digital, digital_file, digital_filename, digital_size,
    lead_time, includes, dimensions, weight, material, care)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

function upsert(p) {
  const row = SELECT.get(p.slug);
  const v = [
    p.name, p.description, p.price, p.category_id, p.collection_id, p.release_id,
    p.image, p.stock, p.is_active, p.is_digital, p.digital_file, p.digital_filename, p.digital_size,
    p.lead_time, p.includes, p.dimensions, p.weight, p.material, p.care,
  ];
  if (row) {
    UPDATE.run(...v, p.slug);
    return 'обновлён ' + row.id;
  }
  const info = INSERT.run(v[0], p.slug, ...v.slice(1));
  return 'создан ' + info.lastInsertRowid;
}

for (const f of flags) {
  console.log(
    upsert({
      name: f.name,
      slug: f.slug,
      description: f.description,
      // Ноль здесь — не «бесплатно», а «Под заказ»: витрина покажет именно так,
      // а в корзину такой товар не кладётся (src/routes/cart.js).
      price: 0,
      category_id: decor,
      collection_id: f.collection_id,
      release_id: f.release_id,
      image: f.image,
      stock: 999,
      is_active: 1,
      is_digital: 0,
      digital_file: '',
      digital_filename: '',
      digital_size: 0,
      lead_time: FLAG_LEAD,
      includes: f.includes || FLAG_INCLUDES,
      dimensions: FLAG_SIZE,
      weight: '',
      material: FLAG_MATERIAL,
      care: FLAG_CARE,
    }),
    '—',
    f.name
  );
}

for (const s of packs) {
  const zip = path.join(DIGITAL, s.zip);
  if (!fs.existsSync(zip)) {
    console.log('ПРОПУСК —', s.name, ': нет архива', zip);
    continue;
  }
  const size = fs.statSync(zip).size;
  console.log(
    upsert({
      name: s.name,
      slug: s.slug,
      description: s.description,
      price: 0,
      category_id: digital,
      collection_id: null,
      release_id: s.release_id,
      image: s.image,
      stock: 0,
      is_active: 1,
      is_digital: 1,
      digital_file: s.zip,
      digital_filename: s.filename,
      digital_size: size,
      lead_time: STICKER_LEAD,
      includes: s.includes,
      dimensions: s.dimensions,
      weight: (size / 1048576).toFixed(1).replace('.', ',') + ' МБ',
      material: STICKER_FORMAT,
      care: STICKER_CARE,
    }),
    '—',
    s.name
  );
}

console.log('\nИтог:');
for (const r of db
  .prepare(
    `SELECT p.slug, p.name, p.price, p.is_active, p.is_digital, c.name AS cat
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug LIKE 'flag-%' OR p.slug LIKE 'stikery-%' OR p.slug = 'emodzi-levkeiser'
     ORDER BY p.is_digital, p.id`
  )
  .all()) {
  console.log(
    ' ',
    (r.is_active ? 'в каталоге ' : 'черновик  ') + r.slug.padEnd(32),
    r.cat,
    '|',
    r.price + ' ₽',
    r.is_digital ? '| цифровой' : ''
  );
}
