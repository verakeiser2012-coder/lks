const db = require('../../db');
const { getConnector } = require('./registry');

function getNetwork(key) {
  return db.prepare('SELECT * FROM social_networks WHERE key = ?').get(key);
}

function parseCredentials(network) {
  try {
    return JSON.parse(network.credentials || '{}');
  } catch {
    return {};
  }
}

// Итоговая подпись для конкретной сети.
// «Музыкальные» сети — международная аудитория: берём английский текст (text_en),
// а если его нет — русский текст без кириллических хэштегов. Инфоповод (news_hook)
// добавляется первой строкой к русской подписи.
function withLink(text, post) {
  const link = (post.link_url || '').trim();
  if (!link || (text || '').includes(link)) return text || '';
  return `${(text || '').replace(/[\s]+$/, '')}

${link}`;
}

function captionFor(post, network) {
  if (network && network.category === 'music') {
    if (post.text_en && post.text_en.trim()) return withLink(post.text_en, post);
    return withLink((post.text || '')
      .split(/\s+/)
      .filter((word) => !(word.startsWith('#') && /[а-яё]/i.test(word)))
      .join(' ')
      .trim(), post);
  }
  const hook = (post.news_hook || '').trim();
  if (hook) return withLink(hook + '\n\n' + (post.text || ''), post);
  return withLink(post.text || '', post);
}

async function publishTarget(post, target) {
  const network = getNetwork(target.network_key);

  if (!network || !network.enabled) {
    db.prepare(`
      UPDATE social_post_targets SET status = 'disabled', error = ?, updated_at = datetime('now') WHERE id = ?
    `).run('Сеть не подключена.', target.id);
    return;
  }

  if (network.connector === 'manual') {
    db.prepare(`
      UPDATE social_post_targets SET status = 'manual', error = '', updated_at = datetime('now') WHERE id = ?
    `).run(target.id);
    return;
  }

  const connector = getConnector(network.connector);
  const credentials = parseCredentials(network);

  try {
    const result = await connector.publish({ ...post, text: captionFor(post, network) }, credentials, network);
    db.prepare(`
      UPDATE social_post_targets SET status = 'published', published_url = ?, error = '', updated_at = datetime('now')
      WHERE id = ?
    `).run(result && result.url ? result.url : '', target.id);

    // Дополнительная публикация в историях — только там, где коннектор это умеет.
    if (post.story && connector.publishStory && target.story_status !== 'published') {
      try {
        await connector.publishStory(post, credentials, network);
        db.prepare(`UPDATE social_post_targets SET story_status = 'published', story_error = '' WHERE id = ?`).run(target.id);
      } catch (storyErr) {
        db.prepare(`UPDATE social_post_targets SET story_status = 'failed', story_error = ? WHERE id = ?`).run(
          storyErr.message || 'Ошибка публикации истории',
          target.id
        );
      }
    }
  } catch (err) {
    db.prepare(`
      UPDATE social_post_targets SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?
    `).run(err.message || 'Неизвестная ошибка', target.id);
  }
}

async function publishPost(postId) {
  const post = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(postId);
  if (!post) return;

  const targets = db
    .prepare(`SELECT * FROM social_post_targets WHERE post_id = ? AND status IN ('pending', 'failed', 'disabled')`)
    .all(postId);

  for (const target of targets) {
    await publishTarget(post, target);
  }

  const failedCount = db
    .prepare(`SELECT COUNT(*) AS c FROM social_post_targets WHERE post_id = ? AND status IN ('failed', 'disabled')`)
    .get(postId).c;

  db.prepare(`UPDATE social_posts SET status = ? WHERE id = ?`).run(
    failedCount > 0 ? 'failed' : 'published',
    postId
  );
}

// Даты в календаре вводятся и хранятся по местному времени администратора (Екатеринбург),
// а datetime('now') в SQLite — это UTC, из-за чего посты уходили на 5 часов позже.
// Сравниваем с текущим временем в нужном часовом поясе (можно переопределить через ADMIN_TZ).
function nowInAdminTz() {
  const tz = process.env.ADMIN_TZ || 'Asia/Yekaterinburg';
  // Локаль sv-SE даёт формат 'YYYY-MM-DD HH:MM:SS' — совпадает с форматом scheduled_at.
  return new Date().toLocaleString('sv-SE', { timeZone: tz });
}

async function publishDuePosts() {
  const duePosts = db
    .prepare(`SELECT id FROM social_posts WHERE status = 'scheduled' AND approved = 1 AND scheduled_at <= ?`)
    .all(nowInAdminTz());
  for (const row of duePosts) {
    await publishPost(row.id);
  }
}

async function refreshStats(targetId) {
  const target = db.prepare('SELECT * FROM social_post_targets WHERE id = ?').get(targetId);
  if (!target || target.status !== 'published') return;

  const network = getNetwork(target.network_key);
  if (!network) return;

  const connector = getConnector(network.connector);
  if (!connector.getStats) return;

  const credentials = parseCredentials(network);
  try {
    const stats = await connector.getStats(target, credentials);
    if (stats) {
      db.prepare(`
        UPDATE social_post_targets SET stats = ?, stats_updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(stats), targetId);
    }
  } catch {
    // Обновление статистики не критично — молча пропускаем сбой (например, невалидный токен).
  }
}

module.exports = { publishPost, publishDuePosts, refreshStats };
