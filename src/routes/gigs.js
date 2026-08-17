const express = require('express');
const db = require('../db');
const { groupLinks } = require('../utils/links');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

const GENRES = ['Танцевальная музыка', 'Lounge', 'Lo-fi'];

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'gigs_intro'").get();
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'gigs' ORDER BY sort_order ASC, id ASC"
  ).all();
  res.render('gigs', {
    intro: introRow ? introRow.value : '',
    groups: groupLinks(links),
    genres: GENRES,
    galleryItems: getGalleryItems('gigs'),
  });
});

module.exports = router;
