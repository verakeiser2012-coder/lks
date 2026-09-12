// Единая кнопка «Скрыть с сайта / Показать на сайте» для списков админки.
// Это не удаление и не архив: запись остаётся, просто не показывается посетителям.
// POST /admin/visibility/<тип>/<id> переключает флаг и возвращает на страницу списка.
const express = require('express');
const db = require('../../db');

const router = express.Router();

const KINDS = {
  collections: { table: 'collections', column: 'is_published', back: '/admin/collections' },
  products: { table: 'products', column: 'is_active', back: '/admin/products' },
  releases: { table: 'releases', column: 'is_published', back: '/admin/releases' },
  tracks: { table: 'tracks', column: 'is_published', back: '/admin/tracks' },
  diary: { table: 'diary_posts', column: 'is_published', back: '/admin/diary' },
  news: { table: 'news', column: 'is_published', back: '/admin/news' },
  creatives: { table: 'podcast_episodes', column: 'is_published', back: '/admin/creatives' },
};

router.post('/:kind/:id', (req, res) => {
  const kind = KINDS[req.params.kind];
  if (!kind) return res.status(404).render('404');
  const row = db.prepare(`SELECT id, ${kind.column} AS flag FROM ${kind.table} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).render('404');
  db.prepare(`UPDATE ${kind.table} SET ${kind.column} = ? WHERE id = ?`).run(row.flag ? 0 : 1, row.id);
  res.redirect(kind.back);
});

module.exports = router;
