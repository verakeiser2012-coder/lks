const express = require('express');
const db = require('../db');
const { findByKey, registerOwner } = require('../utils/busts');
const { getSettings } = require('../utils/settings');

const router = express.Router();

function bonusLinks() {
  const s = getSettings();
  return {
    bonusUrl: s.bust_bonus_url || '',
    storyUrl: s.bust_story_url || '',
  };
}

// Форма ввода номера — сюда попадают, если код набрали руками
router.get('/', (req, res) => {
  res.render('bust-lookup', { title: 'Проверка подлинности', error: null, query: '' });
});

router.post('/', (req, res) => {
  const key = (req.body.key || '').trim();
  const bust = findByKey(key);
  if (!bust) {
    return res.status(404).render('bust-lookup', {
      title: 'Проверка подлинности',
      error: 'Такой номер не найден. Проверьте код с карточки — его легко перепутать при переписывании.',
      query: key,
    });
  }
  res.redirect(`/b/${encodeURIComponent(bust.code)}`);
});

// Страница экземпляра. Сюда же ведёт NFC-метка.
router.get('/:key', (req, res) => {
  const bust = findByKey(req.params.key);
  if (!bust) {
    return res.status(404).render('bust-lookup', {
      title: 'Проверка подлинности',
      error: 'Такой номер не найден. Проверьте код с карточки — его легко перепутать при переписывании.',
      query: req.params.key,
    });
  }

  const total = db.prepare('SELECT COUNT(*) AS c FROM busts').get().c;
  res.render('bust', {
    title: `Экземпляр №${String(bust.number).padStart(3, '0')}`,
    bust,
    total,
    ...bonusLinks(),
    justRegistered: false,
    error: null,
  });
});

router.post('/:key/register', (req, res) => {
  const bust = findByKey(req.params.key);
  if (!bust) {
    return res.status(404).render('404');
  }

  const total = db.prepare('SELECT COUNT(*) AS c FROM busts').get().c;
  const { ownerName, ownerEmail, dataConsent } = req.body;

  const back = (error) =>
    res.render('bust', {
      title: `Экземпляр №${String(bust.number).padStart(3, '0')}`,
      bust,
      total,
      ...bonusLinks(),
      justRegistered: false,
      error,
    });

  if (bust.registered_at) {
    return back('Этот экземпляр уже закреплён. Если это ваша вещь, а закрепили не вы — напишите нам.');
  }
  if (!ownerName || !ownerEmail) {
    return back('Заполните имя и почту.');
  }
  if (!dataConsent) {
    return back('Подтвердите согласие на обработку персональных данных.');
  }

  const updated = registerOwner(bust.id, ownerName, ownerEmail);
  res.render('bust', {
    title: `Экземпляр №${String(updated.number).padStart(3, '0')}`,
    bust: updated,
    total,
    ...bonusLinks(),
    justRegistered: true,
    error: null,
  });
});

module.exports = router;
