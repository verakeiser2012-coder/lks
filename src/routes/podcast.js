const express = require('express');
const ld = require('../utils/jsonld');
const db = require('../db');
const { getBanners } = require('../utils/banners');
const { parseVideoEmbedUrl } = require('../utils/videoEmbed');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

/**
 * Креативы: всё, что Лев делает в кадре и у микрофона, — подкаст с мастерскими,
 * кино и рекламные съёмки. Адрес остался /podcast, чтобы не ломать ссылки.
 *
 * Выпуск подкаста без файла показывается карточкой «скоро» — это честнее,
 * чем пустой раздел. Кино и реклама — те же галереи, что на странице «Стиль»
 * (ключи style-film и style-ads в админке → Галерея).
 */
function episodes() {
  return db
    .prepare('SELECT * FROM podcast_episodes WHERE is_published = 1 ORDER BY sort_order ASC, episode_date DESC, id DESC')
    .all();
}

router.get('/', (req, res) => {
  const adBrandsRow = db.prepare("SELECT value FROM settings WHERE key = 'style_ads_brands'").get();
  res.render('podcast', {
    episodes: episodes(),
    // Весь бэкстейдж — и видео, и фото: в «Стиле» съёмок больше нет.
    filmItems: getGalleryItems('style-film'),
    adItems: getGalleryItems('style-ads'),
    adBrands: adBrandsRow ? adBrandsRow.value : '',
    banners: getBanners('podcast'),
    title: 'В кадре',
    pageDescription: 'В кадре: всё видео Льва Кейсера в одном месте — выпуски подкаста, кино и рекламные ролики.',
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
    jsonLd: ld.serialize(ld.graph(res.locals.canonicalBase, [
      ld.podcastEpisode(res.locals.canonicalBase, episode, 'Подкаст Льва Кейсера'),
      ld.breadcrumbs(res.locals.canonicalBase, [
        { name: 'В кадре', url: '/podcast' },
        { name: episode.title, url: '/podcast/' + episode.slug },
      ]),
    ])),
  });
});

module.exports = router;
