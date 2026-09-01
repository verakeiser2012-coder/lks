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
  if (!product) {
    return res.redirect('/catalog');
  }
  // У цифрового товара нет остатка и нет смысла в количестве:
  // файл покупают один раз, копия всегда одна.
  const isDigital = Number(product.is_digital) === 1;
  if (!isDigital && product.stock <= 0) {
    return res.redirect('/catalog');
  }

  const cart = getCart(req);
  if (isDigital) {
    cart[productId] = 1;
  } else {
    const current = cart[productId] || 0;
    cart[productId] = Math.min(current + qty, product.stock);
  }

  res.redirect('/cart');
});

router.post('/update', (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Number(req.body.qty);
  const cart = getCart(req);

  if (!qty || qty <= 0) {
    delete cart[productId];
  } else {
    const product = db.prepare('SELECT stock, is_digital FROM products WHERE id = ?').get(productId);
    if (!product) {
      cart[productId] = qty;
    } else if (Number(product.is_digital) === 1) {
      cart[productId] = 1;
    } else {
      cart[productId] = Math.min(qty, product.stock);
    }
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
