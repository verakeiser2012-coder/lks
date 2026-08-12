const db = require('./index');

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
      sort_order INTEGER NOT NULL DEFAULT 0,
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
  `);

  const defaultNetworks = [
    { key: 'telegram', label: 'Telegram', connector: 'telegram' },
    { key: 'vk', label: 'VK', connector: 'vk' },
    { key: 'youtube', label: 'YouTube', connector: 'manual' },
    { key: 'instagram', label: 'Instagram', connector: 'manual' },
    { key: 'tiktok', label: 'TikTok', connector: 'manual' },
    { key: 'pinterest', label: 'Pinterest', connector: 'manual' },
    { key: 'rutube', label: 'Rutube', connector: 'manual' },
    { key: 'ok', label: 'Одноклассники', connector: 'manual' },
    { key: 'dzen', label: 'Дзен', connector: 'manual' },
  ];
  const insertNetwork = db.prepare(
    'INSERT OR IGNORE INTO social_networks (key, label, connector) VALUES (?, ?, ?)'
  );
  for (const network of defaultNetworks) {
    insertNetwork.run(network.key, network.label, network.connector);
  }

  const defaultIntros = {
    music_intro: 'DJ Levka — треки, релизы и все площадки в одном месте',
    style_intro: 'Актёрство и моделинг — портфолио, кастинги и соцсети',
    video_intro: 'Каналы и площадки с видео',
    site_alt_name: 'DJ Levka',
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
}

init();

module.exports = init;
