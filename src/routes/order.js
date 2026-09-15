const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { orderView, sendOrdersDigest } = require('../services/orderPage');

const router = express.Router();

// Страница заказа по личной ссылке из письма. Токен — 32 hex-символа, перебор бессмысленен.
router.get('/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).render('404');
  const order = db.prepare('SELECT * FROM orders WHERE access_token = ?').get(token);
  if (!order) return res.status(404).render('404');
  res.render('order', { ...orderView(order), thanks: req.query.thanks === '1', title: `Заказ №${order.id}` });
});

// «Мои покупки»: вводишь почту — на неё уходят ссылки на все заказы.
// Ответ одинаковый независимо от того, есть ли такая почта в базе.
router.get('/orders', (req, res) => {
  res.render('orders-lookup', { sent: false, email: '', error: null, title: 'Мои заказы' });
});

router.post('/orders', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim();
  if (isBot(req) || overLimit('orders', req, 5, 60 * 60 * 1000)) {
    return res.render('orders-lookup', { sent: true, email, error: null, title: 'Мои заказы' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).render('orders-lookup', { sent: false, email, error: 'Введите почту, на которую оформляли заказ.', title: 'Мои заказы' });
  }
  sendOrdersDigest(email).catch((err) => console.error('[orders] письмо со ссылками:', err.message));
  res.render('orders-lookup', { sent: true, email, error: null, title: 'Мои заказы' });
});

module.exports = router;
