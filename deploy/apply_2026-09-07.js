// Данные к выкладке 07.09.2026: вещи ↔ треки, анонс подкаста, черновик дневника.
// Запускать на сервере из корня проекта: node deploy/apply_2026-09-07.js
// Идемпотентно: по слагам, а не по id — id на сервере и локально могут расходиться.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

// Колонки и таблица — на случай, если сервер ещё не перезапускался с новым init.js.
const productCols = db.prepare('PRAGMA table_info(products)').all();
if (!productCols.some((c) => c.name === 'track_id')) {
  db.exec('ALTER TABLE products ADD COLUMN track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL');
}
const brandCols = db.prepare('PRAGMA table_info(brand_requests)').all();
if (!brandCols.some((c) => c.name === 'wants')) {
  db.exec("ALTER TABLE brand_requests ADD COLUMN wants TEXT NOT NULL DEFAULT '[]'");
}
db.exec(`
  CREATE TABLE IF NOT EXISTS track_plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    src TEXT NOT NULL,
    page TEXT NOT NULL DEFAULT '',
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_track_plays_src ON track_plays(src);
`);

const releaseId = (slug) => (db.prepare('SELECT id FROM releases WHERE slug = ?').get(slug) || {}).id || null;
const trackId = (releaseSlug, trackSlug) => {
  const rid = releaseId(releaseSlug);
  if (!rid) return null;
  return (db.prepare('SELECT id FROM tracks WHERE release_id = ? AND slug = ?').get(rid, trackSlug) || {}).id || null;
};

const links = [
  ['aromakamen-byust', 'soundstates', 'soundstates'],
  ['derzhatel-dlya-naushnikov-byust', 'soundstates', 'soundstates'],
  ['derzhatel-dlya-ukrasheniy-byust', 'soundstates', 'soundstates'],
  ['aromaticheskaya-tabletka-grusha-lev', 'soundstates', 'd-r-e-a-m'],
  ['off-the-record', 'berserk', 'berserk'],
];
const upd = db.prepare('UPDATE products SET release_id = ?, track_id = ? WHERE slug = ?');
for (const [pslug, rslug, tslug] of links) {
  const rid = releaseId(rslug);
  const tid = trackId(rslug, tslug);
  const info = upd.run(rid, tid, pslug);
  console.log(pslug, '→ release', rid, 'track', tid, info.changes ? 'ok' : 'NOT FOUND');
}

const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
const podcast = {
  podcast_title: 'Подкаст «Груша»: аромат устроен как музыка',
  podcast_guest: 'Разговор в мастерской благовоний «Груша», Екатеринбург. Записан 31 июля 2026',
  podcast_note: 'Юлия делает благовония по семейным рецептам, я пишу треки без нейросетей. Выяснили, что это одно и то же ремесло: слой за слоем, без спешки. Из разговора родилась ароматическая таблетка «Груша × Лев» под альбом Soundstates.',
  podcast_date: 'выходит в сентябре',
  podcast_url: '',
  podcast_cover: '',
};
// Не затираем то, что уже могли отредактировать в админке: пишем только пустые ключи.
for (const [k, v] of Object.entries(podcast)) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
  if (!row || !row.value) upsert.run(k, v);
}

const draftSlug = 'chto-ostalos-za-kadrom-podkasta-s-grushey';
if (!db.prepare('SELECT id FROM diary_posts WHERE slug = ?').get(draftSlug)) {
  db.prepare(`INSERT INTO diary_posts (title, slug, excerpt, content, is_published, created_at) VALUES (?, ?, ?, ?, 0, datetime('now'))`).run(
    'Что осталось за кадром подкаста с «Грушей»',
    draftSlug,
    'Мы пришли к тому, что музыка и благовония очень близки по своему течению. Записываю, что не вошло в выпуск.',
    '<p>31 июля мы записали разговор в мастерской «Груша». Юлия делает благовония по семейным рецептам, я показывал ей альбом Soundstates и статую с обложки.</p>\n<p>Главное, к чему пришли: аромат собирается так же, как трек. Сначала основа, потом слои, и нельзя торопить, пока всё не сойдётся. Юлия сказала: «каждый аромат — это история, я пишу сказки». Я делаю то же самое, только звуком.</p>\n<p>Что не вошло в выпуск: как Юлия начала, почему мастерская называется «Груша», и история про уральский бахур. Расскажу здесь, когда выпуск выйдет.</p>\n<p>Из разговора родилась вещь: ароматическая таблетка «Груша × Лев» в конверте с обложкой Soundstates. Она уже в каталоге.</p>\n<p><em>Черновик. Лев, поправь своими словами и включи публикацию.</em></p>'
  );
  console.log('diary draft inserted');
} else {
  console.log('diary draft exists');
}

console.log(db.prepare('SELECT slug, release_id, track_id FROM products').all());
