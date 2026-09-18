const express = require('express');
const db = require('../db');
const { groupLinks, socialLinksGroup } = require('../utils/links');
const { getBanners } = require('../utils/banners');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

function setting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

// Проходки по годам: игра «угадай год» берёт год из даты съёмки.
// Кадры без даты в игру не попадают, но в ленте показываются.
function loadWalks() {
  return db.prepare(`
    SELECT * FROM gallery_items WHERE page_key = 'style-walks'
    ORDER BY CASE WHEN shot_date = '' THEN 1 ELSE 0 END, shot_date ASC, sort_order ASC
  `).all().map((item) => ({ ...item, year: /^\d{4}/.test(item.shot_date || '') ? item.shot_date.slice(0, 4) : '' }));
}

router.get('/', (req, res) => {
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'style' ORDER BY sort_order ASC, id ASC"
  ).all();
  const walks = loadWalks();
  const years = [...new Set(walks.map((w) => w.year).filter(Boolean))];
  res.render('style', {
    intro: setting('style_intro'),
    texts: {
      walks: setting('style_walks_intro'),
      redhead: setting('style_redhead_note'),
      film: setting('style_film_intro'),
      ads: setting('style_ads_intro'),
      inspires: setting('style_inspires_intro'),
      portfolio: setting('style_portfolio_intro'),
    },
    walks,
    years,
    inspireItems: getGalleryItems('style-inspires'),
    adBrands: setting('style_ads_brands'),
    // Свои ссылки страницы (если есть) + соцсети из раздела «Соцсети».
    groups: groupLinks(links).concat([socialLinksGroup('Где ещё смотреть', { first: 'shorts', lang: req.lang })]),
    banners: getBanners('style'),
  });
});

module.exports = router;
