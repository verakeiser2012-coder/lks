// Заставки «Флёр»: обложка дропа «Флёр × Лев» и черновик выпуска подкаста
// с мастерской. Картинки — tools/fleur_covers.py → public/uploads/{drop,podcast}-fleur.jpg.
// Ищем по slug, не по id (на сервере id другие). Повторный запуск безопасен.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'shop.db'));

const drop = db.prepare("SELECT id, cover_image FROM collections WHERE slug = 'fleur-x-lev'").get();
if (drop) {
  db.prepare("UPDATE collections SET cover_image = '/uploads/drop-fleur.jpg' WHERE id = ?").run(drop.id);
  console.log('дроп fleur-x-lev: обложка', drop.cover_image, '->', '/uploads/drop-fleur.jpg');
} else {
  console.log('дроп fleur-x-lev не найден');
}

const SLUG = 'fleur-masterskaya-interernogo-tekstilya';
const ep = db.prepare('SELECT id FROM podcast_episodes WHERE slug = ?').get(SLUG);
if (ep) {
  db.prepare("UPDATE podcast_episodes SET cover_image = '/uploads/podcast-fleur.jpg' WHERE id = ?").run(ep.id);
  console.log('выпуск подкаста «Флёр»: обложка обновлена, id', ep.id);
} else {
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM podcast_episodes').get().m;
  const info = db.prepare(`
    INSERT INTO podcast_episodes (title, slug, guest, description, cover_image, audio_url, video_url, episode_date, is_published, sort_order)
    VALUES (?, ?, ?, ?, ?, '', '', '', 0, ?)
  `).run(
    'Разговор в мастерской интерьерного текстиля',
    SLUG,
    'Мастерская «Флёр»',
    'Черновик выпуска: разговор с дизайнерской студией интерьерного текстиля «Флёр» (Екатеринбург) — о ткани, свете и абажурах для дропа «Флёр × Лев». Текст, дата и запись появятся после съёмки.',
    '/uploads/podcast-fleur.jpg',
    maxSort + 1
  );
  console.log('выпуск подкаста «Флёр» создан черновиком (не опубликован), id', info.lastInsertRowid);
}
