// Админка → «В кадре»: выпуски подкаста (таблица podcast_episodes) и ссылки на
// галереи кино/рекламы, из которых собирается раздел /podcast на сайте.
const express = require('express');
const db = require('../../db');
const { slugify } = require('../../utils/slugify');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

function episodes() {
  return db.prepare('SELECT * FROM podcast_episodes ORDER BY sort_order ASC, episode_date DESC, id DESC').all();
}
function galleryCount(key) {
  return db.prepare("SELECT SUM(type = 'video') AS videos, SUM(type = 'photo') AS photos FROM gallery_items WHERE page_key = ?").get(key);
}

router.get('/', (req, res) => {
  res.render('admin/creatives', {
    episodes: episodes(),
    film: galleryCount('style-film'),
    ads: galleryCount('style-ads'),
    msg: req.query.msg || '',
  });
});

router.get('/new', (req, res) => {
  res.render('admin/creative-form', { episode: null, error: null });
});

function fields(body) {
  return {
    title: String(body.title || '').trim(),
    guest: String(body.guest || '').trim(),
    description: String(body.description || ''),
    audioUrl: String(body.audioUrl || '').trim(),
    videoUrl: String(body.videoUrl || '').trim(),
    episodeDate: String(body.episodeDate || '').trim(),
    sortOrder: Number(body.sortOrder) || 0,
    isPublished: body.isPublished ? 1 : 0,
  };
}

router.post('/', uploadImage.single('cover'), (req, res) => {
  const f = fields(req.body);
  if (!f.title) {
    return res.render('admin/creative-form', { episode: req.body, error: 'Укажите название выпуска.' });
  }
  let slug = slugify(f.title);
  if (db.prepare('SELECT 1 FROM podcast_episodes WHERE slug = ?').get(slug)) slug += '-' + Date.now().toString(36);
  db.prepare(`
    INSERT INTO podcast_episodes (title, slug, guest, description, cover_image, audio_url, video_url, episode_date, is_published, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(f.title, slug, f.guest, f.description, req.file ? `/uploads/${req.file.filename}` : '', f.audioUrl, f.videoUrl, f.episodeDate, f.isPublished, f.sortOrder);
  res.redirect('/admin/creatives');
});

router.get('/:id/edit', (req, res) => {
  const episode = db.prepare('SELECT * FROM podcast_episodes WHERE id = ?').get(req.params.id);
  if (!episode) return res.status(404).render('404');
  res.render('admin/creative-form', { episode, error: null });
});

router.post('/:id', uploadImage.single('cover'), (req, res) => {
  const episode = db.prepare('SELECT * FROM podcast_episodes WHERE id = ?').get(req.params.id);
  if (!episode) return res.status(404).render('404');
  const f = fields(req.body);
  if (!f.title) {
    return res.render('admin/creative-form', { episode: { ...episode, ...req.body }, error: 'Укажите название выпуска.' });
  }
  db.prepare(`
    UPDATE podcast_episodes SET title = ?, guest = ?, description = ?, cover_image = ?, audio_url = ?, video_url = ?, episode_date = ?, is_published = ?, sort_order = ?
    WHERE id = ?
  `).run(f.title, f.guest, f.description, req.file ? `/uploads/${req.file.filename}` : episode.cover_image, f.audioUrl, f.videoUrl, f.episodeDate, f.isPublished, f.sortOrder, episode.id);
  res.redirect('/admin/creatives');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM podcast_episodes WHERE id = ?').run(req.params.id);
  res.redirect('/admin/creatives');
});

module.exports = router;
