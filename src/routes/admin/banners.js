const express = require('express');
const db = require('../../db');

const router = express.Router();

router.get('/', (req, res) => {
  const banners = db.prepare('SELECT * FROM promo_banners ORDER BY page_key ASC, sort_order ASC').all();
  res.render('admin/banners', { banners });
});

router.get('/new', (req, res) => {
  res.render('admin/banner-form', { banner: null, error: null });
});

router.post('/', (req, res) => {
  const { pageKey, title, subtitle, ctaLabel, ctaUrl, sortOrder, isPublished } = req.body;
  if (!pageKey || !title) {
    return res.render('admin/banner-form', { banner: req.body, error: 'Укажите страницу и заголовок.' });
  }

  db.prepare(`
    INSERT INTO promo_banners (page_key, title, subtitle, cta_label, cta_url, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(pageKey.trim(), title, subtitle || '', ctaLabel || '', ctaUrl || '', Number(sortOrder) || 0, isPublished ? 1 : 0);

  res.redirect('/admin/banners');
});

router.get('/:id/edit', (req, res) => {
  const banner = db.prepare('SELECT * FROM promo_banners WHERE id = ?').get(req.params.id);
  if (!banner) return res.status(404).render('404');
  res.render('admin/banner-form', { banner, error: null });
});

router.post('/:id', (req, res) => {
  const banner = db.prepare('SELECT * FROM promo_banners WHERE id = ?').get(req.params.id);
  if (!banner) return res.status(404).render('404');

  const { pageKey, title, subtitle, ctaLabel, ctaUrl, sortOrder, isPublished } = req.body;
  if (!pageKey || !title) {
    return res.render('admin/banner-form', { banner: { ...banner, ...req.body }, error: 'Укажите страницу и заголовок.' });
  }

  db.prepare(`
    UPDATE promo_banners SET page_key = ?, title = ?, subtitle = ?, cta_label = ?, cta_url = ?, sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(pageKey.trim(), title, subtitle || '', ctaLabel || '', ctaUrl || '', Number(sortOrder) || 0, isPublished ? 1 : 0, banner.id);

  res.redirect('/admin/banners');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM promo_banners WHERE id = ?').run(req.params.id);
  res.redirect('/admin/banners');
});

module.exports = router;
