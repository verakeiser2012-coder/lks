const db = require('../db');

function getCart(req) {
  if (!req.session.cart) {
    req.session.cart = {};
  }
  return req.session.cart;
}

function getCartDetails(req) {
  const cart = getCart(req);
  const ids = Object.keys(cart).map(Number).filter((id) => cart[id] > 0);
  if (ids.length === 0) {
    return { items: [], total: 0 };
  }

  const placeholders = ids.map(() => '?').join(',');
  const products = db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .all(...ids);

  const items = products.map((product) => {
    const qty = cart[product.id];
    return {
      product,
      qty,
      subtotal: product.price * qty,
    };
  });

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, total };
}

module.exports = { getCart, getCartDetails };
