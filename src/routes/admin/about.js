const express = require('express');
const db = require('../../db');
const { uploadGalleryFile } = require('../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../services/media');

const router = express.Router();

router.get('/', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'about_text'").get();
  const media = db.prepare('SELECT * FROM about_media ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/about', { aboutText: row ? row.value : '', media, error: null, saved: false });
});

router.post('/', (req, res) => {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('about_text', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(req.body.aboutText || '');

  const media = db.prepare('SELECT * FROM about_media ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/about', { aboutText: req.body.aboutText || '', media, error: null, saved: true });
});

router.post('/media', uploadGalleryFile.single('file'), (req, res) => {
  const { type, title, sortOrder } = req.body;

  if (!isValidMediaUpload(req)) {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'about_text'").get();
    const media = db.prepare('SELECT * FROM about_media ORDER BY sort_order ASC, created_at DESC').all();
    return res.render('admin/about', {
      aboutText: row ? row.value : '',
      media,
      error: 'Выберите тип и файл.',
      saved: false,
    });
  }

  db.prepare(`
    INSERT INTO about_media (type, title, file_path, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(type, title || '', mediaFilePath(req), Number(sortOrder) || 0);

  res.redirect('/admin/about');
});

router.post('/media/:id/delete', (req, res) => {
  db.prepare('DELETE FROM about_media WHERE id = ?').run(req.params.id);
  res.redirect('/admin/about');
});

module.exports = router;
