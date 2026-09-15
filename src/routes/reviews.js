// Отзывы: общая страница /reviews, форма со страницы заказа (/order/<токен>/review)
// и форма по приглашению (/review/<токен>) для клиентов услуги. Всё уходит на модерацию.
const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');

const router = express.Router();

const SITE = process.env.SITE_URL || 'https://levkeiser.com';
const TOKEN_RE = /^[a-f0-9]{32}$/;

function approved(where = '', params = []) {
  return db.prepare(`SELECT * FROM reviews WHERE status = 'approved' ${where} ORDER BY created_at DESC`).all(...params);
}

function validate(body) {
  const name = String(body.name || '').trim().slice(0, 80);
  const rating = Math.min(5, Math.max(1, Number(body.rating) || 0));
  const text = String(body.body || '').trim().slice(0, 3000);
  if (!name) return { error: 'Как вас подписать?' };
  if (!Number(body.rating)) return { error: 'Поставьте оценку.' };
  if (text.length < 10) return { error: 'Напишите хотя бы пару фраз.' };
  return { name, rating, text };
}

function afterSubmit(reviewId) {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
  notify(`Новый отзыв: ${r.subject} (${r.rating}/5)`, `${r.author_name}:\n\n${r.body}\n\nПроверить: ${SITE}/admin/reviews`)
    .catch((err) => console.error('[reviews] уведомление:', err.message));
}

router.get('/reviews', (req, res) => {
  res.render('reviews', {
    title: 'Отзывы',
    pageDescription: 'Отзывы покупателей о вещах и музыке Льва Кейсера и клиентов услуги «Коллегам за копеечку».',
    products: approved("AND kind = 'product'"),
    services: approved("AND kind = 'service'"),
  });
});

// ---- отзыв по заказу ----
function orderByToken(token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  return db.prepare("SELECT * FROM orders WHERE access_token = ? AND payment_status = 'paid'").get(token);
}
function orderItems(order) {
  const items = db.prepare('SELECT DISTINCT product_id, product_name FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  const done = new Set(db.prepare('SELECT product_id FROM reviews WHERE order_id = ?').all(order.id).map((r) => r.product_id));
  return items.map((i) => ({ ...i, reviewed: done.has(i.product_id) }));
}

router.get('/order/:token/review', (req, res) => {
  const order = orderByToken(req.params.token);
  if (!order) return res.status(404).render('404');
  res.render('review-form', { title: 'Отзыв', kind: 'product', items: orderItems(order), name: order.customer_name, action: `/order/${order.access_token}/review`, back: `/order/${order.access_token}`, sent: false, error: null, form: {} });
});

router.post('/order/:token/review', (req, res) => {
  const order = orderByToken(req.params.token);
  if (!order) return res.status(404).render('404');
  const items = orderItems(order);
  const view = (extra) => res.render('review-form', { title: 'Отзыв', kind: 'product', items, name: order.customer_name, action: `/order/${order.access_token}/review`, back: `/order/${order.access_token}`, sent: false, error: null, form: req.body, ...extra });
  if (isBot(req) || overLimit('review', req, 5, 60 * 60 * 1000)) return view({ sent: true });
  const item = items.find((i) => String(i.product_id) === String(req.body.product_id));
  if (!item) return view({ error: 'Выберите, о чём отзыв.' });
  if (item.reviewed) return view({ error: 'Отзыв об этой вещи по этому заказу уже есть.' });
  const v = validate(req.body);
  if (v.error) return view({ error: v.error });
  const info = db.prepare("INSERT INTO reviews (kind, product_id, subject, order_id, author_name, rating, body) VALUES ('product', ?, ?, ?, ?, ?, ?)")
    .run(item.product_id, item.product_name, order.id, v.name, v.rating, v.text);
  afterSubmit(info.lastInsertRowid);
  view({ sent: true });
});

// ---- отзыв по приглашению (услуга или вещь без заказа на сайте) ----
function inviteByToken(token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  return db.prepare('SELECT * FROM review_invites WHERE token = ? AND used = 0').get(token);
}

router.get('/review/:token', (req, res) => {
  const inv = inviteByToken(req.params.token);
  if (!inv) return res.status(404).render('404');
  res.render('review-form', { title: 'Отзыв', kind: inv.kind, items: [{ product_id: 0, product_name: inv.subject, reviewed: false }], name: inv.client_name, action: `/review/${inv.token}`, back: inv.kind === 'service' ? '/services' : '/catalog', sent: false, error: null, form: {} });
});

router.post('/review/:token', (req, res) => {
  const inv = inviteByToken(req.params.token);
  if (!inv) return res.status(404).render('404');
  const view = (extra) => res.render('review-form', { title: 'Отзыв', kind: inv.kind, items: [{ product_id: 0, product_name: inv.subject, reviewed: false }], name: inv.client_name, action: `/review/${inv.token}`, back: inv.kind === 'service' ? '/services' : '/catalog', sent: false, error: null, form: req.body, ...extra });
  if (isBot(req) || overLimit('review', req, 5, 60 * 60 * 1000)) return view({ sent: true });
  const v = validate(req.body);
  if (v.error) return view({ error: v.error });
  const info = db.prepare('INSERT INTO reviews (kind, product_id, subject, invite_id, author_name, rating, body) VALUES (?, NULL, ?, ?, ?, ?, ?)')
    .run(inv.kind, inv.subject, inv.id, v.name, v.rating, v.text);
  db.prepare('UPDATE review_invites SET used = 1 WHERE id = ?').run(inv.id);
  afterSubmit(info.lastInsertRowid);
  view({ sent: true });
});

module.exports = { router, approved };
