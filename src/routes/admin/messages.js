const express = require('express');
const db = require('../../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('admin/messages', {
    messages: db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all(),
  });
});

router.post('/:id/read', (req, res) => {
  // Переключаем, а не только помечаем: прочитанное иногда надо вернуть
  // в работу, и снимать отметку должно быть так же легко, как ставить.
  db.prepare('UPDATE messages SET is_read = 1 - is_read WHERE id = ?').run(req.params.id);
  res.redirect('/admin/messages');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.redirect('/admin/messages');
});

module.exports = router;
