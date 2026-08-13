const express = require('express');
const db = require('../db');
const { notify } = require('../services/mail');

const router = express.Router();

function loadIntro() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_intro'").get();
  return row ? row.value : '';
}

function loadPrize() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_prize'").get();
  return row ? row.value : '';
}

router.get('/', (req, res) => {
  res.render('contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    submitted: false,
    error: null,
    values: {},
  });
});

router.post('/submit', (req, res) => {
  const { name, contact, videoUrl, note, ageConsent } = req.body;

  if (!name || !contact || !videoUrl) {
    return res.render('contest', {
      intro: loadIntro(),
      prize: loadPrize(),
      submitted: false,
      error: 'Укажите имя, контакт и ссылку на видео.',
      values: req.body,
    });
  }

  if (!ageConsent) {
    return res.render('contest', {
      intro: loadIntro(),
      prize: loadPrize(),
      submitted: false,
      error: 'Подтвердите, что вам есть 18 лет, либо согласие законного представителя получено.',
      values: req.body,
    });
  }

  db.prepare(`
    INSERT INTO contest_submissions (name, contact, video_url, note, age_consent) VALUES (?, ?, ?, ?, 1)
  `).run(name, contact, videoUrl, note || '');

  notify(
    `Новая заявка на конкурс: ${name}`,
    `Имя: ${name}\nКонтакт: ${contact}\nВидео: ${videoUrl}\nКомментарий: ${note || '—'}\n\nПосмотреть: /admin/contest/submissions`
  );

  res.render('contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    submitted: true,
    error: null,
    values: {},
  });
});

module.exports = router;
