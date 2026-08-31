const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
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

// Ссылка на шаблон для монтажа (CapCut и подобные) — блок скрыт, пока она не заполнена.
function loadTemplateUrl() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_template_url'").get();
  return row ? row.value : '';
}

router.get('/', (req, res) => {
  res.render('contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    submitted: false,
    error: null,
    values: {},
  });
});

router.post('/submit', (req, res) => {
  if (isBot(req) || overLimit('contest', req, 3)) {
    return res.redirect('/contest?sent=1');
  }
  const { name, contact, videoUrl, note, ageConsent, dataConsent } = req.body;

  if (!name || !contact || !videoUrl) {
    return res.render('contest', {
      intro: loadIntro(),
      prize: loadPrize(),
      templateUrl: loadTemplateUrl(),
      submitted: false,
      error: 'Укажите имя, контакт и ссылку на видео.',
      values: req.body,
    });
  }

  if (!ageConsent) {
    return res.render('contest', {
      intro: loadIntro(),
      prize: loadPrize(),
      templateUrl: loadTemplateUrl(),
      submitted: false,
      error: 'Участвовать можно с 18 лет — подтвердите возраст.',
      values: req.body,
    });
  }

  if (!dataConsent) {
    return res.render('contest', {
      intro: loadIntro(),
      prize: loadPrize(),
      templateUrl: loadTemplateUrl(),
      submitted: false,
      error: 'Подтвердите согласие на обработку персональных данных.',
      values: req.body,
    });
  }

  db.prepare(`
    INSERT INTO contest_submissions (name, contact, video_url, note, age_consent, data_consent) VALUES (?, ?, ?, ?, 1, 1)
  `).run(name, contact, videoUrl, note || '');

  notify(
    `Новая заявка на конкурс: ${name}`,
    `Имя: ${name}\nКонтакт: ${contact}\nВидео: ${videoUrl}\nКомментарий: ${note || '—'}\n\nПосмотреть: /admin/contest/submissions`
  );

  res.render('contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    submitted: true,
    error: null,
    values: {},
  });
});

module.exports = router;
