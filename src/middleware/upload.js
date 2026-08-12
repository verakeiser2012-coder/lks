const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
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

const uploadImage = multer({
  storage,
  fileFilter: fileFilter(imageTypes),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const uploadGalleryFile = multer({
  storage,
  fileFilter: fileFilter([...imageTypes, ...videoTypes]),
  limits: { fileSize: 200 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadGalleryFile };
