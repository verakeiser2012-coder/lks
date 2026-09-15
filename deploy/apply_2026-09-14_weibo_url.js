// Weibo оформлен 14.09.2026: ник DJLevka, персональный адрес weibo.com/djlevka
// (u/8255062674). Аудитория en — уже выставлена миграцией. Повтор безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const r = db.prepare("UPDATE social_networks SET url = ? WHERE key = 'weibo'").run('https://weibo.com/djlevka');
console.log('weibo url:', r.changes);
