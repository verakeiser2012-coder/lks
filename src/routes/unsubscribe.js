const express = require('express');
const db = require('../db');
const { unsubscribeToken } = require('../services/newsletter');

const router = express.Router();

router.get('/', (req, res) => {
  const email = String(req.query.e || '').trim().toLowerCase();
  const token = String(req.query.t || '');
  let ok = false;
  if (email && token && token === unsubscribeToken(email)) {
    const result = db.prepare('DELETE FROM subscribers WHERE email = ?').run(email);
    ok = result.changes > 0 || true; // повторный клик по ссылке — тоже успех
  }
  res.render('unsubscribe', { ok, email });
});

module.exports = router;
