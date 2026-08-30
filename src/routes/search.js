const express = require('express');
const db = require('../db');

const router = express.Router();

// Поиск по опубликованным материалам сайта. LIKE достаточно: объём небольшой,
// полнотекстовый индекс тут был бы избыточен.
const ESC = "ESCAPE '\\'";

function like(query) {
  return '%' + query.replace(/[%_\\]/g, function (m) { return '\\' + m; }) + '%';
}

// У Льва есть трек «d r e a m» — с пробелами между буквами. Чтобы он находился
// по обычному «dream», для коротких однословных запросов дополнительно ищем
// вариант с любыми символами между буквами.
function spacedLike(query) {
  if (/[^a-zа-яё0-9]/i.test(query) || query.length < 3 || query.length > 20) return null;
  return '%' + query.split('').join('%') + '%';
}

function search(query) {
  const q = like(query);
  const qs = spacedLike(query);
  const groups = [];

  const news = db.prepare(
    "SELECT title, slug, created_at FROM news WHERE is_published = 1 AND lang = 'ru' " +
    "AND (title LIKE ? " + ESC + " OR content LIKE ? " + ESC + ") ORDER BY created_at DESC LIMIT 20"
  ).all(q, q);
  if (news.length) {
    groups.push({ title: 'Новости', items: news.map((n) => ({ title: n.title, url: '/news/' + n.slug, note: n.created_at.slice(0, 10) })) });
  }

  const diary = db.prepare(
    "SELECT title, slug, created_at FROM diary_posts WHERE is_published = 1 " +
    "AND (title LIKE ? " + ESC + " OR excerpt LIKE ? " + ESC + " OR content LIKE ? " + ESC + ") ORDER BY created_at DESC LIMIT 20"
  ).all(q, q, q);
  if (diary.length) {
    groups.push({ title: 'Дневник', items: diary.map((d) => ({ title: d.title, url: '/diary/' + d.slug, note: d.created_at.slice(0, 10) })) });
  }

  const releases = db.prepare(
    "SELECT title, slug, release_type, year FROM releases WHERE is_published = 1 " +
    "AND (title LIKE ? " + ESC + " OR description LIKE ? " + ESC + ") ORDER BY sort_order LIMIT 20"
  ).all(q, q);
  if (releases.length) {
    groups.push({ title: 'Релизы', items: releases.map((r) => ({ title: r.title, url: '/music/' + r.slug, note: [r.release_type, r.year].filter(Boolean).join(' · ') })) });
  }

  const tracks = db.prepare(
    "SELECT tracks.title, tracks.slug AS track_slug, releases.slug AS release_slug, releases.title AS release_title " +
    "FROM tracks LEFT JOIN releases ON releases.id = tracks.release_id WHERE tracks.is_published = 1 " +
    "AND (tracks.title LIKE ? " + ESC + " OR tracks.description LIKE ? " + ESC + " OR (? IS NOT NULL AND tracks.title LIKE ?)) " +
    "ORDER BY tracks.sort_order LIMIT 20"
  ).all(q, q, qs, qs);
  const trackItems = tracks
    .filter((t) => t.release_slug && t.track_slug)
    .map((t) => ({ title: t.title, url: '/music/' + t.release_slug + '/' + t.track_slug, note: t.release_title }));
  if (trackItems.length) {
    groups.push({ title: 'Треки', items: trackItems });
  }

  const products = db.prepare(
    "SELECT name, slug, price FROM products WHERE is_active = 1 " +
    "AND (name LIKE ? " + ESC + " OR description LIKE ? " + ESC + ") ORDER BY name LIMIT 20"
  ).all(q, q);
  if (products.length) {
    groups.push({ title: 'Товары', items: products.map((p) => ({ title: p.name, url: '/catalog/' + p.slug, note: p.price ? p.price + ' RUB' : '' })) });
  }

  return groups;
}

router.get('/', (req, res) => {
  const query = String(req.query.q || '').trim();
  const groups = query.length >= 2 ? search(query) : [];
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  res.render('search', { query, groups, total });
});

module.exports = router;
