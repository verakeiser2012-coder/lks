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
 * Архив — посты, убранные с глаз, но не удалённые. Свежие сверху:
 * достают обычно то, что отложили недавно.
 */
function listArchived() {
  return db
    .prepare("SELECT * FROM social_posts WHERE status = 'archived' ORDER BY scheduled_at DESC")
    .all();
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
    // Архив в сетке месяца не показываем: он для того и нужен, чтобы убрать с глаз.
    .prepare("SELECT * FROM social_posts WHERE scheduled_at >= ? AND scheduled_at < ? AND status <> 'archived' ORDER BY scheduled_at ASC")
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

/**
 * Сетка Instagram: что уже лежит в ленте и что запланировано, подряд по датам.
 *
 * Берём не только посты с фото из календаря, но и всё, что опубликовано
 * мимо него и записано руками через «Уже в ленте»: иначе сетка показывала бы
 * только планы, а реальная лента — она же и есть контекст для этих планов.
 * У ручной записи картинки может не быть — тогда плитка текстовая, но на месте.
 */
function listInstagramGridPosts() {
  return db
    .prepare(`
      SELECT p.*, t.published_url, t.network_key
      FROM social_posts p
      JOIN social_post_targets t ON t.post_id = p.id
      WHERE t.network_key IN ('instagram', 'instagram-djlevka')
        AND p.status <> 'archived'
        AND (p.media_path != '' OR p.thumb_url != '' OR p.status = 'published')
      ORDER BY p.scheduled_at ASC
    `)
    .all();
}

/**
 * Ленты площадок — что реально лежит в каждой соцсети, по одной полосе на сеть.
 *
 * «Уже в ленте» показывает публикации вперемешку; здесь тот же материал
 * разложен по площадкам, чтобы одним взглядом увидеть: в Telegram густо,
 * в Rutube три ролика за месяц, в Одноклассниках пусто. Берём и то, что
 * календарь публиковал сам, и то, что дописал импорт или ручная запись.
 */
function listFeedsByNetwork(limit = 12) {
  const settings = require('../../../utils/settings').getSettings();
  const networks = db
    .prepare(`
      SELECT * FROM social_networks WHERE enabled = 1
      ORDER BY CASE category WHEN 'music' THEN 0 WHEN 'shorts' THEN 1 ELSE 2 END, label
    `)
    .all();
  const items = db.prepare(`
    SELECT p.id, p.text, p.scheduled_at, p.media_type, p.thumb_url, p.media_path, p.sources,
           t.published_url, t.story_status
    FROM social_post_targets t
    JOIN social_posts p ON p.id = t.post_id
    WHERE t.network_key = ? AND t.status = 'published'
    ORDER BY p.scheduled_at DESC
    LIMIT ?
  `);
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN t.status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN p.status = 'scheduled' THEN 1 ELSE 0 END) AS queued,
      MAX(CASE WHEN t.status = 'published' THEN p.scheduled_at END) AS last_at
    FROM social_post_targets t
    JOIN social_posts p ON p.id = t.post_id
    WHERE t.network_key = ?
  `);

  // Откуда читаем ленту без входа. Остальные площадки из России не отдают
  // ничего — их ленту ведём руками, а здесь показываем, что записано.
  const IMPORTED = { telegram: 'превью канала', youtube: 'RSS канала', rutube: 'открытый API', vk: 'API, нужен сервисный ключ' };
  // Прямая ссылка на живую ленту: чтобы рядом с тем, что знает календарь,
  // в один клик открыть саму площадку и сверить.
  const LIVE = { 'instagram-djlevka': 'https://instagram.com/djlevka', news: '/news' };

  return networks.map((n) => {
    const c = counts.get(n.key) || {};
    return {
      ...n,
      items: items.all(n.key, limit),
      published: c.published || 0,
      queued: c.queued || 0,
      lastAt: c.last_at || '',
      liveUrl: LIVE[n.key] || String(settings[`${n.key}_url`] || ''),
      importedVia: IMPORTED[n.key] || '',
    };
  });
}

function normalizeScheduledAt(value) {
  let normalized = value.replace('T', ' ');
  if (normalized.length === 16) normalized += ':00';
  return normalized;
}

module.exports = {
  listArchived,
  listRecentlyPublished,
  listPendingApproval,
  listNetworks,
  listUpcoming,
  listEventsForMonth,
  listPostsForMonth,
  getPost,
  getTargets,
  listInstagramGridPosts,
  listFeedsByNetwork,
  normalizeScheduledAt,
};
