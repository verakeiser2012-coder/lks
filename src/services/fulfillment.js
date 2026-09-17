const db = require('../db');
const { notify } = require('./mail');
const { deliverDigital } = require('./digital');
const { submitOrder } = require('./printful');
const { createShipment } = require('./delivery');

const SITE = process.env.SITE_URL || 'https://levkeiser.com';

/**
 * Оплаченная услуга (аудит каталога) — письмо нам: обычный заказ виден в админке,
 * а тут надо садиться работать по ссылкам покупателя, и ждать, пока кто-то заглянет
 * в список заказов, нельзя.
 */
async function notifyServiceOrder(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const services = db.prepare(`
    SELECT oi.product_name FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? AND p.is_service = 1
  `).all(orderId);
  if (!order || !services.length) return;
  const text = [
    `Оплачена услуга: ${services.map((s) => s.product_name).join(', ')}.`,
    `Заказ №${order.id}, ${order.customer_name}, ${order.phone}, ${order.email}`,
    '',
    'Что написал покупатель:',
    order.comment || '(пусто — запросить ссылки письмом)',
    '',
    `${SITE}/admin/orders/${order.id}`,
  ].join('\n');
  await notify(`Заказ №${order.id}: ${services[0].product_name} — оплачен, пора делать`, text);
}

/**
 * Одна точка «заказ оплачен»: раньше три места в checkout.js звали выдачу
 * файлов каждое по-своему, и добавить туда печать по требованию значило
 * править все три. Файлы выдаём сразу, печатника не ждём — его ответ
 * покупателю не нужен, а молчащий API держал бы страницу до таймаута.
 */
async function onOrderPaid(orderId) {
  const downloads = await deliverDigital(orderId);
  notifyServiceOrder(orderId).catch((err) => {
    console.error(`[service] заказ №${orderId}:`, err.message);
  });
  submitOrder(orderId).catch((err) => {
    console.error(`[printful] заказ №${orderId}:`, err.message);
  });
  // Накладная в службе доставки — тоже в фоне: покупателю её ответ не нужен.
  createShipment(orderId).then((r) => {
    if (r.status !== 'skipped') console.log(`[delivery] заказ №${orderId}: ${r.status} — ${r.detail}`);
  }).catch((err) => {
    console.error(`[delivery] заказ №${orderId}:`, err.message);
  });
  return downloads;
}

module.exports = { onOrderPaid };
