const express = require('express');
const db = require('../db');
const { getCart, getCartDetails } = require('../utils/cart');

const router = express.Router();

router.get('/', (req, res) => {
  const { items, total } = getCartDetails(req);
  res.render('cart', { items, total });
});

router.post('/add', (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
  if (!product || product.stock <= 0) {
    return res.redirect('/catalog');
  }

  const cart = getCart(req);
  const current = cart[productId] || 0;
  const next = Math.min(current + qty, product.stock);
  cart[productId] = next;

  res.redirect('/cart');
});

router.post('/update', (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Number(req.body.qty);
  const cart = getCart(req);

  if (!qty || qty <= 0) {
    delete cart[productId];
  } else {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    cart[productId] = product ? Math.min(qty, product.stock) : qty;
  }

  res.redirect('/cart');
});

router.post('/remove', (req, res) => {
  const productId = Number(req.body.productId);
  const cart = getCart(req);
  delete cart[productId];
  res.redirect('/cart');
});

module.exports = router;
