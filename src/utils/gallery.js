const db = require('../db');

function getGalleryItems(pageKey) {
  return db
    .prepare('SELECT * FROM gallery_items WHERE page_key = ? ORDER BY sort_order ASC, created_at DESC')
    .all(pageKey);
}

module.exports = { getGalleryItems };
