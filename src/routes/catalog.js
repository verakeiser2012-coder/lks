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

  const track = product.track_id
    ? db.prepare('SELECT * FROM tracks WHERE id = ?').get(product.track_id)
    : null;
  // Релиз берём из привязки товара, а если её нет — из релиза трека:
  // ссылка «к треку» без релиза не строится, у трека адрес через релиз.
  const releaseId = product.release_id || (track && track.release_id) || null;
  const release = releaseId
    ? db.prepare('SELECT * FROM releases WHERE id = ?').get(releaseId)
    : null;
  const category = product.category_id
    ? db.prepare('SELECT * FROM categories WHERE id = ?').get(product.category_id)
    : null;
  // Неопубликованный дроп не показываем: ссылка на него отдаст 404.
  const collection = product.collection_id
    ? db.prepare('SELECT * FROM collections WHERE id = ? AND is_published = 1').get(product.collection_id)
    : null;

  res.render('product', {
    title: product.name,
    product,
    release,
    track,
    category,
    collection,
    pageImage: product.image || '',
    pageDescription: product.description || '',
    pageType: 'product',
  });
});

module.exports = router;
