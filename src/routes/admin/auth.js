const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db');

const router = express.Router();

// Защита от перебора пароля: не больше 10 неудачных попыток с одного IP за 15 минут.
const loginAttempts = new Map();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() - entry.first > ATTEMPT_WINDOW_MS) {
    loginAttempts.set(ip, { first: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
  // Не даём карте расти бесконечно.
  if (loginAttempts.size > 1000) {
    for (const [key, value] of loginAttempts) {
      if (Date.now() - value.first > ATTEMPT_WINDOW_MS) loginAttempts.delete(key);
    }
  }
}

router.get('/login', (req, res) => {
  if (req.session.adminId) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.ip;
  if (tooManyAttempts(ip)) {
    return res.status(429).render('admin/login', {
      error: 'Слишком много попыток входа. Подождите 15 минут.',
    });
  }

  const { username, password, remember } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    registerFailure(ip);
    return res.render('admin/login', { error: 'Неверный логин или пароль.' });
  }

  loginAttempts.delete(ip);

  req.session.adminId = user.id;
  if (remember) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 90; // 90 дней вместо стандартных 7
  }
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;
