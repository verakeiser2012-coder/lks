// Статья «Музыка и благовония: одно течение» была опубликована только в локальной
// базе и на сервер не доехала. Скрипт добавляет её по слагу, ничего не трогая, если
// она уже есть; текст берётся из deploy/data/diary_2026-09-09.json.

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const SLUG = 'muzyka-i-blagovoniya-odno-techenie';
const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'diary_2026-09-09.json'), 'utf8'));
const post = dump.find((p) => p.slug === SLUG);
if (!post) throw new Error('в выгрузке нет статьи ' + SLUG);

const exists = db.prepare('SELECT id FROM diary_posts WHERE slug = ?').get(SLUG);
if (exists) {
  db.prepare(
    'UPDATE diary_posts SET title = ?, excerpt = ?, content = ?, is_published = ? WHERE id = ?'
  ).run(post.title, post.excerpt, post.content, post.is_published, exists.id);
  console.log('статья обновлена, id', exists.id);
} else {
  const info = db.prepare(
    `INSERT INTO diary_posts (title, slug, excerpt, content, cover_image, dzen_url, is_published, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(post.title, post.slug, post.excerpt, post.content, post.cover_image || '',
        post.dzen_url || '', post.is_published, post.created_at);
  console.log('статья добавлена, id', info.lastInsertRowid);
}

const r = db.prepare('SELECT id, title, is_published, length(content) AS n FROM diary_posts WHERE slug = ?').get(SLUG);
console.log('проверка:', r.id, r.title, '| опубликована:', r.is_published ? 'да' : 'нет', '| знаков:', r.n);
console.log('ссылка на карту в тексте:', /\[levkeiser\.com\/aroma\]\(\/aroma\)/.test(post.content) ? 'есть' : 'НЕТ');
