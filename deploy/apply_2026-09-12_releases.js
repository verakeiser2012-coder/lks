// Сверка релизов с папкой «Музыка», MusicBrainz и площадками (12.09.2026):
// - «Cozy Place» отдельным синглом не выходил — это трек с EP Ikigai; сингл убираем;
// - Ruins и Mystery Shack площадок не видели, но закончены в 2024-м и продаются
//   в магазине как «Off the Record»: ставим год, настоящие обложки из папки релиза
//   и честное описание;
// - Hotline и Spooky Month (2024) есть на площадках и в MusicBrainz, а на сайте
//   не было — добавляем со ссылками.
// Ищем по slug, повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));
db.exec('PRAGMA foreign_keys = ON');

// 1. Cozy Place — дубль трека с EP.
const cozy = db.prepare("SELECT id FROM releases WHERE slug = 'cozy-place'").get();
if (cozy) {
  db.prepare('DELETE FROM tracks WHERE release_id = ?').run(cozy.id);
  db.prepare('DELETE FROM releases WHERE id = ?').run(cozy.id);
  console.log('сингл cozy-place удалён (трек остаётся на EP Ikigai)');
}

// 2. Ruins и Mystery Shack — год, обложки, описание.
const offTheRecord = db.prepare("SELECT slug FROM products WHERE slug = 'off-the-record'").get();
const shopNote = offTheRecord ? ' На площадки не выходил — есть в магазине в сборнике [Off the Record](/catalog/off-the-record).' : '';
const fix = db.prepare('UPDATE releases SET year = ?, cover_image = ?, description = ? WHERE slug = ?');
fix.run('2024', '/uploads/release-ruins.jpg', 'Медленный трек с гулким пространством, закончен в 2024-м.' + shopNote, 'ruins');
fix.run('2024', '/uploads/release-mystery-shack.jpg', 'По мотивам «Гравити Фолз» — той же вселенной, что и Bill Cipher. Закончен в 2024-м.' + shopNote, 'mystery-shack');
db.prepare("UPDATE tracks SET cover_image = '/uploads/release-ruins.jpg' WHERE release_id = (SELECT id FROM releases WHERE slug = 'ruins')").run();
db.prepare("UPDATE tracks SET cover_image = '/uploads/release-mystery-shack.jpg' WHERE release_id = (SELECT id FROM releases WHERE slug = 'mystery-shack')").run();
console.log('ruins, mystery-shack: год 2024, обложки из папки релиза');

// 3. Hotline и Spooky Month.
const NEW = [
  {
    slug: 'hotline', title: 'Hotline', year: '2024', cover: '/uploads/release-hotline.jpg',
    description: 'Сингл 2024 года: ретровейв с неоном и телефонным гудком в начале.',
    streaming: 'https://music.yandex.ru/album/30160447',
    links: { yandex: 'https://music.yandex.ru/album/30160447', deezer: 'https://www.deezer.com/album/558213722' },
  },
  {
    slug: 'spooky-month', title: 'Spooky Month', year: '2024', cover: '/uploads/release-spooky-month.jpg',
    description: 'Сингл 2024 года к Хэллоуину: тёмный бит и «страшные» синты.',
    streaming: 'https://music.apple.com/us/album/spooky-month-single/1726584353',
    links: { yandex: 'https://music.yandex.ru/album/29158551', apple: 'https://music.apple.com/us/album/spooky-month-single/1726584353', deezer: 'https://www.deezer.com/album/537020022' },
  },
];
const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM releases').get().m;
const insRel = db.prepare(`INSERT INTO releases (title, slug, release_type, year, description, cover_image, streaming_url, sort_order, is_published, platform_links)
  VALUES (?, ?, 'Single', ?, ?, ?, ?, ?, 1, ?)`);
const insTrack = db.prepare('INSERT INTO tracks (title, slug, description, url, cover_image, release_id, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, 0, 1)');
NEW.forEach((r, i) => {
  const exists = db.prepare('SELECT id FROM releases WHERE slug = ?').get(r.slug);
  if (exists) {
    db.prepare('UPDATE releases SET year = ?, cover_image = ?, streaming_url = ?, platform_links = ? WHERE id = ?')
      .run(r.year, r.cover, r.streaming, JSON.stringify(r.links), exists.id);
    console.log(`${r.slug}: обновлён`);
    return;
  }
  const info = insRel.run(r.title, r.slug, r.year, r.description, r.cover, r.streaming, maxSort + 1 + i, JSON.stringify(r.links));
  insTrack.run(r.title, r.slug, '', r.streaming, r.cover, info.lastInsertRowid);
  console.log(`${r.slug}: добавлен, id ${info.lastInsertRowid}`);
});

console.log(db.prepare("SELECT release_type, COUNT(*) c FROM releases WHERE is_published = 1 GROUP BY release_type").all().map((r) => `${r.release_type}: ${r.c}`).join(', '));
