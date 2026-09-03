const express = require('express');
const db = require('../db');
const { notify } = require('../services/mail');
const { isBot, overLimit } = require('../middleware/antispam');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Тема определяет ящик: сотрудничество и выступления читают в разных местах,
// и общий info@ для них означал бы лишнюю пересылку руками.
const TOPICS = [
  { key: 'question', label: 'Вопрос', to: 'info@levkeiser.com' },
  { key: 'brand', label: 'Сотрудничество с брендом', to: 'brand@levkeiser.com' },
  { key: 'booking', label: 'Выступление', to: 'booking@levkeiser.com' },
  { key: 'vocal', label: 'Предложить вокал или трек', to: 'booking@levkeiser.com' },
  { key: 'order', label: 'Вопрос по заказу', to: 'info@levkeiser.com' },
];

function view(res, extra = {}) {
  res.render('contact', {
    title: 'Написать',
    topics: TOPICS,
    error: null,
    sent: false,
    form: { topic: '', name: '', email: '', body: '' },
    ...extra,
  });
}

router.get('/', (req, res) => view(res));

router.post('/', async (req, res, next) => {
  const form = {
    topic: String(req.body.topic || ''),
    name: String(req.body.name || '').trim(),
    email: String(req.body.email || '').trim(),
    body: String(req.body.body || '').trim(),
  };

  // Боту отвечаем тем же экраном «отправлено», ничего не сохраняя:
  // так он не узнает, что его отсеяли, и не станет подбирать обход.
  if (isBot(req) || overLimit('contact', req)) {
    return view(res, { sent: true });
  }

  const topic = TOPICS.find((t) => t.key === form.topic);
  const fail = (error) => view(res, { error, form });

  if (!topic) return fail('Выберите тему обращения.');
  if (!form.name) return fail('Как к вам обращаться?');
  if (!EMAIL_RE.test(form.email)) return fail('Проверьте адрес почты — на него придёт ответ.');
  if (form.body.length < 10) return fail('Напишите чуть подробнее, чтобы можно было ответить по существу.');
  if (form.body.length > 5000) return fail('Слишком длинное сообщение — уместите в 5000 знаков.');
  if (!req.body.dataConsent) return fail('Подтвердите согласие на обработку персональных данных.');

  const info = db
    .prepare('INSERT INTO messages (topic, name, email, body, sent_to) VALUES (?, ?, ?, ?, ?)')
    .run(topic.label, form.name, form.email, form.body, topic.to);

  // Сначала записали, потом отправляем: письмо может не дойти или уехать
  // в спам, и тогда обращение осталось бы только в почте, которой нет.
  const text = [
    `Тема: ${topic.label}`,
    `Имя: ${form.name}`,
    `Почта: ${form.email}`,
    '',
    form.body,
    '',
    `— обращение №${info.lastInsertRowid} с сайта levkeiser.com`,
  ].join('\n');

  try {
    await notify(`Обращение с сайта: ${topic.label}`, text, topic.to);
  } catch (err) {
    db.prepare('UPDATE messages SET mail_error = ? WHERE id = ?').run(err.message, info.lastInsertRowid);
  }

  view(res, { sent: true });
});

module.exports = router;
