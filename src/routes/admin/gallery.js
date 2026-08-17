const express = require('express');
const db = require('../../db');
const { uploadGalleryFile } = require('../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../services/media');

const router = express.Router();

const PAGE_KEYS = ['', 'home', 'music', 'style', 'gigs'];

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/gallery', { items, error: null });
});

router.post('/', uploadGalleryFile.single('file'), (req, res) => {
  const { type, title, sortOrder, pageKey } = req.body;

  if (!isValidMediaUpload(req)) {
    const items = db.prepare('SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC').all();
    return res.render('admin/gallery', { items, error: 'Выберите тип и файл.' });
  }

  const page_key = PAGE_KEYS.includes(pageKey) ? pageKey : '';

  db.prepare(`
    INSERT INTO gallery_items (type, title, file_path, page_key, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, title || '', mediaFilePath(req), page_key, Number(sortOrder) || 0);

  res.redirect('/admin/gallery');
});

router.post('/:id/page', (req, res) => {
  const pageKey = PAGE_KEYS.includes(req.body.pageKey) ? req.body.pageKey : '';
  db.prepare('UPDATE gallery_items SET page_key = ? WHERE id = ?').run(pageKey, req.params.id);
  res.redirect('/admin/gallery');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM gallery_items WHERE id = ?').run(req.params.id);
  res.redirect('/admin/gallery');
});

module.exports = router;
