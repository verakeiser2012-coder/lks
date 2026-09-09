const fs = require('fs');
const path = require('path');
const db = require('../db');

const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');

// Заголовок берём из названия файла: имена файлов совпадают со слагами треков.
// Так плейлист пополняется простым добавлением mp3 в public/audio, без правки кода.
function titleFromFile(name) {
  return name
    .replace(/\.mp3$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

// Файл ↔ трек: сравниваем по «схлопнутому» имени (только буквы и цифры),
// как в utils/trackAudio: файл dream.mp3, слаг d-r-e-a-m.
function squash(name) {
  return String(name).toLowerCase().replace(/\.mp3$/i, '').replace(/[^a-z0-9]/g, '');
}
function trackIndex() {
  const map = {};
  try {
    db.prepare(`SELECT t.slug, t.title, r.slug AS release_slug FROM tracks t
                JOIN releases r ON r.id = t.release_id
                WHERE t.is_published = 1 AND r.is_published = 1`).all()
      .forEach((t) => { map[squash(t.slug)] = { title: t.title, url: `/music/${t.release_slug}/${t.slug}` }; });
  } catch (err) { /* без базы — останутся имена файлов и без ссылок */ }
  return map;
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

  const index = trackIndex();
  cache = files.map((file) => {
    const track = index[squash(file)];
    return {
      src: `/audio/${file}`,
      title: track ? track.title : titleFromFile(file),
      // Страница трека: из бегущей строки по клику открывается она.
      url: track ? track.url : '',
    };
  });
  cacheAt = now;
  return cache;
}

module.exports = { getBgPlaylist };
