/**
 * Структурированные данные (schema.org, JSON-LD) для поисковиков.
 *
 * Поисковик читает не страницу, а карточку: кто такой Лев Кейсер, что за
 * альбом, почём вещь, когда вышла запись. Без карточки он догадывается по
 * тексту, с карточкой — показывает расширенный сниппет: цену и наличие у
 * товара, обложку у альбома, дату и автора у записи, хлебные крошки вместо
 * адреса. Здесь собираются сами объекты; печатает их шапка (partials/header)
 * из переменной jsonLd, которую маршрут передаёт в render.
 *
 * Адреса — только абсолютные, от канонического домена: поисковик склеивает
 * карточки между страницами и зеркалами именно по ним.
 */
const db = require('../db');

const ARTIST_NAME = 'DJ Levka';
const PERSON_NAME = 'Лев Кейсер';
const BRAND_NAME = 'LEVKEISER';

function abs(base, url) {
  if (!url) return undefined;
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  return base + (s.startsWith('/') ? s : '/' + s);
}

/** Картинка без ?w=: поисковику нужен полный файл, а не миниатюра. */
function image(base, url) {
  if (!url) return undefined;
  return abs(base, String(url).split('?')[0]);
}

/** Текст из админки в одну строку без разметки [текст](адрес) и пустых строк. */
function plain(text, max = 300) {
  const s = String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= max) return s || undefined;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function isoDate(value) {
  if (!value) return undefined;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** Все публичные адреса Льва и DJ Levka: соцсети из админки и площадки со страницы музыки. */
function sameAs() {
  const social = db
    .prepare("SELECT url FROM social_networks WHERE url IS NOT NULL AND url != ''")
    .all()
    .map((r) => r.url);
  const platforms = db
    .prepare("SELECT url FROM page_links WHERE section = 'music' AND group_name = 'Площадки' AND url != ''")
    .all()
    .map((r) => r.url);
  return [...new Set(social.concat(platforms))].filter((u) => /^https?:\/\//.test(u));
}

/** Короткая ссылка на Льва для чужих карточек: имя и адрес, без соцсетей. */
function personRef(base) {
  return { '@type': 'Person', '@id': base + '/#person', name: PERSON_NAME, alternateName: ARTIST_NAME, url: base + '/' };
}

/** Лев Кейсер — человек и бренд; DJ Levka — его музыкальное имя. */
function person(base, settings) {
  return {
    '@type': 'Person',
    '@id': base + '/#person',
    name: PERSON_NAME,
    alternateName: ARTIST_NAME,
    url: base + '/',
    image: image(base, settings.og_image),
    description: plain(settings.site_tagline, 200),
    jobTitle: 'музыкант, диджей, модель',
    address: { '@type': 'PostalAddress', addressLocality: 'Екатеринбург', addressCountry: 'RU' },
    sameAs: sameAs(),
  };
}

/** DJ Levka как исполнитель — на страницы музыки; участник — тот же Лев. */
function musicGroup(base, settings) {
  return {
    '@type': 'MusicGroup',
    '@id': base + '/#artist',
    name: ARTIST_NAME,
    url: base + '/music',
    image: image(base, settings.og_image),
    genre: ['Electronic', 'Lo-fi', 'Lounge'],
    member: personRef(base),
    sameAs: sameAs(),
  };
}

function website(base, settings) {
  return {
    '@type': 'WebSite',
    '@id': base + '/#website',
    name: [settings.site_name, settings.site_alt_name].filter(Boolean).join(' — ') || PERSON_NAME,
    url: base + '/',
    inLanguage: ['ru', 'en'],
    publisher: personRef(base),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: base + '/search?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Хлебные крошки: [{ name, url }], последний пункт — сама страница. */
function breadcrumbs(base, items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(base, it.url),
    })),
  };
}

/**
 * Вещь из каталога. Цена 0 у материальной вещи значит «под заказ» — цены нет,
 * предложение не пишем, чтобы поисковик не показал «0 ₽». Бесплатный файл —
 * честная цена 0. Услуга (аудит) остаётся Product: у неё есть цена и заказ.
 */
