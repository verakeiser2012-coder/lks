const express = require('express');
const db = require('../../db');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

function loadPeople() {
  return db.prepare('SELECT * FROM redhead_spotlights ORDER BY sort_order ASC, created_at ASC').all();
}

function loadIntro() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  return row ? row.value : '';
}

router.get('/', (req, res) => {
  res.render('admin/redheads', { people: loadPeople(), intro: loadIntro(), saved: false });
});

router.post('/intro', (req, res) => {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('redheads_intro', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(req.body.intro || '');
  res.render('admin/redheads', { people: loadPeople(), intro: req.body.intro || '', saved: true });
});

router.get('/new', (req, res) => {
  res.render('admin/redhead-form', { person: null, error: null });
});

router.post('/', uploadImage.single('photo'), (req, res) => {
  const { name, role, note, linkUrl, linkLabel, sortOrder, isPublished } = req.body;
  if (!name) {
    return res.render('admin/redhead-form', { person: req.body, error: 'Укажите имя.' });
  }

  const photo = req.file ? `/uploads/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO redhead_spotlights (name, role, note, link_url, link_label, photo, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, role || '', note || '', linkUrl || '', linkLabel || '', photo, Number(sortOrder) || 0, isPublished ? 1 : 0);

  res.redirect('/admin/redheads');
});

router.get('/:id/edit', (req, res) => {
  const person = db.prepare('SELECT * FROM redhead_spotlights WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).render('404');
  res.render('admin/redhead-form', { person, error: null });
});

router.post('/:id', uploadImage.single('photo'), (req, res) => {
  const person = db.prepare('SELECT * FROM redhead_spotlights WHERE id = ?').get(req.params.id);
  if (!person) return res.status(404).render('404');

  const { name, role, note, linkUrl, linkLabel, sortOrder, isPublished } = req.body;
  if (!name) {
    return res.render('admin/redhead-form', { person: { ...person, ...req.body }, error: 'Укажите имя.' });
  }

  const photo = req.file ? `/uploads/${req.file.filename}` : person.photo;

  db.prepare(`
    UPDATE redhead_spotlights
    SET name = ?, role = ?, note = ?, link_url = ?, link_label = ?, photo = ?, sort_order = ?, is_published = ?
    WHERE id = ?
  `).run(name, role || '', note || '', linkUrl || '', linkLabel || '', photo, Number(sortOrder) || 0, isPublished ? 1 : 0, person.id);

  res.redirect('/admin/redheads');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM redhead_spotlights WHERE id = ?').run(req.params.id);
  res.redirect('/admin/redheads');
});

router.get('/submissions', (req, res) => {
  const submissions = db.prepare('SELECT * FROM redhead_submissions ORDER BY created_at DESC').all();
  res.render('admin/redhead-submissions', { submissions });
});

router.post('/submissions/:id/approve', (req, res) => {
  const submission = db.prepare('SELECT * FROM redhead_submissions WHERE id = ?').get(req.params.id);
  if (!submission) return res.status(404).render('404');

  const maxSort = db.prepare('SELECT MAX(sort_order) AS m FROM redhead_spotlights').get().m;
  db.prepare(`
    INSERT INTO redhead_spotlights (name, role, note, link_url, link_label, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(submission.name, submission.role, submission.note, submission.link_url, 'Смотреть', (maxSort || 0) + 1);

  db.prepare("UPDATE redhead_submissions SET status = 'approved' WHERE id = ?").run(submission.id);
  res.redirect('/admin/redheads/submissions');
});

router.post('/submissions/:id/reject', (req, res) => {
  db.prepare("UPDATE redhead_submissions SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/redheads/submissions');
});

module.exports = router;
