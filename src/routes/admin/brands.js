const express = require('express');
const db = require('../../db');

const router = express.Router();

router.get('/', (req, res) => {
  const requests = db.prepare('SELECT * FROM brand_requests ORDER BY created_at DESC').all();
  res.render('admin/brands', { requests });
});

router.post('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE brand_requests SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/brands');
});

module.exports = router;
