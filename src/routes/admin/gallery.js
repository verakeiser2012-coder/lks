const express = require('express');
const db = require('../../db');
const { uploadGalleryFile } = require('../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../services/media');
const { parseVideoEmbedUrl } = require('../../utils/videoEmbed');

const router = express.Router();

const PAGE_KEYS = ['', 'home', 'music', 'style', 'gigs'];

function loadItems() {
  return db.prepare(`
    SELECT gallery_items.*, tracks.title AS track_title
    FROM gallery_items LEFT JOIN tracks ON tracks.id = gallery_items.track_id
    ORDER BY gallery_items.sort_order ASC, gallery_items.created_at DESC
  `).all();
}

function loadTracks() {
  return db.prepare(`
    SELECT tracks.id, tracks.title, releases.title AS release_title
    FROM tracks LEFT JOIN releases ON releases.id = tracks.release_id
    ORDER BY releases.sort_order ASC, tracks.sort_order ASC
  `).all();
}

function validTrackId(trackId) {
  if (!trackId) return null;
  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(Number(trackId));
  return track ? track.id : null;
}

router.get('/', (req, res) => {
  res.render('admin/gallery', { items: loadItems(), tracks: loadTracks(), error: null });
});

router.post('/', uploadGalleryFile.single('file'), (req, res) => {
  const { type, title, sortOrder, pageKey, trackId, videoUrl } = req.body;
  const track_id = validTrackId(trackId);
  const page_key = track_id ? '' : (PAGE_KEYS.includes(pageKey) ? pageKey : '');

  if (type === 'video_link') {
    const parsed = parseVideoEmbedUrl(videoUrl);
    if (!parsed) {
      return res.render('admin/gallery', {
        items: loadItems(),
        tracks: loadTracks(),
        error: 'Не удалось распознать ссылку — поддерживаются YouTube, Rutube, VK Видео и Vimeo.',
      });
    }
    db.prepare(`
      INSERT INTO gallery_items (type, title, file_path, page_key, track_id, sort_order)
      VALUES ('video', ?, ?, ?, ?, ?)
    `).run(title || '', parsed.embedUrl, page_key, track_id, Number(sortOrder) || 0);
    return res.redirect('/admin/gallery');
  }

  if (!isValidMediaUpload(req)) {
    return res.render('admin/gallery', { items: loadItems(), tracks: loadTracks(), error: 'Выберите тип и файл.' });
  }

  db.prepare(`
    INSERT INTO gallery_items (type, title, file_path, page_key, track_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, title || '', mediaFilePath(req), page_key, track_id, Number(sortOrder) || 0);

  res.redirect('/admin/gallery');
});

router.post('/:id/page', (req, res) => {
  const pageKey = PAGE_KEYS.includes(req.body.pageKey) ? req.body.pageKey : '';
  db.prepare('UPDATE gallery_items SET page_key = ?, track_id = NULL WHERE id = ?').run(pageKey, req.params.id);
  res.redirect('/admin/gallery');
});

router.post('/:id/track', (req, res) => {
  const track_id = validTrackId(req.body.trackId);
  db.prepare('UPDATE gallery_items SET track_id = ?, page_key = ? WHERE id = ?').run(track_id, '', req.params.id);
  res.redirect('/admin/gallery');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM gallery_items WHERE id = ?').run(req.params.id);
  res.redirect('/admin/gallery');
});

module.exports = router;
