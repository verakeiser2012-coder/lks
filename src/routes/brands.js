const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const { plural } = require('../utils/text');
const audience = require('../data/audience');

const router = express.Router();

// Джинглы, которые уже написаны для реальных заказчиков. Лежат в public/audio/jingles,
// в фоновый плейлист не попадают (он читает только корень public/audio).
const JINGLES = [
  { title: 'Груша', sub: 'мастерская благовоний, Екатеринбург · 39 с', src: '/audio/jingles/grusha.mp3' },
  { title: 'Флёр', sub: 'ателье штор и абажуров, Екатеринбург · 25 с', src: '/audio/jingles/fleur.mp3' },
  { title: 'Франт', sub: 'три длины: 15 с', src: '/audio/jingles/frant-long.mp3' },
  { title: 'Франт', sub: '7 с', src: '/audio/jingles/frant-mid.mp3' },
  { title: 'Франт', sub: '3 с, отбивка', src: '/audio/jingles/frant-short.mp3' },
];

// key — то, что уходит в заявку галочкой. Названия живут здесь же,
// чтобы форма, письмо и админка не расходились.
function getOffers() {
  const aboutPhotos = db.prepare("SELECT * FROM about_media WHERE type = 'photo' ORDER BY sort_order ASC").all();
  const galleryVideo = db.prepare("SELECT * FROM gallery_items WHERE type = 'video' ORDER BY sort_order ASC LIMIT 1").get();
  const tablet = db
    .prepare("SELECT name, slug, image FROM products WHERE is_active = 1 AND slug = 'aromaticheskaya-tabletka-grusha-lev'")
    .get();
  const fleurDrop = db.prepare("SELECT name, slug FROM collections WHERE slug = 'fleur-x-lev'").get();

  return [
    {
      key: 'jingle',
      title: 'Джингл',
      description:
        'Пишу оригинальный трек под ваш бренд — со слоганом, названием или мелодией в основе. Готовый джингл можно использовать в рекламе, сторис, на кассах в точках продаж или в подкастах партнёров. Уже написаны для «Груши», «Флёр» и «Франта» — послушайте.',
      example: { type: 'audio', items: JINGLES },
    },
    {
      key: 'photo',
      title: 'Фотосессия',
      description:
        'Съёмка с вашим продуктом в разных образах и локациях — для карточек товара, каталога, рекламных материалов и постов в соцсетях.',
      example: aboutPhotos[0] ? { type: 'photo', src: aboutPhotos[0].file_path } : { type: 'placeholder' },
    },
    {
      key: 'model',
      title: 'Реклама с участием как модель',
      description:
        'Снимаюсь в рекламных роликах и фотосъёмках как модель — работаю с камерой с 4 лет, есть опыт кастингов и киносъёмок. Подойдёт для кампаний, лукбуков и рекламы детских и подростковых линеек.',
      example: aboutPhotos[1] ? { type: 'photo', src: aboutPhotos[1].file_path } : { type: 'placeholder' },
    },
    {
      key: 'podcast',
      title: 'Подкаст',
      description:
        'Записываю выпуск подкаста с обсуждением бренда, интервью с представителем компании или нативным упоминанием в разговоре. Первый выпуск — с мастерской благовоний «Груша»: разговор о том, почему аромат и музыка устроены одинаково.',
      example: { type: 'link', url: '/#podcast', label: 'Анонс выпуска с «Грушей»' },
    },
    {
      key: 'dj-set',
      title: 'DJ-сет на мероприятии',
      description:
        'Провожу DJ-сет на открытии точки, презентации продукта или вечеринке бренда под псевдонимом DJ Levka.',
      example: galleryVideo
        ? { type: 'video', src: galleryVideo.file_path }
        : { type: 'link', url: 'https://rutube.ru/channel/24325663', label: 'Смотреть на Rutube' },
    },
    {
      key: 'review',
      title: 'Видео-обзор',
      description:
        'Снимаю видео-обзор или распаковку продукта для YouTube, TikTok и Rutube — нативно и в своём стиле, без сценарной фальши.',
      example: { type: 'link', url: 'https://www.youtube.com/@DJLEVKA', label: 'Смотреть на YouTube' },
    },
    {
      key: 'posts',
      title: 'Посты и сторис',
      description:
        'Публикую посты и сторис с отметкой бренда в Telegram, VK и Instagram — с реальной аудиторией, без накруток.',
      example: { type: 'link', url: 'https://instagram.com/levkeiser', label: 'Смотреть Instagram' },
    },
    {
      key: 'giveaway',
      title: 'Совместный розыгрыш',
      description:
        'Организуем совместный giveaway с продуктом бренда в качестве приза — это увеличивает охваты и подписчиков с обеих сторон.',
      example: { type: 'placeholder' },
    },
    {
      key: 'ambassador',
      title: 'Амбассадорство',
      description:
        'Долгосрочное сотрудничество с регулярными публикациями, упоминаниями и участием в кампаниях бренда на протяжении сезона или дольше.',
      example: { type: 'placeholder' },
    },
    {
      key: 'merch',
      title: 'Совместный мерч и дроп',
      description:
        'Делаем лимитированную вещь вместе с брендом и продаём её в нашем магазине как дроп, привязанный к треку. Так уже сделаны ароматическая таблетка «Груша × Лев» под альбом Soundstates и абажуры «Флёр × Лев» с обложками релизов.',
      example: tablet
        ? { type: 'photo', src: tablet.image, url: `/catalog/${tablet.slug}`, label: tablet.name }
        : { type: 'link', url: fleurDrop ? `/drops/${fleurDrop.slug}` : '/drops', label: 'Смотреть дропы' },
      extraLink: fleurDrop ? { url: `/drops/${fleurDrop.slug}`, label: fleurDrop.name } : null,
    },
    {
      key: 'redheads',
      title: 'Реклама с рыжими',
      description:
        'У нас курируемое сообщество рыжих моделей, музыкантов и творческих людей — раздел «Рыжие, которые вдохновляют». Рыжий цвет волос — редкая генетика (1–2% людей), и это готовый, узнаваемый визуальный образ для кампании. Подбираем подходящих людей из подборки под вашу съёмку или ролик.',
      example: { type: 'link', url: '/redheads', label: 'Смотреть подборку' },
    },
    {
      key: 'contest',
      title: 'Спонсорство конкурса',
      description:
        'Спонсорский слот на сезон конкурса «Твой выход под трек» (участники 18+ снимают вертикальные видео под мою музыку): ваши вещи на участниках, ваш приз, представитель бренда в жюри, логотип во всех анонсах. Каждая заявка — это видео с вашим продуктом, снятое участником, а не нами. Если у бренда подростковая аудитория, сезон можно провести на площадке бренда и по его правилам — тогда возрастной ценз и модерацию берёт на себя он.',
      example: { type: 'link', url: '/contest', label: 'Смотреть конкурс' },
    },
  ];
}

