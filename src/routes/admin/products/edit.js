const db = require('../../../db');
const { resolveCategoryId } = require('./helpers');

function editForm(req, res) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).render('404');
  }
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const collections = db.prepare('SELECT * FROM collections ORDER BY name').all();
  const releases = db.prepare('SELECT * FROM releases ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/product-form', { product, categories, collections, releases, error: null });
}

function update(req, res) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).render('404');
  }

  const { name, description, price, categoryId, newCategory, collectionId, releaseId, stock, isActive } = req.body;
  if (!name || !price) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    const collections = db.prepare('SELECT * FROM collections ORDER BY name').all();
    const releases = db.prepare('SELECT * FROM releases ORDER BY sort_order ASC, created_at DESC').all();
    return res.render('admin/product-form', {
      product: { ...product, ...req.body },
      categories,
      collections,
      releases,
      error: 'Заполните название и цену.',
    });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : product.image;
  const resolvedCategoryId = resolveCategoryId(categoryId, newCategory);

  db.prepare(`
    UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, collection_id = ?, release_id = ?, image = ?, stock = ?, is_active = ?
    WHERE id = ?
  `).run(
    name,
    description || '',
    Number(price),
    resolvedCategoryId,
    collectionId ? Number(collectionId) : null,
    releaseId ? Number(releaseId) : null,
    image,
    Number(stock) || 0,
    isActive ? 1 : 0,
    product.id
  );

  res.redirect('/admin/products');
}

module.exports = { editForm, update };
