const express = require('express');
const db = require('../../db');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

function loadTracks() {
  return db.prepare('SELECT * FROM tracks ORDER BY sort_order ASC, created_at DESC').all();
}

router.get('/', (req, res) => {
  res.render('admin/tracks', { tracks: loadTracks() });
});

router.get('/new', (req, res) => {
  res.render('admin/track-form', { track: null, error: null });
});

router.post('/', uploadImage.single('cover'), (req, res) => {
  const { title, description, url, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/track-form', { track: req.body, error: 'Укажите название трека.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO tracks (title, description, url, cover_image, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || '', url || '', cover, Number(sortOrder) || 0, isPublished ? 1 : 0);

  res.redirect('/admin/tracks');
});

router.get('/:id/edit', (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).render('404');
  res.render('admin/track-form', { track, error: null });
});

router.post('/:id', uploadImage.single('cover'), (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).render('404');

  const { title, description, url, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/track-form', { track: { ...track, ...req.body }, error: 'Укажите название трека.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : track.cover_image;

  db.prepare(`
    UPDATE tracks SET title = ?, description = ?, url = ?, cover_image = ?, sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(title, description || '', url || '', cover, Number(sortOrder) || 0, isPublished ? 1 : 0, track.id);

  res.redirect('/admin/tracks');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM tracks WHERE id = ?').run(req.params.id);
  res.redirect('/admin/tracks');
});

module.exports = router;
