const express = require('express');
const db = require('../db');
const { groupLinks, socialLinksGroup } = require('../utils/links');

const router = express.Router();

// Почты разведены по темам, чтобы письма не сваливались в один ящик.
// Тот же список лежит в подвале — здесь он развёрнут, потому что «Обо мне»
// это страница, куда приходят именно за контактом.
const MAILS = [
  { address: 'info@levkeiser.com', note: 'общие вопросы и заказы' },
  { address: 'brand@levkeiser.com', note: 'сотрудничество с брендами' },
  { address: 'booking@levkeiser.com', note: 'съёмки, кастинги, музыка' },
];

router.get('/', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'about_text'").get();
  const aboutText = row ? row.value : '';
  const media = db.prepare('SELECT * FROM about_media ORDER BY sort_order ASC, created_at DESC').all();
  const links = db
    .prepare("SELECT * FROM page_links WHERE section = 'about' ORDER BY sort_order ASC, id ASC")
    .all();
  // Соцсети — из раздела «Соцсети» админки; ставим после «Где слушать».
  const linkGroups = groupLinks(links);
  linkGroups.splice(Math.min(1, linkGroups.length), 0, socialLinksGroup('Где читать и смотреть', { lang: req.lang }));
  res.render('about', { aboutText, media, mails: MAILS, linkGroups });
});

module.exports = router;