function product(base, p, extra = {}) {
  const madeToOrder = Number(p.is_digital) !== 1 && Number(p.price) === 0;
  const inStock = Number(p.is_digital) === 1 || Number(p.stock) > 0;
  const out = {
    '@type': 'Product',
    '@id': base + '/catalog/' + p.slug + '#product',
    name: p.name,
    url: base + '/catalog/' + p.slug,
    image: image(base, p.image),
    description: plain(p.description, 500),
    sku: 'LK-' + p.id,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    category: extra.category || undefined,
  };
  if (!madeToOrder) {
    out.offers = {
      '@type': 'Offer',
      url: base + '/catalog/' + p.slug,
      price: Number(p.price),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/' + (inStock ? 'InStock' : 'OutOfStock'),
      itemCondition: 'https://schema.org/NewCondition',
      seller: personRef(base),
    };
  }
  const reviews = (extra.reviews || []).filter((r) => Number(r.rating) > 0);
  if (reviews.length) {
    const sum = reviews.reduce((s, r) => s + Number(r.rating), 0);
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round((sum / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    out.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author_name },
      datePublished: isoDate(r.created_at),
      reviewRating: { '@type': 'Rating', ratingValue: Number(r.rating), bestRating: 5 },
      reviewBody: plain(r.body, 500),
    }));
  }
  return out;
}

function musicAlbum(base, release, tracks = []) {
  const url = base + '/music/' + release.slug;
  return {
    '@type': 'MusicAlbum',
    '@id': url + '#album',
    name: release.title,
    url,
    image: image(base, release.cover_image),
    description: plain(release.description, 300),
    datePublished: release.year ? String(release.year) : undefined,
    albumReleaseType: /single/i.test(release.release_type || '') ? 'https://schema.org/SingleRelease'
      : /ep/i.test(release.release_type || '') ? 'https://schema.org/EPRelease'
      : 'https://schema.org/AlbumRelease',
    byArtist: { '@id': base + '/#artist' },
    numTracks: tracks.length || undefined,
    track: tracks.length ? {
      '@type': 'ItemList',
      numberOfItems: tracks.length,
      itemListElement: tracks.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'MusicRecording',
          name: t.title,
          url: url + '/' + t.slug,
          byArtist: { '@id': base + '/#artist' },
        },
      })),
    } : undefined,
  };
}

function musicRecording(base, track, release) {
  const albumUrl = base + '/music/' + release.slug;
  return {
    '@type': 'MusicRecording',
    '@id': albumUrl + '/' + track.slug + '#recording',
    name: track.title,
    url: albumUrl + '/' + track.slug,
    image: image(base, track.cover_image || release.cover_image),
    description: plain(track.description, 300),
    byArtist: { '@id': base + '/#artist' },
    inAlbum: { '@type': 'MusicAlbum', name: release.title, url: albumUrl, '@id': albumUrl + '#album' },
    datePublished: release.year ? String(release.year) : undefined,
    inLanguage: 'ru',
  };
}

/** Запись дневника или новость: заголовок, дата, обложка, автор. */
function article(base, post, opts) {
  const url = abs(base, opts.url);
  return {
    '@type': opts.type || 'BlogPosting',
    '@id': url + '#article',
    mainEntityOfPage: url,
    headline: String(post.title || '').slice(0, 110),
    url,
    image: image(base, opts.image),
    description: plain(opts.description, 300),
    datePublished: isoDate(post.created_at),
    dateModified: isoDate(post.updated_at || post.created_at),
    author: personRef(base),
    publisher: personRef(base),
    inLanguage: opts.lang || 'ru',
  };
}

function podcastEpisode(base, episode, seriesName) {
  const url = base + '/podcast/' + episode.slug;
  const media = episode.audio_url || episode.video_url;
  return {
    '@type': 'PodcastEpisode',
    '@id': url + '#episode',
    name: episode.title,
    url,
    image: image(base, episode.cover_image),
    description: plain(episode.description, 300),
    datePublished: isoDate(episode.episode_date || episode.created_at),
    partOfSeries: { '@type': 'PodcastSeries', name: seriesName, url: base + '/podcast' },
    associatedMedia: media ? {
      '@type': episode.audio_url ? 'AudioObject' : 'VideoObject',
      contentUrl: abs(base, media),
      name: episode.title,
    } : undefined,
    actor: episode.guest ? { '@type': 'Person', name: episode.guest } : undefined,
    author: personRef(base),
  };
}

/** Один граф на страницу: несколько сущностей в одном <script>. */
function graph(base, items) {
  return {
    '@context': 'https://schema.org',
    '@graph': items.filter(Boolean),
  };
}

/**
 * JSON внутри <script>: «</script» в тексте описания закрыл бы тег и
 * сломал страницу, поэтому угловые скобки экранируем как <.
 */
function serialize(data) {
  // Обратная косая — через код символа: инструменты выкладки схлопывают «\» в тексте.
  const BS = String.fromCharCode(92);
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(data, (k, v) => (v === undefined ? undefined : v))
    .split('<').join(BS + 'u003c')
    .split(LS).join(BS + 'u2028')
    .split(PS).join(BS + 'u2029');
}

module.exports = {
  person, personRef, musicGroup, website, breadcrumbs, product, musicAlbum, musicRecording,
  article, podcastEpisode, graph, serialize, plain,
};
