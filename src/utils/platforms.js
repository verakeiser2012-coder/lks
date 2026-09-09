/**
 * Прямые кнопки на площадки без прокладки вроде band.link.
 *
 * band.link открывает свою промежуточную страницу и в РФ тянет лишний
 * редирект; своя кнопка ведёт сразу на страницу релиза там, где человек
 * слушает. Ссылки хранятся у релиза в JSON `platform_links`:
 *   {"yandex":"https://music.yandex.ru/album/…","spotify":"…"}
 *
 * Порядок зависит от языка страницы: в русской версии первыми идут те,
 * что работают в России (Яндекс, VK, Звук), в английской — Spotify и Apple.
 */
const PLATFORMS = {
  yandex: { ru: 'Яндекс Музыка', en: 'Yandex Music' },
  vk: { ru: 'VK Музыка', en: 'VK Music' },
  zvuk: { ru: 'Звук', en: 'Zvuk' },
  mts: { ru: 'МТС Музыка', en: 'MTS Music' },
  apple: { ru: 'Apple Music', en: 'Apple Music' },
  spotify: { ru: 'Spotify', en: 'Spotify' },
  youtube: { ru: 'YouTube Music', en: 'YouTube Music' },
  deezer: { ru: 'Deezer', en: 'Deezer' },
  soundcloud: { ru: 'SoundCloud', en: 'SoundCloud' },
};

const ORDER = {
  ru: ['yandex', 'vk', 'zvuk', 'mts', 'apple', 'spotify', 'youtube', 'deezer', 'soundcloud'],
  en: ['spotify', 'apple', 'youtube', 'deezer', 'soundcloud', 'yandex', 'vk', 'zvuk', 'mts'],
};

function parseLinks(json) {
  try {
    const obj = JSON.parse(json || '{}');
    return obj && typeof obj === 'object' ? obj : {};
  } catch (err) {
    return {};
  }
}

/** Кнопки релиза в порядке, подходящем языку страницы. */
function platformButtons(release, lang = 'ru') {
  const links = parseLinks(release && release.platform_links);
  const order = ORDER[lang] || ORDER.ru;
  return order
    .filter((key) => links[key])
    .map((key) => ({ key, label: PLATFORMS[key][lang] || PLATFORMS[key].ru, url: links[key] }));
}

/** Текст для textarea в админке: по строке на площадку — «yandex https://…». */
function linksToText(json) {
  const links = parseLinks(json);
  return Object.keys(PLATFORMS)
    .filter((key) => links[key])
    .map((key) => `${key} ${links[key]}`)
    .join('\n');
}

/** Обратно из textarea в JSON; незнакомые площадки и строки без ссылки отбрасываются. */
function textToLinks(text) {
  const links = {};
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.trim().match(/^([a-z]+)\s+(https?:\/\/\S+)$/i);
      if (m && PLATFORMS[m[1].toLowerCase()]) links[m[1].toLowerCase()] = m[2];
    });
  return JSON.stringify(links);
}

/**
 * Площадки, из которых берут звук для вертикальных видео. TikTok и Reels сюда
 * попадут, когда трек доедет до их библиотек (CML / Meta Sound Collection):
 * прямой ссылки на звук у нас пока нет, и выдумывать её нельзя.
 */
const SHOOT = ['vk', 'yandex', 'youtube', 'zvuk'];

function shootButtons(release) {
  const links = parseLinks(release && release.platform_links);
  const SHOOT_LABEL = {
    vk: 'Звук в VK Клипах',
    yandex: 'Трек в Яндекс Музыке',
    youtube: 'Трек в YouTube Music',
    zvuk: 'Трек в Звуке',
  };
  return SHOOT.filter((key) => links[key]).map((key) => ({
    key,
    label: SHOOT_LABEL[key] || PLATFORMS[key].ru,
    url: links[key],
  }));
}

module.exports = { PLATFORMS, platformButtons, shootButtons, linksToText, textToLinks, parseLinks };
