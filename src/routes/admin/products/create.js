const db = require('../../../db');
const { slugify } = require('../../../utils/slugify');
const { resolveCategoryId } = require('./helpers');

function newForm(req, res) {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('admin/product-form', { product: null, categories, error: null });
}

function create(req, res) {
  const { name, description, price, categoryId, newCategory, stock, isActive } = req.body;
  if (!name || !price) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    return res.render('admin/product-form', {
      product: req.body,
      categories,
      error: 'Заполните название и цену.',
    });
  }

  const slug = slugify(name);
  const image = req.file ? `/uploads/${req.file.filename}` : '';
  const resolvedCategoryId = resolveCategoryId(categoryId, newCategory);

  db.prepare(`
    INSERT INTO products (name, slug, description, price, category_id, image, stock, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    slug,
    description || '',
    Number(price),
    resolvedCategoryId,
    image,
    Number(stock) || 0,
    isActive ? 1 : 0
  );

  res.redirect('/admin/products');
}

module.exports = { newForm, create };
