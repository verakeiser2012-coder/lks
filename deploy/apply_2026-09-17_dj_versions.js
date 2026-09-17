// DJ-версии (Extended Mix) и стемы четырёх треков — карточки получают файлы и открываются.
// Архивы собраны «Музыка\DJ-версии\_исходники\build_dj_versions.py» и лежат в storage/digital.
// Локально:   node deploy/apply_2026-09-17_dj_versions.js
// На сервере: cd /var/www/site && node deploy/apply_2026-09-17_dj_versions.js  (архивы докачать заранее)
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const DIGITAL = path.join(__dirname, '..', 'storage', 'digital');
const OWNER = 'Лев Кейсер (DJ Levka), Екатеринбург, Россия';
const WHEN = 'Сразу после оформления: ссылка откроется на экране и придёт на почту';

const TRACKS = [
  { name: 'Soundstates', slug: 'soundstates', bpm: 70, key: 'Bbm', camelot: '3A', dur: '4:34', stems: 3 },
  { name: 'd r e a m', slug: 'd-r-e-a-m', bpm: 93, key: 'Bbm', camelot: '3A', dur: '4:39', stems: 4 },
  { name: 'Back to the Future', slug: 'back-to-the-future', bpm: 70, key: 'F#m', camelot: '11A', dur: '4:34', stems: 4 },
  { name: 'Glitch', slug: 'glitch', bpm: 90, key: 'Gm', camelot: '6A', dur: '4:15', stems: 3 },
];

function mb(bytes) {
  return (bytes / 1e6).toFixed(bytes < 100e6 ? 1 : 0).replace('.', ',') + ' МБ';
}

function upd(slug, file, filename, fields) {
  const p = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (!p) { console.log(slug, 'НЕ НАЙДЕН'); return; }
  const fp = path.join(DIGITAL, file);
  if (!fs.existsSync(fp)) { console.log(slug, 'нет файла', file); return; }
  const size = fs.statSync(fp).size;
  db.prepare(`UPDATE products SET description = ?, includes = ?, lead_time = ?, dimensions = ?, weight = ?, material = ?, care = ?,
    manufacturer = ?, digital_file = ?, digital_filename = ?, digital_size = ?, is_digital = 1, price = 0, stock = 999, is_active = 1
    WHERE id = ?`).run(fields.description, fields.includes, WHEN, fields.dimensions, mb(size), fields.material, fields.care,
    OWNER, file, filename, size, p.id);
  console.log(slug, '→', file, mb(size));
}

for (const t of TRACKS) {
  const tag = `${t.bpm} BPM, ${t.key} (${t.camelot})`;
  upd(`dj-versiya-${t.slug}`, `dj-versiya-${t.slug}.zip`, `DJ Levka - ${t.name} (Extended Mix).zip`, {
    description:
      `Расширенная версия для сведения: 24 такта вступления (барабаны → бас → мелодия под открывающимся фильтром), ` +
      `тело трека без изменений, 16 тактов выхода. Все стыки — по сетке тактов, ничего не растянуто и не сжато.\n\n` +
      `${tag}, ${t.dur}. BPM и тональность — в названии файла и в тегах MP3.\n\n` +
      `Для диджеев бесплатно: играть в сетах, выкладывать записи сетов и стримы с указанием «DJ Levka». ` +
      `Выпускать как релиз и продавать нельзя.`,
    includes: `WAV 44,1 кГц 16 бит\nMP3 320 кбит/с с тегами BPM и тональности\nREADME с условиями`,
    dimensions: `${t.dur}, ${tag}`,
    material: 'WAV + MP3 в ZIP-архиве',
    care: 'Для сетов и записей сетов с указанием DJ Levka. Не для релизов и продажи',
  });
  const list = t.stems === 4 ? 'барабаны, бас, музыка (синты и мелодия), голоса и эффекты' : 'барабаны, бас, музыка (синты и мелодия)';
  upd(`stemy-${t.slug}`, `stemy-${t.slug}.zip`, `DJ Levka - ${t.name} (Stems).zip`, {
    description:
      `Отдельные дорожки для ремикса, кавера или своего вокала: ${list} — ${t.stems} файла одной длины, старт с одной точки. ` +
      `${tag}.\n\n` +
      `Дорожки выделены из готового мастера (разделение на дорожки, не экспорт из проекта): в сумме дают оригинал, ` +
      `по отдельности возможны лёгкие артефакты на стыках инструментов.\n\n` +
      `Ремиксы и каверы делать можно: указывайте «DJ Levka» в названии и не продавайте результат без согласия. ` +
      `Готовое присылайте на booking@levkeiser.com — лучшее опубликуем.`,
    includes: `${t.stems} дорожки WAV 44,1 кГц 24 бит: ${list}\nREADME с условиями`,
    dimensions: tag,
    material: 'WAV 24 бит в ZIP-архиве',
    care: 'Для ремиксов и каверов с указанием DJ Levka. Продавать результат — только с согласия',
  });
}
