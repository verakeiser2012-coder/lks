// Soundstates — третий EP, а не дебютный и не третий альбом (08.09.2026).
// В базе он заведён как EP 2026 года, третий по счёту после Ikigai и Flowers.
// Запускать на сервере: node deploy/apply_2026-09-08f.js
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

const FIXES = [
  ['Soundstates — мой дебютный альбом', 'Soundstates — мой третий EP'],
  ['вышел мой третий альбом Soundstates', 'вышел мой третий EP Soundstates'],
  ['арт третьего альбома', 'арт третьего EP'],
  ['Слушать трек и весь альбом', 'Слушать трек и весь EP'],
  ['Слушать альбом: band.link', 'Слушать EP: band.link'],
  ['из альбома Soundstates', 'из EP Soundstates'],
  ['на примере альбома Soundstates', 'на примере EP Soundstates'],
  ['повлиял на мой альбом Soundstates', 'повлиял на мой EP Soundstates'],
];

const rows = db.prepare("SELECT id, text FROM social_posts WHERE text LIKE '%альбом%'").all();
const upd = db.prepare('UPDATE social_posts SET text = ? WHERE id = ?');
let changed = 0;
for (const row of rows) {
  let text = row.text;
  for (const [from, to] of FIXES) text = text.split(from).join(to);
  if (text !== row.text) { upd.run(text, row.id); changed += 1; }
}
console.log('постов исправлено:', changed);

// Дневник: та же формулировка
const posts = db.prepare("SELECT id, content FROM diary_posts WHERE content LIKE '%альбом%'").all();
const updPost = db.prepare('UPDATE diary_posts SET content = ? WHERE id = ?');
let diary = 0;
for (const row of posts) {
  let text = row.content;
  for (const [from, to] of FIXES) text = text.split(from).join(to);
  text = text.split('третий альбом').join('третий EP').split('дебютный альбом').join('третий EP');
  if (text !== row.content) { updPost.run(text, row.id); diary += 1; }
}
console.log('записей дневника исправлено:', diary);

const left = db.prepare("SELECT COUNT(*) AS c FROM social_posts WHERE text LIKE '%дебютный альбом%' OR text LIKE '%третий альбом%'").get().c;
console.log('осталось спорных формулировок:', left);
for (const r of db.prepare("SELECT id, substr(replace(text, char(10), ' '), 1, 70) AS t FROM social_posts WHERE text LIKE '%EP%' LIMIT 4").all()) {
  console.log('  #' + r.id, r.t);
}
