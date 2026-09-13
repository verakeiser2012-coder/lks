const express = require('express');
const db = require('../../db');
const { collect, sendDailyReport, localDay } = require('../../services/dailyReport');

const router = express.Router();

// Отчёт за день: по умолчанию сегодняшний, любой другой — ?day=YYYY-MM-DD.
router.get('/', (req, res) => {
  const today = localDay();
  const raw = String(req.query.day || '');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today;
  const last = db.prepare("SELECT value FROM settings WHERE key = 'daily_report_last_sent'").get();
  res.render('admin/reports', {
    report: collect(day),
    today,
    lastSent: last ? last.value : '',
    sendHour: Number(process.env.DAILY_REPORT_HOUR || 9),
  });
});

router.post('/send', async (req, res, next) => {
  const raw = String(req.body.day || '');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDay();
  try {
    await sendDailyReport(day);
    res.redirect(`/admin/reports?day=${day}&sent=1`);
  } catch (err) { next(err); }
});

module.exports = router;
