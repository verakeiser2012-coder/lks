const db = require('../db');

function getBanners(pageKey) {
  return db
    .prepare('SELECT * FROM promo_banners WHERE page_key = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(pageKey);
}

module.exports = { getBanners };
