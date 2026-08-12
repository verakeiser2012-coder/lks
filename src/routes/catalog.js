const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const { category } = req.query;

  let products;
  if (category) {
    products = db
      .prepare(`
        SELECT p.* FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1 AND c.slug = ?
        ORDER BY p.created_at DESC
      `)
      .all(category);
  } else {
    products = db
      .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC')
      .all();
  }

  res.render('catalog', { products, categories, activeCategory: category || null });
});

router.get('/:slug', (req, res) => {
  const product = db
    .prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1')
    .get(req.params.slug);

  if (!product) {
    return res.status(404).render('404');
  }

  res.render('product', { product });
});

module.exports = router;
