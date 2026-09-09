// Сверка содержимого с сервером. Сервер — источник правды: то, что удалили
// руками в админке, должно исчезнуть и в локальной базе, иначе каждая следующая
// сверка снова показывает «не доехало», хотя на самом деле «удалено».
//
//   node deploy/sync_content_from_server.js            только показать
//   node deploy/sync_content_from_server.js --apply    удалить лишнее локально
//
// Список записей с сервера берётся заранее: node deploy/dump_content_keys.js
// на сервере, файл кладётся в deploy/data/server_keys.json.

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

// таблица -> поле, по которому запись узнаётся (не id: id на сервере и локально разные)
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

const KEYS = path.join(__dirname, 'data', 'server_keys.json');
if (!fs.existsSync(KEYS)) {
  console.error('Нет выгрузки с сервера. Сначала:');
  console.error('  ssh djlevka-vps "cd /var/www/site && node deploy/dump_content_keys.js" > deploy/data/server_keys.json');
  process.exit(1);
}
const server = JSON.parse(fs.readFileSync(KEYS, 'utf8'));
const apply = process.argv.includes('--apply');
let extra = 0;
let missing = 0;

for (const [table, key] of Object.entries(TABLES)) {
  if (!server[table]) { console.log(table + ': сервер не отдал список, пропускаю'); continue; }
  const onServer = new Set(server[table]);
  let rows;
  try {
    rows = db.prepare('SELECT id, ' + key + ' AS k FROM ' + table).all();
  } catch (e) { console.log(table + ': нет такой таблицы локально'); continue; }

  const local = new Set(rows.map((r) => String(r.k)));
  const toDelete = rows.filter((r) => !onServer.has(String(r.k)));
  const onlyServer = [...onServer].filter((k) => !local.has(k));

  if (toDelete.length) {
    extra += toDelete.length;
    console.log('\n' + table + ': лишние локально (на сервере удалены) — ' + toDelete.length);
    for (const r of toDelete) console.log('   - ' + String(r.k).replace(/\n/g, ' ').slice(0, 60));
    if (apply) {
      const del = db.prepare('DELETE FROM ' + table + ' WHERE id = ?');
      for (const r of toDelete) del.run(r.id);
      console.log('   удалено');
    }
  }
  if (onlyServer.length) {
    missing += onlyServer.length;
    console.log('\n' + table + ': есть на сервере, нет локально — ' + onlyServer.length);
    for (const k of onlyServer.slice(0, 10)) console.log('   + ' + k.replace(/\n/g, ' ').slice(0, 60));
  }
}

console.log('\nИтого: лишних локально ' + extra + ', отсутствует локально ' + missing);
if (extra && !apply) console.log('Чтобы удалить лишнее: node deploy/sync_content_from_server.js --apply');
if (!extra && !missing) console.log('Локальная база совпадает с сервером.');
