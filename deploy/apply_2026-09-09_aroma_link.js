// Ссылка на карту в статье дневника не кликалась: автоссылки ловят только
// https:// и разметку [текст](адрес), а голый /aroma оставался текстом.

const db = require('../src/db');

const SLUG = 'muzyka-i-blagovoniya-odno-techenie';
const OLD = 'там же можно собрать собственный состав и посмотреть, куда он встанет: /aroma';
const NEW = 'там же можно собрать собственный состав и посмотреть, куда он встанет: ' +
            '[levkeiser.com/aroma](/aroma)';

const post = db.prepare('SELECT id, content FROM diary_posts WHERE slug = ?').get(SLUG);
if (!post) throw new Error('статья не найдена: ' + SLUG);

if (post.content.includes(NEW)) {
  console.log('ссылка уже кликабельна');
} else if (post.content.includes(OLD)) {
  db.prepare('UPDATE diary_posts SET content = ? WHERE id = ?').run(post.content.replace(OLD, NEW), post.id);
  console.log('ссылка в статье исправлена, id', post.id);
} else {
  console.log('ВНИМАНИЕ: искомая строка не найдена — текст статьи на сервере другой, правьте вручную');
}
