const express = require('express');
const db = require('../../db');
const { requireAdmin } = require('../../middleware/auth');

const authRoutes = require('./auth');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const galleryRoutes = require('./gallery');
const aboutRoutes = require('./about');
const newsRoutes = require('./news');
const diaryRoutes = require('./diary');
const settingsRoutes = require('./settings');
const calendarRoutes = require('./calendar');
const socialNetworksRoutes = require('./social-networks');
const pagesRoutes = require('./pages');
const brandsRoutes = require('./brands');
const collectionsRoutes = require('./collections');
const redheadsRoutes = require('./redheads');
const contestRoutes = require('./contest');
const bannersRoutes = require('./banners');
const tracksRoutes = require('./tracks');
const releasesRoutes = require('./releases');
const subscribersRoutes = require('./subscribers');
const messagesRoutes = require('./messages');
const reviewsRoutes = require('./reviews');
const bustsRoutes = require('./busts');
const tagsRoutes = require('./tags');
const translationsRoutes = require('./translations');
const visibilityRoutes = require('./visibility');
const creativesRoutes = require('./creatives');
const kollegamRoutes = require('./kollegam');
const reportsRoutes = require('./reports');
const { translateMany } = require('../../services/translate');
const dailyReport = require('../../services/dailyReport');

const router = express.Router();

// Публичные маршруты входа/выхода — без requireAdmin
router.use('/', authRoutes);

// Всё, что ниже, требует авторизации администратора
router.use(requireAdmin);

router.get('/', (req, res) => {
  const productsCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const ordersCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const newOrdersCount = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'new'").get().c;
  // Прослушивания фонового плеера на сайте: всего, за 30 дней и по трекам.
  // Это наш счётчик (30 секунд непрерывной игры = одно прослушивание),
  // в статистику стримингов эти цифры не попадают.
  const playsTotal = db.prepare('SELECT COUNT(*) AS c FROM track_plays').get().c;
  const plays30 = db.prepare("SELECT COUNT(*) AS c FROM track_plays WHERE played_at >= datetime('now', '-30 days')").get().c;
  const playsByTrack = db
    .prepare(`
      SELECT src, COUNT(*) AS total,
             SUM(CASE WHEN played_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS last30
      FROM track_plays GROUP BY src ORDER BY total DESC
    `)
    .all()
    .map((row) => ({ ...row, title: row.src.replace(/^\/audio\//, '').replace(/\.mp3$/i, '').replace(/[-_]+/g, ' ') }));
  const views14 = db.prepare("SELECT COALESCE(SUM(hits), 0) AS c FROM page_views WHERE day >= date('now', '-14 days')").get().c;
  const topPages = db.prepare(`
    SELECT path, SUM(hits) AS hits FROM page_views
    WHERE day >= date('now', '-14 days') GROUP BY path ORDER BY hits DESC LIMIT 25
  `).all();
  const todayReport = dailyReport.collect(dailyReport.localDay());
  res.render('admin/dashboard', { productsCount, ordersCount, newOrdersCount, playsTotal, plays30, playsByTrack, views14, topPages, todayReport });
});

// Автоперевод на английский для кнопок в формах (public/js/admin-translate.js).
// Тело: { texts: ["…", "…"] } или { text: "…" } — ответ { translations: [...] }.
const TRANSLATE_MAX_CHARS = 20000;
router.post('/translate', async (req, res) => {
  const body = req.body || {};
  const texts = Array.isArray(body.texts) ? body.texts : [body.text];
  if (!texts.length || texts.some((t) => typeof t !== 'string')) {
    return res.status(400).json({ error: 'Нужен text или массив texts.' });
  }
  const total = texts.reduce((n, t) => n + t.length, 0);
  if (total > TRANSLATE_MAX_CHARS) {
    return res.status(413).json({ error: `Слишком много текста (${total} символов, лимит ${TRANSLATE_MAX_CHARS}).` });
  }
  try {
    const translations = await translateMany(texts);
    res.json({ translations });
  } catch (e) {
    console.error('[translate]', e.message);
    res.status(502).json({ error: e.message || 'переводчик не ответил' });
  }
});

router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/reports', reportsRoutes);
router.use('/gallery', galleryRoutes);
router.use('/about', aboutRoutes);
router.use('/news', newsRoutes);
router.use('/diary', diaryRoutes);
router.use('/settings', settingsRoutes);
router.use('/pages', pagesRoutes);
router.use('/brands', brandsRoutes);
router.use('/collections', collectionsRoutes);
router.use('/redheads', redheadsRoutes);
router.use('/contest', contestRoutes);
router.use('/banners', bannersRoutes);
router.use('/tracks', tracksRoutes);
router.use('/releases', releasesRoutes);
router.use('/calendar', calendarRoutes);
router.use('/social-networks', socialNetworksRoutes);
router.use('/subscribers', subscribersRoutes);
router.use('/messages', messagesRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/busts', bustsRoutes);
router.use('/nfc', tagsRoutes);
router.use('/translations', translationsRoutes);
router.use('/visibility', visibilityRoutes);
router.use('/creatives', creativesRoutes);
router.use('/kollegam', kollegamRoutes);

module.exports = router;
