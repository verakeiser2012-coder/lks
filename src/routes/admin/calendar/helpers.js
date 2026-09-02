const db = require('../../../db');

function listNetworks() {
  // Музыкальные площадки — первыми, внутри групп по алфавиту.
  return db
    .prepare(`
      SELECT * FROM social_networks
      ORDER BY CASE category WHEN 'music' THEN 0 WHEN 'shorts' THEN 1 ELSE 2 END, label
    `)
    .all();
}

function listUpcoming(days) {
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Yekaterinburg' });
  const until = new Date(Date.now() + days * 24 * 3600 * 1000).toLocaleString('sv-SE', { timeZone: 'Asia/Yekaterinburg' });
  return db
    .prepare("SELECT * FROM social_posts WHERE status = 'scheduled' AND scheduled_at >= ? AND scheduled_at <= ? ORDER BY scheduled_at ASC")
    .all(now, until);
}

/**
 * Всё, что ждёт подтверждения. Не ограничиваем неделей: затор обычно
 * копится дальше, и подтверждать удобнее сразу пачкой.
 */
function listPendingApproval() {
  return db
    .prepare("SELECT * FROM social_posts WHERE status = 'scheduled' AND approved = 0 ORDER BY scheduled_at ASC")
    .all();
}

function listEventsForMonth(month) {
  return db.prepare('SELECT * FROM calendar_events WHERE month = ? ORDER BY day, title').all(month);
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
  return db
    .prepare(`
      SELECT t.*, n.connector AS network_connector, n.label AS network_label
      FROM social_post_targets t
      LEFT JOIN social_networks n ON n.key = t.network_key
      WHERE t.post_id = ?
    `)
    .all(postId);
}

function listInstagramGridPosts() {
  return db
    .prepare(`
      SELECT p.*
      FROM social_posts p
      JOIN social_post_targets t ON t.post_id = p.id
      WHERE t.network_key = 'instagram' AND p.media_path != ''
      ORDER BY p.scheduled_at ASC
    `)
    .all();
}

function normalizeScheduledAt(value) {
  let normalized = value.replace('T', ' ');
  if (normalized.length === 16) normalized += ':00';
  return normalized;
}

module.exports = {
  listPendingApproval,
  listNetworks,
  listUpcoming,
  listEventsForMonth,
  listPostsForMonth,
  getPost,
  getTargets,
  listInstagramGridPosts,
  normalizeScheduledAt,
};
