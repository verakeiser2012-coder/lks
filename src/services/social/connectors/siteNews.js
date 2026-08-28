const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');

// «Соцсеть»-новости: публикация поста календаря создаёт новость на сайте.
const fields = [];

function stripHashtagLines(text) {
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      // строка, состоящая только из хэштегов — в новости сайта не нужна
      return !t.split(/\s+/).every((w) => w.startsWith('#'));
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function publish(post) {
  const text = stripHashtagLines((post.text || '').trim());
  if (!text && !post.media_path) {
    throw new Error('Пустой пост — нечего публиковать в новости.');
  }

  const hook = (post.news_hook || '').trim();
  const firstLine = (hook || text.split('\n')[0] || 'Новость').trim();
  const title = firstLine.length > 90 ? `${firstLine.slice(0, 87)}…` : firstLine;

  let content = text;
  if (content.startsWith(firstLine)) {
    content = content.slice(firstLine.length).trim();
  }

  let slug = slugify(title);
  if (db.prepare('SELECT id FROM news WHERE slug = ?').get(slug)) {
    slug = `${slug}-${post.id || Date.now()}`;
  }

  const info = db.prepare(`
    INSERT INTO news (title, slug, content, is_published, lang) VALUES (?, ?, ?, 1, 'ru')
  `).run(title, slug, content);

  if (post.media_path) {
    db.prepare(`
      INSERT INTO news_media (news_id, type, file_path, sort_order) VALUES (?, ?, ?, 0)
    `).run(info.lastInsertRowid, post.media_type === 'video' ? 'video' : 'photo', post.media_path);
  }

  return { url: `https://levkeiser.com/news/${slug}` };
}

module.exports = { key: 'news', label: 'Новости сайта', fields, publish };
