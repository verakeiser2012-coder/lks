// Уборка 12.09.2026:
// 1) запись дневника «Вдохновило: Джек Воробей…» удаляется вместе с оценками,
//    кадрами и запланированным постом календаря о ней;
// 2) у релизов проставляется тип: три EP (Soundstates, Flowers, Ikigai), остальные —
//    синглы. Без типа страница «Музыка» считала все 13 релизов альбомами.
// Ищем по slug/тексту, не по id. Повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
db.exec('PRAGMA foreign_keys = ON');

const SLUG = 'vdohnovilo-dzhek-vorobey';
const post = db.prepare('SELECT id FROM diary_posts WHERE slug = ?').get(SLUG);
if (post) {
  db.prepare('DELETE FROM diary_marks WHERE post_id = ?').run(post.id);
  db.prepare('DELETE FROM gallery_items WHERE page_key = ?').run('diary-' + SLUG);
  db.prepare('DELETE FROM diary_posts WHERE id = ?').run(post.id);
  console.log('запись удалена:', SLUG);
} else {
  console.log('записи уже нет:', SLUG);
}
const posts = db.prepare("SELECT id, scheduled_at, status FROM social_posts WHERE status = 'scheduled' AND (text LIKE '%Джек Вороб%' OR link_url LIKE ?)").all('%' + SLUG + '%');
for (const p of posts) {
  db.prepare('DELETE FROM social_post_targets WHERE post_id = ?').run(p.id);
  db.prepare('DELETE FROM social_posts WHERE id = ?').run(p.id);
  console.log('пост календаря удалён:', p.id, p.scheduled_at);
}

const EPS = ['soundstates', 'flowers', 'ikigai'];
const setType = db.prepare("UPDATE releases SET release_type = ? WHERE slug = ? AND release_type <> ?");
for (const r of db.prepare('SELECT slug FROM releases').all()) {
  const t = EPS.includes(r.slug) ? 'EP' : 'Single';
  if (setType.run(t, r.slug, t).changes) console.log(`релиз ${r.slug}: тип → ${t}`);
}
console.log(db.prepare("SELECT release_type, COUNT(*) c FROM releases GROUP BY release_type").all().map((r) => `${r.release_type}: ${r.c}`).join(', '));
