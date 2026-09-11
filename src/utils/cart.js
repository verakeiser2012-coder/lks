const db = require('../db');

function getCart(req) {
  if (!req.session.cart) {
    req.session.cart = {};
  }
  return req.session.cart;
}

// Ключ позиции: «12» для обычной вещи, «12:M» для вещи с вариантом (размер
// у печати по требованию). Одна футболка двух размеров — две строки корзины.
function cartKey(productId, variant) {
  return variant ? `${productId}:${variant}` : String(productId);
}

function parseKey(key) {
  const [id, ...rest] = String(key).split(':');
  return { productId: Number(id), variant: rest.join(':') };
}

function getCartDetails(req) {
  const cart = getCart(req);
  const entries = Object.keys(cart)
    .filter((key) => cart[key] > 0)
    .map((key) => ({ key, ...parseKey(key), qty: cart[key] }))
    .filter((e) => e.productId > 0);
  if (entries.length === 0) {
    return { items: [], total: 0 };
  }

  const ids = [...new Set(entries.map((e) => e.productId))];
  const placeholders = ids.map(() => '?').join(',');
  const byId = {};
  db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...ids)
    .forEach((p) => { byId[p.id] = p; });

  const items = entries
    .filter((e) => byId[e.productId])
    .map((e) => {
      const product = byId[e.productId];
      return {
        key: e.key,
        product,
        variant: e.variant,
        qty: e.qty,
        subtotal: product.price * e.qty,
      };
    });

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, total };
}

module.exports = { getCart, getCartDetails, cartKey, parseKey };
