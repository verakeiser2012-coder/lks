// Запускается НА СЕРВЕРЕ. Печатает список записей содержимого — по чему их
// узнавать (слаг, имя, текст), а не по id: id на сервере и локально разные.
//
//   ssh djlevka-vps "cd /var/www/site && node deploy/dump_content_keys.js" > deploy/data/server_keys.json

const db = require('../src/db');

const TABLES = {
  news: 'slug',
  diary_posts: 'slug',
  products: 'slug',
  collections: 'slug',
  releases: 'slug',
  tracks: 'slug',
  redhead_spotlights: 'name',
  social_posts: 'text',
};

const out = {};
for (const [table, key] of Object.entries(TABLES)) {
  try {
    out[table] = db.prepare('SELECT ' + key + ' AS k FROM ' + table).all().map((r) => String(r.k));
  } catch (e) {
    // таблицы может не быть — тогда сверять по ней нечего
  }
}
process.stdout.write(JSON.stringify(out));
