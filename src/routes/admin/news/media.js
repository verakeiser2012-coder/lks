const express = require('express');
const db = require('../../../db');
const { uploadGalleryFile } = require('../../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../../services/media');
const { getPost, getMedia } = require('./helpers');

const router = express.Router();

router.post('/:id/media', uploadGalleryFile.single('file'), (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }

  const { type, sortOrder } = req.body;
  if (!isValidMediaUpload(req)) {
    return res.render('admin/news-edit', { post, media: getMedia(post.id), error: 'Выберите тип и файл.' });
  }

  db.prepare(`
    INSERT INTO news_media (news_id, type, file_path, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(post.id, type, mediaFilePath(req), Number(sortOrder) || 0);

  res.redirect(`/admin/news/${post.id}/edit`);
});

router.post('/:id/media/:mediaId/delete', (req, res) => {
  db.prepare('DELETE FROM news_media WHERE id = ? AND news_id = ?').run(req.params.mediaId, req.params.id);
  res.redirect(`/admin/news/${req.params.id}/edit`);
});

module.exports = router;
