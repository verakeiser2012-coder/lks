/**
 * Службы доставки: СДЭК и Ozon Доставка.
 *
 * Обе подключаются ключами из .env; пока ключей нет, каждая отвечает
 * «недоступно», и оформление заказа работает как раньше — адрес и пункт
 * выдачи текстом, стоимость согласуется после заказа. Так сайт не ломается
 * в промежутке между регистрацией в кабинете и получением ключей.
 *
 * Как получить ключи — notes/delivery-cdek-ozon.md.
 */
const cdek = require('./cdek');
const ozon = require('./ozon');

const CARRIERS = { cdek, ozon };

/** Список подключённых служб для страницы оформления заказа. */
function available() {
  return Object.entries(CARRIERS)
    .filter(([, c]) => c.isConfigured)
    .map(([key, c]) => ({ key, label: c.LABEL }));
}

/** Стоимость и срок по каждой подключённой службе; ошибка одной не валит остальные. */
async function quoteAll({ city, postcode, items }) {
  const out = [];
  for (const [key, c] of Object.entries(CARRIERS)) {
    if (!c.isConfigured) continue;
    try {
      const q = await c.quote({ city, postcode, items });
      if (q) out.push({ key, label: c.LABEL, ...q });
    } catch (err) {
      // Курьерка легла — покупатель всё равно должен оформить заказ.
      out.push({ key, label: c.LABEL, error: err.message });
    }
  }
  return out;
}

/** Пункты выдачи одной службы (пока только СДЭК умеет список). */
async function pickupPoints(key, where) {
  const c = CARRIERS[key];
  if (!c || !c.isConfigured || !c.pickupPoints) return [];
  return c.pickupPoints(where);
}

module.exports = { CARRIERS, available, quoteAll, pickupPoints };
