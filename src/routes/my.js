const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const account = require('../services/account');
const { orderUrl, STATUS_LABELS } = require('../services/orderPage');

// «Мой кабинет» — см. services/account.js про вход по ссылке без пароля.
// Разделы: заказы, файлы, нумерованные экземпляры, рецепты с карты ароматов, рассылка.

const router = express.Router();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SITE = process.env.SITE_URL || 'https://levkeiser.com';

// Куда вернуть после входа по ссылке: только свои относительные пути,
// иначе ссылка из письма стала бы открытым редиректом.
function safeReturn(to) {
  const s = String(to || '');
  return /^\/(?!\/)[\w\-./?=&%#+]*$/.test(s) ? s : '/my';
}

function requireAccount(req, res, next) {
  if (!res.locals.account) {
    if (req.accepts(['html', 'json']) === 'json') return res.status(401).json({ ok: false, error: 'Нужен вход по почте.', login: '/my' });
    return res.redirect('/my');
  }
  next();
}

function cabinet(email) {
  const orders = db.prepare('SELECT * FROM orders WHERE lower(email) = lower(?) ORDER BY id DESC').all(email);
  const itemsStmt = db.prepare('SELECT product_name, qty FROM order_items WHERE order_id = ?');
  const filesStmt = db.prepare('SELECT product_name, token, max_downloads, downloads_count, expires_at FROM downloads WHERE order_id = ?');
  const list = orders.map((o) => ({
    ...o,
    url: orderUrl(o.id),
    statusLabel: STATUS_LABELS[o.status] || o.status,
    items: itemsStmt.all(o.id),
    files: o.payment_status === 'paid' ? filesStmt.all(o.id) : [],
  }));
  const busts = db.prepare('SELECT number, code, kind, series, material, phrase FROM busts WHERE lower(owner_email) = lower(?) ORDER BY number').all(email);
  const tags = db.prepare('SELECT number, code, kind, label, bonus_label FROM nfc_tags WHERE lower(owner_email) = lower(?) ORDER BY number').all(email);
  const recipes = db.prepare('SELECT id, name, code, created_at FROM aroma_recipes WHERE email = ? ORDER BY id DESC').all(email.toLowerCase());
  const subscribed = Boolean(db.prepare('SELECT 1 FROM subscribers WHERE lower(email) = lower(?)').get(email));
  return { orders: list, files: list.flatMap((o) => o.files.map((f) => ({ ...f, orderId: o.id }))), busts, tags, recipes, subscribed };
}

router.get('/', (req, res) => {
  const a = res.locals.account;
  if (!a) return res.render('my-login', { sent: false, email: '', error: null, title: 'Мой кабинет', to: safeReturn(req.query.to) });
  res.render('my', { ...cabinet(a.email), email: a.email, title: 'Мой кабинет', flash: req.query.ok ? String(req.query.ok) : '' });
});

// Запрос ссылки. Ответ одинаковый, есть такая почта в базе или нет.
router.post('/', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const to = safeReturn(req.body && req.body.to);
  const wantsJson = req.is('application/json') || req.accepts(['html', 'json']) === 'json';
  const reply = (sent, error, code) => {
    if (wantsJson) return res.status(code || 200).json({ ok: sent, error: error || null });
    return res.status(code || 200).render('my-login', { sent, email, error, title: 'Мой кабинет', to });
  };
  if (isBot(req) || overLimit('orders', req, 5, 60 * 60 * 1000)) return reply(true, null);
  if (!EMAIL_RE.test(email)) return reply(false, 'Введите почту — на неё придёт ссылка.', 400);

  const token = account.issueLink(email);
  const link = `${SITE}/my/${token}${to !== '/my' ? '?to=' + encodeURIComponent(to) : ''}`;
  const orders = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE lower(email) = lower(?)').get(email).n;
  const text = [
    'Здравствуйте!',
    '',
    'Вы запросили вход в кабинет на levkeiser.com. Откройте по ссылке:',
    link,
    '',
    orders ? `Там ваши заказы (${orders}), файлы и статусы доставки, ` : 'Там ваши ',
    'нумерованные экземпляры, рецепты с карты ароматов и подписка на новости.',
    `Ссылка личная и действует ${account.TTL_DAYS} дней — не пересылайте её. Если запрос делали не вы, просто удалите письмо.`,
    '',
    'Лев Кейсер',
  ].join('\n');
  notify('Вход в кабинет — levkeiser.com', text, email).catch(() => {});
  reply(true, null);
});

// Вход по ссылке из письма: ставим cookie и ведём в кабинет (или туда, откуда просили).
router.get('/:token([a-f0-9]{32})', (req, res) => {
  const link = account.findLink(req.params.token);
  if (!link) return res.status(404).render('my-login', { sent: false, email: '', error: 'Ссылка устарела или неверна — запросите новую.', title: 'Мой кабинет', to: '/my' });
  account.setCookie(req, res, link.token);
  res.redirect(safeReturn(req.query.to));
});

router.post('/logout', (req, res) => {
  account.clearCookie(res);
  res.redirect('/my');
});

// Рассылка: подписка и отписка с почты кабинета.
router.post('/subscribe', requireAccount, (req, res) => {
  try {
    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(res.locals.account.email);
  } catch (err) {
    if (!String(err.message).includes('UNIQUE')) throw err;
  }
  res.redirect('/my?ok=' + encodeURIComponent('Подписка включена.'));
});
router.post('/unsubscribe', requireAccount, (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE lower(email) = lower(?)').run(res.locals.account.email);
  res.redirect('/my?ok=' + encodeURIComponent('Подписка выключена.'));
});

// ---- Рецепты с карты ароматов -------------------------------------------------
// Рецепт — состав в том же коде, что в ссылке карты (ladan.4_labdanum.3): коды
// ароматов устойчивы, поэтому рецепт переживёт обновление карты.
const CODE_RE = /^[a-z0-9-]+\.\d{1,2}(_[a-z0-9-]+\.\d{1,2}){0,23}$/;

router.post('/recipes', requireAccount, (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 80);
  const code = String((req.body && req.body.code) || '').trim();
  if (!name || !CODE_RE.test(code)) return res.status(400).json({ ok: false, error: 'Нужно название и состав.' });
  const email = res.locals.account.email;
  const dup = db.prepare('SELECT id FROM aroma_recipes WHERE email = ? AND code = ?').get(email, code);
  if (dup) return res.json({ ok: true, id: dup.id, existed: true });
  const count = db.prepare('SELECT COUNT(*) AS n FROM aroma_recipes WHERE email = ?').get(email).n;
  if (count >= 200) return res.status(400).json({ ok: false, error: 'Слишком много рецептов — удалите ненужные в кабинете.' });
  const info = db.prepare('INSERT INTO aroma_recipes (email, name, code) VALUES (?, ?, ?)').run(email, name, code);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.post('/recipes/:id/delete', requireAccount, (req, res) => {
  db.prepare('DELETE FROM aroma_recipes WHERE id = ? AND email = ?').run(Number(req.params.id), res.locals.account.email);
  res.redirect('/my?ok=' + encodeURIComponent('Рецепт удалён.'));
});

module.exports = router;
