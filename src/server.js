require('dotenv').config();
require('./db/init');

const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const { formatDate, formatDateShort } = require('./utils/dates');
const { formatPrice, priceLabel, isMadeToOrder } = require('./utils/price');
const { ICONS: socialIcons } = require('./utils/socialIcons');
const SqliteSessionStore = require('./services/sqliteSessionStore');
const morgan = require('morgan');

const { getSettings } = require('./utils/settings');
const { getCart } = require('./utils/cart');
const { renderLinkedText } = require('./utils/text');
const { thumb, srcset } = require('./utils/images');
const { toAsciiHost, REDIRECT_LOOKUP, EN_FIRST_LOOKUP, CANONICAL_STORE_ASCII } = require('./config/domains');
const { isNoPrefixPath } = require('./services/pageTranslate');

const indexRoutes = require('./routes/index');
const catalogRoutes = require('./routes/catalog');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const aboutRoutes = require('./routes/about');
const { createNewsRouter } = require('./routes/news');
const diaryRoutes = require('./routes/diary');
const musicRoutes = require('./routes/music');
const styleRoutes = require('./routes/style');
const brandsRoutes = require('./routes/brands');
const gigsRoutes = require('./routes/gigs');
const collectionsRoutes = require('./routes/collections');
const redheadsRoutes = require('./routes/redheads');
const contestRoutes = require('./routes/contest');
const subscribeRoutes = require('./routes/subscribe');
const legalRoutes = require('./routes/legal');
const aromaRoutes = require('./routes/aroma');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.renderLinkedText = renderLinkedText;
app.locals.socialIcons = socialIcons;

app.use(morgan('dev'));

// Домены-двойники и опечатки (Levkeiser/Levkeyser) редиректят на канонический домен;
// LEVKEISER.STORE — канонический домен магазина, поэтому его главная сразу ведёт в каталог.
app.use((req, res, next) => {
  const host = toAsciiHost(req.hostname.replace(/^www\./, ''));
  // www — отдельный адрес для поисковика (18.09): без редиректа www.levkeiser.com
  // отдавал те же страницы вторым сайтом. Сначала снимаем www, дальше — как обычно.
  if (/^www\./i.test(req.hostname)) {
    return res.redirect(301, `${req.protocol}://${host}${req.originalUrl}`);
  }
  const canonicalTarget = REDIRECT_LOOKUP.get(host);
  if (canonicalTarget) {
    // «Английские» домены (djlevka.com и т. п.) ведут на /en/… канонического сайта.
    const alreadyEn = /^\/en(\/|\?|$)/.test(req.originalUrl);
    const enFirst = EN_FIRST_LOOKUP.has(host) && !alreadyEn && !isNoPrefixPath(req.path);
    const target = enFirst ? '/en' + (req.originalUrl === '/' ? '' : req.originalUrl) : req.originalUrl;
    return res.redirect(301, `${req.protocol}://${canonicalTarget}${target}`);
  }
  if (host === CANONICAL_STORE_ASCII && (req.path === '/' || req.path === '/en' || req.path === '/en/')) {
    return res.redirect(302, req.path === '/' ? '/catalog' : '/en/catalog');
  }
  next();
});
// Базовые заголовки безопасности (кликджекинг, MIME-сниффинг, утечка реферера).
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Уменьшенные версии картинок (/uploads/x.jpg?w=480) — до статики, иначе
// express.static отдаст полный файл, не глядя на ?w=.
app.use('/uploads', require('./routes/thumbs'));
// Кэш статики в браузере (18.09; раньше max-age=0 — каждая страница заново
// тянула стили и скрипты). Стили и скрипты — час: адреса без версии, после
// выкладки обновятся сами. Остальное (картинки, звук, видео) — неделя; их
// уменьшенные копии (?w=) и так лежат год, см. routes/thumbs.js.
// Под pm2 (сервер) — кэш, при локальном npm start — без него: иначе правка стилей
// не видна в браузере целый час (pm2 кладёт в окружение pm_id).
const underPm2 = process.env.pm_id !== undefined;
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: underPm2 ? '7d' : 0,
  setHeaders(res, filePath) {
    if (underPm2 && /\.(css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=3600');
  },
}));
// Просмотры страниц (путь + день, без слежки) — после статики, чтобы не считать файлы.
app.use(require('./middleware/pageViews'));

