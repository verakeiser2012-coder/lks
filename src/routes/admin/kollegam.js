// «Коллегам за копеечку» в админке (18.09.2026). Раньше клиентов бота было видно только
// в консоли (`node bot/admin.js clients`) и командами в самом боте — на сайте раздела не было.
// Здесь: клиенты с анкетой, этапом и файлами по трекам; смена этапа и сообщение клиенту
// идут через тот же bot/admin.js (он читает bot/.env с токенами Telegram и MAX), чтобы
// отправку не дублировать. Файлы клиентов лежат в DATA_DIR бота вне public — отдаём
// их только вошедшему админу.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const db = require('../../db');

const router = express.Router();
const ROOT = path.join(__dirname, '..', '..', '..');
const ADMIN_SCRIPT = path.join(ROOT, 'bot', 'admin.js');

// Как в bot/admin.js: DATA_DIR из bot/.env, иначе data-kollegam рядом с проектом.
function dataDir() {
  if (process.env.KOLLEGAM_DATA_DIR) return process.env.KOLLEGAM_DATA_DIR;
  const envFile = path.join(ROOT, 'bot', '.env');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^\s*DATA_DIR\s*=\s*(.+?)\s*$/m);
    if (m) return m[1];
  }
  return path.join(ROOT, 'data-kollegam');
}

const SHORT = { fullname: 'ФИО', alias: 'Псевдоним', links: 'Релизы', distributor: 'Дистрибьютор', done: 'Уже оформлено', coauthors: 'Соавторы', daw: 'Программа и проекты' };
const ID_RE = /^(max_)?\d+$/;
const SAFE_NAME = (s) => typeof s === 'string' && s.length > 0 && s === path.basename(s) && !s.startsWith('.');

function readClient(id) {
  const dir = path.join(dataDir(), 'clients', id);
  const file = path.join(dir, 'profile.json');
  if (!fs.existsSync(file)) return null;
  let c;
  try { c = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
  const filesRoot = path.join(dir, 'files');
  const tracks = fs.existsSync(filesRoot)
    ? fs.readdirSync(filesRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => ({
      track: d.name,
      files: fs.readdirSync(path.join(filesRoot, d.name)).map((name) => {
        let size = 0;
        try { size = fs.statSync(path.join(filesRoot, d.name, name)).size; } catch (e) { size = 0; }
        return { name, size };
      }),
    }))
    : [];
  const logFile = path.join(dir, 'log.jsonl');
  const log = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).slice(-8).reverse().map((l) => { try { return JSON.parse(l); } catch (e) { return { t: '', type: 'raw', text: l }; } })
    : [];
  const answers = Object.entries(c.answers || {}).map(([k, v]) => ({ key: k, label: SHORT[k] || k, value: String(v || '') }));
  return {
    key: id,
    name: [c.firstName, c.lastName].filter(Boolean).join(' ') || '(без имени)',
    username: c.username || '',
    network: c.network === 'max' ? 'MAX' : 'Telegram',
    created: String(c.created || '').slice(0, 10),
    stage: c.stage || '',
    formDone: c.step === null || c.step === undefined,
    formStep: typeof c.step === 'number' ? c.step + 1 : null,
    answers,
    trackList: Array.isArray(c.tracks) ? c.tracks : [],
    tracks,
    filesCount: tracks.reduce((s, t) => s + t.files.length, 0),
    log,
  };
}

function listClients() {
  const root = path.join(dataDir(), 'clients');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((d) => ID_RE.test(d)).map(readClient).filter(Boolean)
    .sort((a, b) => (b.created > a.created ? 1 : b.created < a.created ? -1 : 0));
}

// Команда консоли бота: stage/msg/tracks — там же уведомление клиенту в его мессенджер.
function runAdmin(args) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [ADMIN_SCRIPT, ...args], { cwd: ROOT, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(String(stderr || stdout || err.message).trim()));
      resolve(String(stdout).trim());
    });
  });
}

