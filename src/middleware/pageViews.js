const db = require('../db');

// Счётчик просмотров без слежки: храним только «страница и день», ни IP,
// ни куки, ни идентификаторов. Одно число на страницу в сутки — этого хватает,
// чтобы понять, куда люди ходят, а куда нет.
const SKIP = /^\/(admin|uploads|audio|css|js|img|fonts|health|search|unsubscribe|b\/|downloads)/;
const STATIC = /\.(css|js|png|jpe?g|gif|webp|svg|ico|mp3|mp4|woff2?|txt|xml|json|map)$/i;
const BOT = /bot|crawl|spider|slurp|yandex|google|bing|baidu|duckduck|facebookexternalhit|telegrambot|vkshare|whatsapp|curl|wget|python-requests/i;

const upsert = db.prepare(`
  INSERT INTO page_views (path, day, hits) VALUES (?, date('now'), 1)
  ON CONFLICT(path, day) DO UPDATE SET hits = hits + 1
`);

function pageViews(req, res, next) {
  if (req.method !== 'GET') return next();
  const path = req.path;
  if (SKIP.test(path) || STATIC.test(path)) return next();
  if (BOT.test(req.headers['user-agent'] || '')) return next();
  res.on('finish', () => {
    if (res.statusCode !== 200) return;
    const type = res.getHeader('content-type') || '';
    if (!String(type).includes('text/html')) return;
    try {
      upsert.run(path.length > 200 ? path.slice(0, 200) : path);
    } catch (e) { /* статистика не должна ломать страницу */ }
  });
  next();
}

module.exports = pageViews;
