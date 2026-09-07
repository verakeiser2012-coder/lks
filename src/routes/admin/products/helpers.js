const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');

function resolveCategoryId(categoryId, newCategory) {
  if (newCategory && newCategory.trim()) {
    const name = newCategory.trim();
    const slug = slugify(name);
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (existing) return existing.id;
    const info = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
    return info.lastInsertRowid;
  }
  return categoryId ? Number(categoryId) : null;
}

// Треки для выпадающего списка «к какому треку вещь»: с названием релиза,
// чтобы «soundstates (Soundstates)» и «flowers (Flowers)» не путались.
function listTracksForForm() {
  return db
    .prepare(`
      SELECT t.id, t.title, t.release_id, r.title AS release_title
      FROM tracks t LEFT JOIN releases r ON r.id = t.release_id
      ORDER BY r.sort_order ASC, t.sort_order ASC, t.id ASC
    `)
    .all();
}

module.exports = { resolveCategoryId, listTracksForForm };
