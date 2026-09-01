const express = require('express');
const db = require('../db');
const { findByKey, registerOwner } = require('../utils/busts');
const { getSettings } = require('../utils/settings');

const router = express.Router();

// Простой счётчик попыток по IP. Хвост кода — четыре знака из тридцати одного,
// это около 923 тысяч вариантов: перебором не взять, если перебор притормозить.
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

  // подчищаем старые записи, чтобы карта не росла бесконечно
  if (attempts.size > 5000) {
    for (const [key, value] of attempts) {
      if (now - value.start > WINDOW_MS) attempts.delete(key);
    }
  }
  return rec.count > MAX_ATTEMPTS;
}

function bonusLinks() {
  const s = getSettings();
  return {
    bonusUrl: s.bust_bonus_url || '',
    storyUrl: s.bust_story_url || '',
  };
}

function renderBust(res, found, extra = {}) {
  const { bust, matchedBy } = found;
  // Подлинность подтверждает только то, что нельзя угадать
  const verified = matchedBy === 'code' || matchedBy === 'nfc';
  res.render('bust', {
    title: `Экземпляр №${String(bust.number).padStart(3, '0')}`,
    bust,
    verified,
    total: db.prepare('SELECT COUNT(*) AS c FROM busts').get().c,
    ...bonusLinks(),
    justRegistered: false,
    error: null,
    ...extra,
  });
}

function notFound(res, query, status = 404) {
  return res.status(status).render('bust-lookup', {
    title: 'Проверка подлинности',
    error: 'Такой код не найден. Проверьте карточку из коробки — код легко перепутать при переписывании.',
    query,
  });
}

router.get('/', (req, res) => {
  res.render('bust-lookup', { title: 'Проверка подлинности', error: null, query: '' });
});

router.post('/', (req, res) => {
  const key = (req.body.key || '').trim();
  if (tooManyAttempts(req)) {
    return res.status(429).render('bust-lookup', {
      title: 'Проверка подлинности',
      error: 'Слишком много попыток подряд. Подождите несколько минут и попробуйте снова.',
      query: '',
    });
  }
  const found = findByKey(key);
  if (!found) return notFound(res, key);
  res.redirect(`/b/${encodeURIComponent(found.matchedBy === 'number' ? found.bust.number : found.bust.code)}`);
});

// Страница экземпляра. Сюда же ведёт NFC-метка.
router.get('/:key', (req, res) => {
  if (tooManyAttempts(req)) {
    return notFound(res, '', 429);
  }
  const found = findByKey(req.params.key);
  if (!found) return notFound(res, req.params.key);
  renderBust(res, found);
});

router.post('/:key/register', (req, res) => {
  const found = findByKey(req.params.key);
  if (!found) return res.status(404).render('404');

  // Закрепить можно только по коду или метке: по номеру это позволило бы
  // присвоить чужую вещь, просто перебрав номера подряд
  if (found.matchedBy === 'number') {
    return renderBust(res, found, {
      error: 'Закрепить экземпляр можно только по коду с карточки или по метке на вещи.',
    });
  }

  const { ownerName, ownerEmail, dataConsent } = req.body;
  const fail = (error) => renderBust(res, found, { error });

  if (found.bust.registered_at) {
    return fail('Этот экземпляр уже закреплён. Если это ваша вещь, а закрепили не вы — напишите нам.');
  }
  if (!ownerName || !ownerEmail) return fail('Заполните имя и почту.');
  if (!dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const updated = registerOwner(found.bust.id, ownerName, ownerEmail);
  renderBust(res, { bust: updated, matchedBy: found.matchedBy }, { justRegistered: true });
});

module.exports = router;
