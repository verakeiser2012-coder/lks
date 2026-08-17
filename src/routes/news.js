const express = require('express');
const db = require('../db');
const { getBanners } = require('../utils/banners');

function createNewsRouter(lang) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const posts = db
      .prepare('SELECT * FROM news WHERE is_published = 1 AND lang = ? ORDER BY created_at DESC')
      .all(lang);
    const covers = db.prepare(`
      SELECT news_id, file_path FROM news_media
      WHERE type = 'photo' AND id IN (
        SELECT MIN(id) FROM news_media WHERE type = 'photo' GROUP BY news_id
      )
    `).all();
    const coverByNewsId = {};
    covers.forEach((c) => { coverByNewsId[c.news_id] = c.file_path; });

    res.render('news', {
      posts,
      coverByNewsId,
      banners: getBanners('news'),
      lang,
    });
  });

  router.get('/:slug', (req, res) => {
    const post = db
      .prepare('SELECT * FROM news WHERE slug = ? AND lang = ? AND is_published = 1')
      .get(req.params.slug, lang);
    if (!post) {
      return res.status(404).render('404');
    }
    const media = db
      .prepare('SELECT * FROM news_media WHERE news_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(post.id);
    res.render('news-detail', { post, media });
  });

  return router;
}

module.exports = { createNewsRouter };
