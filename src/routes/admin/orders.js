const express = require('express');
const db = require('../../db');
const { submitOrder, printfulItems } = require('../../services/printful');
const { createShipment, refreshShipment } = require('../../services/delivery');

const router = express.Router();

router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.render('admin/orders', { orders });
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
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect(`/admin/orders/${req.params.id}`);
});

module.exports = router;
