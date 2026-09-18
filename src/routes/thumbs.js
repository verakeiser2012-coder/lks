const fs = require('fs');
const path = require('path');
const express = require('express');
const { WIDTHS, isResizable } = require('../utils/images');

// /uploads/<файл>?w=<ширина> — уменьшенная версия картинки.
//
// Режет один раз и складывает в storage/thumbs/<ширина>/<файл>; дальше отдаёт
// готовый файл. Без ?w= (или для видео, gif, чужих ширин) пропускает запрос
// дальше — его обслужит express.static как раньше. Если sharp не установлен,
// тоже пропускает: страница получит полную картинку, а не ошибку.
//
// Кэш лежит вне public/, чтобы его нельзя было перебирать напрямую, и не
// попадает в git и бэкапы: он восстанавливается сам.

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
const cacheDir = path.join(__dirname, '..', '..', 'storage', 'thumbs');

let sharp = null;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn('[картинки] sharp не установлен, уменьшенные версии не отдаются: ' + err.message);
}

const router = express.Router();

// Одновременные запросы одной и той же картинки ждут одну нарезку, а не
// запускают её параллельно.
const inFlight = new Map();

// WebP (18.09): браузер, который его понимает, присылает image/webp в Accept —
// ему та же миниатюра уходит в WebP, это на треть легче JPEG при том же
// качестве. Лежит рядом, в подпапке webp/, отдельным файлом; старым браузерам
// по-прежнему JPEG/PNG. В ответе Vary: Accept, чтобы кэши не перепутали.
async function ensureThumb(file, width, webp) {
  const src = path.join(uploadsDir, file);
  const outDir = webp ? path.join(cacheDir, String(width), 'webp') : path.join(cacheDir, String(width));
  const out = webp ? path.join(outDir, file + '.webp') : path.join(outDir, file);
  if (fs.existsSync(out)) return out;
  if (!fs.existsSync(src)) return null;

  const key = `${width}/${webp ? 'webp/' : ''}${file}`;
  if (inFlight.has(key)) return inFlight.get(key);

  const job = (async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const tmp = `${out}.${process.pid}.tmp`;
    const ext = path.extname(file).toLowerCase();
    let pipeline = sharp(src, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true });
    if (webp || ext === '.webp') pipeline = pipeline.webp({ quality: 80 });
    else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
    else pipeline = pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true });
    await pipeline.toFile(tmp);
    fs.renameSync(tmp, out);
    return out;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}

router.get('/:file', (req, res, next) => {
  const width = Number(req.query.w);
  if (!sharp || !width || !WIDTHS.includes(width)) return next();

  const file = path.basename(req.params.file);
  if (!/^[\w.-]+$/.test(file) || !isResizable('/uploads/' + file)) return next();

  const webp = /image\/webp/i.test(String(req.headers.accept || ''));
  ensureThumb(file, width, webp)
    .then((out) => {
      if (!out) return next();
      // Кэш на год: имя файла случайное, при замене картинки меняется и адрес.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Vary', 'Accept');
      if (webp) res.type('image/webp');
      res.sendFile(out);
    })
    .catch((err) => {
      console.warn('[картинки] не удалось уменьшить ' + file + ': ' + err.message);
      next();
    });
});

module.exports = router;
