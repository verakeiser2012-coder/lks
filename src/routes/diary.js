const express = require('express');
const crypto = require('crypto');
const { getBanners } = require('../utils/banners');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db
    .prepare('SELECT * FROM diary_posts WHERE is_published = 1 ORDER BY created_at DESC')
    .all();
  res.render('diary', {
    banners: getBanners('diary'), posts });
});

router.get('/:slug', (req, res) => {
  const post = db
    .prepare('SELECT * FROM diary_posts WHERE slug = ? AND is_published = 1')
    .get(req.params.slug);
  if (!post) {
    return res.status(404).render('404');
  }
  const media = db
    .prepare("SELECT * FROM gallery_items WHERE page_key = ? ORDER BY sort_order ASC, created_at ASC")
    .all('diary-' + post.slug);
  const otherPosts = db
    .prepare('SELECT id, slug, title, cover_image, created_at FROM diary_posts WHERE is_published = 1 AND id != ? ORDER BY created_at DESC LIMIT 3')
    .all(post.id);
  const cover = post.cover_image || (media.find((m) => m.type === 'photo') || {}).file_path || '';
  const marks = db
    .prepare('SELECT COUNT(*) AS n, AVG(mark) AS avg FROM diary_marks WHERE post_id = ?')
    .get(post.id);
  res.render('diary-detail', {
    post,
    marksCount: marks.n || 0,
    marksAvg: marks.n ? Math.round(marks.avg * 10) / 10 : 0,
    media,
    otherPosts,
    title: post.title,
    pageImage: cover,
    pageDescription: post.excerpt || String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
    pageType: 'article',
  });
});

// Оценка записи по школьной шкале. voter — случайный id из localStorage,
// вместе с солёным IP это отсекает накрутку по F5. Повторная оценка заменяет
// прежнюю: передумать нормально, накрутить не выйдет.
router.post('/:slug/mark', (req, res) => {
  const post = db.prepare('SELECT id FROM diary_posts WHERE slug = ? AND is_published = 1').get(req.params.slug);
  const mark = Number((req.body && req.body.mark) || 0);
  const voter = String((req.body && req.body.voter) || '').slice(0, 64);
  if (!post || ![2, 3, 4, 5].includes(mark) || !/^[a-z0-9-]{8,64}$/i.test(voter)) {
    return res.status(400).json({ ok: false });
  }
  const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.ip;
  const key = crypto.createHash('sha1').update(`${voter}|${ip}`).digest('hex').slice(0, 24);
  db.prepare(`INSERT INTO diary_marks (post_id, voter, mark) VALUES (?, ?, ?)
              ON CONFLICT(post_id, voter) DO UPDATE SET mark = excluded.mark`).run(post.id, key, mark);
  const row = db.prepare('SELECT COUNT(*) AS n, AVG(mark) AS avg FROM diary_marks WHERE post_id = ?').get(post.id);
  res.json({ ok: true, count: row.n, avg: Math.round(row.avg * 10) / 10 });
});

module.exports = router;
