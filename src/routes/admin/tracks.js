const express = require('express');
const db = require('../../db');
const { uploadImage } = require('../../middleware/upload');
const { slugify } = require('../../utils/slugify');

const router = express.Router();

function loadTracks() {
  return db.prepare(`
    SELECT tracks.*, releases.title AS release_title
    FROM tracks LEFT JOIN releases ON releases.id = tracks.release_id
    ORDER BY releases.sort_order ASC, tracks.sort_order ASC, tracks.created_at DESC
  `).all();
}

function loadReleases() {
  return db.prepare('SELECT * FROM releases ORDER BY sort_order ASC, created_at DESC').all();
}

router.get('/', (req, res) => {
  res.render('admin/tracks', { tracks: loadTracks() });
});

router.get('/new', (req, res) => {
  res.render('admin/track-form', { track: null, releases: loadReleases(), error: null });
});

router.post('/', uploadImage.single('cover'), (req, res) => {
  const { title, description, url, releaseId, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/track-form', { track: req.body, releases: loadReleases(), error: 'Укажите название трека.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO tracks (title, slug, description, url, cover_image, release_id, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, slugify(title), description || '', url || '', cover,
    releaseId ? Number(releaseId) : null, Number(sortOrder) || 0, isPublished ? 1 : 0
  );

  res.redirect('/admin/tracks');
});

router.get('/:id/edit', (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).render('404');
  res.render('admin/track-form', { track, releases: loadReleases(), error: null });
});

router.post('/:id', uploadImage.single('cover'), (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).render('404');

  const { title, description, url, releaseId, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/track-form', {
      track: { ...track, ...req.body }, releases: loadReleases(), error: 'Укажите название трека.',
    });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : track.cover_image;
  const slug = track.slug || slugify(title);

  db.prepare(`
    UPDATE tracks SET title = ?, slug = ?, description = ?, url = ?, cover_image = ?, release_id = ?, sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(
    title, slug, description || '', url || '', cover,
    releaseId ? Number(releaseId) : null, Number(sortOrder) || 0, isPublished ? 1 : 0, track.id
  );

  res.redirect('/admin/tracks');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM tracks WHERE id = ?').run(req.params.id);
  res.redirect('/admin/tracks');
});

module.exports = router;
