const fs = require('fs');
const path = require('path');

// Ужимает загруженную картинку прямо на диске, после multer.
//
// Зачем: с телефона и из фотошопа прилетают файлы 2668×4000 по 4–9 МБ, а на
// странице они показываются в 300–800 px. Раньше такие уходили на сайт как есть
// и грузились по несколько секунд. Теперь длинная сторона ограничена, JPEG
// пережимается, EXIF-поворот применяется (иначе фото с телефона ложится набок).
//
// Что НЕ трогаем: gif (анимация), видео и всё, что не картинка. Если sharp по
// какой-то причине не справился, файл остаётся исходным — загрузка не падает.

const MAX_SIDE = 2000;
const JPEG_QUALITY = 82;

// Файлы меньше этого порога не пережимаем: выигрыш копеечный, а лишний проход
// по каждой иконке ни к чему.
const MIN_BYTES = 150 * 1024;

let sharp = null;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn('[картинки] sharp не установлен, загрузки идут без сжатия: ' + err.message);
}

async function shrinkFile(file) {
  if (!sharp || !file || !file.path) return;
  const ext = path.extname(file.filename || file.path).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;
  if (file.size && file.size < MIN_BYTES) return;

  const tmp = file.path + '.tmp';
  const image = sharp(file.path, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const needsResize = (meta.width || 0) > MAX_SIDE || (meta.height || 0) > MAX_SIDE;
  let pipeline = needsResize
    ? image.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    : image;

  if (ext === '.png') {
    // PNG оставляем PNG: у обложек и логотипов бывает прозрачность.
    pipeline = pipeline.png({ compressionLevel: 9, palette: false });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: JPEG_QUALITY });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true });
  }

  await pipeline.toFile(tmp);
  const before = fs.statSync(file.path).size;
  const after = fs.statSync(tmp).size;
  // Если стало не меньше — оставляем оригинал, он и так хорош.
  if (after < before) {
    fs.renameSync(tmp, file.path);
    file.size = after;
  } else {
    fs.unlinkSync(tmp);
  }
}

// Middleware: обходит req.file и req.files (single / array / fields).
function shrinkUploadedImages(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const list of Object.values(req.files)) files.push(...list);
  }
  Promise.all(files.map((f) => shrinkFile(f).catch((err) => {
    console.warn('[картинки] не удалось ужать ' + f.filename + ': ' + err.message);
  }))).then(() => next(), next);
}

// Оборачивает экземпляр multer так, чтобы после .single/.array/.fields
// автоматически шло сжатие. Маршруты вызывают uploadImage.single('cover')
// как раньше и ничего не знают про sharp.
function withShrink(upload) {
  const chain = (mw) => (req, res, next) => mw(req, res, (err) => (err ? next(err) : shrinkUploadedImages(req, res, next)));
  return {
    single: (name) => chain(upload.single(name)),
    array: (name, max) => chain(upload.array(name, max)),
    fields: (spec) => chain(upload.fields(spec)),
  };
}

module.exports = { shrinkFile, shrinkUploadedImages, withShrink, MAX_SIDE, JPEG_QUALITY };
