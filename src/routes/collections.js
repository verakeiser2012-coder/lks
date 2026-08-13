const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const collections = db
    .prepare('SELECT * FROM collections WHERE is_published = 1 ORDER BY sort_order ASC, created_at DESC')
    .all();
  const counts = db
    .prepare('SELECT collection_id, COUNT(*) AS c FROM products WHERE collection_id IS NOT NULL GROUP BY collection_id')
    .all();
  const countMap = {};
  for (const row of counts) countMap[row.collection_id] = row.c;

  res.render('collections', {
    collections: collections.map((c) => ({ ...c, productCount: countMap[c.id] || 0 })),
  });
});

router.get('/:slug', (req, res) => {
  const collection = db
    .prepare('SELECT * FROM collections WHERE slug = ? AND is_published = 1')
    .get(req.params.slug);
  if (!collection) {
    return res.status(404).render('404');
  }
  const products = db
    .prepare('SELECT * FROM products WHERE collection_id = ? AND is_active = 1 ORDER BY created_at DESC')
    .all(collection.id);

  res.render('collection', { collection, products });
});

module.exports = router;
