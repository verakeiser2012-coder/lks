const express = require('express');
const db = require('../../db');
const { slugify } = require('../../utils/slugify');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM diary_posts ORDER BY created_at DESC').all();
  res.render('admin/diary', { posts });
});

router.get('/new', (req, res) => {
  res.render('admin/diary-form', { post: null, error: null });
});

router.post('/', uploadImage.single('cover'), (req, res) => {
  const { title, excerpt, content, dzenUrl, isPublished } = req.body;
  if (!title) {
    return res.render('admin/diary-form', { post: req.body, error: 'Укажите заголовок записи.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO diary_posts (title, slug, excerpt, content, cover_image, dzen_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, slugify(title), excerpt || '', content || '', cover, dzenUrl || '', isPublished ? 1 : 0);

  res.redirect('/admin/diary');
});

router.get('/:id/edit', (req, res) => {
  const post = db.prepare('SELECT * FROM diary_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).render('404');
  res.render('admin/diary-form', { post, error: null });
});

router.post('/:id', uploadImage.single('cover'), (req, res) => {
  const post = db.prepare('SELECT * FROM diary_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).render('404');

  const { title, excerpt, content, dzenUrl, isPublished } = req.body;
  if (!title) {
    return res.render('admin/diary-form', { post: { ...post, ...req.body }, error: 'Укажите заголовок записи.' });
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : post.cover_image;

  db.prepare(`
    UPDATE diary_posts SET title = ?, excerpt = ?, content = ?, cover_image = ?, dzen_url = ?, is_published = ?
    WHERE id = ?
  `).run(title, excerpt || '', content || '', cover, dzenUrl || '', isPublished ? 1 : 0, post.id);

  res.redirect('/admin/diary');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM diary_posts WHERE id = ?').run(req.params.id);
  res.redirect('/admin/diary');
});

module.exports = router;
