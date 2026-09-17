const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');

// Карта натуральных ароматов и «верстак»: посетитель собирает состав из частей
// и сохраняет его. Составы общие — их видят все, поэтому удалять чужое нельзя:
// автор получает при сохранении токен, кладёт его себе в браузер и только с ним
// может удалить свою запись. Админ удаляет что угодно из своей панели.

const router = express.Router();
const MAX_ITEMS = 24;
const MAX_NAME = 80;

router.get('/', (req, res) => {
  res.render('aroma', {
    title: 'Карта ароматов',
    metaDescription:
      '166 натуральных ароматов на двенадцати семействах. Соберите свой состав и посмотрите, где он встанет на карте.',
  });
});

// Карта во весь экран — без шапки и подвала; сюда же ведёт поддомен aroma.levkeiser.com
router.get('/full', (req, res) => {
  res.render('aroma-full', { title: 'Карта натуральных ароматов', layout: false });
});

router.get('/blends', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, author, items, created_at FROM aroma_blends ORDER BY id DESC LIMIT 80')
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      author: r.author,
      items: JSON.parse(r.items),
      created_at: r.created_at,
    })),
  );
});

router.post('/blends', (req, res) => {
  if (isBot(req)) return res.json({ ok: true, id: 0, token: '' });
  if (overLimit('aroma-blend', req, 20, 10 * 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Слишком часто. Подождите немного.' });
  }
  const name = String(req.body.name || '').trim().slice(0, MAX_NAME);
  const author = String(req.body.author || '').trim().slice(0, 24);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const clean = items
    .map((o) => ({ i: Number(o && o.i), p: Number(o && o.p) }))
    .filter((o) => Number.isInteger(o.i) && o.i >= 0 && o.i < 500 && Number.isFinite(o.p) && o.p > 0 && o.p <= 99)
    .slice(0, MAX_ITEMS);
  if (!name || !clean.length) {
    return res.status(400).json({ ok: false, error: 'Нужно название и хотя бы один аромат.' });
  }
  const token = crypto.randomBytes(12).toString('hex');
  const info = db
    .prepare('INSERT INTO aroma_blends (name, author, items, delete_token) VALUES (?, ?, ?, ?)')
    .run(name, author, JSON.stringify(clean), token);
  res.json({ ok: true, id: info.lastInsertRowid, token });
});

router.delete('/blends/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT delete_token FROM aroma_blends WHERE id = ?').get(id);
  if (!row) return res.json({ ok: true });
  const admin = Boolean(req.session && req.session.adminId);
  const token = String(req.get('X-Blend-Token') || req.query.token || '');
  if (!admin && (!token || token !== row.delete_token)) {
    return res.status(403).json({ ok: false, error: 'Удалить может только автор состава.' });
  }
  db.prepare('DELETE FROM aroma_blends WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
