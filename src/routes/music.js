const express = require('express');
const db = require('../db');
const { groupLinks } = require('../utils/links');

const router = express.Router();

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'music_intro'").get();
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'music' ORDER BY sort_order ASC, id ASC"
  ).all();
  res.render('music', { intro: introRow ? introRow.value : '', groups: groupLinks(links) });
});

module.exports = router;
