const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');

// Заголовок берём из названия файла: имена файлов совпадают со слагами треков.
// Так плейлист пополняется простым добавлением mp3 в public/audio, без правки кода.
function titleFromFile(name) {
  return name
    .replace(/\.mp3$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

let cache = null;
let cacheAt = 0;
const TTL_MS = 60 * 1000;

/**
 * Что реально можно проиграть: файлы, лежащие в public/audio.
 * В таблице треков записей больше, но у большинства нет аудио —
 * ставить их в плеер значит показывать кнопку, которая молчит.
 */
function getBgPlaylist() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;

  let files = [];
  try {
    files = fs
      .readdirSync(audioDir)
      .filter((f) => /\.mp3$/i.test(f))
      .sort();
  } catch (err) {
    files = [];
  }

  cache = files.map((file) => ({
    src: `/audio/${file}`,
    title: titleFromFile(file),
  }));
  cacheAt = now;
  return cache;
}

module.exports = { getBgPlaylist };
