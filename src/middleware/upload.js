const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { withShrink, shrinkUploadedImages } = require('./shrinkImage');

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');

// Файлы цифровых товаров лежат ВНЕ public/ — иначе их можно было бы скачать
// по прямой ссылке, не заплатив. Отдаёт их только маршрут /downloads по токену.
const digitalDir = path.join(__dirname, '..', '..', 'storage', 'digital');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const digitalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(digitalDir, { recursive: true });
    cb(null, digitalDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const imageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const videoTypes = ['.mp4', '.webm', '.mov'];

function fileFilter(allowedExts) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Недопустимый тип файла: ${ext}`));
    }
  };
}

// Все картинки после загрузки ужимаются (см. shrinkImage.js): маршруты
// по-прежнему зовут uploadImage.single('cover') и про это не знают.
const uploadImage = withShrink(multer({
  storage,
  fileFilter: fileFilter(imageTypes),
  limits: { fileSize: 8 * 1024 * 1024 },
}));

const uploadGalleryFile = withShrink(multer({
  storage,
  fileFilter: fileFilter([...imageTypes, ...videoTypes]),
  limits: { fileSize: 200 * 1024 * 1024 },
}));

// Что продаём цифрового: DJ-версии и отдельные треки (wav/mp3/flac/aiff),
// стемы и пресеты — архивом (zip).
const digitalTypes = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.zip'];

const uploadDigitalFile = multer({
  storage: digitalStorage,
  fileFilter: fileFilter(digitalTypes),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Форма товара шлёт сразу два файла — фото и файл цифрового товара, —
// и они уезжают в разные папки: фото в public/, файл в закрытую storage/.
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'digitalFile') {
      fs.mkdirSync(digitalDir, { recursive: true });
      return cb(null, digitalDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const uploadProductFilesRaw = multer({
  storage: productStorage,
  fileFilter: (req, file, cb) => {
    const allowed = file.fieldname === 'digitalFile' ? digitalTypes : imageTypes;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error(`Недопустимый тип файла: ${ext}`));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'digitalFile', maxCount: 1 },
]);
// Фото товара тоже ужимаем; файл цифрового товара (zip/wav) sharp не трогает —
// он не картинка по расширению.
const uploadProductFiles = (req, res, next) => uploadProductFilesRaw(req, res, (err) => (err ? next(err) : shrinkUploadedImages(req, res, next)));

module.exports = {
  uploadImage,
  uploadGalleryFile,
  uploadDigitalFile,
  uploadProductFiles,
  digitalDir,
};
