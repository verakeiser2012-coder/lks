const path = require('path');

// Медиа поста календаря. Раньше пост нёс один файл (media_path + media_type),
// теперь до десяти в media_items (JSON). Первый элемент дублируется в старые
// поля, поэтому коннекторы, которые умеют только один файл, работают как прежде.

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);
const MAX_ITEMS = 10;

function typeFromFilename(name) {
  return VIDEO_EXTS.has(path.extname(String(name || '')).toLowerCase()) ? 'video' : 'photo';
}

function normalize(items) {
  const out = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it.path !== 'string' || !it.path) continue;
    out.push({ path: it.path, type: it.type === 'video' ? 'video' : 'photo' });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function mediaItemsOf(post) {
  if (!post) return [];
  let items = [];
  try {
    items = normalize(JSON.parse(post.media_items || '[]'));
  } catch (e) {
    items = [];
  }
  if (items.length === 0 && post.media_path) {
    items = [{ path: post.media_path, type: post.media_type === 'video' ? 'video' : 'photo' }];
  }
  return items;
}

// Значения для записи в базу: JSON всех элементов плюс первый в старые поля.
function mediaColumns(items) {
  const list = normalize(items);
  return {
    media_items: JSON.stringify(list),
    media_path: list.length ? list[0].path : '',
    media_type: list.length ? list[0].type : '',
  };
}

module.exports = { typeFromFilename, normalize, mediaItemsOf, mediaColumns, MAX_ITEMS };
