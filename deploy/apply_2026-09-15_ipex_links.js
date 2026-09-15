// Ссылки на биржу лицензий IPEX: витрина DJ Levka (настройка ipex_showcase_url)
// и страница каждого опубликованного там трека (tracks.ipex_url). Welcome и BERSERK
// на 15.09 ещё «Отклонён» — добавить, когда опубликуют; Bill Cipher и Mystery Shack
// на IPEX не выкладываются (производные). Повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
const SHOWCASE = 'https://ipex.ru/showcase/zo92euk';
const OBJ = 'https://ipex.ru/catalog/music/';

// slug трека на сайте → slug объекта на IPEX
const MAP = {
  'soundstates': 'soundstates',
  'd-r-e-a-m': 'd-r-e-a-m-1',
  'back-to-the-future': 'back-to-the-future-15',
  '2am': '2am-15',
  'cloudflute': 'cloudflute',
  'flowers': 'flowers-84',
  'memory': 'memory-125',
  'u': 'u-2033',
  'rif-raf': 'riff-raff-1',
  'lullaby': 'lullaby-155',
  'ikigai': 'ikigai',
  'the-sleepiest-beatmaker': 'the-sleepiest-beatmaker',
  'cozy-place-ikigai': 'cozy-place-1',
  'fog': 'fog-2006',
  'glitch': 'glitch-45',
  'bubblegum': 'bubblegum-7',
  'game-over': 'game-over-83',
  'deep-sleep': 'deep-sleep-546',
  'at-the-jazz-club': 'at-the-jazz-club',
  'ruins': 'ruins-7',
  'hotline': 'hotline-7',
  'spooky-month': 'spooky-month',
};

const cols = db.prepare('PRAGMA table_info(tracks)').all().map((c) => c.name);
if (!cols.includes('ipex_url')) db.exec("ALTER TABLE tracks ADD COLUMN ipex_url TEXT NOT NULL DEFAULT ''");

db.prepare("INSERT INTO settings (key, value) VALUES ('ipex_showcase_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(SHOWCASE);

const upd = db.prepare('UPDATE tracks SET ipex_url = ? WHERE slug = ?');
let n = 0;
for (const [slug, ipex] of Object.entries(MAP)) {
  const r = upd.run(OBJ + ipex, slug);
  if (r.changes) n += 1; else console.log('нет трека со slug', slug);
}
console.log(`витрина задана, ссылок IPEX проставлено: ${n} из ${Object.keys(MAP).length}`);
