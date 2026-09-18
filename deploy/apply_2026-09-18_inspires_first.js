// «Что вдохновляет» (style-inspires): серия «первые разы» — 12 кадров 2016–2017.
// Подписи — из имён файлов, сокращены под одну строку ленты; возраст ушёл в год кадра.
// Запуск: локально `node deploy/apply_2026-09-18_inspires_first.js` (копирует файлы из
// папки на рабочем столе), на сервере — с флагом --db-only (файлы едут отдельно).
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const SRC = 'C:\\Users\\User\\Desktop\\вдохновительный лев на сайт';
const UPLOADS = path.join(__dirname, '..', 'public', 'uploads');
const KEY = 'style-inspires';
const dbOnly = process.argv.includes('--db-only');

// [исходный файл, целевое имя, подпись, год]
// Точных дат нет (файлы — превью с Pinterest без EXIF), поэтому в shot_date только год:
// штамп кадра тогда показывает «КАДР 01 · 2016», а не выдуманный день.
const ITEMS = [
  ['первое портфолио в 4 года.jpg', 'inspires-01-portfolio-4y.jpg', 'Первое портфолио. Четыре года, чужой мотоцикл, свой взгляд', '2016'],
  ['самая первая реклама (одежда УМКА) в 4 года.jpg', 'inspires-02-umka-4y.jpg', 'Самая первая реклама — одежда «Умка»', '2016'],
  ['Первый образ каратэ-пацан.jpg', 'inspires-03-karate.jpg', 'Первый образ: каратэ-пацан', '2016'],
  ['Первая фотосессия с моим котом Василием.jpg', 'inspires-04-cat-vasily.jpg', 'Первая фотосессия с котом Василием', '2017'],
  ['Первое фото от столичного фотографа.jpg', 'inspires-05-moscow-photographer.jpg', 'Первое фото от столичного фотографа', '2017'],
  ['Первый портрет от профессионального фотографа в 5 лет.jpg', 'inspires-06-pro-portrait-5y.jpg', 'Первый портрет от профессионального фотографа', '2017'],
  ['Первое фотопозирование от души в 5 лет.jpg', 'inspires-07-posing-5y.jpg', 'Первое позирование от души', '2017'],
  ['Первое знакомство с дизайнером одежды в 5 лет.jpg', 'inspires-08-designer-5y.jpg', 'Первое знакомство с дизайнером одежды', '2017'],
  ['Первое дефиле в одежде Leya me и первые овации в 5 лет.jpg', 'inspires-09-leya-me-5y.jpg', 'Первое дефиле — Leya me — и первые овации', '2017'],
  ['Первое победное дефиле с призом участие в московской неделе моды в 5 лет.jpg', 'inspires-10-winning-walk-5y.jpg', 'Первое победное дефиле: приз — Московская неделя моды', '2017'],
  ['Самая первая победа в конкурсе в номинации Мистер фото.jpg', 'inspires-11-mister-photo.jpg', 'Самая первая победа: номинация «Мистер фото»', '2017'],
  ['Первый люкс - шуба и красные ботинки в 5 лет.jpg', 'inspires-12-fur-red-boots-5y.jpg', 'Первый люкс: шуба и красные ботинки', '2017'],
];

const exists = db.prepare('SELECT id FROM gallery_items WHERE page_key = ? AND file_path = ?');
const insert = db.prepare("INSERT INTO gallery_items (type, title, file_path, page_key, sort_order, shot_date) VALUES ('photo', ?, ?, ?, ?, ?)");

let added = 0;
ITEMS.forEach(([src, dst, title, date], i) => {
  if (!dbOnly) {
    const from = path.join(SRC, src);
    const to = path.join(UPLOADS, dst);
    if (!fs.existsSync(from)) { console.error('нет файла:', src); process.exit(1); }
    if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
  const fp = '/uploads/' + dst;
  if (exists.get(KEY, fp)) return;
  insert.run(title, fp, KEY, i + 1, date);
  added += 1;
  console.log(`+ ${title}`);
});
console.log(`добавлено: ${added}, всего в ${KEY}:`, db.prepare('SELECT COUNT(*) c FROM gallery_items WHERE page_key = ?').get(KEY).c);
