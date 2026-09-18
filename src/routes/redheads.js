const express = require('express');
const { getBanners } = require('../utils/banners');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const consent = require('../services/guardianConsent');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function teaserModeOn() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'redheads_teaser_mode'").get();
  return !row || row.value === '1';
}

// Записи дневника, из которых вырос раздел: без них подборка выглядит
// списком без объяснения, зачем он тут.
const READ_SLUGS = ['poka-v-niderlandah-festival-ryzhih-u-nas-novyy-razdel'];
function redheadReads() {
  const marks = READ_SLUGS.map(() => '?').join(',');
  return db.prepare(`SELECT slug, title FROM diary_posts WHERE is_published = 1 AND slug IN (${marks})`).all(...READ_SLUGS);
}

/** Всё, что нужно странице раздела; extra — что меняется после отправки формы. */
function pageData(extra) {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  const people = db
    .prepare('SELECT * FROM redhead_spotlights WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC')
    .all();
  return {
    banners: getBanners('redheads'),
    reads: redheadReads(),
    intro: introRow ? introRow.value : '',
    people,
    submitted: false,
    error: null,
    values: {},
    ...extra,
  };
}

router.get('/', (req, res) => {
  if (teaserModeOn()) {
    return res.render('redheads-teaser', { subscribeSuccess: false, subscribeError: null });
  }
  res.render('redheads', pageData({}));
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

// ---- Заявка ------------------------------------------------------------------
// Возраст и согласие родителя — общая схема, см. services/guardianConsent.js.
const describe = (s) =>
  `Имя: ${s.name}\nРод деятельности: ${s.role || '—'}\nО себе: ${s.note || '—'}\nСсылка: ${s.link_url || '—'}\nКонтакт: ${s.contact}`;

router.post('/submit', async (req, res) => {
  if (isBot(req) || overLimit('redheads', req, 3)) {
    return res.redirect('/redheads?sent=1');
  }
  const { name, role, note, linkUrl, contact, dataConsent } = req.body;
  const fail = (error) => res.render('redheads', pageData({ error, values: req.body }));

  if (!name || !contact) return fail('Укажите имя и контакт для связи.');
  const a = consent.parseAge(req.body);
  if (a.error) return fail(a.error);
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const info = db.prepare(`
    INSERT INTO redhead_submissions
      (name, role, note, link_url, contact, age_consent, data_consent, status,
       age_group, guardian_name, guardian_contact, consent_token, consent_confirmed_at, consent_ip)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, role || '', note || '', linkUrl || '', contact, a.status,
    a.age, a.guardian, a.guardianMail, a.token, a.confirmedAt, a.confirmedAt ? req.ip : null);

  if (a.age === 'teen') {
    const error = await consent.sendLetter('redheads', {
      name, guardianName: a.guardian, guardianMail: a.guardianMail, token: a.token, base: res.locals.canonicalBase,
    });
    if (error) {
      db.prepare('DELETE FROM redhead_submissions WHERE id = ?').run(info.lastInsertRowid);
      return fail(error);
    }
    return res.render('redheads', pageData({ submitted: 'teen' }));
  }

  notify(
    `Новая заявка в «Рыжие»: ${name}${a.age === 'child' ? ' (ребёнок до 14, подал родитель)' : ''}`,
    describe({ name, role, note, link_url: linkUrl, contact })
      + (a.age === 'child' ? `\nРодитель: ${a.guardian}, ${a.guardianMail}` : '')
      + '\n\nПосмотреть: /admin/redheads/submissions'
  );

  res.render('redheads', pageData({ submitted: true }));
});

consent.mountConsentRoutes(router, 'redheads', (s, forPage) => (forPage
  ? ((s.role || s.note) ? `Сейчас в заявке указано: ${[s.role, s.note].filter(Boolean).join(' — ')}.` : '')
  : describe(s)));

module.exports = router;
