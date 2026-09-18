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

const { parseVideoEmbedUrl } = require('../utils/videoEmbed');

function setting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? String(row.value || '').trim() : '';
}

// Сезон: название и даты из админки. Приём открыт, если дата окончания не задана
// или ещё не прошла (сравниваем по дате, в часовом поясе сервера).
function season() {
  const name = setting('contest_season');
  const start = setting('contest_season_start');
  const end = setting('contest_season_end');
  const results = setting('contest_results_date');
  const today = new Date().toISOString().slice(0, 10);
  const open = !end || today <= end;
  const notYet = Boolean(start) && today < start;
  const jury = setting('contest_jury').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [who, ...rest] = l.split(' — ');
    return { who: who.trim(), role: rest.join(' — ').trim() };
  });
  return { name, start, end, results, open: open && !notYet, notYet, jury };
}

const ORDER = { winner: 0, shortlisted: 1, approved: 2 };

// Галерея: одобренные работы текущего сезона (победители первыми) и победители
// прошлых сезонов. Несовершеннолетние — только имя без фамилии.
function gallery(currentSeason) {
  const rows = db
    .prepare("SELECT id, name, video_url, note, status, season, age_group FROM contest_submissions WHERE status IN ('approved', 'shortlisted', 'winner') ORDER BY created_at DESC")
    .all()
    .map((r) => ({
      ...r,
      shownName: r.age_group && r.age_group !== 'adult' ? String(r.name).trim().split(/\s+/)[0] : r.name,
      video: parseVideoEmbedUrl(r.video_url),
    }))
    .filter((r) => r.video);
  const current = rows.filter((r) => !currentSeason || r.season === currentSeason).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const past = rows.filter((r) => currentSeason && r.season !== currentSeason && r.status === 'winner');
  return { current, past };
}

function pageData(extra) {
  const s = season();
  return {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    season: s,
    ...gallery(s.name),
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

  const s = season();
  if (!s.open) return fail(s.notYet ? 'Приём работ ещё не открыт.' : 'Приём работ этого сезона закрыт.');
  if (!name || !contact || !videoUrl) return fail('Укажите имя, контакт и ссылку на видео.');
  if (!parseVideoEmbedUrl(videoUrl)) return fail('Нужна ссылка на видео в VK Клипах или VK Видео, YouTube (в том числе Shorts), Rutube или Vimeo — так мы сможем показать его в галерее.');
  const a = consent.parseAge(req.body);
  if (a.error) return fail(a.error);
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const info = db.prepare(`
    INSERT INTO contest_submissions
      (name, contact, video_url, note, age_consent, data_consent, status,
       age_group, guardian_name, guardian_contact, consent_token, consent_confirmed_at, consent_ip, season)
    VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, contact, videoUrl, note || '', a.status,
    a.age, a.guardian, a.guardianMail, a.token, a.confirmedAt, a.confirmedAt ? req.ip : null, s.name);

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
