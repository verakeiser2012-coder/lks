const express = require('express');
const ld = require('../utils/jsonld');
const db = require('../db');
const { getBanners } = require('../utils/banners');

function createNewsRouter(lang) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const posts = db
      .prepare('SELECT * FROM news WHERE is_published = 1 AND lang = ? ORDER BY is_pinned DESC, created_at DESC')
      .all(lang);
    const covers = db.prepare(`
      SELECT news_id, file_path FROM news_media
      WHERE type = 'photo' AND id IN (
        SELECT MIN(id) FROM news_media WHERE type = 'photo' GROUP BY news_id
      )
    `).all();
    const coverByNewsId = {};
    covers.forEach((c) => { coverByNewsId[c.news_id] = c.file_path; });

    res.render('news', {
      posts,
      coverByNewsId,
      banners: getBanners('news'),
      lang,
    });
  });

  router.get('/:slug', (req, res) => {
    const post = db
      .prepare('SELECT * FROM news WHERE slug = ? AND lang = ? AND is_published = 1')
      .get(req.params.slug, lang);
    if (!post) {
      return res.status(404).render('404');
    }
    // Перевод ищем по совпадению слага; нет перевода — уводим на список,
    // а не на несуществующую страницу.
    const twin = db
      .prepare('SELECT slug FROM news WHERE slug = ? AND lang <> ? AND is_published = 1')
      .get(post.slug, lang);
    const langAlt = lang === 'en'
      ? { en: `/en/news/${post.slug}`, ru: twin ? `/news/${twin.slug}` : '/news' }
      : { ru: `/news/${post.slug}`, en: twin ? `/en/news/${twin.slug}` : '/en/news' };
    const media = db
      .prepare('SELECT * FROM news_media WHERE news_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(post.id);
    // Лента времени: все опубликованные новости для киноплёнки-навигации
    const allPosts = db
      .prepare('SELECT id, slug, title, created_at, is_pinned FROM news WHERE is_published = 1 AND lang = ? ORDER BY is_pinned DESC, created_at ASC')
      .all(lang);
    const covers = db.prepare(`
      SELECT news_id, file_path FROM news_media
      WHERE type = 'photo' AND id IN (
        SELECT MIN(id) FROM news_media WHERE type = 'photo' GROUP BY news_id
      )
    `).all();
    const coverByNewsId = {};
    covers.forEach((c) => { coverByNewsId[c.news_id] = c.file_path; });
    const cover = media.find((m) => m.type === 'photo');
    res.render('news-detail', {
      post,
      langAlt,
      media,
      allPosts,
      coverByNewsId,
      title: post.title,
      pageImage: cover ? cover.file_path : '',
      // Первый абзац без разметки — то, что человек и так увидит под заголовком.
      pageDescription: String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
      pageType: 'article',
      jsonLd: ld.serialize(ld.graph(res.locals.canonicalBase, [
        ld.article(res.locals.canonicalBase, post, {
          type: 'NewsArticle', url: langAlt[lang], image: cover ? cover.file_path : '',
          description: post.content, lang,
        }),
        ld.breadcrumbs(res.locals.canonicalBase, [
          { name: lang === 'en' ? 'News' : 'Новости', url: lang === 'en' ? '/en/news' : '/news' },
          { name: post.title, url: langAlt[lang] },
        ]),
      ])),
    });
  });

  return router;
}

module.exports = { createNewsRouter };
