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

    -- Нумерованные бюсты. Тираж открытый: номера идут сквозняком, потолка нет.
    -- У каждого экземпляра своя фраза — на самой вещи её нет, она открывается
    -- только по номеру на сайте.
    CREATE TABLE IF NOT EXISTS busts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      nfc_uid TEXT NOT NULL DEFAULT '',
      series TEXT NOT NULL DEFAULT 'soundstates',
      kind TEXT NOT NULL DEFAULT '',
      material TEXT NOT NULL DEFAULT '',
      phrase TEXT NOT NULL DEFAULT '',
      cast_date TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      owner_email TEXT NOT NULL DEFAULT '',
      registered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Метки на вещах, которые не бюсты: пластинки, флаги, чехлы. Та же логика,
    -- что у busts: на метку пишется ссылка /n/<код>, код случайный и подтверждает
    -- подлинность, UID метки записывается для сверки. Куда ведёт страница,
    -- меняется в админке — саму метку переписывать не нужно.
    CREATE TABLE IF NOT EXISTS nfc_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      code TEXT NOT NULL UNIQUE,
      nfc_uid TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'other',
      label TEXT NOT NULL DEFAULT '',
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      target_url TEXT NOT NULL DEFAULT '',
      bonus_file TEXT NOT NULL DEFAULT '',
      bonus_label TEXT NOT NULL DEFAULT '',
      public_note TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      scans INTEGER NOT NULL DEFAULT 0,
      last_scan_at TEXT,
      owner_name TEXT NOT NULL DEFAULT '',
      owner_email TEXT NOT NULL DEFAULT '',
      registered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Выдача цифровых товаров: одна строка на каждый купленный цифровой товар.
    -- Ссылка на скачивание работает по токену, ограничена сроком и числом попыток,
    -- чтобы её нельзя было просто переслать дальше.
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      max_downloads INTEGER NOT NULL DEFAULT 5,
      downloads_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      last_download_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS diary_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      dzen_url TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aroma_blends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL,
      delete_token TEXT NOT NULL DEFAULT '',
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

    -- Обращения с формы на сайте. Храним, потому что письмо может не дойти
    -- или уехать в спам, а обращение потерять нельзя.
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_to TEXT NOT NULL,
      mail_error TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
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

  // Превью публикации на площадке: ленту просматривают глазами по картинкам,
  // а не по тексту. Ссылка внешняя — файл к себе не тянем.
  const postCols = db.prepare('PRAGMA table_info(social_posts)').all();
  if (!postCols.some((c) => c.name === 'thumb_url')) {
    db.exec("ALTER TABLE social_posts ADD COLUMN thumb_url TEXT NOT NULL DEFAULT ''");
  }

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
  // Цифровые товары: DJ-версии, стемы, пресеты. Файл лежит вне public/,
  // отдаётся только после оплаты и только по токену.
  if (!productCols.some((c) => c.name === 'is_digital')) {
    db.exec('ALTER TABLE products ADD COLUMN is_digital INTEGER NOT NULL DEFAULT 0');
  }
  if (!productCols.some((c) => c.name === 'digital_file')) {
    db.exec("ALTER TABLE products ADD COLUMN digital_file TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'digital_filename')) {
    db.exec("ALTER TABLE products ADD COLUMN digital_filename TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'digital_size')) {
    db.exec('ALTER TABLE products ADD COLUMN digital_size INTEGER NOT NULL DEFAULT 0');
  }
  // Услуга: оформляется как цифровой товар (без адреса и остатка), но файла нет —
  // результат делаем руками и присылаем письмом. Пример — аудит каталога за 1 000 ₽.
  if (!productCols.some((c) => c.name === 'is_service')) {
    db.exec('ALTER TABLE products ADD COLUMN is_service INTEGER NOT NULL DEFAULT 0');
  }
  // Параметры для карточки: покупатель должен видеть, что именно получит,
  // до оформления заказа, а не писать нам с вопросами
  if (!productCols.some((c) => c.name === 'lead_time')) {
    db.exec("ALTER TABLE products ADD COLUMN lead_time TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'includes')) {
    db.exec("ALTER TABLE products ADD COLUMN includes TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'dimensions')) {
    db.exec("ALTER TABLE products ADD COLUMN dimensions TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'weight')) {
    db.exec("ALTER TABLE products ADD COLUMN weight TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'material')) {
    db.exec("ALTER TABLE products ADD COLUMN material TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.some((c) => c.name === 'care')) {
    db.exec("ALTER TABLE products ADD COLUMN care TEXT NOT NULL DEFAULT ''");
  }
  // Вещь привязана к конкретному треку, а не только к релизу: бюсты сделаны
  // под Soundstates, таблетка «Груша × Лев» звучит под d r e a m. На странице
  // трека показываем «вещи к этому треку», в карточке — ссылку на трек.
  if (!productCols.some((c) => c.name === 'track_id')) {
    db.exec('ALTER TABLE products ADD COLUMN track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL');
  }

  // Бренд отмечает галочками, какие форматы из ассортимента ему нужны.
  // Храним как JSON-массив названий, чтобы список форматов жил в одном месте (routes/brands.js).
  const brandCols = db.prepare('PRAGMA table_info(brand_requests)').all();
  if (!brandCols.some((c) => c.name === 'wants')) {
    db.exec("ALTER TABLE brand_requests ADD COLUMN wants TEXT NOT NULL DEFAULT '[]'");
  }

  // Прослушивания фонового плеера на сайте. Стриминги их не считают —
  // это наш собственный счётчик: трек засчитывается после 30 секунд
  // непрерывного воспроизведения, как на Spotify.
  db.exec(`
    CREATE TABLE IF NOT EXISTS track_plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      src TEXT NOT NULL,
      page TEXT NOT NULL DEFAULT '',
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_track_plays_src ON track_plays(src);
  `);

  // Просмотры страниц: только путь и день, без IP и куки.
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      path TEXT NOT NULL,
      day TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (path, day)
    );
  `);

  // Раздел «Стиль»: вещи с историей и голоса за образы.
  // Голос — один на образ с одного устройства (voter приходит из localStorage),
  // без регистрации: это игра, а не выборы.
  db.exec(`
    CREATE TABLE IF NOT EXISTS style_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      story TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      link_label TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Оценки записей дневника: школьная шкала от 2 до 5. Игра, а не рейтинг:
    -- Лев пишет, читатель ставит оценку, как учитель на полях.
    -- Один голос с устройства на запись, повторный меняет оценку.
    CREATE TABLE IF NOT EXISTS diary_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES diary_posts(id) ON DELETE CASCADE,
      voter TEXT NOT NULL,
      mark INTEGER NOT NULL CHECK (mark BETWEEN 2 AND 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, voter)
    );

    CREATE TABLE IF NOT EXISTS look_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
      voter TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(item_id, voter)
    );
  `);

  // Фото знаменитостей берём с Wikimedia Commons под CC — лицензия требует
  // указать автора и лицензию рядом с фото, для этого своя колонка.
  const spotlightCols = db.prepare('PRAGMA table_info(redhead_spotlights)').all();
  if (!spotlightCols.some((c) => c.name === 'photo_credit')) {
    db.exec("ALTER TABLE redhead_spotlights ADD COLUMN photo_credit TEXT NOT NULL DEFAULT ''");
  }

  const redheadSubmissionCols = db.prepare('PRAGMA table_info(redhead_submissions)').all();
  if (!redheadSubmissionCols.some((c) => c.name === 'age_consent')) {
    db.exec("ALTER TABLE redhead_submissions ADD COLUMN age_consent INTEGER NOT NULL DEFAULT 0");
  }
  if (!redheadSubmissionCols.some((c) => c.name === 'data_consent')) {
    db.exec("ALTER TABLE redhead_submissions ADD COLUMN data_consent INTEGER NOT NULL DEFAULT 0");
  }
  // Несовершеннолетние в «Рыжих» (18.09.2026): возрастная группа заявки, родитель
  // или законный представитель и его подтверждение. Для 14–17 согласие родителя
  // подтверждается ссылкой из письма (токен), за детей до 14 заявку подаёт сам
  // родитель. Подтверждение хранится с датой и адресом — это и есть согласие
  // в электронной форме (152-ФЗ, ст. 152.1 ГК).
  for (const [col, ddl] of [
    ['age_group', "TEXT NOT NULL DEFAULT 'adult'"],
    ['guardian_name', "TEXT NOT NULL DEFAULT ''"],
    ['guardian_contact', "TEXT NOT NULL DEFAULT ''"],
    ['consent_token', 'TEXT'],
    ['consent_confirmed_at', 'TEXT'],
    ['consent_ip', 'TEXT'],
  ]) {
    if (!redheadSubmissionCols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE redhead_submissions ADD COLUMN ${col} ${ddl}`);
    }
  }
  // Несовершеннолетний на витрине: только имя без фамилии и без внешней ссылки.
  if (!spotlightCols.some((c) => c.name === 'is_minor')) {
    db.exec("ALTER TABLE redhead_spotlights ADD COLUMN is_minor INTEGER NOT NULL DEFAULT 0");
  }
  // Кабинет без пароля (18.09.2026): ссылки входа и рецепты с карты ароматов.
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      last_seen_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_account_links_email ON account_links(email);
    CREATE TABLE IF NOT EXISTS aroma_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_aroma_recipes_email ON aroma_recipes(email);
  `);

  // Конкурс «Твой выход под трек» — та же схема согласия родителя (18.09.2026).
  const contestCols = db.prepare('PRAGMA table_info(contest_submissions)').all();
  for (const [col, ddl] of [
    ['season', "TEXT NOT NULL DEFAULT ''"],
    ['age_group', "TEXT NOT NULL DEFAULT 'adult'"],
    ['guardian_name', "TEXT NOT NULL DEFAULT ''"],
    ['guardian_contact', "TEXT NOT NULL DEFAULT ''"],
    ['consent_token', 'TEXT'],
    ['consent_confirmed_at', 'TEXT'],
    ['consent_ip', 'TEXT'],
  ]) {
    if (!contestCols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE contest_submissions ADD COLUMN ${col} ${ddl}`);
    }
  }

  const contestSubmissionCols = db.prepare('PRAGMA table_info(contest_submissions)').all();
  if (!contestSubmissionCols.some((c) => c.name === 'data_consent')) {
    db.exec("ALTER TABLE contest_submissions ADD COLUMN data_consent INTEGER NOT NULL DEFAULT 0");
  }

  const newsCols = db.prepare('PRAGMA table_info(news)').all();
  if (!newsCols.some((c) => c.name === 'lang')) {
    db.exec("ALTER TABLE news ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'");
  }
  if (!newsCols.some((c) => c.name === 'newsletter_sent_at')) {
    db.exec('ALTER TABLE news ADD COLUMN newsletter_sent_at TEXT');
  }
  if (!newsCols.some((c) => c.name === 'is_pinned')) {
    // Закреплённая новость показывается первой в списке независимо от даты.
    db.exec('ALTER TABLE news ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
  }

  // Пара RU/EN одной новости живёт под одним slug — по нему переключатель языка
  // на сайте находит перевод (src/routes/news.js). Поэтому уникальность должна
  // быть на (slug, lang), а не на одном slug, как в первой версии таблицы.
  const newsSlugOnlyUnique = db.prepare('PRAGMA index_list(news)').all()
    .filter((ix) => ix.unique)
    .some((ix) => {
      const cols = db.prepare(`PRAGMA index_info("${ix.name}")`).all();
      return cols.length === 1 && cols[0].name === 'slug';
    });
  if (newsSlugOnlyUnique) {
    // Пересборка таблицы. Внешние ключи выключаем на время: иначе DROP TABLE news
    // каскадом снесёт все строки news_media.
    db.exec('PRAGMA foreign_keys = OFF');
    try {
      db.exec(`
        BEGIN;
        CREATE TABLE news_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          content TEXT DEFAULT '',
          is_published INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          lang TEXT NOT NULL DEFAULT 'ru',
          newsletter_sent_at TEXT,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          UNIQUE (slug, lang)
        );
        INSERT INTO news_new (id, title, slug, content, is_published, created_at, lang, newsletter_sent_at, is_pinned)
          SELECT id, title, slug, content, is_published, created_at, lang, newsletter_sent_at, is_pinned FROM news;
        DROP TABLE news;
        ALTER TABLE news_new RENAME TO news;
        COMMIT;
      `);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }

  // Ссылки на соцсети в одном месте — social_networks.url (админка → Соцсети).
  // Раньше они жили в settings (vk_url, telegram_url, …) и дублировались в
  // page_links; переносим значения из settings и удаляем старые ключи.
  const socialCols = db.prepare('PRAGMA table_info(social_networks)').all();
  if (!socialCols.some((c) => c.name === 'url')) {
    db.exec("ALTER TABLE social_networks ADD COLUMN url TEXT NOT NULL DEFAULT ''");
  }
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'migration_social_urls'").get()) {
    const SOCIAL_URL_KEYS = ['vk', 'telegram', 'whatsapp', 'instagram', 'youtube', 'tiktok', 'pinterest', 'rutube', 'ok', 'dzen', 'douyin', 'weibo', 'wechat', 'xiaohongshu'];
    const LABELS = { whatsapp: 'WhatsApp', wechat: 'WeChat' };
    const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
    const hasNet = db.prepare('SELECT id, url FROM social_networks WHERE key = ?');
    const insertNet = db.prepare("INSERT INTO social_networks (key, label, connector, credentials, enabled, category, url) VALUES (?, ?, 'manual', '{}', 0, 'general', ?)");
    const setUrl = db.prepare("UPDATE social_networks SET url = ? WHERE key = ? AND url = ''");
    for (const key of SOCIAL_URL_KEYS) {
      const row = getSetting.get(key + '_url');
      const url = row ? String(row.value || '').trim() : '';
      const net = hasNet.get(key);
      if (!net) insertNet.run(key, LABELS[key] || key, url);
      else if (url) setUrl.run(url, key);
    }
    // Остальным сетям адрес берём из списков ссылок на страницах, если он там есть.
    const fromLinks = db.prepare('SELECT url FROM page_links WHERE url LIKE ? ORDER BY id LIMIT 1');
    const GUESS = {
      'instagram-djlevka': '%instagram.com/djlevka%', facebook: '%facebook.com/%', x: '%x.com/%',
      soundcloud: '%soundcloud.com/%', yappy: '%yappy.media/%', likee: '%likee.video/%', vimeo: '%vimeo.com/%',
    };
    for (const [key, pattern] of Object.entries(GUESS)) {
      const hit = fromLinks.get(pattern);
      if (hit) setUrl.run(hit.url, key);
    }
    db.prepare("DELETE FROM settings WHERE key IN (" + SOCIAL_URL_KEYS.map((k) => `'${k}_url'`).join(',') + ')').run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_social_urls', '1')").run();
  }

  // Аудитория сети: 'all' — на обеих версиях сайта, 'ru' — только на русской,
  // 'en' — только на английской (/en/…). Правится в карточке сети в админке.
  if (!socialCols.some((c) => c.name === 'audience')) {
    db.exec("ALTER TABLE social_networks ADD COLUMN audience TEXT NOT NULL DEFAULT 'all'");
  }
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'migration_social_audience'").get()) {
    const setAud = db.prepare('UPDATE social_networks SET audience = ? WHERE key = ?');
    // Русские площадки — русской версии; заблокированные в РФ и китайские — английской.
    for (const k of ['vk', 'dzen', 'ok', 'rutube', 'likee', 'yappy']) setAud.run('ru', k);
    for (const k of ['facebook', 'x', 'douyin', 'weibo', 'wechat', 'xiaohongshu']) setAud.run('en', k);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_social_audience', '1')").run();
  }

  // Списки соцсетей на страницах «Обо мне», «Музыка», «Стиль» теперь строятся из
  // social_networks (utils/links.socialLinksGroup); дубли адресов в page_links убираем.
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'migration_social_page_links'").get()) {
    db.prepare(`
      DELETE FROM page_links WHERE
        (section = 'about' AND group_name = 'Где читать и смотреть')
        OR (section = 'music' AND group_name = 'Соцсети')
        OR (section = 'video' AND group_name = 'Каналы')
        OR (section = 'style' AND (url LIKE '%pinterest.%' OR url LIKE '%t.me/%'))
    `).run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_social_page_links', '1')").run();
  }

  // Запись дневника может быть привязана к дропу: на странице записи — карточка
  // дропа, на странице дропа — «Из дневника». Выбирается в /admin/diary.
  const diaryCols = db.prepare('PRAGMA table_info(diary_posts)').all();
  if (!diaryCols.some((c) => c.name === 'collection_id')) {
    db.exec('ALTER TABLE diary_posts ADD COLUMN collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL');
  }
  // Первая связка: манифест «Двигаюсь медленно в быстром мире» ↔ дроп Slow in a fast world.
  db.prepare(`
    UPDATE diary_posts SET collection_id = (SELECT id FROM collections WHERE slug = 'slow-in-a-fast-world')
    WHERE slug = 'dvigayus-medlenno-v-bystrom-mire' AND collection_id IS NULL
  `).run();

  // Кэш переводов фраз для английской версии сайта (services/pageTranslate.js).
  // edited = 1 — перевод поправлен руками в админке, автоперевод его не трогает.
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT UNIQUE NOT NULL,
      lang TEXT NOT NULL DEFAULT 'en',
      src TEXT NOT NULL,
      dst TEXT NOT NULL,
      edited INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const galleryItemCols = db.prepare('PRAGMA table_info(gallery_items)').all();
  if (!galleryItemCols.some((c) => c.name === 'shot_date')) {
    // Дата съёмки (YYYY-MM-DD) — для маркировки кадров в киноплёнке; created_at остаётся датой загрузки.
    db.exec("ALTER TABLE gallery_items ADD COLUMN shot_date TEXT NOT NULL DEFAULT ''");
  }
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
  // Страница трека на бирже лицензий IPEX — кнопка «лицензия для видео и рекламы».
  if (!trackCols.some((c) => c.name === 'ipex_url')) {
    db.exec("ALTER TABLE tracks ADD COLUMN ipex_url TEXT NOT NULL DEFAULT ''");
  }
  // Видео к треку и релизу: клип или плейлист YouTube (или любая ссылка,
  // которую понимает utils/videoEmbed). Хранится ссылка, не файл.
  // Формат — горизонтальный 16:9 или вертикальный 9:16 (shorts, вертикалки):
  // плеер сам его не сообщает, поэтому выбирают в админке.
  for (const table of ['tracks', 'releases']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === 'video_url')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN video_url TEXT DEFAULT ''`);
    }
    if (!cols.some((c) => c.name === 'video_format')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN video_format TEXT NOT NULL DEFAULT 'landscape'`);
    }
  }

  // Прямые ссылки на площадки по релизу (JSON: yandex, vk, zvuk, apple, spotify…).
  // Кнопки на сайте ведут сразу туда, без прокладки band.link; порядок кнопок
  // по языку страницы собирает utils/platforms.
  const releaseCols = db.prepare('PRAGMA table_info(releases)').all();
  if (!releaseCols.some((c) => c.name === 'platform_links')) {
    db.exec("ALTER TABLE releases ADD COLUMN platform_links TEXT NOT NULL DEFAULT '{}'");
  }

  // Печать по требованию (Printful). У товара — кто изготавливает и варианты
  // (размеры ↔ sync variant id), у позиции заказа — выбранный вариант и статус
  // отправки печатнику, у заказа — адрес по полям: Printful не разбирает
  // строку «город, улица, дом», ему нужны страна, город и индекс отдельно.
  const podProductCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
  if (!podProductCols.includes('fulfillment')) {
    db.exec("ALTER TABLE products ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'self'");
  }
  if (!podProductCols.includes('printful_variants')) {
    db.exec("ALTER TABLE products ADD COLUMN printful_variants TEXT NOT NULL DEFAULT ''");
  }
  // Изготовитель и место изготовления — обязательная информация о товаре по
  // правилам дистанционной торговли (ст. 26.1 ЗоЗПП, ПП 2463). Показывается в карточке.
  if (!podProductCols.includes('manufacturer')) {
    db.exec("ALTER TABLE products ADD COLUMN manufacturer TEXT NOT NULL DEFAULT ''");
  }
  // Габариты упаковки «Д × Ш × В см» — для накладной в службе доставки
  // (dimensions — размер самой вещи, он показывается покупателю).
  if (!podProductCols.includes('package_size')) {
    db.exec("ALTER TABLE products ADD COLUMN package_size TEXT NOT NULL DEFAULT ''");
  }
  const podItemCols = db.prepare('PRAGMA table_info(order_items)').all().map((c) => c.name);
  for (const [col, def] of [['variant', "TEXT NOT NULL DEFAULT ''"], ['fulfillment_status', "TEXT NOT NULL DEFAULT ''"], ['fulfillment_ref', "TEXT NOT NULL DEFAULT ''"]]) {
    if (!podItemCols.includes(col)) db.exec(`ALTER TABLE order_items ADD COLUMN ${col} ${def}`);
  }
  const podOrderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  for (const col of ['country', 'city', 'zip']) {
    if (!podOrderCols.includes(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
  }
  // Доставка, посчитанная при оформлении (СДЭК): служба, тариф, сумма, срок.
  // total заказа включает shipping_cost; вещи считаются отдельно в order_items.
  // shipping_ref — uuid заказа в СДЭК, shipping_track — номер накладной (появляется
  // после обработки заказа СДЭК), shipping_status — 'created' | 'manual' | 'error'.
  for (const [col, def] of [['shipping_carrier', "TEXT NOT NULL DEFAULT ''"], ['shipping_tariff', "TEXT NOT NULL DEFAULT ''"], ['shipping_cost', 'REAL NOT NULL DEFAULT 0'], ['shipping_days', "TEXT NOT NULL DEFAULT ''"], ['shipping_ref', "TEXT NOT NULL DEFAULT ''"], ['shipping_track', "TEXT NOT NULL DEFAULT ''"], ['shipping_status', "TEXT NOT NULL DEFAULT ''"]]) {
    if (!podOrderCols.includes(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
  }
  // Страница заказа без личного кабинета: длинный случайный токен в ссылке из письма.
  // Старым заказам токен выдаём здесь же, чтобы /orders (поиск по почте) находил и их.
  if (!podOrderCols.includes('access_token')) {
    db.exec("ALTER TABLE orders ADD COLUMN access_token TEXT NOT NULL DEFAULT ''");
  }
  {
    const { randomBytes } = require('crypto');
    const fill = db.prepare('UPDATE orders SET access_token = ? WHERE id = ?');
    for (const row of db.prepare("SELECT id FROM orders WHERE access_token = ''").all()) {
      fill.run(randomBytes(16).toString('hex'), row.id);
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_access_token ON orders(access_token)');
  }

  // Отзывы только от подтверждённых покупателей: пишутся со страницы заказа
  // (kind = product) или по приглашению, которое выдаёт админка (kind = service —
  // клиенты услуги «Коллегам», заказа в магазине у них нет). Показываются после модерации.
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'product',
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      subject TEXT NOT NULL DEFAULT '',
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      invite_id INTEGER,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS review_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      kind TEXT NOT NULL DEFAULT 'service',
      subject TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL DEFAULT '',
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Подкаст: раздел заведён до первого выпуска, поэтому запись может жить
  // без файла — тогда карточка показывается как «скоро».
  db.exec(`
    CREATE TABLE IF NOT EXISTS podcast_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      guest TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL DEFAULT '',
      audio_url TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      episode_date TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Обложка дропа: витрина коллабораций не может быть текстовой, а товары
  // появляются позже самого дропа — брать картинку из первого товара нечем.
  const collectionCols = db.prepare('PRAGMA table_info(collections)').all();
  if (!collectionCols.some((c) => c.name === 'cover_image')) {
    db.exec("ALTER TABLE collections ADD COLUMN cover_image TEXT NOT NULL DEFAULT ''");
  }

  const socialTargetCols = db.prepare('PRAGMA table_info(social_post_targets)').all();
  if (!socialTargetCols.some((c) => c.name === 'stats')) {
    db.exec("ALTER TABLE social_post_targets ADD COLUMN stats TEXT DEFAULT '{}'");
  }
  if (!socialTargetCols.some((c) => c.name === 'stats_updated_at')) {
    db.exec('ALTER TABLE social_post_targets ADD COLUMN stats_updated_at TEXT');
  }

  const socialPostCols = db.prepare('PRAGMA table_info(social_posts)').all();
  if (!socialPostCols.some((c) => c.name === 'text_en')) {
    // Английская версия подписи — используется для «музыкальных» сетей (международная аудитория).
    db.exec("ALTER TABLE social_posts ADD COLUMN text_en TEXT NOT NULL DEFAULT ''");
  }
  if (!socialPostCols.some((c) => c.name === 'news_hook')) {
    // Инфоповод (напр. «трек попал в плейлист…») — подставляется первой строкой подписи.
    db.exec("ALTER TABLE social_posts ADD COLUMN news_hook TEXT NOT NULL DEFAULT ''");
  }
  if (!socialPostCols.some((c) => c.name === 'story')) {
    // 1 = дополнительно опубликовать в историях (там, где сеть это умеет: VK, Instagram).
    db.exec('ALTER TABLE social_posts ADD COLUMN story INTEGER NOT NULL DEFAULT 0');
  }
  if (!socialPostCols.some((c) => c.name === 'approved')) {
    // Пост публикуется планировщиком ТОЛЬКО после явного подтверждения (кнопка в календаре).
    db.exec('ALTER TABLE social_posts ADD COLUMN approved INTEGER NOT NULL DEFAULT 0');
  }
  if (!socialPostCols.some((c) => c.name === 'link_url')) {
    // Ссылка поста (например, на товар) — добавляется в подпись и в кнопку VK-истории.
    db.exec("ALTER TABLE social_posts ADD COLUMN link_url TEXT NOT NULL DEFAULT ''");
  }
  // Откуда взят материал. Заполняется в том числе ПОСЛЕ публикации: текст
  // переписывать поздно, а ссылки на источники хранить негде — и потом их
  // приходится искать заново.
  if (!socialPostCols.some((c) => c.name === 'sources')) {
    db.exec("ALTER TABLE social_posts ADD COLUMN sources TEXT NOT NULL DEFAULT ''");
  }
  // Альбом: до десяти файлов в одном посте (JSON), первый дублируется в media_path/media_type.
  if (!postCols.some((c) => c.name === 'media_items')) {
    db.exec("ALTER TABLE social_posts ADD COLUMN media_items TEXT NOT NULL DEFAULT '[]'");
  }

  const socialTargetCols2 = db.prepare('PRAGMA table_info(social_post_targets)').all();
  if (!socialTargetCols2.some((c) => c.name === 'story_status')) {
    db.exec("ALTER TABLE social_post_targets ADD COLUMN story_status TEXT NOT NULL DEFAULT ''");
  }
  if (!socialTargetCols2.some((c) => c.name === 'story_error')) {
    db.exec("ALTER TABLE social_post_targets ADD COLUMN story_error TEXT NOT NULL DEFAULT ''");
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
    { key: 'instagram', label: 'Instagram', connector: 'manual', category: 'general' },
    { key: 'instagram-djlevka', label: 'Instagram DJ Levka', connector: 'manual', category: 'music' },
    { key: 'tiktok', label: 'TikTok', connector: 'manual', category: 'shorts' },
    { key: 'pinterest', label: 'Pinterest', connector: 'manual', category: 'general' },
    { key: 'rutube', label: 'Rutube', connector: 'manual', category: 'general' },
    { key: 'ok', label: 'Одноклассники', connector: 'manual', category: 'general' },
    { key: 'dzen', label: 'Дзен', connector: 'manual', category: 'general' },
    // Найдены на band.link/levkeiser и band.link/djlevka, но отсутствовали в списке.
    { key: 'x', label: 'X', connector: 'manual', category: 'general' },
    { key: 'facebook', label: 'Facebook', connector: 'manual', category: 'general' },
    { key: 'yappy', label: 'Yappy', connector: 'manual', category: 'shorts' },
    { key: 'likee', label: 'Likee', connector: 'manual', category: 'shorts' },
    // Китайские площадки — ссылки на них уже есть в /admin/settings (douyin_url и т.д.).
    { key: 'douyin', label: 'Douyin', connector: 'manual', category: 'shorts' },
    { key: 'weibo', label: 'Weibo', connector: 'manual', category: 'general' },
    { key: 'xiaohongshu', label: 'Xiaohongshu', connector: 'manual', category: 'general' },
    { key: 'vimeo', label: 'Vimeo', connector: 'manual', category: 'music' },
    { key: 'soundcloud', label: 'SoundCloud', connector: 'manual', category: 'music' },
    { key: 'news', label: 'Новости сайта', connector: 'news', category: 'general' },
  ];
  const insertNetwork = db.prepare(
    'INSERT OR IGNORE INTO social_networks (key, label, connector, category) VALUES (?, ?, ?, ?)'
  );
  for (const network of defaultNetworks) {
    insertNetwork.run(network.key, network.label, network.connector, network.category);
  }

  // Одноразовая раскладка категории «видеовертикалки» для уже существующих строк
  // (флаг в settings, чтобы не перетирать ручные изменения пользователя при каждом старте).
  // Названия сетей — короткие, без скобок (12.09.2026); раньше здесь при каждом
  // старте Instagram переименовывался обратно в «Instagram (@levkeiser, личный)».

  // «Новости сайта» не требуют учётных данных — включаем один раз при появлении.
  const newsNetMigrated = db.prepare("SELECT value FROM settings WHERE key = 'migration_news_network_enabled'").get();
  if (!newsNetMigrated) {
    db.prepare("UPDATE social_networks SET enabled = 1 WHERE key = 'news'").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_news_network_enabled', '1')").run();
  }

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
    contest_intro: 'Сними, как ты выходишь под мой трек — 15–30 секунд вертикального видео. '
      + 'Судим образ и попадание в музыку, а не рост и параметры. Участникам 18+.',
    contest_prize: 'Главный приз — съёмка в клипе. Дальше: вещь из капсулы и денежный приз от бренда-партнёра '
      + 'сезона. Победителей объявляем в канале и на этой странице.',
    site_alt_name: 'DJ Levka',
    music_featured_title: 'Soundstates',
    music_featured_note: 'Новый EP — попал в кураторский плейлист на следующий день после релиза',
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
    redheads_teaser_mode: '1',
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
