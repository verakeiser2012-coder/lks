const express = require('express');
const db = require('../../db');
const { requireAdmin } = require('../../middleware/auth');

const authRoutes = require('./auth');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const galleryRoutes = require('./gallery');
const aboutRoutes = require('./about');
const newsRoutes = require('./news');
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

const router = express.Router();

// Публичные маршруты входа/выхода — без requireAdmin
router.use('/', authRoutes);

// Всё, что ниже, требует авторизации администратора
router.use(requireAdmin);

router.get('/', (req, res) => {
  const productsCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const ordersCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const newOrdersCount = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'new'").get().c;
  res.render('admin/dashboard', { productsCount, ordersCount, newOrdersCount });
});

router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/gallery', galleryRoutes);
router.use('/about', aboutRoutes);
router.use('/news', newsRoutes);
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

module.exports = router;
