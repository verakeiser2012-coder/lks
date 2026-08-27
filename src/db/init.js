const db = require('./index');
const { slugify } = require('../utils/slugify');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image TEXT DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      delivery_method TEXT NOT NULL DEFAULT 'courier',
      pickup_point TEXT DEFAULT '',
      comment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_provider TEXT DEFAULT '',
      payment_id TEXT DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
      title TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      page_key TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS about_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
      title TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
      file_path TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_networks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      connector TEXT NOT NULL DEFAULT 'manual',
      credentials TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL DEFAULT '',
      media_path TEXT DEFAULT '',
      media_type TEXT DEFAULT '',
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_post_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      network_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      published_url TEXT DEFAULT '',
      error TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brand_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      website TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS page_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      group_name TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS redhead_spotlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      note TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      link_label TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS redhead_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      note TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      age_consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contest_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      video_url TEXT NOT NULL,
      note TEXT DEFAULT '',
      age_consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS promo_banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      cta_label TEXT DEFAULT '',
      cta_url TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      season_label TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      release_type TEXT NOT NULL DEFAULT 'EP',
      year TEXT DEFAULT '',
      description TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      streaming_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const orderCols = db.prepare('PRAGMA table_info(orders)').all();
  if (!orderCols.some((c) => c.name === 'delivery_method')) {
    db.exec("ALTER TABLE orders ADD COLUMN delivery_method TEXT NOT NULL DEFAULT 'courier'");
  }
  if (!orderCols.some((c) => c.name === 'pickup_point')) {
    db.exec("ALTER TABLE orders ADD COLUMN pickup_point TEXT DEFAULT ''");
  }

  const productCols = db.prepare('PRAGMA table_info(products)').all();
  if (!productCols.some((c) => c.name === 'collection_id')) {
    db.exec('ALTER TABLE products ADD COLUMN collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL');
  }
  if (!productCols.some((c) => c.name === 'release_id')) {
    db.exec('ALTER TABLE products ADD COLUMN release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL');
  }

  const redheadSubmissionCols = db.prepare('PRAGMA table_info(redhead_submissions)').all();
  if (!redheadSubmissionCols.some((c) => c.name === 'age_consent')) {
    db.exec("ALTER TABLE redhead_submissions ADD COLUMN age_consent INTEGER NOT NULL DEFAULT 0");
  }
  if (!redheadSubmissionCols.some((c) => c.name === 'data_consent')) {
    db.exec("ALTER TABLE redhead_submissions ADD COLUMN data_consent INTEGER NOT NULL DEFAULT 0");
  }

  const contestSubmissionCols = db.prepare('PRAGMA table_info(contest_submissions)').all();
  if (!contestSubmissionCols.some((c) => c.name === 'data_consent')) {
    db.exec("ALTER TABLE contest_submissions ADD COLUMN data_consent INTEGER NOT NULL DEFAULT 0");
  }

  const newsCols = db.prepare('PRAGMA table_info(news)').all();
  if (!newsCols.some((c) => c.name === 'lang')) {
    db.exec("ALTER TABLE news ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'");
  }

  const galleryItemCols = db.prepare('PRAGMA table_info(gallery_items)').all();
  if (!galleryItemCols.some((c) => c.name === 'page_key')) {
    db.exec("ALTER TABLE gallery_items ADD COLUMN page_key TEXT NOT NULL DEFAULT ''");
  }
  if (!galleryItemCols.some((c) => c.name === 'track_id')) {
    db.exec('ALTER TABLE gallery_items ADD COLUMN track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE');
  }

  const trackCols = db.prepare('PRAGMA table_info(tracks)').all();
  if (!trackCols.some((c) => c.name === 'release_id')) {
    db.exec('ALTER TABLE tracks ADD COLUMN release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL');
  }
  if (!trackCols.some((c) => c.name === 'slug')) {
    db.exec("ALTER TABLE tracks ADD COLUMN slug TEXT DEFAULT ''");
  }

  const socialTargetCols = db.prepare('PRAGMA table_info(social_post_targets)').all();
  if (!socialTargetCols.some((c) => c.name === 'stats')) {
    db.exec("ALTER TABLE social_post_targets ADD COLUMN stats TEXT DEFAULT '{}'");
  }
  if (!socialTargetCols.some((c) => c.name === 'stats_updated_at')) {
    db.exec('ALTER TABLE social_post_targets ADD COLUMN stats_updated_at TEXT');
  }

  const socialNetworkCols = db.prepare('PRAGMA table_info(social_networks)').all();
  if (!socialNetworkCols.some((c) => c.name === 'category')) {
    db.exec("ALTER TABLE social_networks ADD COLUMN category TEXT NOT NULL DEFAULT 'general'");
    // Стартовое разделение: музыкальные площадки DJ Levka — остальное «общие». Меняется в /admin/social-networks.
    db.exec("UPDATE social_networks SET category = 'music' WHERE key IN ('youtube', 'tiktok')");
  }

  // Ежегодные праздники (месяц/день без года) — подсвечиваются в календаре публикаций как инфоповоды.
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      UNIQUE (month, day, title)
    );
  `);

  const holidays = [
    // Музыка
    { month: 3, day: 9, title: 'Всемирный день диджея', category: 'music' },
    { month: 4, day: 13, title: 'Всемирный день рок-н-ролла', category: 'music' },
    { month: 4, day: 30, title: 'Международный день джаза', category: 'music' },
    { month: 5, day: 19, title: 'День уличной музыки', category: 'music' },
    { month: 6, day: 21, title: 'Всемирный день музыки', category: 'music' },
    { month: 8, day: 12, title: 'День виниловых пластинок', category: 'music' },
    { month: 10, day: 1, title: 'Международный день музыки', category: 'music' },
    // Кино
    { month: 8, day: 27, title: 'День российского кино', category: 'cinema' },
    { month: 10, day: 28, title: 'Международный день анимации', category: 'cinema' },
    { month: 12, day: 28, title: 'Международный день кино', category: 'cinema' },
    // Мода / модельное
    { month: 5, day: 20, title: 'День рождения джинсов', category: 'fashion' },
    { month: 8, day: 19, title: 'Всемирный день фотографии', category: 'fashion' },
    { month: 8, day: 21, title: 'Международный день моды', category: 'fashion' },
    { month: 9, day: 9, title: 'Международный день красоты', category: 'fashion' },
    { month: 11, day: 5, title: 'День любви к рыжим волосам', category: 'fashion' },
    // Бажов — повод напоминать о фильме, где Лев сыграл Дёму Баклушкина.
    { month: 1, day: 27, title: 'День рождения Павла Бажова — напомнить о фильме (Дёма Баклушкин)', category: 'cinema' },
    { month: 12, day: 3, title: 'День памяти Павла Бажова — повод для поста о фильме', category: 'cinema' },
    // Личные даты
    { month: 3, day: 21, title: 'День рождения Льва (2012)', category: 'personal' },
    { month: 8, day: 14, title: 'День рождения бренда LEVKEYSER (регистрация ИП, 2026)', category: 'personal' },
  ];
  const insertHoliday = db.prepare(
    'INSERT OR IGNORE INTO calendar_events (month, day, title, category) VALUES (?, ?, ?, ?)'
  );
  for (const h of holidays) {
    insertHoliday.run(h.month, h.day, h.title, h.category);
  }

  const defaultNetworks = [
    { key: 'telegram', label: 'Telegram', connector: 'telegram', category: 'general' },
    { key: 'vk', label: 'VK', connector: 'vk', category: 'general' },
    { key: 'youtube', label: 'YouTube', connector: 'manual', category: 'music' },
    { key: 'instagram', label: 'Instagram (@levkeiser, личный)', connector: 'manual', category: 'general' },
    { key: 'instagram-djlevka', label: 'Instagram (@djlevka, музыка)', connector: 'manual', category: 'music' },
    { key: 'tiktok', label: 'TikTok', connector: 'manual', category: 'shorts' },
    { key: 'pinterest', label: 'Pinterest', connector: 'manual', category: 'general' },
    { key: 'rutube', label: 'Rutube', connector: 'manual', category: 'general' },
    { key: 'ok', label: 'Одноклассники', connector: 'manual', category: 'general' },
    { key: 'dzen', label: 'Дзен', connector: 'manual', category: 'general' },
    // Найдены на band.link/levkeiser и band.link/djlevka, но отсутствовали в списке.
    { key: 'x', label: 'X (Twitter)', connector: 'manual', category: 'general' },
    { key: 'facebook', label: 'Facebook', connector: 'manual', category: 'general' },
    { key: 'yappy', label: 'Yappy', connector: 'manual', category: 'shorts' },
    { key: 'likee', label: 'Likee', connector: 'manual', category: 'shorts' },
    // Китайские площадки — ссылки на них уже есть в /admin/settings (douyin_url и т.д.).
    { key: 'douyin', label: 'Douyin (кит. TikTok)', connector: 'manual', category: 'shorts' },
    { key: 'weibo', label: 'Weibo', connector: 'manual', category: 'general' },
    { key: 'xiaohongshu', label: 'Xiaohongshu (RedNote)', connector: 'manual', category: 'general' },
    { key: 'vimeo', label: 'Vimeo', connector: 'manual', category: 'music' },
  ];
  const insertNetwork = db.prepare(
    'INSERT OR IGNORE INTO social_networks (key, label, connector, category) VALUES (?, ?, ?, ?)'
  );
  for (const network of defaultNetworks) {
    insertNetwork.run(network.key, network.label, network.connector, network.category);
  }

  // Одноразовая раскладка категории «видеовертикалки» для уже существующих строк
  // (флаг в settings, чтобы не перетирать ручные изменения пользователя при каждом старте).
  // Существующая строка Instagram получила уточнённую подпись (у Льва два аккаунта — личный и музыкальный).
  db.prepare("UPDATE social_networks SET label = ? WHERE key = 'instagram' AND label = 'Instagram'").run(
    'Instagram (@levkeiser, личный)'
  );

  const shortsMigrated = db.prepare("SELECT value FROM settings WHERE key = 'migration_shorts_category'").get();
  if (!shortsMigrated) {
    db.exec("UPDATE social_networks SET category = 'shorts' WHERE key IN ('tiktok', 'yappy', 'likee', 'douyin')");
    db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('migration_shorts_category', 'done')").run();
  }

  // Реальные коннекторы добавились позже, чем сеть 'manual' была изначально засеяна —
  // подтягиваем уже существующие строки на новый коннектор, но только если их не настроили вручную на что-то другое.
  const connectorUpgrades = { youtube: 'youtube', instagram: 'instagram', 'instagram-djlevka': 'instagram', tiktok: 'tiktok', pinterest: 'pinterest' };
  const upgradeConnector = db.prepare("UPDATE social_networks SET connector = ? WHERE key = ? AND connector = 'manual'");
  for (const [key, connector] of Object.entries(connectorUpgrades)) {
    upgradeConnector.run(connector, key);
  }

  const defaultIntros = {
    music_intro: 'DJ Levka — треки, релизы и все площадки в одном месте',
    style_intro: 'Актёрство и моделинг — портфолио, кастинги и соцсети',
    video_intro: 'Каналы и площадки с видео',
    gigs_intro: 'DJ Levka выступает на праздниках — танцевальная музыка, lounge и lo-fi',
    redheads_intro: 'Рыжий цвет волос встречается всего у 1–2% людей на планете — редкая генетика, а не '
      + 'случайность. Здесь — рыжие, которые вдохновляют: модели, музыканты, актёры, творческие люди. '
      + 'Подборку собираем сами, без открытой регистрации.',
    contest_intro: 'Снимите видео модельной проходки под мою музыку и пришлите ссылку — оцениваем сами, '
      + 'лучших объявим отдельно.',
    contest_prize: 'Победитель выбирает приз сам: товары из нашего магазина или денежный приз — на выбор.',
    site_alt_name: 'DJ Levka',
    music_featured_title: 'Soundstates',
    music_featured_note: 'Новый EP — в день релиза попал в плейлист рядом с Moby, Moderat и Röyksopp',
    music_featured_url: 'https://band.link/soundstates',
    legal_ip_name: '',
    legal_inn: '',
    legal_ogrnip: '',
    legal_address: '',
    legal_doc_date: '17.08.2026',
    legal_bank_name: '',
    legal_bank_account: '',
    legal_bank_bik: '',
    legal_bank_corr_account: '',
  };
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultIntros)) {
    insertSetting.run(key, value);
  }

  const pageLinksCount = db.prepare('SELECT COUNT(*) AS c FROM page_links').get().c;
  if (pageLinksCount === 0) {
    const defaultLinks = [
      ['music', 'Площадки', 'Яндекс Музыка', 'https://music.yandex.ru/artist/16939806', 0],
      ['music', 'Площадки', 'VK Музыка', 'https://vk.com/artist/djlevka', 1],
      ['music', 'Площадки', 'МТС Music', 'https://music.mts.ru/artist/16939806', 2],
      ['music', 'Площадки', 'Zvuk', 'https://zvuk.com/artist/211982472', 3],
      ['music', 'Площадки', 'Deezer', 'https://www.deezer.com/ru/artist/174382297', 4],
      ['music', 'Релизы', 'Soundstates EP', 'https://band.link/soundstates', 0],
      ['music', 'Релизы', 'Flowers EP', 'http://band.link/qj5QQ', 1],
      ['music', 'Релизы', 'Ikigai EP', 'https://band.link/ikigai', 2],
      ['music', 'Соцсети', 'Instagram', 'https://instagram.com/djlevka.music', 0],
      ['music', 'Соцсети', 'Telegram', 'https://t.me/djlevkatg', 1],
      ['music', 'Соцсети', 'YouTube', 'https://www.youtube.com/channel/UC2NFcW_NAqJQeSBkZz2dEKA', 2],
      ['music', 'Соцсети', 'TikTok', 'https://www.tiktok.com/@djlevka', 3],
      ['music', 'Соцсети', 'X (Twitter)', 'https://x.com/djlevka', 4],
      ['music', 'Соцсети', 'Facebook', 'https://www.facebook.com/djlevka.music', 5],
      ['music', 'Соцсети', 'Linktree', 'https://linktr.ee/djlevka.music', 6],
      ['style', 'Портфолио', 'Instagram', 'https://instagram.com/levkeiser', 0],
      ['style', 'Портфолио', 'Pinterest — портфолио с 4х лет', 'https://ru.pinterest.com/levkeiser/', 1],
      ['style', 'Кастинг', 'Castingcraft', 'https://castingcraft.ru/actor&uid=vq6ps1p16ojeiiix', 0],
      ['style', 'Кастинг', 'FilmToolz', 'https://casting.filmtoolz.ru/4091179/', 1],
      ['style', 'Соцсети', 'VK', 'https://vk.com/levkeiser', 0],
      ['style', 'Соцсети', 'Дзен', 'https://dzen.ru/djlevka', 1],
      ['style', 'Соцсети', 'Telegram', 'https://t.me/djlevkatg', 2],
      ['style', 'Соцсети', 'Одноклассники', 'https://ok.ru/profile/910221978637', 3],
      ['style', 'Соцсети', 'Linktree', 'https://linktr.ee/djlevka.music', 4],
      ['video', 'Каналы', 'YouTube', 'https://www.youtube.com/channel/UC2NFcW_NAqJQeSBkZz2dEKA', 0],
      ['video', 'Каналы', 'YouTube (второй канал)', 'https://www.youtube.com/@DJLEVKA', 1],
      ['video', 'Каналы', 'TikTok', 'https://www.tiktok.com/@levkeiser', 2],
      ['video', 'Каналы', 'Rutube', 'https://rutube.ru/channel/24325663', 3],
      ['video', 'Каналы', 'Yappy — закулисье', 'https://yappy.media/s/v_6TDy4NiEkVhFZ1S2UdbkAw', 4],
      ['video', 'Каналы', 'Likee — питомцы', 'https://l.likee.video/p/gDIjTT', 5],
    ];
    const insertLink = db.prepare(
      'INSERT INTO page_links (section, group_name, label, url, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    for (const row of defaultLinks) {
      insertLink.run(...row);
    }
  }

  const gigsLinksCount = db.prepare("SELECT COUNT(*) AS c FROM page_links WHERE section = 'gigs'").get().c;
  if (gigsLinksCount === 0) {
    db.prepare(`
      INSERT INTO page_links (section, group_name, label, url, sort_order) VALUES (?, ?, ?, ?, ?)
    `).run('gigs', 'Контакты', 'Написать на почту', 'mailto:booking@levkeiser.com', 0);
  }

  const bannersCount = db.prepare('SELECT COUNT(*) AS c FROM promo_banners').get().c;
  if (bannersCount === 0) {
    const insertBanner = db.prepare(`
      INSERT INTO promo_banners (page_key, title, subtitle, cta_label, cta_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertBanner.run(
      'style',
      'Рыжие, которые вдохновляют',
      'Редкая генетика — 1–2% людей на планете. Подборка рыжих моделей, музыкантов и творческих людей — от Льва и не только.',
      'Смотреть подборку',
      '/redheads',
      0
    );
    insertBanner.run(
      'news',
      'Рыжие, которые вдохновляют',
      'Новый раздел стиля: курируемая подборка рыжих людей, которые вдохновляют — без открытой регистрации.',
      'Открыть раздел',
      '/redheads',
      0
    );
  }

  const spotlightsCount = db.prepare('SELECT COUNT(*) AS c FROM redhead_spotlights').get().c;
  if (spotlightsCount === 0) {
    db.prepare(`
      INSERT INTO redhead_spotlights (name, role, note, link_url, link_label, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'Лев Кейсер',
      'Модель, актёр, DJ Levka',
      'Начинаем подборку с себя — портфолио с 4 лет, сейчас ещё и музыка под именем DJ Levka.',
      '/style',
      'Смотреть портфолио',
      0
    );
  }

  const collectionsCount = db.prepare('SELECT COUNT(*) AS c FROM collections').get().c;
  if (collectionsCount === 0) {
    db.prepare(`
      INSERT INTO collections (name, slug, subtitle, description, season_label, is_published, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Флёр × Лев',
      'fleur-x-lev',
      'Кастомные светильники — коллаборация с мастерской «Флёр»',
      'Абажуры декорирует ателье «Флёр» (Екатеринбург, 28+ лет на рынке), основания — от «Сима-ленд». '
        + 'На части абажуров — сублимационная печать с обложками альбомов DJ Levka. '
        + 'Этот дроп — в первую очередь витрина: показывает, как может выглядеть коллаборация с Львом, '
        + 'для других мастерских и брендов.',
      'Осень 2026',
      1,
      0
    );
  }

  const releasesCount = db.prepare('SELECT COUNT(*) AS c FROM releases').get().c;
  if (releasesCount === 0) {
    const insertRelease = db.prepare(`
      INSERT INTO releases (title, slug, release_type, year, description, cover_image, streaming_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTrack = db.prepare(`
      INSERT INTO tracks (title, slug, description, url, cover_image, release_id, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const releases = [
      {
        title: 'Soundstates',
        slug: 'soundstates',
        year: '2026',
        description: 'Третий альбом DJ Levka — vaporwave / synthwave / lofi house / jazzy lofi / retrowave.',
        cover: '/uploads/release-soundstates.jpg',
        url: 'https://band.link/soundstates',
        sort: 0,
        tracks: [
          { title: 'soundstates', description: 'Заглавный трек альбома — фирменное звучание DJ Levka: ретро-синты и lo-fi атмосфера. Стиль: synthwave.' },
          { title: 'd r e a m', description: 'Плывущий, полусонный трек — как обрывок сна, который пытаешься удержать. Стиль: vaporwave.' },
          { title: 'back to the future', description: 'Ретрофутуризм в звуке: synthwave-ностальгия по будущему, каким его видели из прошлого. Стиль: retrowave.' },
          { title: '2AM', description: 'Час ночи, когда город затихает — трек для одиноких прогулок под неон. Стиль: lofi house.' },
          { title: 'cloudflute', description: 'Воздушная, почти невесомая мелодия — звук, будто сыгранный на облаке. Стиль: jazzy lofi.' },
        ],
      },
      {
        title: 'Flowers',
        slug: 'flowers',
        year: '2025',
        description: 'Второй EP DJ Levka.',
        cover: '/uploads/release-flowers.jpg',
        url: 'http://band.link/qj5QQ',
        sort: 1,
        tracks: [
          { title: 'flowers', description: 'Заглавный трек — хрупкое, цветущее начало альбома о чувствах. Стиль: dream pop / lofi.' },
          { title: 'memory', description: 'Трек-воспоминание: тёплая грусть по тому, что уже не вернуть. Стиль: ambient lofi.' },
          { title: 'u', description: 'Самый личный трек альбома — обращение к одному человеку. Стиль: bedroom pop.' },
          { title: 'rif raf', description: 'Более дерзкий, шершавый по звучанию момент альбома. Стиль: lofi hip-hop.' },
          { title: 'lullaby', description: 'Колыбельная в конце пути — мягкое закрытие альбома. Стиль: ambient / downtempo.' },
        ],
      },
      {
        title: 'Ikigai',
        slug: 'ikigai',
        year: '2024',
        description: 'Дебютный EP DJ Levka — с японского «икигай» переводится как «причина жить».',
        cover: '/uploads/release-ikigai.jpg',
        url: 'https://band.link/ikigai',
        sort: 2,
        tracks: [
          { title: 'Ikigai', description: 'Заглавный трек дебютного EP — про поиск своего смысла. Стиль: lofi hip-hop.' },
          { title: 'The Sleepiest Beatmaker', description: 'Ироничная самопрезентация — сонный битмейкер за работой. Стиль: chillhop.' },
          { title: 'Nisu', description: 'Один из самых атмосферных треков EP. Стиль: ambient lofi.' },
          { title: 'Fog', description: 'Туманное, приглушённое звучание — как взгляд сквозь дымку. Стиль: downtempo.' },
          { title: 'Bill Cipher', description: 'Название-отсылка к культовому персонажу — трек с лёгким налётом мистики. Стиль: dark lofi hip-hop.' },
        ],
      },
    ];

    for (const release of releases) {
      const info = insertRelease.run(
        release.title, release.slug, 'EP', release.year, release.description, release.cover, release.url, release.sort
      );
      release.tracks.forEach((track, i) => {
        insertTrack.run(track.title, slugify(track.title), track.description, '', release.cover, info.lastInsertRowid, i);
      });
    }
  }
}

init();

module.exports = init;
