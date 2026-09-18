const express = require('express');
const crypto = require('crypto');
const { getBanners } = require('../utils/banners');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify, sendHtml, isConfigured } = require('../services/mail');

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
// Три входа (18.09.2026): взрослые — как раньше; 14–17 — подросток подаёт сам,
// а согласие на обработку данных и публикацию фото подтверждает родитель по
// ссылке из письма (ст. 152.1 ГК — изображение несовершеннолетнего только с
// согласия законного представителя); до 14 — заявку подаёт сам родитель, его
// согласие в самой форме. Подтверждение хранится с датой и адресом.
const AGE_GROUPS = new Set(['adult', 'teen', 'child']);

/** Письмо родителю подростка: что опубликуем, что нет, и ссылка для решения. */
function guardianLetter({ name, guardianName, token, base }) {
  const link = `${base}/redheads/consent/${token}`;
  const privacy = `${base}/legal/privacy`;
  const lines = [
    `Здравствуйте${guardianName ? ', ' + guardianName : ''}!`,
    '',
    `${name} подал(а) заявку в раздел «Рыжие, которые вдохновляют» на сайте levkeiser.com —`,
    'это подборка людей с натуральным рыжим цветом волос. Заявителю от 14 до 17 лет,',
    'поэтому без вашего согласия мы её не рассматриваем.',
    '',
    'Если заявку примем, на сайте появятся: имя (без фамилии), фотография, род занятий',
    'и пара слов о себе. Контакты, город и школу мы не публикуем, ссылки на соцсети',
    'несовершеннолетних не ставим. Если подборкой заинтересуется бренд для съёмки,',
    'предложение придёт вам, а не ребёнку.',
    '',
    'Подтвердить согласие на обработку данных и публикацию — по ссылке (там же можно отказать):',
    link,
    '',
    'Согласие можно отозвать в любой момент письмом на info@levkeiser.com — данные удалим.',
    `Политика обработки персональных данных: ${privacy}`,
    '',
    'Лев Кейсер, levkeiser.com',
  ];
  const text = lines.join('\n');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = lines
    .map((l) => (l === link || l.endsWith(privacy)
      ? esc(l).replace(link, `<a href="${link}">${link}</a>`).replace(privacy, `<a href="${privacy}">${privacy}</a>`)
      : esc(l)))
    .join('<br>');
  return { text, html: `<div style="font:15px/1.5 Georgia,serif;color:#211a12">${html}</div>` };
}

router.post('/submit', async (req, res) => {
  if (isBot(req) || overLimit('redheads', req, 3)) {
    return res.redirect('/redheads?sent=1');
  }
  const { name, role, note, linkUrl, contact, dataConsent, guardianName, guardianContact } = req.body;
  const age = AGE_GROUPS.has(req.body.age) ? req.body.age : 'adult';
  const fail = (error) => res.render('redheads', pageData({ error, values: req.body }));

  if (!name || !contact) return fail('Укажите имя и контакт для связи.');
  if (age !== 'adult' && !String(guardianName || '').trim()) {
    return fail(age === 'teen' ? 'Укажите имя родителя или законного представителя.' : 'Укажите своё имя как родителя.');
  }
  if (age !== 'adult' && !EMAIL_RE.test(String(guardianContact || '').trim())) {
    return fail(age === 'teen' ? 'Укажите почту родителя — туда придёт ссылка для подтверждения.' : 'Укажите свою почту.');
  }
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const guardian = age === 'adult' ? '' : String(guardianName).trim();
  const guardianMail = age === 'adult' ? '' : String(guardianContact).trim().toLowerCase();
  const token = age === 'teen' ? crypto.randomBytes(24).toString('hex') : null;
  const confirmedAt = age === 'child' ? new Date().toISOString() : null;
  const status = age === 'teen' ? 'pending_consent' : 'new';

  const info = db.prepare(`
    INSERT INTO redhead_submissions
      (name, role, note, link_url, contact, age_consent, data_consent, status,
       age_group, guardian_name, guardian_contact, consent_token, consent_confirmed_at, consent_ip)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, role || '', note || '', linkUrl || '', contact, status,
    age, guardian, guardianMail, token, confirmedAt, confirmedAt ? req.ip : null);

  if (age === 'teen') {
    const base = res.locals.canonicalBase;
    const letter = guardianLetter({ name, guardianName: guardian, token, base });
    try {
      await sendHtml({ to: guardianMail, subject: `Согласие на участие ${name} в разделе «Рыжие» — levkeiser.com`, ...letter });
    } catch (err) {
      console.error('[redheads] письмо родителю не ушло:', err.message);
      if (isConfigured) {
        // Без письма подтверждения не будет — заявку не держим, просим исправить адрес.
        db.prepare('DELETE FROM redhead_submissions WHERE id = ?').run(info.lastInsertRowid);
        return fail('Не удалось отправить письмо родителю. Проверьте адрес или напишите нам через форму обращения.');
      }
      console.log('[redheads] SMTP не настроен, ссылка подтверждения:', `${base}/redheads/consent/${token}`);
    }
    return res.render('redheads', pageData({ submitted: 'teen' }));
  }

  notify(
    `Новая заявка в «Рыжие»: ${name}${age === 'child' ? ' (ребёнок до 14, подал родитель)' : ''}`,
    `Имя: ${name}\nРод деятельности: ${role || '—'}\nО себе: ${note || '—'}\nСсылка: ${linkUrl || '—'}\nКонтакт: ${contact}`
      + (age === 'child' ? `\nРодитель: ${guardian}, ${guardianMail}` : '')
      + '\n\nПосмотреть: /admin/redheads/submissions'
  );

  res.render('redheads', pageData({ submitted: true }));
});

// ---- Подтверждение согласия родителем (14–17) ---------------------------------
// Страница с кнопкой, а не действие по самой ссылке: почтовые сканеры открывают
// ссылки из писем, и согласие «подтверждалось» бы без человека.
function findByToken(token) {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) return null;
  return db.prepare('SELECT * FROM redhead_submissions WHERE consent_token = ?').get(token) || null;
}

router.get('/consent/:token', (req, res) => {
  const s = findByToken(req.params.token);
  if (!s) return res.status(404).render('redheads-consent', { state: 'missing', s: null });
  res.render('redheads-consent', { state: s.consent_confirmed_at ? 'already' : 'ask', s });
});

router.post('/consent/:token', (req, res) => {
  const s = findByToken(req.params.token);
  if (!s) return res.status(404).render('redheads-consent', { state: 'missing', s: null });
  if (s.consent_confirmed_at) return res.render('redheads-consent', { state: 'already', s });

  if (req.body.action === 'decline') {
    // Отказ — заявку и данные ребёнка стираем сразу: хранить их без согласия нельзя.
    db.prepare('DELETE FROM redhead_submissions WHERE id = ?').run(s.id);
    return res.render('redheads-consent', { state: 'declined', s: null });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE redhead_submissions SET consent_confirmed_at = ?, consent_ip = ?, status = 'new' WHERE id = ?")
    .run(now, req.ip, s.id);
  notify(
    `Новая заявка в «Рыжие»: ${s.name} (14–17, согласие родителя подтверждено)`,
    `Имя: ${s.name}\nРод деятельности: ${s.role || '—'}\nО себе: ${s.note || '—'}\nСсылка: ${s.link_url || '—'}\nКонтакт: ${s.contact}\nРодитель: ${s.guardian_name}, ${s.guardian_contact}\nПодтверждено: ${now}\n\nПосмотреть: /admin/redheads/submissions`
  );
  res.render('redheads-consent', { state: 'confirmed', s });
});

module.exports = router;
