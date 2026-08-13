const express = require('express');
const db = require('../../db');
const { slugify } = require('../../utils/slugify');

const router = express.Router();

router.get('/', (req, res) => {
  const collections = db.prepare('SELECT * FROM collections ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/collections', { collections });
});

router.get('/new', (req, res) => {
  res.render('admin/collection-form', { collection: null, error: null });
});

router.post('/', (req, res) => {
  const { name, subtitle, description, seasonLabel, sortOrder, isPublished } = req.body;
  if (!name) {
    return res.render('admin/collection-form', { collection: req.body, error: 'Укажите название дропа.' });
  }

  db.prepare(`
    INSERT INTO collections (name, slug, subtitle, description, season_label, is_published, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, slugify(name), subtitle || '', description || '', seasonLabel || '', isPublished ? 1 : 0, Number(sortOrder) || 0);

  res.redirect('/admin/collections');
});

router.get('/:id/edit', (req, res) => {
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) return res.status(404).render('404');
  res.render('admin/collection-form', { collection, error: null });
});

router.post('/:id', (req, res) => {
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id);
  if (!collection) return res.status(404).render('404');

  const { name, subtitle, description, seasonLabel, sortOrder, isPublished } = req.body;
  if (!name) {
    return res.render('admin/collection-form', {
      collection: { ...collection, ...req.body },
      error: 'Укажите название дропа.',
    });
  }

  db.prepare(`
    UPDATE collections SET name = ?, subtitle = ?, description = ?, season_label = ?, is_published = ?, sort_order = ?
    WHERE id = ?
  `).run(name, subtitle || '', description || '', seasonLabel || '', isPublished ? 1 : 0, Number(sortOrder) || 0, collection.id);

  res.redirect('/admin/collections');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('UPDATE products SET collection_id = NULL WHERE collection_id = ?').run(req.params.id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  res.redirect('/admin/collections');
});

module.exports = router;
