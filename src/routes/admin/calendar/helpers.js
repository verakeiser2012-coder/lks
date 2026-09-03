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
 * Что уже вышло — последние публикации со ссылками и списком площадок,
 * куда пост НЕ попал.
 *
 * Пропуски здесь важнее самих публикаций: по ним видно, что можно
 * перепостить. Без этого списка человек, открывший календарь, знает
 * только про будущее и не знает, что уже лежит в ленте.
 */
function listRecentlyPublished(limit = 12) {
  const posts = db
    .prepare("SELECT * FROM social_posts WHERE status = 'published' ORDER BY scheduled_at DESC LIMIT ?")
    .all(limit);
  if (posts.length === 0) return [];

  const targets = db
    .prepare('SELECT * FROM social_post_targets WHERE post_id IN (' + posts.map(() => '?').join(',') + ')')
    .all(...posts.map((p) => p.id));

  // Считаем пропуски только по живым площадкам: предлагать перепост
  // в отключённую сеть — совет, которым нельзя воспользоваться.
  const live = db
    .prepare('SELECT key, label, category FROM social_networks WHERE enabled = 1')
    .all();

  // Площадки, где без видео делать нечего. Совет «выложите статью в TikTok»
  // не просто бесполезен — из-за него перестают читать всю строку.
  const VIDEO_ONLY = new Set(['youtube', 'rutube']);
  const isVideoOnly = (n) => VIDEO_ONLY.has(n.key) || n.category === 'shorts';

  return posts.map((post) => {
    const mine = targets.filter((t) => t.post_id === post.id);
    const went = new Set(mine.map((t) => t.network_key));
    const hasVideo = post.media_type === 'video';
    return {
      ...post,
      targets: mine,
      missing: live.filter((n) => !went.has(n.key) && (hasVideo || !isVideoOnly(n))),
    };
  });
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
  listRecentlyPublished,
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
