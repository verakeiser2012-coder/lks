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
    const result = await connector.publish(post, credentials);
    db.prepare(`
      UPDATE social_post_targets SET status = 'published', published_url = ?, error = '', updated_at = datetime('now')
      WHERE id = ?
    `).run(result && result.url ? result.url : '', target.id);
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

async function publishDuePosts() {
  const duePosts = db
    .prepare(`SELECT id FROM social_posts WHERE status = 'scheduled' AND scheduled_at <= datetime('now')`)
    .all();
  for (const row of duePosts) {
    await publishPost(row.id);
  }
}

module.exports = { publishPost, publishDuePosts };
