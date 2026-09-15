const express = require('express');
const { randomBytes } = require('crypto');
const db = require('../../db');

const router = express.Router();
const SITE = process.env.SITE_URL || 'https://levkeiser.com';

router.get('/', (req, res) => {
  res.render('admin/reviews', {
    reviews: db.prepare("SELECT * FROM reviews ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC").all(),
    invites: db.prepare('SELECT * FROM review_invites ORDER BY created_at DESC LIMIT 30').all(),
    site: SITE,
    created: req.query.invite || '',
  });
});

router.post('/:id/status', (req, res) => {
  const status = ['approved', 'rejected', 'pending'].includes(req.body.status) ? req.body.status : 'pending';
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/admin/reviews');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.redirect('/admin/reviews');
});

// Приглашение — ссылка для клиента, у которого нет заказа на сайте (услуга «Коллегам»).
router.post('/invite', (req, res) => {
  const kind = req.body.kind === 'product' ? 'product' : 'service';
  const subject = String(req.body.subject || '').trim().slice(0, 120) || (kind === 'service' ? 'Коллегам за копеечку' : '');
  const client = String(req.body.client_name || '').trim().slice(0, 80);
  const token = randomBytes(16).toString('hex');
  db.prepare('INSERT INTO review_invites (token, kind, subject, client_name) VALUES (?, ?, ?, ?)').run(token, kind, subject, client);
  res.redirect(`/admin/reviews?invite=${token}`);
});

router.post('/invite/:id/delete', (req, res) => {
  db.prepare('DELETE FROM review_invites WHERE id = ?').run(req.params.id);
  res.redirect('/admin/reviews');
});

module.exports = router;
