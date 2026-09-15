const express = require('express');
const { sendStatusChanged } = require('../../services/orderPage');
const db = require('../../db');
const { submitOrder, printfulItems } = require('../../services/printful');
const { createShipment, refreshShipment, CARRIERS } = require('../../services/delivery');

const router = express.Router();

router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.render('admin/orders', { orders });
});

// Этикетка отправления для передачи в ПВЗ (пока только Ozon отдаёт PDF).
router.get('/:id/label', async (req, res, next) => {
  const order = db.prepare('SELECT id, shipping_carrier, shipping_ref FROM orders WHERE id = ?').get(req.params.id);
  if (!order || !order.shipping_ref) return res.status(404).render('404');
  const c = CARRIERS[order.shipping_carrier];
  if (!c || !c.label) return res.status(404).render('404');
  try {
    const pdf = await c.label(order.shipping_ref);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="order-${order.id}-label.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).render('404');
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const printful = printfulItems(order.id).length > 0;
  res.render('admin/order-detail', { order, items, printful, printfulResult: req.query.printful || '', shipResult: req.query.ship || '' });
});

// Повторная отправка в Printful: после ошибки, после заполнения адреса или
// когда токен появился уже после оплаты.
router.post('/:id/printful', async (req, res) => {
  const result = await submitOrder(req.params.id);
  res.redirect(`/admin/orders/${req.params.id}?printful=${encodeURIComponent(`${result.status}: ${result.detail}`)}`);
});

// Накладная службы доставки: создать (если после оплаты не вышло) или обновить номер и статус.
router.post('/:id/shipment', async (req, res) => {
  const order = db.prepare('SELECT id, shipping_ref FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).render('404');
  let result;
  try {
    result = order.shipping_ref ? await refreshShipment(order.id) : await createShipment(order.id);
  } catch (err) {
    result = { status: 'error', detail: err.message };
  }
  res.redirect(`/admin/orders/${order.id}?ship=${encodeURIComponent(`${result.status}: ${result.detail}`)}`);
});

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  const before = db.prepare('SELECT status FROM orders WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  // Покупателю — письмо со ссылкой на страницу заказа, если статус действительно сменился
  if (before && before.status !== status) {
    sendStatusChanged(req.params.id).catch((err) => console.error('[order] письмо о статусе:', err.message));
  }
  res.redirect(`/admin/orders/${req.params.id}`);
});

module.exports = router;
