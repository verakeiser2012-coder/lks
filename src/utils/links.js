const db = require('../db');

// Группирует ссылки по group_name, сохраняя порядок первого появления группы
// и относительный порядок ссылок внутри неё (список должен быть отсортирован
// по sort_order/id перед вызовом).
function groupLinks(links) {
  const map = new Map();
  for (const link of links) {
    const key = link.group_name || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(link);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
}

// Группа «соцсети» для страниц сайта — из раздела админки «Соцсети»
// (social_networks.url), а не из page_links: адрес правится в одном месте.
// first — какие категории показать первыми ('music' на странице музыки).
function socialLinksGroup(name, opts = {}) {
  const first = opts.first || 'general';
  const order = { music: 0, shorts: 1, general: 2 };
  order[first] = -1;
  const items = db
    .prepare("SELECT key, label, url, category FROM social_networks WHERE url <> '' AND key <> 'news' ORDER BY label")
    .all()
    .sort((a, b) => (order[a.category || 'general'] ?? 2) - (order[b.category || 'general'] ?? 2))
    .map((n) => ({ label: n.label, url: n.url, key: n.key, group_name: name }));
  return { name, items, social: true };
}

module.exports = { groupLinks, socialLinksGroup };
