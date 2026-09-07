const path = require('path');

// Уменьшенные версии картинок для телефона.
//
// Загруженные файлы лежат в /uploads в одном размере — до 2000 px. Карточка
// новости на телефоне занимает 360 px, обложка в таблице — 48 px, а грузился
// всё равно полный файл. Здесь собираются адреса вида /uploads/x.jpg?w=480:
// их отдаёт маршрут routes/thumbs.js, который режет картинку под нужную
// ширину один раз и дальше берёт из кэша.
//
// Ширины фиксированы: произвольное ?w= позволило бы забить диск кэшем.

const WIDTHS = [96, 160, 320, 480, 640, 960, 1280];
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isResizable(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return false;
  if (url.includes('?')) return false;
  return IMAGE_EXT.has(path.extname(url).toLowerCase());
}

// Ближайшая разрешённая ширина не меньше запрошенной.
function snap(width) {
  const w = Number(width) || 0;
  return WIDTHS.find((x) => x >= w) || WIDTHS[WIDTHS.length - 1];
}

// Один адрес под фиксированный размер (обложка 48 px → ?w=160, чтобы хватило
// и на экран с тройной плотностью).
function thumb(url, width) {
  if (!isResizable(url)) return url;
  return `${url}?w=${snap(width)}`;
}

// Строка для srcset: браузер сам выберет ширину под экран и плотность.
function srcset(url, widths) {
  if (!isResizable(url)) return '';
  const list = (widths && widths.length ? widths : [320, 480, 640, 960]).map(snap);
  return [...new Set(list)].map((w) => `${url}?w=${w} ${w}w`).join(', ');
}

module.exports = { WIDTHS, isResizable, snap, thumb, srcset };
