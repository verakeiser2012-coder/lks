const express = require('express');
const db = require('../../db');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

// Тексты блоков раздела «Стиль», кроме вводного (он в /admin/pages/style).
const TEXT_KEYS = {
  style_looks_intro: 'Образы — подпись под заголовком',
  style_walks_intro: 'Проходка — подпись под заголовком',
  style_wear_intro: 'Что ношу — подпись под заголовком',
  style_redhead_note: 'Рыжий — абзац',
  style_film_intro: 'Кино — подпись под заголовком',
};

function loadItems() {
  return db.prepare('SELECT * FROM style_items ORDER BY sort_order ASC, created_at ASC').all();
}

function loadTexts() {
  const texts = {};
  for (const key of Object.keys(TEXT_KEYS)) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    texts[key] = row ? row.value : '';
  }
  return texts;
}

function loadVotes() {
  return db.prepare(`
    SELECT gallery_items.id, gallery_items.title, gallery_items.file_path, COUNT(look_votes.id) AS votes
    FROM gallery_items LEFT JOIN look_votes ON look_votes.item_id = gallery_items.id
    WHERE gallery_items.page_key = 'style'
    GROUP BY gallery_items.id ORDER BY votes DESC, gallery_items.sort_order ASC
  `).all();
}

router.get('/', (req, res) => {
  res.render('admin/style-items', { items: loadItems(), texts: loadTexts(), textLabels: TEXT_KEYS, votes: loadVotes(), saved: false });
});

router.post('/texts', (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const key of Object.keys(TEXT_KEYS)) upsert.run(key, req.body[key] || '');
  res.render('admin/style-items', { items: loadItems(), texts: loadTexts(), textLabels: TEXT_KEYS, votes: loadVotes(), saved: true });
});

router.get('/new', (req, res) => {
  res.render('admin/style-item-form', { item: null, error: null });
});

function fields(body) {
  return {
    name: body.name || '',
    story: body.story || '',
    link_url: body.linkUrl || '',
    link_label: body.linkLabel || '',
    sort_order: Number(body.sortOrder) || 0,
    is_published: body.isPublished ? 1 : 0,
  };
}

router.post('/', uploadImage.single('photo'), (req, res) => {
  const f = fields(req.body);
  if (!f.name) return res.render('admin/style-item-form', { item: req.body, error: 'Укажите название вещи.' });
  const photo = req.file ? `/uploads/${req.file.filename}` : '';
  db.prepare(`
    INSERT INTO style_items (name, story, photo, link_url, link_label, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(f.name, f.story, photo, f.link_url, f.link_label, f.sort_order, f.is_published);
  res.redirect('/admin/style-items');
});

router.get('/:id/edit', (req, res) => {
  const item = db.prepare('SELECT * FROM style_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('404');
  res.render('admin/style-item-form', { item, error: null });
});

router.post('/:id', uploadImage.single('photo'), (req, res) => {
  const item = db.prepare('SELECT * FROM style_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('404');
  const f = fields(req.body);
  if (!f.name) return res.render('admin/style-item-form', { item: { ...item, ...req.body }, error: 'Укажите название вещи.' });
  const photo = req.file ? `/uploads/${req.file.filename}` : item.photo;
  db.prepare(`
    UPDATE style_items SET name = ?, story = ?, photo = ?, link_url = ?, link_label = ?, sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(f.name, f.story, photo, f.link_url, f.link_label, f.sort_order, f.is_published, item.id);
  res.redirect('/admin/style-items');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM style_items WHERE id = ?').run(req.params.id);
  res.redirect('/admin/style-items');
});

module.exports = router;
