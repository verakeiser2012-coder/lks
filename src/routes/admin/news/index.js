const express = require('express');
const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');
const { getPost, getMedia } = require('./helpers');
const mediaRoutes = require('./media');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM news ORDER BY created_at DESC').all();
  res.render('admin/news', { posts });
});

router.get('/new', (req, res) => {
  res.render('admin/news-new', { error: null });
});

router.post('/', (req, res) => {
  const { title, content, isPublished } = req.body;
  if (!title) {
    return res.render('admin/news-new', { error: 'Укажите заголовок.' });
  }

  const slug = slugify(title);
  const info = db.prepare(`
    INSERT INTO news (title, slug, content, is_published)
    VALUES (?, ?, ?, ?)
  `).run(title, slug, content || '', isPublished ? 1 : 0);

  res.redirect(`/admin/news/${info.lastInsertRowid}/edit`);
});

router.get('/:id/edit', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  res.render('admin/news-edit', { post, media: getMedia(post.id), error: null });
});

router.post('/:id', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }

  const { title, content, isPublished } = req.body;
  if (!title) {
    return res.render('admin/news-edit', { post, media: getMedia(post.id), error: 'Укажите заголовок.' });
  }

  db.prepare(`
    UPDATE news SET title = ?, content = ?, is_published = ? WHERE id = ?
  `).run(title, content || '', isPublished ? 1 : 0, post.id);

  res.redirect(`/admin/news/${post.id}/edit`);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.redirect('/admin/news');
});

router.use('/', mediaRoutes);

module.exports = router;
