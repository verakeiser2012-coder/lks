// Полная версия манифеста «Двигаюсь медленно в быстром мире» в дневнике
// + кадры к записи (лента «Кадры к записи»). Текст — content/articles/slow-in-a-fast-world.md,
// картинки — tools/slow_cards.py → public/uploads/slow-card-{1,2,3}.jpg плюс два
// существующих кадра. Ищем по slug, повторный запуск безопасен.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const db = new DatabaseSync(path.join(ROOT, 'data', 'shop.db'));
const SLUG = 'dvigayus-medlenno-v-bystrom-mire';

const post = db.prepare('SELECT id, content FROM diary_posts WHERE slug = ?').get(SLUG);
if (!post) {
  console.log('запись не найдена:', SLUG);
  process.exit(1);
}
const text = fs.readFileSync(path.join(ROOT, 'content', 'articles', 'slow-in-a-fast-world.md'), 'utf8').replace(/\r\n/g, '\n').trim();
db.prepare("UPDATE diary_posts SET content = ?, excerpt = ? WHERE id = ?").run(
  text,
  'У меня появился слоган: «Двигаюсь медленно в быстром мире». Это не про лень — это про темп, который выбираешь сам. Откуда он взялся и как устроен в музыке, кадре и вещах.',
  post.id
);
console.log(`текст записи: ${post.content.length} → ${text.length} символов`);

const KEY = 'diary-' + SLUG;
const frames = [
  ['/uploads/slow-card-1.jpg', 'Тезис'],
  ['/uploads/style-walks-13y-08.jpg', 'Своим ходом'],
  ['/uploads/slow-card-2.jpg', 'Улитка Slow Food, Рим, 1986'],
  ['/uploads/product-flag-para.jpg', 'Пара флагов из дропа'],
  ['/uploads/slow-card-3.jpg', 'Темп и Василий'],
];
const exists = db.prepare('SELECT id FROM gallery_items WHERE page_key = ? AND file_path = ?');
const insert = db.prepare("INSERT INTO gallery_items (type, title, file_path, page_key, sort_order) VALUES ('photo', ?, ?, ?, ?)");
const upd = db.prepare('UPDATE gallery_items SET title = ?, sort_order = ? WHERE id = ?');
frames.forEach(([file, title], i) => {
  const row = exists.get(KEY, file);
  if (row) upd.run(title, i, row.id);
  else insert.run(title, file, KEY, i);
});
console.log('кадров к записи:', db.prepare('SELECT COUNT(*) AS c FROM gallery_items WHERE page_key = ?').get(KEY).c);
