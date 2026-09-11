// Пластинки: все три одиночные — 12″ (у Vinylium нет 10″, конверты сделаны под 12″),
// длительности сторон — по мастерам WAV. В релизе Ikigai вместо «Nisu» — «Cozy Place»,
// как на площадках, и порядок треков как в самом релизе.
// Записи ищем по слагу: id на сервере и локально разные. Повторный запуск безопасен.

const db = require('../src/db');

const CARDS = {
  'plastinka-ikigai': {
    name: 'Пластинка Ikigai, 12″',
    desc: 'Ikigai целиком: пять треков, десять минут восемнадцать секунд — шесть минут на первой стороне и четыре на второй. Первый альбом, с которого началась вся линия.',
  },
  'plastinka-flowers': {
    name: 'Пластинка Flowers, 12″',
    desc: 'Flowers целиком: пять треков, тринадцать минут пятьдесят пять секунд — девять минут на первой стороне и пять на второй.',
  },
  'plastinka-soundstates': {
    name: 'Пластинка Soundstates, 12″',
    desc: 'Soundstates целиком: пять треков, двенадцать минут пятьдесят семь секунд — семь с половиной минут на первой стороне и пять с половиной на второй. Тот самый альбом, который на следующий день после выхода попал в кураторский плейлист.',
  },
};
const TAIL =
  '\n\nПечатаем поштучно, а не тиражом на склад: студия режет диск под конкретный заказ. Поэтому пластинка ' +
  'стоит дороже магазинной и делается дольше — зато она существует ровно потому, что её кто-то захотел.' +
  '\n\nНа фото макет: снимок настоящей пластинки поставим, когда напечатаем первую.';

for (const [slug, c] of Object.entries(CARDS)) {
  const r = db.prepare(
    `UPDATE products SET name = ?, dimensions = ?, includes = ?, description = ? WHERE slug = ?`
  ).run(c.name, '12″ (30 см)', 'Пластинка 12″\nКонверт с обложкой альбома', c.desc + TAIL, slug);
  console.log(slug, r.changes ? '-> 12″' : 'НЕ НАЙДЕНА');
}

// --- релиз Ikigai: Cozy Place вместо Nisu, порядок как на площадках
const rel = db.prepare("SELECT id FROM releases WHERE slug = 'ikigai'").get();
if (!rel) throw new Error('нет релиза ikigai');
const nisu = db.prepare('SELECT id FROM tracks WHERE release_id = ? AND title = ?').get(rel.id, 'Nisu');
if (nisu) {
  db.prepare("UPDATE tracks SET title = 'Cozy Place', slug = 'cozy-place-ikigai' WHERE id = ?").run(nisu.id);
  console.log('Nisu -> Cozy Place, id', nisu.id);
} else {
  console.log('Nisu в релизе Ikigai уже нет');
}
const ORDER = ['The Sleepiest Beatmaker', 'Ikigai', 'Cozy Place', 'Bill Cipher', 'Fog'];
ORDER.forEach((title, i) => {
  db.prepare('UPDATE tracks SET sort_order = ? WHERE release_id = ? AND title = ?').run(i, rel.id, title);
});
console.log('порядок Ikigai:', db.prepare('SELECT title FROM tracks WHERE release_id = ? ORDER BY sort_order').all(rel.id).map((t) => t.title).join(' → '));
