// Страница заказа по ссылке и письма покупателю. Кабинета с паролем нет:
// доступ к заказу даёт длинный токен из письма, «мои покупки» — письмо на почту.
const { randomBytes } = require('crypto');
const db = require('../db');
const { notify } = require('./mail');

const SITE = process.env.SITE_URL || 'https://levkeiser.com';

const STATUS_STEPS = [
  ['new', 'Принят'],
  ['processing', 'В работе'],
  ['shipped', 'Отправлен'],
  ['completed', 'Выполнен'],
];
const STATUS_LABELS = { ...Object.fromEntries(STATUS_STEPS), cancelled: 'Отменён' };

function ensureToken(orderId) {
  const row = db.prepare('SELECT access_token FROM orders WHERE id = ?').get(orderId);
  if (!row) return '';
  if (row.access_token) return row.access_token;
  const token = randomBytes(16).toString('hex');
  db.prepare('UPDATE orders SET access_token = ? WHERE id = ?').run(token, orderId);
  return token;
}

const orderUrl = (orderId) => `${SITE}/order/${ensureToken(orderId)}`;

function trackingUrl(order) {
  if (!order.shipping_track) return '';
  if (order.shipping_carrier === 'cdek') return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.shipping_track)}`;
  if (order.shipping_carrier === 'ozon') return `https://www.ozon.ru/tracking/${encodeURIComponent(order.shipping_track)}`;
  return '';
}

function orderView(order) {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  const downloads = order.payment_status === 'paid'
    ? db.prepare('SELECT * FROM downloads WHERE order_id = ? ORDER BY id').all(order.id)
    : [];
  const stepIndex = STATUS_STEPS.findIndex(([s]) => s === order.status);
  // Услуга в заказе: файлов не будет, результат приходит письмом — страница должна это сказать.
  const hasService = items.some((i) => {
    const p = db.prepare('SELECT is_service FROM products WHERE id = ?').get(i.product_id);
    return p && Number(p.is_service) === 1;
  });
  return {
    order, items, downloads, hasService,
    steps: STATUS_STEPS.map(([key, label], i) => ({ key, label, done: stepIndex >= i, current: stepIndex === i })),
    cancelled: order.status === 'cancelled',
    statusLabel: STATUS_LABELS[order.status] || order.status,
    trackingUrl: trackingUrl(order),
  };
}

/** Письмо сразу после оформления: номер, состав, ссылка на страницу заказа. */
async function sendOrderCreated(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || !order.email) return false;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const lines = items.map((i) => `— ${i.product_name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty}`);
  const text = [
    `Здравствуйте, ${order.customer_name}!`,
    '',
    `Заказ №${order.id} принят.`,
    ...lines,
    '',
    `Сумма: ${Math.round(order.total)} ₽${order.payment_status === 'paid' ? ' (оплачено)' : ''}`,
    '',
    'Статус заказа, доставка и файлы — на его странице, ссылка личная, храните её:',
    orderUrl(orderId),
    '',
    'Если ссылка потеряется — на levkeiser.com/orders можно запросить её заново на эту почту.',
    'Вопросы — ответом на это письмо.',
    '',
    'Условия возврата (ст. 26.1 Закона о защите прав потребителей): от вещи можно отказаться до получения и в течение 7 дней после, если сохранены товарный вид и упаковка; вещи, сделанные лично под вас (номер, имя, фраза), возврату не подлежат; файлы — до перехода по ссылке на скачивание. Брак или повреждение при доставке — замена или возврат денег за наш счёт. Подробно: ' + SITE + '/legal/returns',
    '',
    'Лев Кейсер',
  ].join('\n');
  await notify(`Заказ №${order.id} принят`, text, order.email);
  return true;
}

/** Письмо при смене статуса из админки. */
async function sendStatusChanged(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || !order.email) return false;
  const what = {
    processing: 'взят в работу',
    shipped: order.shipping_track ? `отправлен, трек-номер ${order.shipping_track}` : 'отправлен',
    completed: 'выполнен. Спасибо!',
    cancelled: 'отменён. Если это ошибка — ответьте на письмо',
  }[order.status];
  if (!what) return false;
  const track = trackingUrl(order);
  const text = [
    `Здравствуйте, ${order.customer_name}!`,
    '',
    `Заказ №${order.id} ${what}.`,
    ...(track ? ['Отследить: ' + track] : []),
    '',
    'Страница заказа: ' + orderUrl(orderId),
    '',
    'Лев Кейсер',
  ].join('\n');
  await notify(`Заказ №${order.id}: ${STATUS_LABELS[order.status].toLowerCase()}`, text, order.email);
  return true;
}

/** «Мои покупки»: одно письмо со ссылками на все заказы этой почты. */
async function sendOrdersDigest(email) {
  const orders = db.prepare('SELECT * FROM orders WHERE lower(email) = lower(?) ORDER BY id DESC').all(email);
  if (!orders.length) return 0;
  const blocks = orders.map((o) => {
    const items = db.prepare('SELECT product_name, qty FROM order_items WHERE order_id = ?').all(o.id);
    const files = o.payment_status === 'paid' ? db.prepare('SELECT product_name, token FROM downloads WHERE order_id = ?').all(o.id) : [];
    return [
      `Заказ №${o.id} от ${o.created_at.slice(0, 10)} — ${STATUS_LABELS[o.status] || o.status}${o.payment_status === 'paid' ? ', оплачен' : ''}`,
      ...items.map((i) => `  — ${i.product_name} × ${i.qty}`),
      `  ${orderUrl(o.id)}`,
      ...files.map((f) => `  файл: ${f.product_name} — ${SITE}/downloads/${f.token}`),
    ].join('\n');
  });
  const text = [
    'Здравствуйте!',
    '',
    `Вы запросили ссылки на свои заказы на levkeiser.com. Вот они, ${orders.length} шт.:`,
    '',
    blocks.join('\n\n'),
    '',
    'Ссылки личные — не пересылайте их. Если запрос делали не вы, просто удалите письмо.',
    '',
    'Лев Кейсер',
  ].join('\n');
  await notify('Ваши заказы на levkeiser.com', text, email);
  return orders.length;
}

module.exports = { ensureToken, orderUrl, orderView, sendOrderCreated, sendStatusChanged, sendOrdersDigest, STATUS_LABELS };
