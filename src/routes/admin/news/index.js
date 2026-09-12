const express = require('express');
const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');
const { getPost, getMedia } = require('./helpers');
const { sendNewsletter } = require('../../../services/newsletter');
const { translateMany } = require('../../../services/translate');
const mediaRoutes = require('./media');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM news ORDER BY is_pinned DESC, created_at DESC').all();
  const subscribersCount = db.prepare('SELECT COUNT(*) AS c FROM subscribers').get().c;
  res.render('admin/news', { posts, subscribersCount, msg: req.query.msg || '' });
});

router.post('/:id/pin', (req, res) => {
  const post = db.prepare('SELECT id, is_pinned FROM news WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).render('404');
  if (post.is_pinned) {
    db.prepare('UPDATE news SET is_pinned = 0 WHERE id = ?').run(post.id);
  } else {
    // Закреплённая новость всегда одна — снимаем прежнюю.
    db.prepare('UPDATE news SET is_pinned = 0').run();
    db.prepare('UPDATE news SET is_pinned = 1 WHERE id = ?').run(post.id);
  }
  res.redirect('/admin/news');
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

// Пара на другом языке — та же новость с тем же slug (по нему же ищет
// переключатель RU/EN на сайте, src/routes/news.js).
function getTwin(post) {
  return db.prepare('SELECT id, lang, is_published FROM news WHERE slug = ? AND lang <> ? AND id <> ?')
    .get(post.slug, post.lang, post.id);
}

router.get('/:id/edit', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  res.render('admin/news-edit', { post, twin: getTwin(post), media: getMedia(post.id), error: null, msg: req.query.msg || '' });
});

// Создать версию новости на другом языке автопереводом: тот же slug, та же дата,
// те же фото/видео (строки news_media копируются, файлы общие — удаление медиа
// у копии файл не трогает). Копия создаётся неопубликованной — перевод надо
// проверить глазами и поставить галочку.
router.post('/:id/translate', async (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  const existing = getTwin(post);
  if (existing) {
    return res.redirect(`/admin/news/${existing.id}/edit?msg=` + encodeURIComponent('Версия на другом языке уже есть — это она.'));
  }
  const from = post.lang === 'en' ? 'en' : 'ru';
  const to = from === 'en' ? 'ru' : 'en';
  let title;
  let content;
  try {
    [title, content] = await translateMany([post.title, post.content || ''], { from, to });
  } catch (e) {
    console.error('[news translate]', e.message);
    return res.render('admin/news-edit', {
      post, twin: null, media: getMedia(post.id), msg: '',
      error: `Не удалось перевести: ${e.message}`,
    });
  }
  const info = db.prepare(`
    INSERT INTO news (title, slug, content, is_published, lang, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(title || post.title, post.slug, content, to, post.created_at);
  const copyMedia = db.prepare('INSERT INTO news_media (news_id, type, file_path, sort_order) VALUES (?, ?, ?, ?)');
  for (const m of getMedia(post.id)) copyMedia.run(info.lastInsertRowid, m.type, m.file_path, m.sort_order);

  res.redirect(`/admin/news/${info.lastInsertRowid}/edit?msg=` + encodeURIComponent(
    to === 'en'
      ? 'Английская версия создана автопереводом. Проверь текст и поставь «Опубликовать».'
      : 'Русская версия создана автопереводом. Проверь текст и поставь «Опубликовать».'
  ));
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
