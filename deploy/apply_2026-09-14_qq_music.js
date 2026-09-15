// Площадка QQ Music (Tencent): каталог DJ Levka там лежит целиком — 18 альбомов,
// его доставил текущий дистрибьютор. Страница артиста не заявлена, поэтому
// ссылка на «сырой» singerMID. ⚠ После смены дистрибьютора (Our Angels) проверить,
// что релизы легли к тому же артисту 0009Tsz73ef4pe, а не к дублю.
// Повторный запуск безопасен — ищем по подписи.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const LABEL = 'QQ Music';
const URL = 'https://y.qq.com/n/ryqq_v2/singer/0009Tsz73ef4pe';

const row = db.prepare("SELECT id FROM page_links WHERE section = 'music' AND group_name = 'Площадки' AND label = ?").get(LABEL);
if (row) {
  db.prepare('UPDATE page_links SET url = ? WHERE id = ?').run(URL, row.id);
  console.log('QQ Music: ссылка обновлена, id', row.id);
} else {
  const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM page_links WHERE section = 'music' AND group_name = 'Площадки'").get().m;
  db.prepare('INSERT INTO page_links (section, group_name, label, url, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run('music', 'Площадки', LABEL, URL, max + 1);
  console.log('QQ Music: добавлена, sort_order', max + 1);
}
