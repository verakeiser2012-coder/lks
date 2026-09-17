const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../db');
const { findByKey, countScan, registerOwner, kindInfo } = require('../utils/tags');
const { digitalDir } = require('../middleware/upload');

const router = express.Router();

// Перебор хвостов кода притормаживаем так же, как у бюстов.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

function tooManyAttempts(req) {
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const rec = attempts.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  if (attempts.size > 5000) {
    for (const [key, value] of attempts) {
      if (now - value.start > WINDOW_MS) attempts.delete(key);
    }
  }
  return rec.count > MAX_ATTEMPTS;
}

function productOf(tag) {
  if (!tag.product_id) return null;
  return db.prepare('SELECT id, name, slug, image FROM products WHERE id = ?').get(tag.product_id);
}

function renderTag(res, found, extra = {}) {
  const { tag, matchedBy } = found;
  res.render('tag', {
    title: tag.label || `${kindInfo(tag.kind).label} №${String(tag.number).padStart(3, '0')}`,
    tag,
    kindLabel: kindInfo(tag.kind).label,
    product: productOf(tag),
    verified: matchedBy === 'code' || matchedBy === 'nfc',
    error: null,
    justRegistered: false,
    ...extra,
  });
}

function notFound(res, status = 404) {
  res.status(status).render('tag-notfound', { title: 'Метка не найдена' });
}

// Сюда ведёт метка (ссылка /n/<код>) и код с карточки.
router.get('/:key', (req, res) => {
  if (tooManyAttempts(req)) return notFound(res, 429);
  const found = findByKey(req.params.key);
  if (!found) return notFound(res);
  countScan(found.tag.id);
  // Метка-перенаправление: без бонуса и без страницы, просто ведёт куда сказано
  if (found.tag.target_url && !found.tag.bonus_file) {
    return res.redirect(found.tag.target_url);
  }
  renderTag(res, found);
});

router.get('/:key/file', (req, res) => {
  const found = findByKey(req.params.key);
  if (!found || !found.tag.bonus_file) return res.status(404).render('404');
  // basename отсекает попытку подсунуть путь наружу через имя файла в базе
  const filePath = path.join(digitalDir, path.basename(found.tag.bonus_file));
  if (!fs.existsSync(filePath)) {
    console.error('[tags] Файл бонуса не найден на диске:', filePath);
    return res.status(404).render('404');
  }
  res.download(filePath, path.basename(found.tag.bonus_file));
});

router.post('/:key/register', (req, res) => {
  const found = findByKey(req.params.key);
  if (!found) return res.status(404).render('404');
  const { ownerName, ownerEmail, dataConsent } = req.body;
  const fail = (error) => renderTag(res, found, { error });

  if (found.tag.registered_at) {
    return fail('Этот экземпляр уже закреплён. Если это ваша вещь, а закрепили не вы — напишите нам.');
  }
  if (!ownerName || !ownerEmail) return fail('Заполните имя и почту.');
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const updated = registerOwner(found.tag.id, ownerName, ownerEmail);
  renderTag(res, { tag: updated, matchedBy: found.matchedBy }, { justRegistered: true });
});

module.exports = router;
