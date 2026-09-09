const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');

/**
 * Файл трека для встроенного плеера.
 *
 * Имена файлов в public/audio и слаги треков совпадают не буква в букву:
 * трек «d r e a m» лежит слагом `d-r-e-a-m`, а файлом `dream.mp3`.
 * Поэтому сравниваем по «схлопнутому» виду: только буквы и цифры.
 *
 * Кэш на минуту: каталог читается на каждой странице трека и релиза,
 * а меняется он раз в несколько недель, когда добавляют новый mp3.
 */
let cache = null;
let cacheAt = 0;
const TTL_MS = 60 * 1000;

function squash(name) {
  return String(name).toLowerCase().replace(/\.mp3$/i, '').replace(/[^a-z0-9]/g, '');
}

function audioMap() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;
  const map = {};
  try {
    for (const file of fs.readdirSync(audioDir)) {
      if (!/\.mp3$/i.test(file)) continue;
      map[squash(file)] = `/audio/${file}`;
    }
  } catch (err) {
    // Каталога нет — значит слушать нечего, плеер просто не покажем.
  }
  cache = map;
  cacheAt = now;
  return cache;
}

/** Путь к mp3 трека или пустая строка, если файла нет. */
function trackAudio(slug) {
  if (!slug) return '';
  return audioMap()[squash(slug)] || '';
}

/** Проставить поле audio каждому треку списка. */
function withAudio(tracks) {
  return (tracks || []).map((t) => ({ ...t, audio: trackAudio(t.slug) }));
}

module.exports = { trackAudio, withAudio };
