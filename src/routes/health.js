const express = require('express');
const db = require('../db');

// GET /health — точка для внешнего монитора (UptimeRobot и подобные).
//
// Отвечает 200 и коротким JSON, если приложение живо и база открывается.
// Если база не отвечает — 503, чтобы монитор поднял тревогу, а не считал
// «страница есть, значит всё хорошо». В nginx этот адрес открыт без пароля
// (deploy/add-health-nginx.sh): монитор должен видеть его и пока сайт закрыт.
//
// Ничего лишнего наружу не отдаём: ни версий, ни путей, ни настроек.

const router = express.Router();
const startedAt = Date.now();

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, uptime: Math.round((Date.now() - startedAt) / 1000) });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'db' });
  }
});

module.exports = router;
