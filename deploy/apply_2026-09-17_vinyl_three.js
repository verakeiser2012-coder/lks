// Пластинки по схеме 17.09.2026: альбом целиком на одной стороне.
//   «2024» (бывшая карточка Ikigai): A — Ikigai, B — синглы 2024.
//   «Flowers / Soundstates» (бывшая карточка Flowers): A — Flowers, B — Soundstates.
//   «Три альбома»: A — Ikigai + Soundstates, B — Flowers.
//   Карточка «Пластинка Soundstates» скрывается; её метка VN-004 (не записана) удаляется.
// Метки: VN-002 → бонус album-2024.zip, VN-003 → album-flowers-soundstates.zip.
// Локально:   node deploy/apply_2026-09-17_vinyl_three.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_vinyl_three.js
const db = require('../src/db');

const PRESS =
  'Печатаем поштучно, а не тиражом на склад: студия режет диск под конкретный заказ. ' +
  'Поэтому пластинка стоит дороже магазинной и делается дольше — зато она существует ровно потому, что её кто-то захотел.';
const NOTE = 'На фото макет: снимок настоящей пластинки поставим, когда напечатаем первую.';

const CARDS = {
  'plastinka-ikigai': {
    name: 'Пластинка «2024»: Ikigai и синглы, 12″',
    description:
      'Сторона A — Ikigai целиком, четыре трека, с которых началась вся линия. Сторона B — семь синглов ' +
      'того же года: Welcome, Hotline, BERSERK, Ruins, Spooky Month, At The Jazz Club, Deep Sleep. ' +
      'Двадцать четыре с половиной минуты, весь 2024-й на одном диске.\n\n' +
      'Альбом не делится между сторонами: поставил — дослушал, перевернул — другая история.\n\n' +
      PRESS + '\n\n' + NOTE,
    includes: 'Пластинка 12″: сторона A — Ikigai, сторона B — синглы 2024\nКонверт с обложкой Ikigai, треклист по сторонам',
  },
  'plastinka-flowers': {
    name: 'Пластинка Flowers / Soundstates, 12″',
    description:
      'Два альбома на одном диске: сторона A — Flowers (2025) целиком, сторона B — Soundstates (2026) целиком. ' +
      'Двадцать семь минут, каждый альбом на своей стороне от первого трека до последнего.\n\n' +
      'На обложке — Flowers, на этикетке стороны B — Soundstates.\n\n' +
      PRESS + '\n\n' + NOTE,
    includes: 'Пластинка 12″: сторона A — Flowers, сторона B — Soundstates\nКонверт с обложкой, треклист по сторонам',
  },
  'plastinka-tri-alboma': {
    description:
      'Все три альбома DJ Levka на одной пластинке: Ikigai (2024), Flowers (2025) и Soundstates (2026) — ' +
      'четырнадцать треков, тридцать пять минут. Сторона A — Ikigai и Soundstates, сторона B — Flowers: ' +
      'ни один альбом не разрезан пополам.\n\n' +
      'Конверт раскладывается гармошкой, и каждая панель открывает свой альбом по порядку выхода. Получается ' +
      'не обложка, а маленькая хронология: видно, как менялся звук за три года.\n\n' +
      'Одна пластинка со всеми альбомами выходит почти вдвое дешевле трёх отдельных: каждый диск платит свою ' +
      'стоимость резки независимо от длины.\n\n' +
      PRESS + '\n\n' + NOTE,
  },
};

for (const [slug, c] of Object.entries(CARDS)) {
  const row = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (!row) { console.log(slug, 'НЕ НАЙДЕН'); continue; }
  if (c.name) db.prepare('UPDATE products SET name = ? WHERE id = ?').run(c.name, row.id);
  if (c.includes) db.prepare('UPDATE products SET includes = ? WHERE id = ?').run(c.includes, row.id);
  db.prepare('UPDATE products SET description = ? WHERE id = ?').run(c.description, row.id);
  console.log(slug, '→', c.name || 'описание обновлено');
}
const ss = db.prepare("UPDATE products SET is_active = 0 WHERE slug = 'plastinka-soundstates'").run();
console.log('plastinka-soundstates скрыта:', ss.changes);

function retag(slug, file, label, btn) {
  const p = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (!p) return;
  const r = db.prepare("UPDATE nfc_tags SET bonus_file = ?, label = ?, bonus_label = ? WHERE product_id = ? AND kind = 'vinyl'").run(file, label, btn, p.id);
  console.log('метка', slug, '→', file, r.changes);
}
retag('plastinka-ikigai', 'album-2024.zip', 'Пластинка «2024»: Ikigai и синглы, 12″', 'Скачать Ikigai и синглы 2024 в цифре');
retag('plastinka-flowers', 'album-flowers-soundstates.zip', 'Пластинка Flowers / Soundstates, 12″', 'Скачать оба альбома в цифре');
const p = db.prepare("SELECT id FROM products WHERE slug = 'plastinka-soundstates'").get();
if (p) {
  const d = db.prepare("DELETE FROM nfc_tags WHERE product_id = ? AND kind = 'vinyl' AND nfc_uid = '' AND registered_at IS NULL").run(p.id);
  console.log('метка Soundstates удалена:', d.changes);
}
