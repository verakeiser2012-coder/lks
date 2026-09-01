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

  const { name, description, price, categoryId, newCategory, collectionId, releaseId, stock, isActive, isDigital } = req.body;
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

  const imageFile = req.files && req.files.image && req.files.image[0];
  const digitalFile = req.files && req.files.digitalFile && req.files.digitalFile[0];
  const image = imageFile ? `/uploads/${imageFile.filename}` : product.image;
  const resolvedCategoryId = resolveCategoryId(categoryId, newCategory);

  // Новый файл заменяет прежний; если не приложили — оставляем что было,
  // иначе редактирование названия сносило бы товар с уже выданными ссылками.
  db.prepare(`
    UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, collection_id = ?, release_id = ?, image = ?, stock = ?, is_active = ?, is_digital = ?, digital_file = ?, digital_filename = ?, digital_size = ?
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
    isDigital ? 1 : 0,
    digitalFile ? digitalFile.filename : product.digital_file,
    digitalFile ? digitalFile.originalname : product.digital_filename,
    digitalFile ? digitalFile.size : product.digital_size,
    product.id
  );

  res.redirect('/admin/products');
}

module.exports = { editForm, update };
