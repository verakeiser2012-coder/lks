const ALLOWED_MEDIA_TYPES = ['photo', 'video'];

function isValidMediaUpload(req) {
  return Boolean(req.file) && ALLOWED_MEDIA_TYPES.includes(req.body.type);
}

function mediaFilePath(req) {
  return `/uploads/${req.file.filename}`;
}

module.exports = { ALLOWED_MEDIA_TYPES, isValidMediaUpload, mediaFilePath };