router.get('/', (req, res) => {
  const notice = req.session.kollegamNotice || '';
  const error = req.session.kollegamError || '';
  delete req.session.kollegamNotice;
  delete req.session.kollegamError;
  const servicesPublic = (db.prepare("SELECT value FROM settings WHERE key = 'services_public'").get() || {}).value === '1';
  const servicesEnPublic = (db.prepare("SELECT value FROM settings WHERE key = 'services_en_public'").get() || {}).value === '1';
  // Заказы аудита — обычные заказы магазина с товаром-услугой.
  let auditOrders = 0;
  try {
    auditOrders = db.prepare(`
      SELECT COUNT(DISTINCT o.id) AS c FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.is_service = 1
    `).get().c;
  } catch (e) { auditOrders = 0; }
  res.render('admin/kollegam', {
    clients: listClients(),
    dataDir: dataDir(),
    botConfigured: fs.existsSync(path.join(ROOT, 'bot', '.env')),
    servicesPublic,
    servicesEnPublic,
    auditOrders,
    notice,
    error,
  });
});

router.post('/:id/stage', async (req, res) => {
  const id = String(req.params.id);
  const text = String(req.body.stage || '').trim();
  if (!ID_RE.test(id) || !readClient(id)) { req.session.kollegamError = 'Клиент не найден.'; return res.redirect('/admin/kollegam'); }
  if (!text) { req.session.kollegamError = 'Напишите, какой теперь этап.'; return res.redirect('/admin/kollegam'); }
  try {
    await runAdmin(['stage', id, text]);
    req.session.kollegamNotice = 'Этап обновлён, клиент получил уведомление.';
  } catch (e) {
    req.session.kollegamError = 'Не удалось сменить этап: ' + e.message;
  }
  res.redirect('/admin/kollegam#client-' + id);
});

router.post('/:id/msg', async (req, res) => {
  const id = String(req.params.id);
  const text = String(req.body.text || '').trim();
  if (!ID_RE.test(id) || !readClient(id)) { req.session.kollegamError = 'Клиент не найден.'; return res.redirect('/admin/kollegam'); }
  if (!text) { req.session.kollegamError = 'Пустое сообщение не отправляем.'; return res.redirect('/admin/kollegam'); }
  try {
    await runAdmin(['msg', id, text]);
    req.session.kollegamNotice = 'Сообщение отправлено от имени бота.';
  } catch (e) {
    req.session.kollegamError = 'Не удалось отправить: ' + e.message;
  }
  res.redirect('/admin/kollegam#client-' + id);
});

// Список треков для кнопок бота — по одному названию на строку.
router.post('/:id/tracks', async (req, res) => {
  const id = String(req.params.id);
  const names = String(req.body.tracks || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!ID_RE.test(id) || !readClient(id)) { req.session.kollegamError = 'Клиент не найден.'; return res.redirect('/admin/kollegam'); }
  if (!names.length) { req.session.kollegamError = 'Список треков пуст.'; return res.redirect('/admin/kollegam'); }
  const tmp = path.join(require('os').tmpdir(), `kollegam-tracks-${id}-${Date.now()}.txt`);
  try {
    fs.writeFileSync(tmp, names.join('\n'));
    await runAdmin(['tracks', id, tmp]);
    req.session.kollegamNotice = `Список треков задан (${names.length}), клиент уведомлён.`;
  } catch (e) {
    req.session.kollegamError = 'Не удалось задать треки: ' + e.message;
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) { /* уже нет */ }
  }
  res.redirect('/admin/kollegam#client-' + id);
});

router.get('/:id/files/:track/:file', (req, res) => {
  const { id, track, file } = req.params;
  if (!ID_RE.test(id) || !SAFE_NAME(track) || !SAFE_NAME(file)) return res.status(404).render('404');
  const full = path.join(dataDir(), 'clients', id, 'files', track, file);
  if (!fs.existsSync(full)) return res.status(404).render('404');
  res.download(full, file);
});

module.exports = router;
