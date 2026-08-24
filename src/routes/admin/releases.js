const express = require('express');
const db = require('../../db');
const { slugify } = require('../../utils/slugify');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

router.get('/', (req, res) => {
  const releases = db.prepare('SELECT * FROM releases ORDER BY sort_order ASC, created_at DESC').all();
  const counts = db
    .prepare('SELECT release_id, COUNT(*) AS c FROM tracks WHERE release_id IS NOT NULL GROUP BY release_id')
    .all();
  const countMap = {};
  for (const row of counts) countMap[row.release_id] = row.c;
  res.render('admin/releases', { releases: releases.map((r) => ({ ...r, trackCount: countMap[r.id] || 0 })) });
});

router.get('/new', (req, res) => {
  res.render('admin/release-form', { release: null, error: null });
});

router.post('/', uploadImage.single('cover'), (req, res) => {
  const { title, releaseType, year, description, streamingUrl, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/release-form', { release: req.body, error: 'Укажите название релиза.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO releases (title, slug, release_type, year, description, cover_image, streaming_url, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, slugify(title), releaseType || 'EP', year || '', description || '', cover, streamingUrl || '',
    Number(sortOrder) || 0, isPublished ? 1 : 0
  );

  res.redirect('/admin/releases');
});

router.get('/:id/edit', (req, res) => {
  const release = db.prepare('SELECT * FROM releases WHERE id = ?').get(req.params.id);
  if (!release) return res.status(404).render('404');
  const tracks = db
    .prepare('SELECT * FROM tracks WHERE release_id = ? ORDER BY sort_order ASC, id ASC')
    .all(release.id);
  res.render('admin/release-form', { release, tracks, error: null });
});

router.post('/:id', uploadImage.single('cover'), (req, res) => {
  const release = db.prepare('SELECT * FROM releases WHERE id = ?').get(req.params.id);
  if (!release) return res.status(404).render('404');

  const { title, releaseType, year, description, streamingUrl, sortOrder, isPublished } = req.body;
  if (!title) {
    return res.render('admin/release-form', { release: { ...release, ...req.body }, error: 'Укажите название релиза.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : release.cover_image;

  db.prepare(`
    UPDATE releases SET title = ?, release_type = ?, year = ?, description = ?, cover_image = ?, streaming_url = ?,
      sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(
    title, releaseType || 'EP', year || '', description || '', cover, streamingUrl || '',
    Number(sortOrder) || 0, isPublished ? 1 : 0, release.id
  );

  res.redirect('/admin/releases');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('UPDATE tracks SET release_id = NULL WHERE release_id = ?').run(req.params.id);
  db.prepare('DELETE FROM releases WHERE id = ?').run(req.params.id);
  res.redirect('/admin/releases');
});

module.exports = router;
