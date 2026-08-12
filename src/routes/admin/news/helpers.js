const db = require('../../../db');

function getPost(id) {
  return db.prepare('SELECT * FROM news WHERE id = ?').get(id);
}

function getMedia(postId) {
  return db
    .prepare('SELECT * FROM news_media WHERE news_id = ? ORDER BY sort_order ASC, created_at DESC')
    .all(postId);
}

module.exports = { getPost, getMedia };
