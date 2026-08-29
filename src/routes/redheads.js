const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function teaserModeOn() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'redheads_teaser_mode'").get();
  return !row || row.value === '1';
}

router.get('/', (req, res) => {
  if (teaserModeOn()) {
    return res.render('redheads-teaser', { subscribeSuccess: false, subscribeError: null });
  }
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

// Отдельный путь подписки для teaser-режима — nginx открывает /redheads без
// пароля сайта, пока остальной сайт закрыт; форма должна жить под тем же префиксом.
router.post('/subscribe', (req, res) => {
  if (isBot(req) || overLimit('subscribe', req)) {
    return res.render('redheads-teaser', { subscribeSuccess: true, subscribeError: null });
  }
  const { email, dataConsent } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.render('redheads-teaser', { subscribeSuccess: false, subscribeError: 'Введите корректный email.' });
  }
  if (!dataConsent) {
    return res.render('redheads-teaser', { subscribeSuccess: false, subscribeError: 'Подтвердите согласие на обработку персональных данных.' });
  }

  try {
    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email.trim().toLowerCase());
  } catch (err) {
    if (!String(err.message).includes('UNIQUE')) throw err;
  }

  res.render('redheads-teaser', { subscribeSuccess: true, subscribeError: null });
});

router.post('/submit', (req, res) => {
  if (isBot(req) || overLimit('redheads', req, 3)) {
    return res.redirect('/redheads?sent=1');
  }
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
