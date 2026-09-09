const express = require('express');
const { getBanners } = require('../utils/banners');
const db = require('../db');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

// Анонс подкаста на главной. Поля редактируются в /admin/pages/home.
// Пустое название — блок не показываем (вместо него ничего: пустой анонс хуже отсутствия).
const PODCAST_KEYS = ['podcast_title', 'podcast_guest', 'podcast_note', 'podcast_date', 'podcast_url', 'podcast_cover'];

function loadPodcast() {
  const rows = db
    .prepare(`SELECT key, value FROM settings WHERE key IN (${PODCAST_KEYS.map(() => '?').join(',')})`)
    .all(...PODCAST_KEYS);
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    title: map.podcast_title || '',
    guest: map.podcast_guest || '',
    note: map.podcast_note || '',
    date: map.podcast_date || '',
    url: map.podcast_url || '',
    cover: map.podcast_cover || '',
  };
}

router.get('/', (req, res) => {
  // По две вещи из каждого раздела каталога, а не последние добавленные:
  // иначе одна большая категория (сейчас это цифровые товары) съедает всю
  // витрину, и человек не догадывается, что есть ещё бюсты, ароматы и пластинки.
  // Первый ряд — по одной из каждого раздела, второй — вторые.
  const products = db
    .prepare(`
      SELECT * FROM (
        SELECT p.*, COALESCE(c.name, 'Прочее') AS category_name,
               ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY p.created_at DESC) AS n
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = 1
      )
      WHERE n <= 2
      ORDER BY n ASC, category_name ASC
      LIMIT 8
    `)
    .all();
  // Только русские записи: без фильтра по языку на русскую главную
  // вылезала английская, написанная для /en/news.
  //
  // Закрепление здесь намеренно не учитываем, в отличие от раздела новостей.
  // Главная показывает свежее, и закреплённая запись полугодовой давности
  // заняла бы первое место как самая новая. Разбирать по важности — работа
  // раздела, куда ведёт ссылка «Все новости».
  const news = db
    .prepare('SELECT * FROM news WHERE is_published = 1 AND lang = ? ORDER BY created_at DESC LIMIT 4')
    .all('ru');
  const covers = db.prepare(`
    SELECT news_id, file_path FROM news_media
    WHERE type = 'photo' AND id IN (
      SELECT MIN(id) FROM news_media WHERE type = 'photo' GROUP BY news_id
    )
  `).all();
  const coverByNewsId = {};
  covers.forEach((c) => { coverByNewsId[c.news_id] = c.file_path; });

  // Вокруг подкаста: вещь, которая родилась из него, и записи дневника.
  const podcast = loadPodcast();
  const podcastProduct = db
    .prepare("SELECT id, name, slug, price, image FROM products WHERE is_active = 1 AND slug = 'aromaticheskaya-tabletka-grusha-lev'")
    .get();
  // Трек и запись дневника, которые стоят рядом с подкастом: их обложки
  // нужны карточкам «вокруг подкаста», иначе там пустые прямоугольники.
  const podcastTrack = db
    .prepare(`SELECT t.title, t.slug, r.slug AS release_slug, COALESCE(NULLIF(t.cover_image, ''), r.cover_image) AS image
              FROM tracks t JOIN releases r ON r.id = t.release_id WHERE t.slug = 'd-r-e-a-m'`)
    .get();
  const podcastDiary = db
    .prepare("SELECT title, slug, cover_image FROM diary_posts WHERE slug = 'chto-ostalos-za-kadrom-podkasta-s-grushey' AND is_published = 1")
    .get();
  const diaryPosts = db
    .prepare('SELECT id, title, slug, excerpt, cover_image, created_at FROM diary_posts WHERE is_published = 1 ORDER BY created_at DESC LIMIT 4')
    .all();

  // Рыжие — на главную, а не в хвост меню: единственный раздел, который
  // удивляет чужого человека, и единственный, куда уже ведёт статья в Дзене.
  const redheadIntroRow = db.prepare("SELECT value FROM settings WHERE key = 'redheads_intro'").get();
  const redheads = db
    .prepare('SELECT name, role, photo FROM redhead_spotlights WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 5')
    .all();

  // Вещи к трекам: в карточке на главной подписываем, к какому релизу вещь.
  const releaseTitles = {};
  for (const r of db.prepare('SELECT id, title, slug FROM releases').all()) releaseTitles[r.id] = r;

  // «Что нового»: одна лента на всех из последних записей всех разделов.
  // Одинаковая для каждого посетителя — никакой персонализации и памяти о визитах.
  // Заголовок сознательно не «Свежее»: это слово намекает, что остальное на сайте
  // залежалось, и заодно читается как «мы помним, что вы уже смотрели».
  // Не больше трёх новостей, двух записей дневника, одной вещи и одного дропа:
  // иначе пять товаров, залитых в один день, вытесняют всё остальное.
  // Релизы не берём: у них created_at — дата импорта, а не выхода.
  // Обложка берётся из своей колонки у каждого типа, у новостей — первое фото.
  const fresh = db.prepare(`
    SELECT kind, title, url, created_at, image FROM (
      SELECT kind, title, url, created_at, image,
        ROW_NUMBER() OVER (PARTITION BY kind ORDER BY created_at DESC) AS n,
        -- Один материал часто идёт и новостью, и записью дневника. В ленте это
        -- две одинаковые карточки подряд с одной обложкой, поэтому по заголовку
        -- оставляем что-то одно — то, что вышло позже.
        ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at DESC) AS dup
      FROM (
        SELECT 'Новость' AS kind, n.title, '/news/' || n.slug AS url, n.created_at,
               COALESCE((SELECT m.file_path FROM news_media m
                         WHERE m.news_id = n.id AND m.type = 'photo'
                         ORDER BY m.id LIMIT 1), '') AS image
          FROM news n WHERE n.is_published = 1 AND n.lang = 'ru'
        UNION ALL
        SELECT 'Дневник', title, '/diary/' || slug, created_at, COALESCE(cover_image, '') FROM diary_posts WHERE is_published = 1
        UNION ALL
        SELECT 'Вещь', name, '/catalog/' || slug, created_at, COALESCE(image, '') FROM products WHERE is_active = 1
        UNION ALL
        SELECT 'Дроп', c.name, '/drops/' || c.slug, c.created_at,
               COALESCE((SELECT p.image FROM products p
                         WHERE p.collection_id = c.id AND p.is_active = 1 AND p.image != ''
                         ORDER BY p.created_at LIMIT 1), '') AS image
          FROM collections c WHERE c.is_published = 1
      ) WHERE created_at <= datetime('now')
    ) WHERE dup = 1 AND n <= CASE kind WHEN 'Новость' THEN 3 WHEN 'Дневник' THEN 2 ELSE 1 END
    ORDER BY created_at DESC LIMIT 6
  `).all();

  res.render('index', {
    banners: getBanners('home'),
    fresh,
    products,
    releaseTitles,
    news,
    coverByNewsId,
    podcast,
    podcastProduct,
    podcastTrack,
    podcastDiary,
    diaryPosts,
    redheadIntro: redheadIntroRow ? redheadIntroRow.value : '',
    redheads,
    galleryItems: getGalleryItems('home'),
  });
});

module.exports = router;
