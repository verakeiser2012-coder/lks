const db = require('../../../db');

function listNetworks() {
  return db.prepare('SELECT * FROM social_networks ORDER BY label').all();
}

function listPostsForMonth(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01 00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${pad(nextMonth)}-01 00:00:00`;
  return db
    .prepare('SELECT * FROM social_posts WHERE scheduled_at >= ? AND scheduled_at < ? ORDER BY scheduled_at ASC')
    .all(start, end);
}

function getPost(id) {
  return db.prepare('SELECT * FROM social_posts WHERE id = ?').get(id);
}

function getTargets(postId) {
  return db.prepare('SELECT * FROM social_post_targets WHERE post_id = ?').all(postId);
}

function normalizeScheduledAt(value) {
  let normalized = value.replace('T', ' ');
  if (normalized.length === 16) normalized += ':00';
  return normalized;
}

module.exports = { listNetworks, listPostsForMonth, getPost, getTargets, normalizeScheduledAt };
