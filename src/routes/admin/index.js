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
const styleItemsRoutes = require('./style-items');
const contestRoutes = require('./contest');
const bannersRoutes = require('./banners');
const tracksRoutes = require('./tracks');
const releasesRoutes = require('./releases');
const subscribersRoutes = require('./subscribers');
const messagesRoutes = require('./messages');
const bustsRoutes = require('./busts');

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
  res.render('admin/dashboard', { productsCount, ordersCount, newOrdersCount, playsTotal, plays30, playsByTrack });
});

router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/gallery', galleryRoutes);
router.use('/about', aboutRoutes);
router.use('/news', newsRoutes);
router.use('/diary', diaryRoutes);
router.use('/settings', settingsRoutes);
router.use('/pages', pagesRoutes);
router.use('/brands', brandsRoutes);
router.use('/collections', collectionsRoutes);
router.use('/redheads', redheadsRoutes);
router.use('/style-items', styleItemsRoutes);
router.use('/contest', contestRoutes);
router.use('/banners', bannersRoutes);
router.use('/tracks', tracksRoutes);
router.use('/releases', releasesRoutes);
router.use('/calendar', calendarRoutes);
router.use('/social-networks', socialNetworksRoutes);
router.use('/subscribers', subscribersRoutes);
router.use('/messages', messagesRoutes);
router.use('/busts', bustsRoutes);

module.exports = router;
