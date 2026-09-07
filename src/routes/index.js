const express = require('express');
const db = require('../db');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

// Анонс подкаста на главной. Поля редактируются в /admin/pages/home.
// Пустое название — блок не показываем (вместо него ничего: пустой анонс хуже отсутствия).
const PODCAST_KEYS = ['podcast_title', 'podcast_guest', 'podcast_note', 'podcast_date', 'podcast_url', 'podcast_cover'];

function loadPodcast() {
  const rows = db
    .prepare(`SELECT key, value FROM settings WHERE key IN (${PODCAST_KEYS.map(() => '?').join(',')})`)
    .all(...PODCAST_KEYS);
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    title: map.podcast_title || '',
    guest: map.podcast_guest || '',
    note: map.podcast_note || '',
    date: map.podcast_date || '',
    url: map.podcast_url || '',
    cover: map.podcast_cover || '',
  };
}

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

  // Вокруг подкаста: вещь, которая родилась из него, и записи дневника.
  const podcast = loadPodcast();
  const podcastProduct = db
    .prepare("SELECT id, name, slug, price, image FROM products WHERE is_active = 1 AND slug = 'aromaticheskaya-tabletka-grusha-lev'")
    .get();
  const diaryPosts = db
    .prepare('SELECT id, title, slug, excerpt, cover_image, created_at FROM diary_posts WHERE is_published = 1 ORDER BY created_at DESC LIMIT 3')
    .all();

  // Рыжие — на главную, а не в хвост меню: единственный раздел, который
  // удивляет чужого человека, и единственный, куда уже ведёт статья в Дзене.
  const redheadIntroRow = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  const redheads = db
    .prepare('SELECT name, role, photo FROM redhead_spotlights WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 4')
    .all();

  // Вещи к трекам: в карточке на главной подписываем, к какому релизу вещь.
  const releaseTitles = {};
  for (const r of db.prepare('SELECT id, title, slug FROM releases').all()) releaseTitles[r.id] = r;

  res.render('index', {
    products,
    releaseTitles,
    news,
    coverByNewsId,
    podcast,
    podcastProduct,
    diaryPosts,
    redheadIntro: redheadIntroRow ? redheadIntroRow.value : '',
    redheads,
    galleryItems: getGalleryItems('home'),
  });
});

module.exports = router;
