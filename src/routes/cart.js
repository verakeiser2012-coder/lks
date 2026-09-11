const express = require('express');
const { shopClosedNotice } = require('../utils/shopOpen');
const db = require('../db');
const { getCart, getCartDetails, cartKey } = require('../utils/cart');
const { parseVariants } = require('../services/printful');
const { isMadeToOrder } = require('../utils/price');

const router = express.Router();

router.get('/', (req, res) => {
  const { items, total } = getCartDetails(req);
  res.render('cart', { shopClosed: shopClosedNotice(), items, total });
});

router.post('/add', (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const variant = String(req.body.variant || '').trim();

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
  if (!product) {
    return res.redirect('/catalog');
  }
  // У цифрового товара нет остатка и нет смысла в количестве:
  // файл покупают один раз, копия всегда одна.
  const isDigital = Number(product.is_digital) === 1;
  // Печать по требованию: остатка нет — вещь печатают под заказ, но размер
  // выбрать обязательно, без него Printful заказ не примет.
  const isPrintful = product.fulfillment === 'printful';
  if (isPrintful && parseVariants(product.printful_variants).length && !variant) {
    return res.redirect('/catalog/' + product.slug);
  }
  if (!isDigital && !isPrintful && product.stock <= 0) {
    return res.redirect('/catalog');
  }
  // Вещь без цены («Под заказ») в корзину не кладём: иначе заказ уедет за 0 ₽.
  // Такой товар ведёт в переписку, а не в оформление.
  if (isMadeToOrder(product)) {
    return res.redirect('/catalog/' + product.slug);
  }

  const cart = getCart(req);
  const key = cartKey(productId, isPrintful ? variant : '');
  if (isDigital) {
    cart[key] = 1;
  } else if (isPrintful) {
    cart[key] = (cart[key] || 0) + qty;
  } else {
    const current = cart[key] || 0;
    cart[key] = Math.min(current + qty, product.stock);
  }

  res.redirect('/cart');
});

router.post('/update', (req, res) => {
  const productId = Number(req.body.productId);
  const key = cartKey(productId, String(req.body.variant || '').trim());
  const qty = Number(req.body.qty);
  const cart = getCart(req);

  if (!qty || qty <= 0) {
    delete cart[key];
  } else {
    const product = db.prepare('SELECT stock, is_digital, fulfillment FROM products WHERE id = ?').get(productId);
    if (!product) {
      cart[key] = qty;
    } else if (Number(product.is_digital) === 1) {
      cart[key] = 1;
    } else if (product.fulfillment === 'printful') {
      cart[key] = qty;
    } else {
      cart[key] = Math.min(qty, product.stock);
    }
  }

  res.redirect('/cart');
});

router.post('/remove', (req, res) => {
  const productId = Number(req.body.productId);
  const key = cartKey(productId, String(req.body.variant || '').trim());
  const cart = getCart(req);
  delete cart[key];
  res.redirect('/cart');
});

module.exports = router;
