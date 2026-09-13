const { deliverDigital } = require('./digital');
const { submitOrder } = require('./printful');
const { createShipment } = require('./delivery');

/**
 * Одна точка «заказ оплачен»: раньше три места в checkout.js звали выдачу
 * файлов каждое по-своему, и добавить туда печать по требованию значило
 * править все три. Файлы выдаём сразу, печатника не ждём — его ответ
 * покупателю не нужен, а молчащий API держал бы страницу до таймаута.
 */
async function onOrderPaid(orderId) {
  const downloads = await deliverDigital(orderId);
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
