const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const consent = require('../services/guardianConsent');
const account = require('../services/account');
const crypto = require('crypto');

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
  // Голосование зрителей идёт до даты итогов; без неё — пока открыт приём.
  const voting = !notYet && (results ? today <= results : open);
  const jury = setting('contest_jury').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [who, ...rest] = l.split(' — ');
    return { who: who.trim(), role: rest.join(' — ').trim() };
  });
  return { name, start, end, results, open: open && !notYet, notYet, voting, jury };
}

// Приз зрительских симпатий (решение владельца 18.09.2026): голосуют прямо в
// галерее, по одному голосу на работу с одного браузера — cookie lk_vote на год.
// Это порог, а не защита от накрутки: IP пишется в таблицу, счётчик виден в админке.
const VOTE_COOKIE = 'lk_vote';
const GALLERY = ['approved', 'shortlisted', 'winner', 'audience'];
const ORDER = { winner: 0, audience: 1, shortlisted: 2, approved: 3 };

function voterId(req) {
  const v = account.parseCookies(req.headers.cookie)[VOTE_COOKIE];
  return /^[a-f0-9]{32}$/.test(v || '') ? v : null;
}

function ensureVoter(req, res) {
  let v = voterId(req);
  if (!v) {
    v = crypto.randomBytes(16).toString('hex');
    const secure = req.secure || req.get('x-forwarded-proto') === 'https';
    res.append('Set-Cookie', `${VOTE_COOKIE}=${v}; Path=/contest; Max-Age=${365 * 24 * 3600}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
  }
  return v;
}

// Галерея: одобренные работы текущего сезона (победители первыми, дальше по
// голосам) и победители прошлых сезонов. Несовершеннолетние — только имя без фамилии.
function gallery(currentSeason, voter) {
  const counts = {};
  db.prepare('SELECT submission_id, COUNT(*) AS c FROM contest_votes GROUP BY submission_id').all().forEach((r) => { counts[r.submission_id] = r.c; });
  const mine = new Set(voter ? db.prepare('SELECT submission_id FROM contest_votes WHERE voter = ?').all(voter).map((r) => r.submission_id) : []);
  const rows = db
    .prepare(`SELECT id, name, video_url, note, status, season, age_group FROM contest_submissions WHERE status IN (${GALLERY.map(() => '?').join(', ')}) ORDER BY created_at DESC`)
    .all(...GALLERY)
    .map((r) => ({
      ...r,
      shownName: r.age_group && r.age_group !== 'adult' ? String(r.name).trim().split(/\s+/)[0] : r.name,
      video: parseVideoEmbedUrl(r.video_url),
      votes: counts[r.id] || 0,
      voted: mine.has(r.id),
    }))
    .filter((r) => r.video);
  const current = rows
    .filter((r) => !currentSeason || r.season === currentSeason)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.votes - a.votes);
  const past = rows.filter((r) => currentSeason && r.season !== currentSeason && (r.status === 'winner' || r.status === 'audience'));
  return { current, past };
}

function pageData(req, extra) {
  const s = season();
  return {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    season: s,
    ...gallery(s.name, voterId(req)),
    submitted: false,
    error: null,
    values: {},
    ...extra,
  };
}

router.get('/', (req, res) => {
  res.render('contest', pageData(req, {}));
});

// Голос за работу — переключатель: второй клик снимает голос. Скрипту на странице
// отвечаем JSON, без него — возвращаем к работе в галерее.
router.post('/vote/:id', (req, res) => {
  const wantsJson = req.get('x-requested-with') === 'fetch' || req.accepts(['html', 'json']) === 'json';
  const id = Number(req.params.id);
  const reply = (code, body) => (wantsJson ? res.status(code).json(body) : res.redirect(`/contest#work-${id}`));
  const s = season();
  if (!s.voting) return reply(403, { ok: false, error: s.notYet ? 'Голосование откроется вместе с сезоном.' : 'Голосование этого сезона закрыто.' });
  const row = Number.isInteger(id) && id > 0
    ? db.prepare(`SELECT id FROM contest_submissions WHERE id = ? AND season = ? AND status IN (${GALLERY.map(() => '?').join(', ')})`).get(id, s.name, ...GALLERY)
    : null;
  if (!row) return reply(404, { ok: false, error: 'Работа не найдена.' });
  if (overLimit('contest_vote', req, 40)) return reply(429, { ok: false, error: 'Слишком много голосов подряд — подождите немного.' });
  const voter = ensureVoter(req, res);
  const existing = db.prepare('SELECT id FROM contest_votes WHERE submission_id = ? AND voter = ?').get(id, voter);
  if (existing) db.prepare('DELETE FROM contest_votes WHERE id = ?').run(existing.id);
  else db.prepare('INSERT INTO contest_votes (submission_id, voter, ip) VALUES (?, ?, ?)').run(id, voter, req.headers['x-real-ip'] || req.ip || null);
  const count = db.prepare('SELECT COUNT(*) AS c FROM contest_votes WHERE submission_id = ?').get(id).c;
  return reply(200, { ok: true, voted: !existing, count });
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
  const fail = (error) => res.render('contest', pageData(req, { error, values: req.body }));

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
    return res.render('contest', pageData(req, { submitted: 'teen' }));
  }

  notify(
    `Новая заявка на конкурс: ${name}${a.age === 'child' ? ' (ребёнок до 14, подал родитель)' : ''}`,
    describe({ name, contact, video_url: videoUrl, note })
      + (a.age === 'child' ? `\nРодитель: ${a.guardian}, ${a.guardianMail}` : '')
      + '\n\nПосмотреть: /admin/contest/submissions'
  );

  res.render('contest', pageData(req, { submitted: true }));
});

consent.mountConsentRoutes(router, 'contest', (s, forPage) => (forPage
  ? `Видео из заявки: ${s.video_url}`
  : describe(s)));

module.exports = router;
