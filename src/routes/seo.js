const express = require('express');
const db = require('../db');
const { CANONICAL_MAIN } = require('../config/domains');

const router = express.Router();
const BASE = 'https://' + CANONICAL_MAIN;

// Разделы без своих записей — их адреса не выводятся из базы.
// Порядок задаёт приоритет: чем выше, тем важнее страница для поиска.
const STATIC_PAGES = [
  ['/', 1.0],
  ['/music', 0.9],
  ['/catalog', 0.9],
  ['/about', 0.8],
  ['/news', 0.8],
  ['/diary', 0.7],
  ['/style', 0.7],
  ['/gigs', 0.7],
  ['/drops', 0.7],
  ['/redheads', 0.6],
  ['/brands', 0.6],
  ['/contest', 0.6],
  ['/b', 0.5],
  ['/en/news', 0.4],
  ['/legal/oferta', 0.3],
  ['/legal/privacy', 0.3],
  ['/legal/payment', 0.3],
  ['/legal/delivery', 0.3],
  ['/legal/returns', 0.3],
];

// Страницы, которым в поиске делать нечего: личные, служебные и те,
// что существуют в бесконечном числе вариантов (поиск, корзина).
// Ссылки на скачивание закрыты отдельно — они одноразовые и именные.
const DISALLOW = [
  '/admin',
  '/cart',
  '/checkout',
  '/downloads',
  '/search',
  '/unsubscribe',
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Дата в формате W3C, который ждут поисковики: 2026-09-03.
function lastmod(value) {
  const s = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function rows(sql, params = []) {
  try {
    return db.prepare(sql).all(...params);
  } catch (err) {
    // Карта сайта не должна падать целиком из-за одной таблицы:
    // лучше отдать её без одного раздела, чем не отдать вовсе.
    console.error('[sitemap] Не удалось прочитать раздел:', err.message);
    return [];
  }
}

function collectUrls() {
  const urls = STATIC_PAGES.map(([loc, priority]) => ({ loc, priority }));

  for (const r of rows("SELECT slug, created_at FROM releases WHERE is_published = 1")) {
    urls.push({ loc: `/music/${r.slug}`, priority: 0.8, lastmod: lastmod(r.created_at) });
  }
  for (const t of rows(`
    SELECT t.slug AS slug, r.slug AS release_slug, t.created_at AS created_at
    FROM tracks t JOIN releases r ON r.id = t.release_id
    WHERE t.is_published = 1 AND r.is_published = 1 AND t.slug IS NOT NULL
  `)) {
    urls.push({ loc: `/music/${t.release_slug}/${t.slug}`, priority: 0.6, lastmod: lastmod(t.created_at) });
  }
  for (const p of rows("SELECT slug, created_at FROM products WHERE is_active = 1")) {
    urls.push({ loc: `/catalog/${p.slug}`, priority: 0.8, lastmod: lastmod(p.created_at) });
  }
  for (const c of rows("SELECT slug, created_at FROM collections WHERE is_published = 1")) {
    urls.push({ loc: `/drops/${c.slug}`, priority: 0.6, lastmod: lastmod(c.created_at) });
  }
  for (const n of rows("SELECT slug, lang, created_at FROM news WHERE is_published = 1")) {
    const prefix = n.lang === 'en' ? '/en/news' : '/news';
    urls.push({ loc: `${prefix}/${n.slug}`, priority: 0.6, lastmod: lastmod(n.created_at) });
  }
  for (const d of rows("SELECT slug, created_at FROM diary_posts WHERE is_published = 1")) {
    urls.push({ loc: `/diary/${d.slug}`, priority: 0.6, lastmod: lastmod(d.created_at) });
  }

  // Записи, датированные будущим, в карту не попадают: обещать поисковику
  // страницу, которой ещё не время, — верный способ получить её в выдаче
  // раньше срока.
  const today = new Date().toISOString().slice(0, 10);
  return urls.filter((u) => !u.lastmod || u.lastmod <= today);
}

router.get('/robots.txt', (req, res) => {
  const lines = ['User-agent: *'];
  for (const path of DISALLOW) lines.push(`Disallow: ${path}`);
  lines.push('');
  // Яндекс до сих пор понимает Host как указание на главное зеркало —
  // у нас восемнадцать доменов, и лишним это не будет.
  lines.push(`Host: ${CANONICAL_MAIN}`);
  lines.push(`Sitemap: ${BASE}/sitemap.xml`);
  res.type('text/plain; charset=utf-8').send(lines.join('\n') + '\n');
});

router.get('/sitemap.xml', (req, res) => {
  const urls = collectUrls();
  const body = urls
    .map((u) => {
      const parts = [`    <loc>${xmlEscape(BASE + u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  res
    .type('application/xml; charset=utf-8')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

module.exports = router;
