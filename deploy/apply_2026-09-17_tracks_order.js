// Порядок треков Soundstates и название Riff Raff — по официальному релизу (Deezer/Apple):
// Soundstates, d r e a m, 2AM, Cloudflute, Back to the Future; «rif raf» → «riff raff».
// Локально:   node deploy/apply_2026-09-17_tracks_order.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_tracks_order.js
const db = require('../src/db');
const rel = db.prepare("SELECT id FROM releases WHERE LOWER(title) = 'soundstates'").get();
if (rel) {
  const order = ['soundstates', 'd r e a m', '2am', 'cloudflute', 'back to the future'];
  for (const t of db.prepare('SELECT id, title FROM tracks WHERE release_id = ?').all(rel.id)) {
    const i = order.indexOf(t.title.trim().toLowerCase());
    if (i >= 0) db.prepare('UPDATE tracks SET sort_order = ? WHERE id = ?').run(i, t.id);
  }
  console.log('Soundstates:', db.prepare('SELECT title FROM tracks WHERE release_id = ? ORDER BY sort_order').all(rel.id).map((x) => x.title).join(' → '));
}
const r = db.prepare("UPDATE tracks SET title = 'riff raff' WHERE LOWER(title) IN ('rif raf', 'rifraf')").run();
console.log('riff raff:', r.changes);
