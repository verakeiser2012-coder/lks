const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('../db');
const { digitalDir } = require('../middleware/upload');

const router = express.Router();

function loadDownload(token) {
  return db.prepare('SELECT * FROM downloads WHERE token = ?').get(token);
}

/**
 * Почему ссылка может не сработать. Разделяем причины, чтобы человек понимал,
 * писать ли нам или просто он исчерпал попытки.
 */
function checkAccess(download) {
  if (!download) return 'not_found';
  const expired = new Date(download.expires_at.replace(' ', 'T')) < new Date();
  if (expired) return 'expired';
  if (download.downloads_count >= download.max_downloads) return 'limit';
  return null;
}

router.get('/:token', (req, res) => {
  const download = loadDownload(req.params.token);
  if (!download) {
    return res.status(404).render('404');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(download.order_id);
  const siblings = db
    .prepare('SELECT * FROM downloads WHERE order_id = ? ORDER BY id')
    .all(download.order_id);

  res.render('downloads', {
    title: 'Скачивание',
    download,
    siblings,
    order,
    problem: checkAccess(download),
  });
});

router.get('/:token/file', (req, res) => {
  const download = loadDownload(req.params.token);
  const problem = checkAccess(download);
  if (problem === 'not_found') {
    return res.status(404).render('404');
  }
  if (problem) {
    return res.redirect(`/downloads/${req.params.token}`);
  }

  // basename отсекает попытку подсунуть путь наружу через имя файла в базе
  const filePath = path.join(digitalDir, path.basename(download.file_path));
  if (!fs.existsSync(filePath)) {
    console.error('[downloads] Файл не найден на диске:', filePath);
    return res.status(404).render('404');
  }

  db.prepare(
    "UPDATE downloads SET downloads_count = downloads_count + 1, last_download_at = datetime('now') WHERE id = ?"
  ).run(download.id);

  res.download(filePath, download.file_name);
});

module.exports = router;