// Пакеты для медиа-кита: те же форматы, собранные в три ступени сотрудничества.
// Цены сознательно не указываем — они зависят от объёма прав и сроков, обсуждаются по запросу.
function getPackages() {
  return [
    {
      title: 'Знакомство',
      subtitle: 'разовая интеграция',
      includes: [
        'Пост и серия сторис с отметкой бренда',
        'Или видео-обзор либо распаковка продукта',
        'Съёмка и монтаж на нашей стороне',
        'Материал согласуем до публикации',
      ],
      note: 'От бренда нужен продукт и короткий бриф. Подходит, чтобы попробовать формат без длинных обязательств.',
    },
    {
      title: 'Кампания',
      subtitle: 'комплект материалов под запуск',
      includes: [
        'Фотосессия с продуктом — кадры для карточек товара и рекламы',
        'Видео-обзор для YouTube, TikTok и Rutube',
        'Серия постов и сторис на всех площадках',
        'По желанию — совместный розыгрыш с продуктом бренда',
      ],
      note: 'Права на использование кадров в рекламе бренда обсуждаем отдельно — от этого зависит стоимость.',
    },
    {
      title: 'Амбассадорство',
      subtitle: 'сезон и дольше',
      includes: [
        'Всё из «Кампании», но регулярно в течение сезона',
        'Джингл бренда — оригинальный трек под слоган или название',
        'Участие как модель в съёмках бренда',
        'DJ-сет на открытии точки, презентации или вечеринке',
        'Капсульный мерч и логотип в анонсах наших конкурсов',
      ],
      note: 'Долгая история работает лучше разовой: аудитория успевает связать бренд с человеком, а не с рекламной вставкой.',
    },
  ];
}

// Галочки из формы → названия форматов. Чужие значения отбрасываем.
function parseWants(raw) {
  const offers = getOffers();
  const keys = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return offers.filter((o) => keys.includes(o.key)).map((o) => o.title);
}

function renderForm(res, { error = null, success = false, values = {} } = {}) {
  res.render('brands', { error, success, values, offers: getOffers(), audience });
}

router.get('/', (req, res) => {
  renderForm(res);
});

// Медиа-кит: то же содержание, что и /brands, но в формате презентации для отправки бренду.
router.get('/media-kit', (req, res) => {
  const settings = {};
  for (const row of db.prepare('SELECT key, value FROM settings').all()) settings[row.key] = row.value;
  const releases = db
    .prepare('SELECT title, slug, year, cover_image, release_type FROM releases WHERE is_published = 1 ORDER BY sort_order ASC')
    .all();
  const trackCount = db.prepare('SELECT COUNT(*) AS c FROM tracks').get().c;
  const epCount = releases.filter((r) => r.release_type !== 'Single').length;
  const singleCount = releases.length - epCount;
  res.render('media-kit', {
    offers: getOffers(),
    packages: getPackages(),
    mediaSettings: settings,
    releases,
    trackCount,
    epCount,
    singleCount,
    plural,
    audience,
  });
});

router.post('/', (req, res) => {
  if (isBot(req) || overLimit('brands', req, 3)) {
    return res.redirect('/brands?sent=1');
  }
  const { companyName, contactName, phone, email, website, message, dataConsent } = req.body;
  const wants = parseWants(req.body.wants);
  const values = { companyName, contactName, phone, email, website, message, dataConsent, wants: req.body.wants };

  if (!companyName || !contactName || !phone) {
    return renderForm(res, { error: 'Заполните название бренда, контактное лицо и телефон.', values });
  }

  if (!dataConsent) {
    return renderForm(res, { error: 'Подтвердите согласие на обработку персональных данных.', values });
  }

  db.prepare(`
    INSERT INTO brand_requests (company_name, contact_name, phone, email, website, message, wants)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(companyName, contactName, phone, email || '', website || '', message || '', JSON.stringify(wants));

  notify(
    `Новая заявка от бренда: ${companyName}`,
    `Компания: ${companyName}\nКонтакт: ${contactName}\nТелефон: ${phone}\nEmail: ${email || '—'}\nСайт: ${website || '—'}\nЧто интересует: ${wants.length ? wants.join(', ') : '—'}\nСообщение: ${message || '—'}\n\nПосмотреть: /admin/brands`,
    'brand@levkeiser.com'
  );

  renderForm(res, { success: true });
});

module.exports = router;
