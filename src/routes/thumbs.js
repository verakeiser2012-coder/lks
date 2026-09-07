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

async function ensureThumb(file, width) {
  const src = path.join(uploadsDir, file);
  const outDir = path.join(cacheDir, String(width));
  const out = path.join(outDir, file);
  if (fs.existsSync(out)) return out;
  if (!fs.existsSync(src)) return null;

  const key = `${width}/${file}`;
  if (inFlight.has(key)) return inFlight.get(key);

  const job = (async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const tmp = `${out}.${process.pid}.tmp`;
    const ext = path.extname(file).toLowerCase();
    let pipeline = sharp(src, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true });
    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
    else if (ext === '.webp') pipeline = pipeline.webp({ quality: 80 });
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

  ensureThumb(file, width)
    .then((out) => {
      if (!out) return next();
      // Кэш на год: имя файла случайное, при замене картинки меняется и адрес.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(out);
    })
    .catch((err) => {
      console.warn('[картинки] не удалось уменьшить ' + file + ': ' + err.message);
      next();
    });
});

module.exports = router;
