const db = require('../../../db');

function list(req, res) {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.render('admin/products', { products });
}

module.exports = { list };
