// Убираем «маленькими тиражами»: вещи кастомные, а не лимитированные. Идемпотентно.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
db.prepare("UPDATE settings SET value = ? WHERE key = 'style_intro' AND value LIKE '%маленькими тиражами%'")
  .run('Как я выгляжу и почему. Рыжий, без фильтров и нейросетей, кастомные вещи.');
for (const p of db.prepare("SELECT id, content FROM diary_posts WHERE content LIKE '%Вещи в магазине собираю маленькими тиражами%'").all()) {
  db.prepare('UPDATE diary_posts SET content = ? WHERE id = ?').run(
    p.content.replace('Вещи в магазине собираю маленькими тиражами вместе с мастерскими Екатеринбурга', 'Кастомные вещи для магазина делаю вместе с мастерскими Екатеринбурга'), p.id);
}
console.log('style_intro:', db.prepare("SELECT value FROM settings WHERE key = 'style_intro'").get().value);
console.log('left:', db.prepare("SELECT count(*) c FROM settings WHERE value LIKE '%тираж%'").get().c, db.prepare("SELECT count(*) c FROM diary_posts WHERE content LIKE '%тираж%'").get().c);
