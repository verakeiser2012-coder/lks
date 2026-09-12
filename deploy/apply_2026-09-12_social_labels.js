// Короткие названия сетей без скобок: они показываются на страницах сайта
// («Где читать и смотреть», «Соцсети», «Где ещё смотреть») и в админке.
// Ищем по ключу, а не по id. Повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const LABELS = {
  instagram: 'Instagram',
  'instagram-djlevka': 'Instagram DJ Levka',
  x: 'X',
  xiaohongshu: 'Xiaohongshu',
  douyin: 'Douyin',
  ok: 'Одноклассники',
};
const upd = db.prepare('UPDATE social_networks SET label = ? WHERE key = ? AND label <> ?');
for (const [key, label] of Object.entries(LABELS)) {
  const r = upd.run(label, key, label);
  if (r.changes) console.log(`${key}: → «${label}»`);
}
console.log(db.prepare("SELECT key, label FROM social_networks WHERE label LIKE '%(%'").all().length === 0 ? 'скобок не осталось' : 'ещё есть скобки');
