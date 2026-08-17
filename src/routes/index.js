const express = require('express');
const db = require('../db');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 8')
    .all();
  const news = db
    .prepare('SELECT * FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 4')
    .all();
  const covers = db.prepare(`
    SELECT news_id, file_path FROM news_media
    WHERE type = 'photo' AND id IN (
      SELECT MIN(id) FROM news_media WHERE type = 'photo' GROUP BY news_id
    )
  `).all();
  const coverByNewsId = {};
  covers.forEach((c) => { coverByNewsId[c.news_id] = c.file_path; });
  res.render('index', { products, news, coverByNewsId, galleryItems: getGalleryItems('home') });
});

module.exports = router;
