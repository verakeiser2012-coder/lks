const express = require('express');
const db = require('../db');

const router = express.Router();

// Услуга «Коллегам за копеечку»: оформление прав музыкантов под ключ.
// Цены и состав пакетов живут здесь, форма заявки — общая /contact?topic=service.
const PACKAGES = [
  {
    key: 'audit',
    title: 'Аудит каталога',
    price: '1 000 ₽',
    lead: 'Разбираемся, что у вас уже есть и чего не хватает. Заказывается прямо здесь, тысяча засчитывается в любой пакет.',
    items: [
      'сверяем ваши релизы по площадкам: стриминги, Shazam, YouTube, TikTok',
      'ISRC и UPC по всем трекам собираем сами — с площадок и из мастеров, вам искать ничего не нужно; заодно сверяем названия, обложки, указание авторов',
      'ищем треки с чужими цитатами и сэмплами — их оформлять нельзя',
      'отдаём документ: что нашли, что с этим делать и в каком порядке',
    ],
  },
  {
    key: 'cabinet',
    title: 'Кабинет и три общества',
    price: '5 000 ₽',
    lead: 'Регистрируем вас как автора и правообладателя в России. Минус тысяча, если аудит уже оплачен.',
    items: [
      'кабинет правообладателя ЛКП (РЦИС ID) — заводим все ваши произведения',
      'договоры с РАО, ВОИС и РСП — по шагам, с готовыми заявлениями',
      'соглашение соавторов, если у трека несколько авторов',
      'памятка: какие поля заполнять самому и что дальше приходит на почту',
    ],
  },
  {
    key: 'full',
    title: 'Всё и сразу',
    price: '12 000 ₽',
    lead: 'Аудит + общества + площадки, где музыка начинает зарабатывать. Минус тысяча, если аудит уже оплачен.',
    items: [
      'всё из первых двух пакетов',
      'дистрибьютор с TikTok и Meta Sound Collection — перенос или новый релиз',
      'каталог на бирже лицензий IPEX: карточки, обложки, цены, заверение об авторстве, скриншоты проектов',
      'заявки на синхронизацию: Songtradr, Fonmix и другие площадки',
      'сопровождение до первых ответов от обществ и площадок',
    ],
  },
];

// Дополнительно к любому пакету, оплачивается отдельно. DJ-версию делаем из мастера
// (разделение на дорожки + сборка по тактам), стемы — только из проекта клиента.
const EXTRAS = [
  ['DJ-версия трека (Extended Mix)', '2 000 ₽ за трек',
    'Вступление и выход по 16 тактов, брейкдаун, ровная сетка — версия, которую диджей возьмёт в сет. WAV + MP3 с BPM и тональностью в тегах, выкладка на SoundCloud с нужными тегами.'],
  ['Стемы для ремиксов', '1 000 ₽ за трек',
    'Из вашего проекта: барабаны, бас, мелодия, вокал отдельными файлами, с описанием и лицензией «для ремиксов».'],
];

const STAGES = [
  ['Заявка', 'Заказываете аудит на этой странице и вписываете ссылки на релизы при оформлении — или пишете в бота: кто вы, что уже оформлено.'],
  ['Аудит', 'Проверяем каталог, в течение пяти рабочих дней присылаем документ с находками и планом.'],
  ['Кабинет', 'Регистрируете РЦИС ID сами (там паспорт — его вводите только вы), дальше ведём мы.'],
  ['Общества', 'РАО, ВОИС, РСП: готовим заявления и произведения, вы подписываете.'],
  ['Соавторы', 'Если есть общие треки — соглашение соавторов и split sheet.'],
  ['Дистрибьютор', 'Подбираем площадку с TikTok/Meta, переносим каталог или выпускаем новое.'],
  ['Лицензии', 'Каталог на IPEX (на каждый трек — скриншот вашего проекта в DAW, так биржа подтверждает авторство), заявки на синхронизацию.'],
  ['Передача', 'Все доступы у вас, папка с документами — тоже. Дальше сами или с нами.'],
];

// Английская страница — не перевод русской услуги (РАО, ВОИС, РСП и кабинет
// правообладателя иностранцу не нужны), а своё предложение: российские стриминги,
// куда западные дистрибьюторы с 2022 года не отгружают, артист-страницы и
// русскоязычный питч. Оплата рублями через Robokassa с зарубежной карты.
// Свой флажок services_en_public: русскую услугу можно показывать, английскую — ещё нет.
const cbr = require('../services/cbrRates');

