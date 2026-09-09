const express = require('express');
const db = require('../db');
const { getBanners } = require('../utils/banners');
const { parseVideoEmbedUrl } = require('../utils/videoEmbed');

const router = express.Router();

/**
 * DJ-сеты и стемы — раздел для тех, кто сам делает музыку.
 *
 * Сеты: длинные записи, которые не помещаются в каталог релизов и на витрины
 * стримингов. Стемы: отдельные дорожки трека, которые можно взять на ремикс
 * или спеть поверх. Выступлений мы не обещаем (Лев к ним не готов) — здесь
 * только записи и файлы.
 */
function sets() {
  return db
    .prepare('SELECT * FROM dj_sets WHERE is_published = 1 ORDER BY sort_order ASC, set_date DESC, id DESC')
    .all()
    .map((s) => ({ ...s, video: parseVideoEmbedUrl(s.video_url) }));
}

function stems() {
  return db
    .prepare(`SELECT p.*, t.title AS track_title, t.slug AS track_slug, r.slug AS release_slug
              FROM stem_packs p
              LEFT JOIN tracks t ON t.id = p.track_id
              LEFT JOIN releases r ON r.id = t.release_id
              WHERE p.is_published = 1
              ORDER BY p.sort_order ASC, p.id ASC`)
    .all();
}

router.get('/', (req, res) => {
  res.render('sets', {
    djSets: sets(),
    stemPacks: stems(),
    banners: getBanners('sets'),
    title: 'Сеты и стемы',
    pageDescription: 'Записи DJ-сетов DJ Levka и стемы треков — отдельные дорожки для ремиксов и вокала.',
  });
});

module.exports = router;
