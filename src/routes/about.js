const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'about_text'").get();
  const aboutText = row ? row.value : '';
  const media = db.prepare('SELECT * FROM about_media ORDER BY sort_order ASC, created_at DESC').all();
  res.render('about', { aboutText, media });
});

module.exports = router;