const EN_PACKAGES = [
  {
    key: 'audit',
    title: 'Catalogue check',
    rub: 3000,
    lead: 'Where your music stands in Russia today. Ordered here; the fee counts toward any package.',
    items: [
      'which of your releases are on Yandex Music, VK Music and Zvuk — and which never arrived',
      'artist pages: do they exist, are they claimed, are your releases mapped to the right artist (namesakes are common)',
      'metadata: covers, titles, credits, duplicates, the Cyrillic spelling of your name where stores show it',
      'tracks with uncleared samples or quotes — flagged, they can\'t be delivered or registered',
      'a written report: what is missing, what it takes and in what order',
    ],
  },
  {
    key: 'presence',
    title: 'Artist presence',
    rub: 15000,
    lead: 'Your artist pages and one release, set up the way Russian editors and listeners expect. Minus 3 000 ₽ if the check is paid.',
    items: [
      'claimed and verified artist pages on Yandex Music and VK, with a Russian bio and your photos',
      'Russian spelling and transliteration of your name agreed with you and fixed across the stores',
      'editorial pitch in Russian for one release — Yandex Music, VK Music, Zvuk',
      'one Russian-language announcement: a VK post or an article on Dzen, with your links',
      'a short guide to reading Russian statements and store analytics',
    ],
  },
  {
    key: 'full',
    title: 'Russian stores + presence',
    rub: 36000,
    lead: 'Everything above plus delivery of your catalogue to the Russian stores. Minus 3 000 ₽ if the check is paid.',
    items: [
      'delivery of your catalogue to Yandex Music, VK Music and Zvuk through a Russian distributor — on your own account where the distributor accepts foreign artists, otherwise on ours under a non-exclusive licence for Russia only',
      'Russian-side metadata: titles, credits, ISRC and UPC kept identical to your main distributor',
      'registration of your works with the Russian rights societies where it makes sense, via a Russian representative',
      'monitoring of the first statements; royalties paid out under the licence, by a method agreed before you sign',
      'support in writing until the first statements arrive',
    ],
  },
];

const EN_EXTRAS = [
  ['DJ version (Extended Mix)', 6000,
    '16-bar intro and outro, a breakdown, a straight grid — the version a DJ will actually play. WAV + MP3 with BPM and key in the tags.'],
  ['Stems for remixes', 3000,
    'From your project: drums, bass, melody and vocal as separate files, with a note on the remix licence.'],
];

const EN_STAGES = [
  ['Request', 'Order the check here and paste links to your releases at checkout — or write through the form: who you are and where your music is now.'],
  ['Check', 'We go through the stores and send the report within five working days.'],
  ['Plan', 'You pick a package; we agree spellings, the bio and which releases go first.'],
  ['Pages', 'Artist pages claimed, bio and photos up, links in place.'],
  ['Delivery', 'The catalogue goes to the Russian stores; we confirm as each release goes live.'],
  ['Pitch', 'Editorial pitch and the Russian announcement for the release you choose.'],
  ['Hand-over', 'All accounts and documents are yours. Carry on alone or with us.'],
];

async function renderEn(req, res) {
  if (res.locals.settings.services_en_public !== '1' && !res.locals.isAdmin) return res.status(404).render('404');
  // Свой товар-услуга (lang = 'en', в русском каталоге не показывается), цена втрое выше русского аудита —
  // решение владельца 18.09: зарубежному артисту и объём другой, и переписка на английском.
  const auditProduct = db.prepare("SELECT id, price FROM products WHERE slug = 'catalogue-check' AND is_active = 1").get() || null;
  const rates = await cbr.rates();
  // «≈ €10» рядом с рублями — ориентир по курсу ЦБ; без курса показываем только рубли.
  const approx = (rub) => (rates && rates.EUR ? ` (≈ €${Math.round(rub / rates.EUR)})` : '');
  res.render('services-en', {
    auditProduct,
    title: 'Your music in Russia — for artists',
    pageDescription:
      'Delivery to Yandex Music, VK Music and Zvuk, claimed artist pages, Russian-language pitches and announcements — for artists whose distributors no longer deliver to Russia. Paid in rubles by card issued outside Russia.',
    packages: EN_PACKAGES,
    extras: EN_EXTRAS,
    stages: EN_STAGES,
    approx,
    hasRates: Boolean(rates && rates.EUR),
  });
}

router.get('/', (req, res, next) => {
  if (req.lang === 'en') return renderEn(req, res).catch(next);
  // Пока услуга не включена в настройках, страницу видит только вошедший админ:
  // всё выложено и закоммичено, а «показывать или нет» — флажок, не отложенная выкладка.
  if (res.locals.settings.services_public !== '1' && !res.locals.isAdmin) return res.status(404).render('404');
  // Аудит — товар-услуга в магазине: кнопка на пакете кладёт его в корзину, дальше обычное оформление.
  const auditProduct = db.prepare("SELECT id, price FROM products WHERE slug = 'audit-kataloga' AND is_active = 1").get() || null;
  res.render('services', {
    auditProduct,
    title: 'Коллегам за копеечку — оформление прав на музыку',
    pageDescription:
      'Помогаю музыкантам оформить права: РАО, ВОИС, РСП, кабинет правообладателя, дистрибьютор с TikTok, биржа лицензий IPEX. Без созвонов, за символическую копеечку.',
    packages: PACKAGES,
    extras: EXTRAS,
    stages: STAGES,
    reviews: require('./reviews').approved("AND kind = 'service'"),
  });
});

module.exports = router;
