const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const consent = require('../services/guardianConsent');

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

function pageData(extra) {
  return {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    submitted: false,
    error: null,
    values: {},
    ...extra,
  };
}

router.get('/', (req, res) => {
  res.render('contest', pageData({}));
});

// Возраст и согласие родителя — та же схема, что в «Рыжих» (18.09.2026):
// 14–17 подтверждает родитель по письму, до 14 подаёт родитель.
// См. services/guardianConsent.js.
const describe = (s) =>
  `Имя: ${s.name}\nКонтакт: ${s.contact}\nВидео: ${s.video_url}\nКомментарий: ${s.note || '—'}`;

router.post('/submit', async (req, res) => {
  if (isBot(req) || overLimit('contest', req, 3)) {
    return res.redirect('/contest?sent=1');
  }
  const { name, contact, videoUrl, note, dataConsent } = req.body;
  const fail = (error) => res.render('contest', pageData({ error, values: req.body }));

  if (!name || !contact || !videoUrl) return fail('Укажите имя, контакт и ссылку на видео.');
  const a = consent.parseAge(req.body);
  if (a.error) return fail(a.error);
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const info = db.prepare(`
    INSERT INTO contest_submissions
      (name, contact, video_url, note, age_consent, data_consent, status,
       age_group, guardian_name, guardian_contact, consent_token, consent_confirmed_at, consent_ip)
    VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, contact, videoUrl, note || '', a.status,
    a.age, a.guardian, a.guardianMail, a.token, a.confirmedAt, a.confirmedAt ? req.ip : null);

  if (a.age === 'teen') {
    const error = await consent.sendLetter('contest', {
      name, guardianName: a.guardian, guardianMail: a.guardianMail, token: a.token, base: res.locals.canonicalBase,
    });
    if (error) {
      db.prepare('DELETE FROM contest_submissions WHERE id = ?').run(info.lastInsertRowid);
      return fail(error);
    }
    return res.render('contest', pageData({ submitted: 'teen' }));
  }

  notify(
    `Новая заявка на конкурс: ${name}${a.age === 'child' ? ' (ребёнок до 14, подал родитель)' : ''}`,
    describe({ name, contact, video_url: videoUrl, note })
      + (a.age === 'child' ? `\nРодитель: ${a.guardian}, ${a.guardianMail}` : '')
      + '\n\nПосмотреть: /admin/contest/submissions'
  );

  res.render('contest', pageData({ submitted: true }));
});

consent.mountConsentRoutes(router, 'contest', (s, forPage) => (forPage
  ? `Видео из заявки: ${s.video_url}`
  : describe(s)));

module.exports = router;
