// «Стиль» → «Вдохновительный лев»: блок «Образы» (голосование) и сетка миниатюр
// портфолио убраны — смысловой нагрузки без брендов у них не было. На их место
// встала лента «Первые разы» (style-inspires, 12 кадров 2016–2017).
// Кадры старых блоков не удаляем: снимаем привязку к странице, они остаются
// в общей галерее админки (/admin/gallery) и могут быть назначены куда угодно.
// Запуск: node deploy/apply_2026-09-18_style_firsts.js — локально и на сервере.
const db = require('../src/db');

const unlink = db.prepare("UPDATE gallery_items SET page_key = '' WHERE page_key IN ('style', 'style-portfolio')").run();
console.log('отвязано от «Образы»/«портфолио»:', unlink.changes);

const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
upsert.run('style_inspires_intro', 'С чего всё началось: первое портфолио, первая реклама, первое дефиле. Четыре и пять лет — и уже в кадре по-настоящему. Подпись под каждым кадром — про то, чем он дорог.');
upsert.run('style_portfolio_intro', 'В кадре с четырёх лет: реклама, кино, показы, подиум. Работаем по договору с законным представителем.');
console.log('тексты обновлены');

for (const k of ['style-inspires', 'style', 'style-portfolio']) {
  console.log(k, db.prepare('SELECT COUNT(*) c FROM gallery_items WHERE page_key = ?').get(k).c);
}
