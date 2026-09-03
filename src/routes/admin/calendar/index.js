const express = require('express');
const db = require('../../../db');
const { uploadGalleryFile } = require('../../../middleware/upload');
const { isValidMediaUpload, mediaFilePath } = require('../../../services/media');
const { publishPost, refreshStats } = require('../../../services/social/publish');
const { suggestHashtags } = require('../../../utils/hashtags');
const { detectNetwork } = require('../../../utils/postUrl');
const {
  listNetworks,
  listUpcoming,
  listPendingApproval,
  listRecentlyPublished,
  listEventsForMonth,
  listPostsForMonth,
  getPost,
  getTargets,
  listInstagramGridPosts,
  normalizeScheduledAt,
} = require('./helpers');

const router = express.Router();

function listActiveProducts() {
  return db.prepare('SELECT id, name, slug FROM products WHERE is_active = 1 ORDER BY name').all();
}

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

  const upcoming = listUpcoming(7);
  const pending = listPendingApproval();
  const published = listRecentlyPublished();
  const calendarError = req.session.calendarError || null;
  req.session.calendarError = null;
  for (const post of upcoming) {
    if (!targetsByPost[post.id]) targetsByPost[post.id] = getTargets(post.id);
  }

  const eventsByDay = {};
  for (const ev of listEventsForMonth(month)) {
    if (!eventsByDay[ev.day]) eventsByDay[ev.day] = [];
    eventsByDay[ev.day].push(ev);
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
    published,
    calendarError,
    pending,
    year,
    month,
    daysInMonth,
    firstWeekday,
    postsByDay,
    eventsByDay,
    upcoming,
    targetsByPost,
    prevMonth,
    prevYear,
    nextMonth,
    nextYear,
  });
});

// Подтверждение пачкой. Пока подтверждение вообще существует, открывать
// полсотни страниц по одной — главный затор в работе с календарём.
/**
 * Записать пост, опубликованный руками мимо календаря.
 *
 * Так в ленту попадают спонтанные публикации — репост в X, пост в Facebook,
 * статья в Дзене. Без этого календарь знает только про то, что планировали,
 * и человек со стороны не понимает, что уже вышло.
 *
 * Просим только ссылку: площадка видна из адреса, время по умолчанию —
 * сейчас. Чем меньше полей, тем выше шанс, что запись вообще сделают.
 */
