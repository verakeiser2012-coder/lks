// Сброс пароля админа на сервере: node deploy/reset-admin-password.js <новый_пароль>
// Запускать из /var/www/site. Меняет только хеш в таблице users (пользователь admin).
const db = require('../src/db');
const bcrypt = require('bcryptjs');
const pass = process.argv[2];
if (!pass || pass.length < 8) { console.error('нужен пароль от 8 символов'); process.exit(1); }
const r = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(bcrypt.hashSync(pass, 10), 'admin');
console.log('обновлено строк:', r.changes);
