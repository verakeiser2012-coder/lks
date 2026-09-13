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

const db = require('../../db');
const { notify } = require('../mail');

/**
 * Накладная после оплаты: заказ с shipping_carrier уходит в свою службу,
 * uuid пишется в shipping_ref, номер накладной подтягивается сразу, если служба
 * успела его выдать (СДЭК — обычно через несколько секунд; иначе кнопкой
 * «обновить» в админке). Ошибка не мешает оплате: статус 'manual' и письмо.
 */
async function createShipment(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { status: 'skipped', detail: 'заказ не найден' };
  if (order.delivery_method === 'digital') return { status: 'skipped', detail: 'цифровой заказ' };
  if (!order.shipping_carrier) return { status: 'skipped', detail: 'доставка не считалась при оформлении' };
  if (order.shipping_ref) return { status: 'exists', detail: `уже создана: ${order.shipping_track || order.shipping_ref}` };
  const c = CARRIERS[order.shipping_carrier];
  if (!c || !c.isConfigured || !c.createOrder) return { status: 'manual', detail: 'служба не подключена' };
  const items = db.prepare('SELECT oi.*, p.weight, p.package_size FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(orderId);
  const s = {};
  db.prepare("SELECT key, value FROM settings WHERE key IN ('legal_ip_name', 'legal_address', 'phone', 'site_name')").all().forEach((r) => { s[r.key] = r.value; });
  const sender = {
    company: s.legal_ip_name || s.site_name || '',
    name: String(s.legal_ip_name || '').replace(/^ИП\s+/i, '') || s.site_name || '',
    phone: String(s.phone || '').replace(/[^\d+]/g, ''),
    address: s.legal_address || '',
  };
  try {
    const { uuid } = await c.createOrder({ order, items, sender });
    db.prepare("UPDATE orders SET shipping_ref = ?, shipping_status = 'created' WHERE id = ?").run(uuid, orderId);
    let track = '';
    try {
      await new Promise((r) => setTimeout(r, 4000));
      track = (await c.orderInfo(uuid)).track;
    } catch (e) { /* номер заберём позже кнопкой в админке */ }
    if (track) db.prepare('UPDATE orders SET shipping_track = ? WHERE id = ?').run(track, orderId);
    return { status: 'created', detail: track ? `накладная ${track}` : `заказ принят (uuid ${uuid}), номер появится после обработки` };
  } catch (err) {
    db.prepare("UPDATE orders SET shipping_status = 'manual' WHERE id = ?").run(orderId);
    notify(
      `Заказ №${orderId}: накладную ${c.LABEL} оформить вручную`,
      `Автоматически создать не удалось: ${err.message}\n\nЗаказ в админке: /admin/orders/${orderId}`
    ).catch(() => {});
    return { status: 'manual', detail: err.message };
  }
}

/** Обновить номер накладной и статус по уже созданному заказу службы. */
async function refreshShipment(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || !order.shipping_ref) return { status: 'skipped', detail: 'накладной ещё нет' };
  const c = CARRIERS[order.shipping_carrier];
  if (!c || !c.orderInfo) return { status: 'skipped', detail: 'служба не отдаёт статус' };
  const info = await c.orderInfo(order.shipping_ref);
  if (info.track) db.prepare('UPDATE orders SET shipping_track = ? WHERE id = ?').run(info.track, orderId);
  if (info.error) db.prepare("UPDATE orders SET shipping_status = 'error' WHERE id = ?").run(orderId);
  return {
    status: info.error ? 'error' : 'ok',
    detail: (info.track ? `накладная ${info.track}` : 'номера ещё нет') + (info.status ? `, статус: ${info.status}` : '') + (info.error ? `, ошибка: ${info.error}` : ''),
  };
}

module.exports = { CARRIERS, available, quoteAll, pickupPoints, createShipment, refreshShipment };
