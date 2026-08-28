const express = require('express');
const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');
const { getPost, getMedia } = require('./helpers');
const { sendNewsletter } = require('../../../services/newsletter');
const mediaRoutes = require('./media');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM news ORDER BY created_at DESC').all();
  const subscribersCount = db.prepare('SELECT COUNT(*) AS c FROM subscribers').get().c;
  res.render('admin/news', { posts, subscribersCount, msg: req.query.msg || '' });
});

router.post('/:id/newsletter', async (req, res) => {
  const testEmail = (req.body.testEmail || '').trim();
  const result = await sendNewsletter(req.params.id, testEmail || null);
  let msg;
  if (result.error) {
    msg = result.error;
  } else if (testEmail) {
    msg = result.sent === 1 ? `Тестовое письмо отправлено на ${testEmail}.` : `Не удалось отправить тест: ${result.failed[0] ? result.failed[0].error : 'неизвестная ошибка'}`;
  } else {
    msg = `Отправлено: ${result.sent}` + (result.failed.length ? `, ошибок: ${result.failed.length} (${result.failed[0].error})` : '');
  }
  res.redirect('/admin/news?msg=' + encodeURIComponent(msg));
});

router.get('/new', (req, res) => {
  res.render('admin/news-new', { error: null });
});

router.post('/', (req, res) => {
  const { title, content, isPublished, lang } = req.body;
  if (!title) {
    return res.render('admin/news-new', { error: 'Укажите заголовок.' });
  }

  const slug = slugify(title);
  const info = db.prepare(`
    INSERT INTO news (title, slug, content, is_published, lang)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, slug, content || '', isPublished ? 1 : 0, lang === 'en' ? 'en' : 'ru');

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

  const { title, content, isPublished, lang } = req.body;
  if (!title) {
    return res.render('admin/news-edit', { post, media: getMedia(post.id), error: 'Укажите заголовок.' });
  }

  db.prepare(`
    UPDATE news SET title = ?, content = ?, is_published = ?, lang = ? WHERE id = ?
  `).run(title, content || '', isPublished ? 1 : 0, lang === 'en' ? 'en' : 'ru', post.id);

  res.redirect(`/admin/news/${post.id}/edit`);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.redirect('/admin/news');
});

router.use('/', mediaRoutes);

module.exports = router;
