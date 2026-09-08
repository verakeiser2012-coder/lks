const express = require('express');
const db = require('../db');
const { groupLinks } = require('../utils/links');
const { getGalleryItems } = require('../utils/gallery');
const { parseVideoEmbedUrl } = require('../utils/videoEmbed');
const { getBgPlaylist } = require('../utils/bgPlaylist');
const QUIZ = require('../data/quiz');

const router = express.Router();

// Один список для раздела и для плёнки на страницах релиза и трека:
// порядок везде должен совпадать, иначе «соседи» на плёнке не те.
function listReleases() {
  return db
    .prepare('SELECT * FROM releases WHERE is_published = 1 ORDER BY sort_order ASC, created_at DESC')
    .all();
}

// Вещи, привязанные к релизу или треку. Товар без привязки здесь не показываем.
function productsForRelease(releaseId) {
  return db
    .prepare('SELECT id, name, slug, price, image, track_id FROM products WHERE is_active = 1 AND release_id = ? ORDER BY created_at DESC')
    .all(releaseId);
}
function productsForTrack(trackId) {
  return db
    .prepare('SELECT id, name, slug, price, image FROM products WHERE is_active = 1 AND track_id = ? ORDER BY created_at DESC')
    .all(trackId);
}

// Счётчик прослушиваний фонового плеера. Стриминги эти прослушивания не
// видят: файл играет с нашего сервера. Считаем сами: клиент шлёт маячок,
// когда трек проиграл 30 секунд подряд (правило Spotify). Один маячок на
// трек за одну загрузку страницы, проверка на клиенте.
router.post('/play', express.json({ limit: '2kb' }), (req, res) => {
  const src = typeof req.body.src === 'string' ? req.body.src.slice(0, 200) : '';
  const page = typeof req.body.page === 'string' ? req.body.page.slice(0, 200) : '';
  if (!/^\/audio\/[\w.-]+\.mp3$/.test(src)) return res.status(400).end();
  db.prepare('INSERT INTO track_plays (src, page) VALUES (?, ?)').run(src, page);
  res.status(204).end();
});

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'music_intro'").get();
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'music' ORDER BY sort_order ASC, id ASC"
  ).all();
  const featuredRows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('music_featured_title', 'music_featured_note', 'music_featured_url')")
    .all();
  const featuredMap = {};
  for (const row of featuredRows) featuredMap[row.key] = row.value;

  const releases = listReleases();
  const trackCounts = db
    .prepare('SELECT release_id, COUNT(*) AS c FROM tracks WHERE is_published = 1 AND release_id IS NOT NULL GROUP BY release_id')
    .all();
  const countMap = {};
  for (const row of trackCounts) countMap[row.release_id] = row.c;

  const looseTracks = db
    .prepare('SELECT * FROM tracks WHERE is_published = 1 AND release_id IS NULL ORDER BY sort_order ASC, created_at DESC')
    .all();

  res.render('music', {
    intro: introRow ? introRow.value : '',
    groups: groupLinks(links),
    featured: {
      title: featuredMap.music_featured_title || '',
      note: featuredMap.music_featured_note || '',
      url: featuredMap.music_featured_url || '',
    },
    releases: releases.map((r) => ({ ...r, trackCount: countMap[r.id] || 0 })),
    tracks: looseTracks,
    galleryItems: getGalleryItems('music'),
  });
});

