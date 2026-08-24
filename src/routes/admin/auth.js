const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.adminId) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password, remember } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.render('admin/login', { error: 'Неверный логин или пароль.' });
  }

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
