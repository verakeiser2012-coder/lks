const express = require('express');
const db = require('../db');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', (req, res) => {
  const { email, redirectTo } = req.body;
  const target = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/';

  if (!email || !EMAIL_RE.test(email)) {
    req.session.subscribeError = 'Введите корректный email.';
    return res.redirect(target);
  }

  try {
    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email.trim().toLowerCase());
  } catch (err) {
    if (!String(err.message).includes('UNIQUE')) throw err;
  }

  req.session.subscribeSuccess = true;
  res.redirect(target);
});

module.exports = router;
