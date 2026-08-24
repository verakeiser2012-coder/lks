const express = require('express');
const db = require('../db');
const { notify } = require('../services/mail');

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
  const { name, role, note, linkUrl, contact, ageConsent, dataConsent } = req.body;
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

  if (!ageConsent) {
    return res.render('redheads', {
      intro: introRow ? introRow.value : '',
      people,
      submitted: false,
      error: 'Подтвердите, что вам есть 18 лет, либо согласие законного представителя получено.',
      values: req.body,
    });
  }

  if (!dataConsent) {
    return res.render('redheads', {
      intro: introRow ? introRow.value : '',
      people,
      submitted: false,
      error: 'Подтвердите согласие на обработку персональных данных.',
      values: req.body,
    });
  }

  db.prepare(`
    INSERT INTO redhead_submissions (name, role, note, link_url, contact, age_consent, data_consent) VALUES (?, ?, ?, ?, ?, 1, 1)
  `).run(name, role || '', note || '', linkUrl || '', contact);

  notify(
    `Новая заявка в «Рыжие»: ${name}`,
    `Имя: ${name}\nРод деятельности: ${role || '—'}\nО себе: ${note || '—'}\nСсылка: ${linkUrl || '—'}\nКонтакт: ${contact}\n\nПосмотреть: /admin/redheads/submissions`
  );

  res.render('redheads', {
    intro: introRow ? introRow.value : '',
    people,
    submitted: true,
    error: null,
    values: {},
  });
});

module.exports = router;
