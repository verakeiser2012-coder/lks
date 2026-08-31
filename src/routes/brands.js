const express = require('express');
const db = require('../db');
const { isBot, overLimit } = require('../middleware/antispam');
const { notify } = require('../services/mail');
const { plural } = require('../utils/text');

const router = express.Router();

function getOffers() {
  const aboutPhotos = db.prepare("SELECT * FROM about_media WHERE type = 'photo' ORDER BY sort_order ASC").all();
  const galleryVideo = db.prepare("SELECT * FROM gallery_items WHERE type = 'video' ORDER BY sort_order ASC LIMIT 1").get();

  return [
    {
      title: 'Джингл',
      description:
        'Пишу оригинальный трек под ваш бренд — со слоганом, названием или мелодией в основе. Готовый джингл можно использовать в рекламе, сторис, на кассах в точках продаж или в подкастах партнёров.',
      example: { type: 'link', url: 'https://band.link/soundstates', label: 'Послушать пример трека' },
    },
    {
      title: 'Фотосессия',
      description:
        'Съёмка с вашим продуктом в разных образах и локациях — для карточек товара, каталога, рекламных материалов и постов в соцсетях.',
      example: aboutPhotos[0] ? { type: 'photo', src: aboutPhotos[0].file_path } : { type: 'placeholder' },
    },
    {
      title: 'Реклама с участием как модель',
      description:
        'Снимаюсь в рекламных роликах и фотосъёмках как модель — работаю с камерой с 4 лет, есть опыт кастингов и киносъёмок. Подойдёт для кампаний, лукбуков и рекламы детских и подростковых линеек.',
      example: aboutPhotos[1] ? { type: 'photo', src: aboutPhotos[1].file_path } : { type: 'placeholder' },
    },
    {
      title: 'Подкаст',
      description:
        'Записываю выпуск подкаста с обсуждением бренда, интервью с представителем компании или нативным упоминанием в разговоре.',
      example: { type: 'placeholder' },
    },
    {
      title: 'DJ-сет на мероприятии',
      description:
        'Провожу DJ-сет на открытии точки, презентации продукта или вечеринке бренда под псевдонимом DJ Levka.',
      example: galleryVideo
        ? { type: 'video', src: galleryVideo.file_path }
        : { type: 'link', url: 'https://rutube.ru/channel/24325663', label: 'Смотреть на Rutube' },
    },
    {
      title: 'Видео-обзор',
      description:
        'Снимаю видео-обзор или распаковку продукта для YouTube, TikTok и Rutube — нативно и в своём стиле, без сценарной фальши.',
      example: { type: 'link', url: 'https://www.youtube.com/@DJLEVKA', label: 'Смотреть на YouTube' },
    },
    {
      title: 'Посты и сторис',
      description:
        'Публикую посты и сторис с отметкой бренда в Instagram и VK — с реальной аудиторией, без накруток.',
      example: { type: 'link', url: 'https://instagram.com/levkeiser', label: 'Смотреть Instagram' },
    },
    {
      title: 'Совместный розыгрыш',
      description:
        'Организуем совместный giveaway с продуктом бренда в качестве приза — это увеличивает охваты и подписчиков с обеих сторон.',
      example: { type: 'placeholder' },
    },
    {
      title: 'Амбассадорство',
      description:
        'Долгосрочное сотрудничество с регулярными публикациями, упоминаниями и участием в кампаниях бренда на протяжении сезона или дольше.',
      example: { type: 'placeholder' },
    },
    {
      title: 'Совместный мерч',
      description:
        'Создаём лимитированную капсульную коллекцию кастомных вещей вместе с брендом — она продаётся в нашем интернет-магазине.',
      example: { type: 'link', url: '/catalog', label: 'Смотреть каталог' },
    },
    {
      title: 'Реклама с рыжими',
      description:
        'У нас курируемое сообщество рыжих моделей, музыкантов и творческих людей — раздел «Рыжие, которые вдохновляют». Рыжий цвет волос — редкая генетика (1–2% людей), и это готовый, узнаваемый визуальный образ для кампании. Подбираем подходящих людей из подборки под вашу съёмку или ролик.',
      example: { type: 'link', url: '/redheads', label: 'Смотреть подборку' },
    },
    {
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

router.get('/', (req, res) => {
  res.render('brands', { error: null, success: false, values: {}, offers: getOffers() });
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
  res.render('media-kit', { offers: getOffers(), packages: getPackages(), mediaSettings: settings, releases, trackCount, epCount, singleCount, plural });
});

router.post('/', (req, res) => {
  if (isBot(req) || overLimit('brands', req, 3)) {
    return res.redirect('/brands?sent=1');
  }
  const { companyName, contactName, phone, email, website, message, dataConsent } = req.body;

  if (!companyName || !contactName || !phone) {
    return res.render('brands', {
      error: 'Заполните название бренда, контактное лицо и телефон.',
      success: false,
      values: { companyName, contactName, phone, email, website, message, dataConsent },
      offers: getOffers(),
    });
  }

  if (!dataConsent) {
    return res.render('brands', {
      error: 'Подтвердите согласие на обработку персональных данных.',
      success: false,
      values: { companyName, contactName, phone, email, website, message, dataConsent },
      offers: getOffers(),
    });
  }

  db.prepare(`
    INSERT INTO brand_requests (company_name, contact_name, phone, email, website, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(companyName, contactName, phone, email || '', website || '', message || '');

  notify(
    `Новая заявка от бренда: ${companyName}`,
    `Компания: ${companyName}\nКонтакт: ${contactName}\nТелефон: ${phone}\nEmail: ${email || '—'}\nСайт: ${website || '—'}\nСообщение: ${message || '—'}\n\nПосмотреть: /admin/brands`,
    'brand@levkeiser.com'
  );

  res.render('brands', { error: null, success: true, values: {}, offers: getOffers() });
});

module.exports = router;
