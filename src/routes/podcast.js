const express = require('express');
const db = require('../db');
const { getBanners } = require('../utils/banners');
const { parseVideoEmbedUrl } = require('../utils/videoEmbed');

const router = express.Router();

/**
 * Подкаст: разговоры с теми, кто делает вещи руками.
 *
 * Раздел заводится до первого выпуска нарочно: анонс уже висит на главной и
 * в дневнике, а человеку, который дочитал, некуда идти. Выпуск без файла
 * показывается карточкой «скоро» — это честнее, чем пустой раздел.
 */
function episodes() {
  return db
    .prepare('SELECT * FROM podcast_episodes WHERE is_published = 1 ORDER BY sort_order ASC, episode_date DESC, id DESC')
    .all();
}

router.get('/', (req, res) => {
  res.render('podcast', {
    episodes: episodes(),
    banners: getBanners('podcast'),
    title: 'Подкаст',
    pageDescription: 'Подкаст DJ Levka: разговоры с мастерскими и людьми, которые делают вещи руками.',
  });
});

router.get('/:slug', (req, res, next) => {
  const episode = db
    .prepare('SELECT * FROM podcast_episodes WHERE slug = ? AND is_published = 1')
    .get(req.params.slug);
  if (!episode) return next();

  res.render('podcast-episode', {
    episode,
    others: episodes().filter((e) => e.id !== episode.id),
    video: parseVideoEmbedUrl(episode.video_url),
    title: episode.title,
    pageImage: episode.cover_image || '',
    pageDescription: episode.description ? episode.description.slice(0, 200) : 'Выпуск подкаста DJ Levka',
  });
});

module.exports = router;
