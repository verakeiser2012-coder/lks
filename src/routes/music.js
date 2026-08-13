const express = require('express');
const db = require('../db');
const { groupLinks } = require('../utils/links');

const router = express.Router();

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'music_intro'").get();
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'music' ORDER BY sort_order ASC, id ASC"
  ).all();
  const featuredRows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('music_featured_title', 'music_featured_note', 'music_featured_url')")
    .all();
  const featuredMap = {};
  for (const row of featuredRows) featuredMap[row.key] = row.value;

  res.render('music', {
    intro: introRow ? introRow.value : '',
    groups: groupLinks(links),
    featured: {
      title: featuredMap.music_featured_title || '',
      note: featuredMap.music_featured_note || '',
      url: featuredMap.music_featured_url || '',
    },
  });
});

module.exports = router;
