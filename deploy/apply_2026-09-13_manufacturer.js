// Изготовитель и место изготовления у товаров — обязательные сведения по правилам
// дистанционной торговли. Заполняем то, что известно; остальное Лев допишет в админке.
// Ищем по slug, повторный запуск безопасен (пустые поля не перезаписываются).
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

const SELF = 'ИП Кейсер, Екатеринбург, Россия';
const GRUSHA = 'Мастерская «Груша», Екатеринбург, Россия';
const RIGHTS = 'Лев Кейсер (DJ Levka), Екатеринбург, Россия';

const BY_SLUG = {
  'aromakamen-byust': SELF,
  'derzhatel-dlya-naushnikov-byust': SELF,
  'derzhatel-dlya-ukrasheniy-byust': SELF,
  'aromaticheskaya-tabletka-grusha-lev': GRUSHA,
  'karta-naturalnyh-aromatov': 'Печать по заказу ИП Кейсер, Екатеринбург, Россия',
};

const set = db.prepare("UPDATE products SET manufacturer = ? WHERE slug = ? AND manufacturer = ''");
let n = 0;
for (const [slug, m] of Object.entries(BY_SLUG)) n += set.run(m, slug).changes;
// Цифровые товары: правообладатель.
n += db.prepare("UPDATE products SET manufacturer = ? WHERE is_digital = 1 AND manufacturer = ''").run(RIGHTS).changes;
console.log('заполнено изготовителей:', n);
console.log('без изготовителя:', db.prepare("SELECT slug FROM products WHERE is_active = 1 AND manufacturer = ''").all().map((r) => r.slug).join(', ') || '—');
