const db = require('../db');

/**
 * Места под баннеры. Раньше ключ страницы вводили в админке руками, и понять,
 * где баннер вылезет и какие ключи вообще существуют, было неоткуда: работали
 * ровно два места, «news» и «style», а опечатка в ключе означала баннер,
 * который нигде не показывается.
 *
 * Порядок в списке — порядок в выпадающем списке админки.
 */
const SLOTS = [
  { key: 'home', label: 'Главная', where: 'под лентой «Что нового», до блока свежих релизов' },
  { key: 'music', label: 'Музыка', where: 'после релизов, перед кличем про вокал' },
  { key: 'catalog', label: 'Каталог', where: 'над сеткой товаров' },
  { key: 'podcast', label: 'Подкаст', where: 'страница /podcast, под заголовком' },
  { key: 'games', label: 'Поиграть', where: 'над плитками игр' },
  { key: 'news', label: 'Новости', where: 'над списком новостей' },
  { key: 'diary', label: 'Дневник', where: 'над списком записей' },
  { key: 'style', label: 'Стиль', where: 'под вводным текстом раздела' },
  { key: 'redheads', label: 'Рыжие', where: 'над карточками людей; пока раздел в режиме тизера, не показывается' },
];

function getBanners(pageKey) {
  return db
    .prepare('SELECT * FROM promo_banners WHERE page_key = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(pageKey);
}

/** Человеческое имя места по ключу — для списка баннеров в админке. */
function slotLabel(key) {
  const slot = SLOTS.find((s) => s.key === key);
  return slot ? slot.label : `${key} (нет такого места)`;
}

module.exports = { getBanners, slotLabel, SLOTS };
