const express = require('express');
const db = require('../db');
const { orderView } = require('../services/orderPage');

const router = express.Router();

// Страница заказа по личной ссылке из письма. Токен — 32 hex-символа, перебор бессмысленен.
router.get('/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).render('404');
  const order = db.prepare('SELECT * FROM orders WHERE access_token = ?').get(token);
  if (!order) return res.status(404).render('404');
  res.render('order', { ...orderView(order), thanks: req.query.thanks === '1', title: `Заказ №${order.id}` });
});

// «Мои заказы» переехали в кабинет (/my): старые ссылки и формы ведут туда.
router.get('/orders', (req, res) => res.redirect(301, '/my'));
router.post('/orders', (req, res) => res.redirect(307, '/my'));

module.exports = router;