// ---- Игры -----------------------------------------------------------------
// Треки, у которых есть mp3 в public/audio: только их можно проиграть.
// Имя файла совпадает со слагом трека, либо со слагом без дефисов (dream ↔ d-r-e-a-m).
function playableTracks() {
  const byKey = {};
  for (const t of db.prepare(`
    SELECT tracks.slug, tracks.title, tracks.cover_image, releases.slug AS release_slug, releases.title AS release_title
    FROM tracks LEFT JOIN releases ON releases.id = tracks.release_id
    WHERE tracks.is_published = 1
  `).all()) {
    byKey[t.slug] = t;
    byKey[t.slug.replace(/-/g, '')] = t;
  }
  const out = [];
  for (const item of getBgPlaylist()) {
    const name = item.src.replace(/^\/audio\//, '').replace(/\.mp3$/i, '');
    const t = byKey[name] || byKey[name.replace(/-/g, '')];
    out.push({
      src: item.src,
      slug: t ? t.slug : name,
      title: t ? t.title : item.title,
      cover: t ? t.cover_image : '',
      url: t && t.release_slug ? `/music/${t.release_slug}/${t.slug}` : '/music',
      release: t ? t.release_title : '',
    });
  }
  return out;
}

router.get('/guess', (req, res) => {
  res.render('games/guess', {
    tracks: playableTracks(),
    title: 'Угадай трек по пяти секундам',
    pageDescription: 'Пять секунд трека DJ Levka, четыре названия. Угадай все.',
  });
});

router.get('/quiz', (req, res) => {
  res.render('games/quiz', {
    questions: QUIZ.QUESTIONS,
    title: 'Какой ты трек Soundstates',
    pageDescription: 'Пять вопросов, и альбом Soundstates скажет, какой ты трек.',
  });
});

router.post('/quiz', (req, res) => {
  const score = {};
  QUIZ.QUESTIONS.forEach((q, i) => {
    const a = q.answers[Number(req.body[`q${i}`])];
    if (a) score[a.slug] = (score[a.slug] || 0) + 1;
  });
  const best = Object.keys(QUIZ.TRACKS).sort((a, b) => (score[b] || 0) - (score[a] || 0))[0];
  res.redirect(`/music/quiz/${best}`);
});

router.get('/quiz/:slug', (req, res, next) => {
  const info = QUIZ.TRACKS[req.params.slug];
  if (!info) return next();
  const track = db.prepare(`
    SELECT tracks.*, releases.slug AS release_slug FROM tracks
    LEFT JOIN releases ON releases.id = tracks.release_id WHERE tracks.slug = ?
  `).get(req.params.slug);
  const audio = playableTracks().find((t) => t.slug === req.params.slug);
  const shareUrl = `https://levkeiser.com/music/quiz/${req.params.slug}`;
  res.render('games/quiz-result', {
    slug: req.params.slug,
    info,
    track,
    audio,
    shareUrl,
    shareText: `Я — «${info.title}» из альбома Soundstates. А ты какой трек?`,
    title: `Ты — ${info.title}`,
    pageDescription: info.line,
    pageImage: track ? track.cover_image : '',
  });
});

router.get('/set', (req, res) => {
  res.render('games/set', {
    tracks: playableTracks(),
    title: 'Собери сет',
    pageDescription: 'Три трека DJ Levka в своём порядке, одной ссылкой.',
  });
});

router.get('/set/:combo', (req, res, next) => {
  const slugs = String(req.params.combo).split('.').slice(0, 3);
  const all = playableTracks();
  const picked = slugs.map((s) => all.find((t) => t.slug === s)).filter(Boolean);
  if (picked.length !== 3 || new Set(slugs).size !== 3) return next();
  const shareUrl = `https://levkeiser.com/music/set/${picked.map((t) => t.slug).join('.')}`;
  res.render('games/set-view', {
    picked,
    shareUrl,
    shareText: `Мой сет из треков DJ Levka: ${picked.map((t) => t.title).join(' → ')}`,
    title: `Сет: ${picked.map((t) => t.title).join(' → ')}`,
    pageDescription: 'Три трека DJ Levka в порядке, который выбрал слушатель.',
    pageImage: picked[0].cover || '',
  });
});

router.get('/:releaseSlug', (req, res, next) => {
  const release = db
    .prepare('SELECT * FROM releases WHERE slug = ? AND is_published = 1')
    .get(req.params.releaseSlug);
  if (!release) return next();

  const tracks = db
    .prepare('SELECT * FROM tracks WHERE release_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(release.id);

  res.render('release', {
    title: release.title,
    release,
    tracks,
    products: productsForRelease(release.id),
    releaseVideo: parseVideoEmbedUrl(release.video_url),
    allReleases: listReleases(),
    currentReleaseId: release.id,
    // Превью репоста — обложка релиза. Без неё ссылка в мессенджере
    // показывала общую картинку сайта, одинаковую для всех страниц.
    pageImage: release.cover_image || '',
    pageDescription: release.description || `${release.title} (${release.year}) — ${release.release_type} DJ Levka`,
    pageType: 'music.album',
  });
});

router.get('/:releaseSlug/:trackSlug', (req, res, next) => {
  const release = db
    .prepare('SELECT * FROM releases WHERE slug = ? AND is_published = 1')
    .get(req.params.releaseSlug);
  if (!release) return next();

  const track = db
    .prepare('SELECT * FROM tracks WHERE release_id = ? AND slug = ? AND is_published = 1')
    .get(release.id, req.params.trackSlug);
  if (!track) return next();

  const siblings = db
    .prepare('SELECT id, title, slug FROM tracks WHERE release_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(release.id);
  const index = siblings.findIndex((t) => t.id === track.id);
  const prevTrack = index > 0 ? siblings[index - 1] : null;
  const nextTrack = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const trackGalleryItems = db
    .prepare('SELECT * FROM gallery_items WHERE track_id = ? ORDER BY sort_order ASC, created_at DESC')
    .all(track.id);

  res.render('track', {
    title: track.title,
    release,
    track,
    prevTrack,
    nextTrack,
    trackGalleryItems,
    products: productsForTrack(track.id),
    trackVideo: parseVideoEmbedUrl(track.video_url),
    allReleases: listReleases(),
    currentReleaseId: release.id,
    // У трека своя обложка бывает не всегда — тогда берём обложку релиза.
    pageImage: track.cover_image || (release && release.cover_image) || '',
    pageDescription: track.description || (release ? `Трек из релиза ${release.title} (${release.year})` : 'Трек DJ Levka'),
    pageType: 'music.song',
  });
});

module.exports = router;
