const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  const people = db
    .prepare('SELECT * FROM redhead_spotlights WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC')
    .all();
  res.render('redheads', {
    intro: introRow ? introRow.value : '',
    people,
    submitted: false,
    error: null,
    values: {},
  });
});

router.post('/submit', (req, res) => {
  const { name, role, note, linkUrl, contact } = req.body;
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  const people = db
    .prepare('SELECT * FROM redhead_spotlights WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC')
    .all();

  if (!name || !contact) {
    return res.render('redheads', {
      intro: introRow ? introRow.value : '',
      people,
      submitted: false,
      error: 'Укажите имя и контакт для связи.',
      values: req.body,
    });
  }

  db.prepare(`
    INSERT INTO redhead_submissions (name, role, note, link_url, contact) VALUES (?, ?, ?, ?, ?)
  `).run(name, role || '', note || '', linkUrl || '', contact);

  res.render('redheads', {
    intro: introRow ? introRow.value : '',
    people,
    submitted: true,
    error: null,
    values: {},
  });
});

module.exports = router;
