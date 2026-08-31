const db = require('/var/www/site/src/db');
db.prepare("UPDATE social_posts SET scheduled_at = '2026-09-01 12:00:00' WHERE id = 41").run();
const r = db.prepare('SELECT id, scheduled_at, approved, status FROM social_posts WHERE id = 41').get();
console.log('MOVED:', JSON.stringify(r));
