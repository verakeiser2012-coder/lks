// Админка → Переводы: кэш фраз английской версии сайта (page_translations).
// Здесь можно поправить автоперевод руками (edited = 1, дальше не перезаписывается)
// или сбросить фразу, чтобы при следующем показе страницы она перевелась заново.
const express = require('express');
const db = require('../../db');
const { setManual, resetTranslation } = require('../../services/pageTranslate');

const router = express.Router();
const PER_PAGE = 50;

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const onlyEdited = req.query.edited === '1';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const where = [];
  const params = [];
  if (q) { where.push('(src LIKE ? OR dst LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (onlyEdited) where.push('edited = 1');
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM page_translations ${whereSql}`).get(...params).c;
  const rows = db.prepare(`
    SELECT * FROM page_translations ${whereSql}
    ORDER BY edited DESC, updated_at DESC, id DESC LIMIT ? OFFSET ?
  `).all(...params, PER_PAGE, (page - 1) * PER_PAGE);
  const stats = db.prepare('SELECT COUNT(*) AS total, SUM(edited) AS edited FROM page_translations').get();
  res.render('admin/translations', {
    rows, q, onlyEdited, page, total, pages: Math.max(1, Math.ceil(total / PER_PAGE)),
    stats, msg: req.query.msg || '',
  });
});

function backUrl(req, msg) {
  const params = new URLSearchParams();
  if (req.body.q) params.set('q', req.body.q);
  if (req.body.edited) params.set('edited', '1');
  if (req.body.page) params.set('page', req.body.page);
  if (msg) params.set('msg', msg);
  const qs = params.toString();
  return '/admin/translations' + (qs ? '?' + qs : '');
}

router.post('/:id', (req, res) => {
  const dst = String(req.body.dst || '').trim();
  if (!dst) return res.redirect(backUrl(req, 'Перевод пустой — не сохранил.'));
  const ok = setManual(Number(req.params.id), dst);
  res.redirect(backUrl(req, ok ? 'Перевод сохранён.' : 'Фраза не найдена.'));
});

router.post('/:id/reset', (req, res) => {
  const ok = resetTranslation(Number(req.params.id));
  res.redirect(backUrl(req, ok ? 'Фраза сброшена — переведётся заново при следующем показе страницы.' : 'Фраза не найдена.'));
});

module.exports = router;
