const express = require('express');
const db = require('../db');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 8')
    .all();
  // Только русские записи: без фильтра по языку на русскую главную
  // вылезала английская, написанная для /en/news.
  //
  // Закрепление здесь намеренно не учитываем, в отличие от раздела новостей.
  // Главная показывает свежее, и закреплённая запись полугодовой давности
  // заняла бы первое место как самая новая. Разбирать по важности — работа
  // раздела, куда ведёт ссылка «Все новости».
  const news = db
    .prepare('SELECT * FROM news WHERE is_published = 1 AND lang = ? ORDER BY created_at DESC LIMIT 4')
    .all('ru');
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
