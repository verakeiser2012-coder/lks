// Габариты упаковки для накладных СДЭК (products.package_size, «Д × Ш × В» в см).
// Оценка по размеру вещи с запасом на коробку; Лев уточнит в админке, когда
// упакует первый заказ. Пустые поля не перезаписываются, повтор безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const SIZES = {
  'aromakamen-byust': '16 × 12 × 12',            // вещь 12×8×8, коробка с наполнителем
  'aromaticheskaya-tabletka-grusha-lev': '12 × 12 × 3', // таблетка d7 в конверте
  'karta-naturalnyh-aromatov': '65 × 8 × 8',     // плакат A1 в тубусе
  'derzhatel-dlya-naushnikov-byust': '28 × 20 × 20', // 22×14×14, 1,4 кг, коробка
  'derzhatel-dlya-ukrasheniy-byust': '28 × 20 × 20',
  'plastinka-flowers': '33 × 33 × 2',             // 12″ в конверте + картон
  'plastinka-ikigai': '33 × 33 × 2',
  'plastinka-soundstates': '33 × 33 × 2',
  'plastinka-tri-alboma': '34 × 34 × 3',          // конверт-разворот
  'flag-dvigayus-medlenno': '25 × 18 × 4',         // сложенный флаг в пакете
  'flag-v-bystrom-mire': '25 × 18 × 4',
  'flag-soundstates': '25 × 18 × 4',
  'flag-muzyka-bez-ii': '25 × 18 × 4',
  'flag-para-slow-in-a-fast-world': '25 × 18 × 7',
};
const set = db.prepare("UPDATE products SET package_size = ? WHERE slug = ? AND package_size = ''");
let n = 0;
for (const [slug, size] of Object.entries(SIZES)) n += set.run(size, slug).changes;
console.log('габариты заполнены:', n);
console.log('без габаритов (физические):', db.prepare("SELECT slug FROM products WHERE is_active = 1 AND is_digital = 0 AND package_size = ''").all().map((r) => r.slug).join(', ') || '—');
