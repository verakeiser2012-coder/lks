const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db
    .prepare('SELECT * FROM diary_posts WHERE is_published = 1 ORDER BY created_at DESC')
    .all();
  res.render('diary', { posts });
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
  res.render('diary-detail', {
    post,
    media,
    otherPosts,
    title: post.title,
    pageImage: cover,
    pageDescription: post.excerpt || String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
    pageType: 'article',
  });
});

module.exports = router;
