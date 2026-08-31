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

router.get('/', (req, res) => {
  res.render('admin/contest', {
    intro: loadIntro(),
    prize: loadPrize(),
    templateUrl: loadTemplateUrl(),
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
  res.render('admin/contest', {
    intro: req.body.intro || '',
    prize: req.body.prize || '',
    templateUrl: req.body.templateUrl || '',
    saved: true,
  });
});

router.get('/submissions', (req, res) => {
  const submissions = db.prepare('SELECT * FROM contest_submissions ORDER BY created_at DESC').all();
  res.render('admin/contest-submissions', { submissions });
});

router.post('/submissions/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE contest_submissions SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/contest/submissions');
});

module.exports = router;
