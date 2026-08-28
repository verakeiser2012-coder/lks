const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', (req, res) => {
  if (isBot(req) || overLimit('subscribe', req)) {
    req.session.subscribeSuccess = true; // боту отвечаем «успехом», ничего не сохраняя
    const t = typeof req.body.redirectTo === 'string' && req.body.redirectTo.startsWith('/') ? req.body.redirectTo : '/';
    return res.redirect(t);
  }
  const { email, redirectTo, dataConsent } = req.body;
  const target = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/';

  if (!email || !EMAIL_RE.test(email)) {
    req.session.subscribeError = 'Введите корректный email.';
    return res.redirect(target);
  }

  if (!dataConsent) {
    req.session.subscribeError = 'Подтвердите согласие на обработку персональных данных.';
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
