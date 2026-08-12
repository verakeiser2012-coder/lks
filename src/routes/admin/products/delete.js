const db = require('../../../db');

function remove(req, res) {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
}

module.exports = { remove };
