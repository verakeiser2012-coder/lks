const express = require('express');
const db = require('../../../db');
const { uploadGalleryFile } = require('../../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../../services/media');
const { publishPost } = require('../../../services/social/publish');
const { listNetworks, listPostsForMonth, getPost, getTargets, normalizeScheduledAt } = require('./helpers');

const router = express.Router();

router.get('/', (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

  const posts = listPostsForMonth(year, month);
  const postsByDay = {};
  const targetsByPost = {};
  for (const post of posts) {
    const day = post.scheduled_at.slice(8, 10);
    if (!postsByDay[day]) postsByDay[day] = [];
    postsByDay[day].push(post);
    targetsByPost[post.id] = getTargets(post.id);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  res.render('admin/calendar', {
    year,
    month,
    daysInMonth,
    firstWeekday,
    postsByDay,
    targetsByPost,
    prevMonth,
    prevYear,
    nextMonth,
    nextYear,
  });
});

router.get('/new', (req, res) => {
  res.render('admin/calendar-form', { post: null, networks: listNetworks(), error: null });
});

router.post('/', uploadGalleryFile.single('file'), (req, res) => {
  const { text, scheduledAt } = req.body;
  const rawNetworks = req.body.networks;
  const selectedNetworks = Array.isArray(rawNetworks) ? rawNetworks : rawNetworks ? [rawNetworks] : [];

  if (!scheduledAt || selectedNetworks.length === 0) {
    return res.render('admin/calendar-form', {
      post: null,
      networks: listNetworks(),
      error: 'Укажите дату публикации и хотя бы одну соцсеть.',
    });
  }

  let mediaPath = '';
  let mediaType = '';
  if (req.file) {
    if (!isValidMediaUpload(req)) {
      return res.render('admin/calendar-form', {
        post: null,
        networks: listNetworks(),
        error: 'Некорректный тип медиафайла.',
      });
    }
    mediaPath = mediaFilePath(req);
    mediaType = req.body.type;
  }

  const info = db.prepare(`
    INSERT INTO social_posts (text, media_path, media_type, scheduled_at, status)
    VALUES (?, ?, ?, ?, 'scheduled')
  `).run(text || '', mediaPath, mediaType, normalizeScheduledAt(scheduledAt));

  const insertTarget = db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)');
  for (const key of selectedNetworks) {
    insertTarget.run(info.lastInsertRowid, key);
  }

  res.redirect(`/admin/calendar/${info.lastInsertRowid}`);
});

router.get('/:id', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  res.render('admin/calendar-detail', { post, targets: getTargets(post.id) });
});

router.get('/:id/edit', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  if (post.status !== 'scheduled') {
    return res.redirect(`/admin/calendar/${post.id}`);
  }
  res.render('admin/calendar-form', { post, networks: listNetworks(), error: null });
});

router.post('/:id/edit', uploadGalleryFile.single('file'), (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  if (post.status !== 'scheduled') {
    return res.redirect(`/admin/calendar/${post.id}`);
  }

  const { text, scheduledAt } = req.body;
  if (!scheduledAt) {
    return res.render('admin/calendar-form', {
      post,
      networks: listNetworks(),
      error: 'Укажите дату публикации.',
    });
  }

  let mediaPath = post.media_path;
  let mediaType = post.media_type;
  if (req.file) {
    if (!isValidMediaUpload(req)) {
      return res.render('admin/calendar-form', {
        post,
        networks: listNetworks(),
        error: 'Некорректный тип медиафайла.',
      });
    }
    mediaPath = mediaFilePath(req);
    mediaType = req.body.type;
  }

  db.prepare(`
    UPDATE social_posts SET text = ?, media_path = ?, media_type = ?, scheduled_at = ? WHERE id = ?
  `).run(text || '', mediaPath, mediaType, normalizeScheduledAt(scheduledAt), post.id);

  res.redirect(`/admin/calendar/${post.id}`);
});

router.post('/:id/publish', async (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  await publishPost(post.id);
  res.redirect(`/admin/calendar/${post.id}`);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM social_posts WHERE id = ?').run(req.params.id);
  res.redirect('/admin/calendar');
});

module.exports = router;
