const express = require('express');
const db = require('../../db');

const router = express.Router();

function loadIntro() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_intro'").get();
  return row ? row.value : '';
}

function loadPrize() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_prize'").get();
  return row ? row.value : '';
}

function loadTemplateUrl() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'contest_template_url'").get();
  return row ? row.value : '';
}

// Сезоны конкурса — два в год, как в моде: «Осень 2026 — зима 2027», «Весна — лето 2027».
// Название сезона пишется в заявку при подаче, по нему строится галерея и архив победителей.
const SEASON_KEYS = ['contest_season', 'contest_season_start', 'contest_season_end', 'contest_results_date', 'contest_jury'];
function loadSeason() {
  const out = {};
  for (const k of SEASON_KEYS) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    out[k.replace('contest_', '')] = row ? row.value : '';
  }
  return out;
}

router.get('/', (req, res) => {
  res.render('admin/contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
    season: loadSeason(),
    saved: false,
  });
});

router.post('/', (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  upsert.run('contest_intro', req.body.intro || '');
  upsert.run('contest_prize', req.body.prize || '');
  upsert.run('contest_template_url', req.body.templateUrl || '');
  upsert.run('contest_season', String(req.body.season || '').trim());
  upsert.run('contest_season_start', String(req.body.seasonStart || '').trim());
  upsert.run('contest_season_end', String(req.body.seasonEnd || '').trim());
  upsert.run('contest_results_date', String(req.body.resultsDate || '').trim());
  upsert.run('contest_jury', String(req.body.jury || '').trim());
  res.render('admin/contest', {
    intro: req.body.intro || '',
    prize: req.body.prize || '',
    templateUrl: req.body.templateUrl || '',
    season: loadSeason(),
    saved: true,
  });
});

router.get('/submissions', (req, res) => {
  const submissions = db.prepare('SELECT s.*, (SELECT COUNT(*) FROM contest_votes v WHERE v.submission_id = s.id) AS votes FROM contest_submissions s ORDER BY created_at DESC').all();
  res.render('admin/contest-submissions', { submissions });
});

router.post('/submissions/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE contest_submissions SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/contest/submissions');
});

module.exports = router;
