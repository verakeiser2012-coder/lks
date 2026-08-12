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

module.exports = { resolveCategoryId };
