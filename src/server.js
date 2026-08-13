require('dotenv').config();
require('./db/init');

const path = require('path');
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');

const { getSettings } = require('./utils/settings');
const { getCart } = require('./utils/cart');
const { renderLinkedText } = require('./utils/text');
const { toAsciiHost, REDIRECT_LOOKUP, CANONICAL_STORE_ASCII } = require('./config/domains');

const indexRoutes = require('./routes/index');
const catalogRoutes = require('./routes/catalog');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const galleryRoutes = require('./routes/gallery');
const aboutRoutes = require('./routes/about');
const newsRoutes = require('./routes/news');
const musicRoutes = require('./routes/music');
const styleRoutes = require('./routes/style');
const videoRoutes = require('./routes/video');
const brandsRoutes = require('./routes/brands');
const gigsRoutes = require('./routes/gigs');
const collectionsRoutes = require('./routes/collections');
const redheadsRoutes = require('./routes/redheads');
const contestRoutes = require('./routes/contest');
const subscribeRoutes = require('./routes/subscribe');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.renderLinkedText = renderLinkedText;

app.use(morgan('dev'));

// Домены-двойники и опечатки (Levkeiser/Levkeyser) редиректят на канонический домен;
// LEVKEISER.STORE — канонический домен магазина, поэтому его главная сразу ведёт в каталог.
app.use((req, res, next) => {
  const host = toAsciiHost(req.hostname.replace(/^www\./, ''));
  const canonicalTarget = REDIRECT_LOOKUP.get(host);
  if (canonicalTarget) {
    return res.redirect(301, `${req.protocol}://${canonicalTarget}${req.originalUrl}`);
  }
  if (host === CANONICAL_STORE_ASCII && req.path === '/') {
    return res.redirect(302, '/catalog');
  }
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// Общие данные, доступные во всех шаблонах
app.use((req, res, next) => {
  res.locals.settings = getSettings();
  res.locals.isAdmin = Boolean(req.session.adminId);
  const cart = getCart(req);
  res.locals.cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  res.locals.currentPath = req.originalUrl;
  res.locals.subscribeSuccess = Boolean(req.session.subscribeSuccess);
  res.locals.subscribeError = req.session.subscribeError || null;
  delete req.session.subscribeSuccess;
  delete req.session.subscribeError;
  next();
});

app.use('/', indexRoutes);
app.use('/catalog', catalogRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/gallery', galleryRoutes);
app.use('/about', aboutRoutes);
app.use('/news', newsRoutes);
app.use('/music', musicRoutes);
app.use('/style', styleRoutes);
app.use('/video', videoRoutes);
app.use('/brands', brandsRoutes);
app.use('/gigs', gigsRoutes);
app.use('/drops', collectionsRoutes);
app.use('/redheads', redheadsRoutes);
app.use('/contest', contestRoutes);
app.use('/subscribe', subscribeRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Внутренняя ошибка сервера');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  require('./services/social/scheduler').start();
});
