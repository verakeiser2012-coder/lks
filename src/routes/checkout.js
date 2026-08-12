const express = require('express');
const db = require('../db');
const { getCartDetails, getCart } = require('../utils/cart');
const { createPayment } = require('../services/payments/yookassa');

const router = express.Router();

router.get('/', (req, res) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }
  res.render('checkout', { items, total, error: null });
});

router.post('/', async (req, res, next) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }

  const { customerName, phone, email, address, comment } = req.body;
  if (!customerName || !phone) {
    return res.render('checkout', { items, total, error: 'Заполните имя и телефон.' });
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_name, phone, email, address, comment, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const orderInfo = insertOrder.run(customerName, phone, email || '', address || '', comment || '', total);
  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, qty)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insertItem.run(orderId, item.product.id, item.product.name, item.product.price, item.qty);
  }

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const payment = await createPayment(order, baseUrl);

    db.prepare('UPDATE orders SET payment_provider = ?, payment_id = ? WHERE id = ?').run(
      payment.provider,
      payment.paymentId,
      orderId
    );

    req.session.cart = {};
    res.redirect(payment.confirmationUrl);
  } catch (err) {
    next(err);
  }
});

// Тестовая (mock) страница оплаты — используется, пока не подключены реальные ключи ЮKassa
router.get('/pay/:orderId', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    return res.status(404).render('404');
  }
  res.render('payment-mock', { order });
});

router.post('/pay/:orderId/confirm', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    return res.status(404).render('404');
  }
  db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?").run(order.id);
  res.redirect(`/checkout/success?orderId=${order.id}`);
});

router.get('/success', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.query.orderId);
  res.render('checkout-success', { order: order || null });
});

// Вебхук для реальных уведомлений от ЮKassa об изменении статуса платежа.
// Используется только когда в .env заданы YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY.
router.post('/webhook/yookassa', (req, res) => {
  const event = req.body;
  const payment = event && event.object;
  if (payment && payment.id) {
    const order = db.prepare('SELECT * FROM orders WHERE payment_id = ?').get(payment.id);
    if (order && payment.status === 'succeeded') {
      db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?").run(order.id);
    }
  }
  res.sendStatus(200);
});

module.exports = router;
