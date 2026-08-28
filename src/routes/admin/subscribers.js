const express = require('express');
const db = require('../../db');

const router = express.Router();

function listSubscribers() {
  return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
}

router.get('/', (req, res) => {
  res.render('admin/subscribers', { subscribers: listSubscribers() });
});

// Экспорт в CSV — пригодится для рассылок
router.get('/export.csv', (req, res) => {
  const rows = listSubscribers();
  const lines = ['email;created_at'];
  for (const r of rows) {
    lines.push(r.email + ';' + r.created_at);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  // BOM, чтобы Excel открыл кириллицу и разделители корректно
  res.send('\ufeff' + lines.join('\r\n'));
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
  res.redirect('/admin/subscribers');
});

module.exports = router;
