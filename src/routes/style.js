const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { groupLinks } = require('../utils/links');
const { getBanners } = require('../utils/banners');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

function setting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

// Образы с числом голосов. Голосуют за кадр из галереи: «этот образ — на следующую съёмку».
function loadLooks() {
  return db.prepare(`
    SELECT gallery_items.*, COUNT(look_votes.id) AS votes
    FROM gallery_items LEFT JOIN look_votes ON look_votes.item_id = gallery_items.id
    WHERE gallery_items.page_key = 'style'
    GROUP BY gallery_items.id
    ORDER BY gallery_items.sort_order ASC, gallery_items.created_at DESC
  `).all();
}

// Проходки по годам: игра «угадай год» берёт год из даты съёмки.
// Кадры без даты в игру не попадают, но в ленте показываются.
function loadWalks() {
  return db.prepare(`
    SELECT * FROM gallery_items WHERE page_key = 'style-walks'
    ORDER BY CASE WHEN shot_date = '' THEN 1 ELSE 0 END, shot_date ASC, sort_order ASC
  `).all().map((item) => ({ ...item, year: /^\d{4}/.test(item.shot_date || '') ? item.shot_date.slice(0, 4) : '' }));
}

router.get('/', (req, res) => {
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'style' ORDER BY sort_order ASC, id ASC"
  ).all();
  const walks = loadWalks();
  const years = [...new Set(walks.map((w) => w.year).filter(Boolean))];
  res.render('style', {
    intro: setting('style_intro'),
    texts: {
      looks: setting('style_looks_intro'),
      walks: setting('style_walks_intro'),
      wear: setting('style_wear_intro'),
      redhead: setting('style_redhead_note'),
      film: setting('style_film_intro'),
    },
    looks: loadLooks(),
    walks,
    years,
    wearItems: db.prepare('SELECT * FROM style_items WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC').all(),
    filmItems: getGalleryItems('style-film'),
    groups: groupLinks(links),
    banners: getBanners('style'),
  });
});

// Голос за образ. voter — случайный id из localStorage; вместе с солёным IP
// это отсекает накрутку по F5, а большего здесь и не нужно.
router.post('/vote/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare("SELECT id FROM gallery_items WHERE id = ? AND page_key = 'style'").get(id);
  const voter = String((req.body && req.body.voter) || '').slice(0, 64);
  if (!item || !/^[a-z0-9-]{8,64}$/i.test(voter)) return res.status(400).json({ ok: false });
  const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.ip;
  const key = crypto.createHash('sha1').update(`${voter}|${ip}`).digest('hex').slice(0, 24);
  db.prepare('INSERT OR IGNORE INTO look_votes (item_id, voter) VALUES (?, ?)').run(id, key);
  const votes = db.prepare('SELECT COUNT(*) AS c FROM look_votes WHERE item_id = ?').get(id).c;
  res.json({ ok: true, votes });
});

module.exports = router;