app.use(
  session({
    store: new SqliteSessionStore(),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// Версия статики для адресов стилей и скриптов (?v=…). Браузер держит css/js час
// (см. статику выше), и без версии после выкладки страница час живёт с новой разметкой и
// старыми стилями. Версия — время последней правки файлов в css/ и js/, считается
// при старте: выкладка = scp + перезапуск pm2, так что после неё адреса меняются сами.
const assetVer = (() => {
  try {
    const fs = require('fs');
    let latest = 0;
    for (const dir of ['css', 'js']) {
      const base = path.join(__dirname, '..', 'public', dir);
      for (const f of fs.readdirSync(base)) latest = Math.max(latest, fs.statSync(path.join(base, f)).mtimeMs);
    }
    return Math.round(latest / 1000).toString(36);
  } catch (e) { return '1'; }
})();

app.locals.assetVer = assetVer;

// Общие данные, доступные во всех шаблонах
app.use((req, res, next) => {
  res.locals.settings = getSettings();
  res.locals.isAdmin = Boolean(req.session.adminId);
  const cart = getCart(req);
  res.locals.cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  res.locals.currentPath = req.originalUrl;
  // Канонический адрес: все 20 доменов отдают один сайт — поисковикам и соцсетям
  // показываем единственный основной, иначе получаются дубли и разнобой в превью.
  res.locals.canonicalBase = 'https://' + require('./config/domains').CANONICAL_MAIN;
  next();
});
// Кабинет без пароля: по cookie — почта, res.locals.account (services/account.js).
app.use(require('./services/account').middleware);
app.use((req, res, next) => {
  res.locals.bgPlaylist = require('./utils/bgPlaylist').getBgPlaylist();
  res.locals.formatDate = formatDate;
  res.locals.formatDateShort = formatDateShort;
  res.locals.formatPrice = formatPrice;
  // priceLabel(product) — ценник для витрины: у вещи под заказ вместо нуля «Под заказ».
  res.locals.priceLabel = priceLabel;
  res.locals.isMadeToOrder = isMadeToOrder;
  // Размеры вещи печати по требованию — на странице товара из текстового поля
  res.locals.parseVariants = require('./services/printful').parseVariants;
  // thumb(url, w) и srcset(url, [w…]) — уменьшенные картинки, utils/images.js.
  res.locals.thumb = thumb;
  res.locals.srcset = srcset;
  // Площадки и соцсети музыки — единый источник для раздела /music и подвала,
  // чтобы списки не расходились: добавил площадку в одном месте — она везде.
  res.locals.musicLinks = db
    .prepare("SELECT group_name, label, url FROM page_links WHERE section = 'music' ORDER BY sort_order, id")
    .all();
  res.locals.videoLinks = db
    .prepare("SELECT group_name, label, url FROM page_links WHERE section = 'video' ORDER BY sort_order, id")
    .all();
  res.locals.subscribeSuccess = Boolean(req.session.subscribeSuccess);
  res.locals.subscribeError = req.session.subscribeError || null;
  delete req.session.subscribeSuccess;
  delete req.session.subscribeError;
  next();
});

// robots.txt и sitemap.xml — до остальных маршрутов, чтобы их не перехватил
// обработчик страниц по адресу.
app.use('/', require('./routes/seo'));
// Английская версия: /en/… отдаёт те же страницы с переводом (middleware/lang.js).
app.use(require('./middleware/lang'));
// /health — для внешнего монитора: жив ли сервер и открывается ли база.
app.use('/health', require('./routes/health'));
app.use('/aroma', aromaRoutes);
app.use('/', indexRoutes);
app.use('/catalog', catalogRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/about', aboutRoutes);
app.use('/news', createNewsRouter('ru'));
app.use('/en/news', createNewsRouter('en'));
app.use('/diary', diaryRoutes);
app.use('/music', musicRoutes);
app.use('/games', require('./routes/games'));
app.use('/podcast', require('./routes/podcast'));
app.use('/style', styleRoutes);
app.use('/brands', brandsRoutes);
app.use('/services', require('./routes/services'));
app.use('/gigs', gigsRoutes);
app.use('/drops', collectionsRoutes);
app.use('/redheads', redheadsRoutes);
app.use('/contest', contestRoutes);
app.use('/subscribe', subscribeRoutes);
app.use('/contact', require('./routes/contact'));
app.use('/unsubscribe', require('./routes/unsubscribe'));
app.use('/search', require('./routes/search'));
app.use('/legal', legalRoutes);
app.use('/b', require('./routes/busts'));
app.use('/n', require('./routes/tags'));
app.use('/downloads', require('./routes/downloads'));
app.use('/my', require('./routes/my')); // кабинет без пароля: заказы, файлы, экземпляры, рецепты, рассылка
app.use('/', require('./routes/order')); // /order/<токен>; /orders ведёт в кабинет
app.use('/', require('./routes/reviews').router); // /reviews, отзыв по заказу и по приглашению
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
  // Справочник ПВЗ Ozon (86 тысяч точек) обновляется в фоне раз в сутки.
  require('./services/delivery/ozon').scheduleSync();
  // Утреннее письмо «что нового за вчера»: подписки, заявки, заказы, соцсети.
  require('./services/dailyReport').schedule();
});
