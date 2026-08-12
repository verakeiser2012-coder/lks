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

module.exports = { groupLinks };