router.post('/log', (req, res) => {
  const url = String(req.body.url || '').trim();
  const key = detectNetwork(url);
  if (!key) {
    req.session.calendarError = url
      ? 'Не удалось понять площадку по ссылке. Проверьте адрес или заведите пост вручную.'
      : 'Вставьте ссылку на публикацию.';
    return res.redirect('/admin/calendar');
  }

  const known = db.prepare('SELECT key FROM social_networks WHERE key = ?').get(key);
  if (!known) {
    req.session.calendarError = `Площадка «${key}» не заведена в соцсетях — добавьте её, чтобы вести учёт.`;
    return res.redirect('/admin/calendar');
  }

  const when = normalizeScheduledAt(req.body.scheduled_at) ||
    new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Yekaterinburg' }).slice(0, 16).replace('T', ' ') + ':00';
  const text = String(req.body.text || '').trim() || 'Опубликовано вручную';

  db.exec('BEGIN');
  try {
    const info = db
      .prepare("INSERT INTO social_posts (text, scheduled_at, status, approved, link_url) VALUES (?, ?, 'published', 1, ?)")
      .run(text, when, url);
    db.prepare("INSERT INTO social_post_targets (post_id, network_key, status, published_url) VALUES (?, ?, 'published', ?)")
      .run(info.lastInsertRowid, key, url);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.redirect('/admin/calendar');
});

router.post('/approve-batch', (req, res) => {
  const raw = req.body.ids;
  const ids = (Array.isArray(raw) ? raw : [raw])
    .map((x) => parseInt(x, 10))
    .filter((x) => Number.isInteger(x));

  if (ids.length) {
    const stmt = db.prepare("UPDATE social_posts SET approved = 1 WHERE id = ? AND status = 'scheduled'");
    db.exec('BEGIN');
    try {
      for (const id of ids) stmt.run(id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  res.redirect('/admin/calendar');
});

router.get('/new', (req, res) => {
  let prefill = null;
  if (req.query.fromPost) {
    const source = getPost(req.query.fromPost);
    if (source) {
      prefill = {
        text: source.text,
        mediaPath: source.media_path || '',
        mediaType: source.media_type || '',
      };
    }
  } else if (req.query.fromNews) {
    const news = db.prepare('SELECT * FROM news WHERE id = ?').get(req.query.fromNews);
    if (news) {
      const media = db
        .prepare("SELECT * FROM news_media WHERE news_id = ? ORDER BY sort_order ASC, created_at DESC")
        .get(news.id);
      prefill = {
        text: `${news.title}\n\n${news.content || ''}`.trim(),
        mediaPath: media ? media.file_path : '',
        mediaType: media ? media.type : '',
      };
    }
  }
  res.render('admin/calendar-form', { post: null, prefill, networks: listNetworks(), selectedKeys: [], products: listActiveProducts(), error: null });
});

router.post('/', uploadGalleryFile.single('file'), (req, res) => {
  const { text, textEn, newsHook, linkUrl, scheduledAt, prefillMediaPath, prefillMediaType } = req.body;
  const storyFlag = req.body.story ? 1 : 0;
  const rawNetworks = req.body.networks;
  const selectedNetworks = Array.isArray(rawNetworks) ? rawNetworks : rawNetworks ? [rawNetworks] : [];

  if (!scheduledAt || selectedNetworks.length === 0) {
    return res.render('admin/calendar-form', {
      post: null,
      prefill: null,
      networks: listNetworks(),
      selectedKeys: [],
      products: listActiveProducts(),
      error: 'Укажите дату публикации и хотя бы одну соцсеть.',
    });
  }

  let mediaPath = prefillMediaPath || '';
  let mediaType = prefillMediaType || '';
  if (req.file) {
    if (!isValidMediaUpload(req)) {
      return res.render('admin/calendar-form', {
        post: null,
        prefill: null,
        networks: listNetworks(),
        selectedKeys: [],
        products: listActiveProducts(),
        error: 'Некорректный тип медиафайла.',
      });
    }
    mediaPath = mediaFilePath(req);
    mediaType = req.body.type;
  }

  // Если в тексте нет ни одного хэштега — автоматически добавляем подобранные (потом можно отредактировать).
  let finalText = text || '';
  if (finalText && !finalText.includes('#')) {
    const tags = suggestHashtags(finalText);
    if (tags.length > 0) finalText += `

${tags.join(' ')}`;
  }

  const info = db.prepare(`
    INSERT INTO social_posts (text, text_en, news_hook, link_url, story, media_path, media_type, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
  `).run(finalText, textEn || '', newsHook || '', (linkUrl || '').trim(), storyFlag, mediaPath, mediaType, normalizeScheduledAt(scheduledAt));

  const insertTarget = db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)');
  for (const key of selectedNetworks) {
    insertTarget.run(info.lastInsertRowid, key);
  }

  res.redirect(`/admin/calendar/${info.lastInsertRowid}`);
});

router.post('/hashtags', (req, res) => {
  res.json({ hashtags: suggestHashtags(String(req.body.text || '')) });
});

router.get('/instagram-grid', (req, res) => {
  res.render('admin/calendar-instagram-grid', { posts: listInstagramGridPosts() });
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
  const selectedKeys = getTargets(post.id).map((t) => t.network_key);
  res.render('admin/calendar-form', { post, prefill: null, networks: listNetworks(), selectedKeys, products: listActiveProducts(), error: null });
});

router.post('/:id/edit', uploadGalleryFile.single('file'), (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  if (post.status !== 'scheduled') {
    return res.redirect(`/admin/calendar/${post.id}`);
  }

  const { text, textEn, newsHook, linkUrl, scheduledAt } = req.body;
  const storyFlag = req.body.story ? 1 : 0;
  const rawNetworks = req.body.networks;
  const selectedNetworks = Array.isArray(rawNetworks) ? rawNetworks : rawNetworks ? [rawNetworks] : [];
  if (!scheduledAt || selectedNetworks.length === 0) {
    return res.render('admin/calendar-form', {
      post,
      prefill: null,
      networks: listNetworks(),
      selectedKeys: getTargets(post.id).map((t) => t.network_key),
      products: listActiveProducts(),
      error: 'Укажите дату публикации и хотя бы одну соцсеть.',
    });
  }

  let mediaPath = post.media_path;
  let mediaType = post.media_type;
  if (req.file) {
    if (!isValidMediaUpload(req)) {
      return res.render('admin/calendar-form', {
        post,
        prefill: null,
        networks: listNetworks(),
        selectedKeys: getTargets(post.id).map((t) => t.network_key),
        products: listActiveProducts(),
        error: 'Некорректный тип медиафайла.',
      });
    }
    mediaPath = mediaFilePath(req);
    mediaType = req.body.type;
  }

  db.prepare(`
    UPDATE social_posts SET text = ?, text_en = ?, news_hook = ?, link_url = ?, story = ?, media_path = ?, media_type = ?, scheduled_at = ? WHERE id = ?
  `).run(text || '', textEn || '', newsHook || '', (linkUrl || '').trim(), storyFlag, mediaPath, mediaType, normalizeScheduledAt(scheduledAt), post.id);

  // Синхронизация соцсетей: убираем невыбранные (кроме уже опубликованных), добавляем новые.
  const existing = getTargets(post.id);
  const removeTarget = db.prepare('DELETE FROM social_post_targets WHERE id = ?');
  for (const target of existing) {
    if (!selectedNetworks.includes(target.network_key) && target.status !== 'published') {
      removeTarget.run(target.id);
    }
  }
  const existingKeys = existing.map((t) => t.network_key);
  const insertTarget = db.prepare('INSERT INTO social_post_targets (post_id, network_key) VALUES (?, ?)');
  for (const key of selectedNetworks) {
    if (!existingKeys.includes(key)) insertTarget.run(post.id, key);
  }

  res.redirect(`/admin/calendar/${post.id}`);
});

// Ссылки: откуда взят материал и куда он вышел. Работает для ЛЮБОГО статуса,
// в том числе опубликованного — текст переписывать поздно, а ссылки нужны
// именно после публикации, иначе потом их приходится искать заново.
router.post('/:id/links', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }

  db.prepare('UPDATE social_posts SET sources = ? WHERE id = ?').run(req.body.sources || '', post.id);

  // Адреса публикаций правим поштучно: у ручных сетей вроде Дзена
  // их некому проставить автоматически
  for (const target of getTargets(post.id)) {
    const field = `url_${target.id}`;
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      db.prepare("UPDATE social_post_targets SET published_url = ?, updated_at = datetime('now') WHERE id = ?")
        .run((req.body[field] || '').trim(), target.id);
    }
  }

  res.redirect(`/admin/calendar/${post.id}`);
});

router.post('/:id/move', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).json({ ok: false, error: 'Пост не найден.' });
  }
  if (post.status !== 'scheduled') {
    return res.status(400).json({ ok: false, error: 'Перетаскивать можно только запланированные посты.' });
  }
  const date = String(req.body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'Некорректная дата.' });
  }
  // Дата меняется, время публикации сохраняется прежним.
  const time = post.scheduled_at.slice(11);
  db.prepare('UPDATE social_posts SET scheduled_at = ? WHERE id = ?').run(`${date} ${time}`, post.id);
  res.json({ ok: true });
});

router.post('/:id/approve', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).render('404');
  }
  db.prepare('UPDATE social_posts SET approved = ? WHERE id = ?').run(post.approved ? 0 : 1, post.id);
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

router.post('/:id/targets/:targetId/refresh-stats', async (req, res) => {
  await refreshStats(req.params.targetId);
  res.redirect(`/admin/calendar/${req.params.id}`);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM social_posts WHERE id = ?').run(req.params.id);
  res.redirect('/admin/calendar');
});

module.exports = router;
