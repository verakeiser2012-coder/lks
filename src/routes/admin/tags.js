const fs = require('fs');
const express = require('express');
const db = require('../../db');
const { KINDS, createBatch, nextNumber } = require('../../utils/tags');
const { digitalDir } = require('../../middleware/upload');

const router = express.Router();

function loadAll() {
  return db
    .prepare(`
      SELECT t.*, p.name AS product_name
      FROM nfc_tags t LEFT JOIN products p ON p.id = t.product_id
      ORDER BY t.kind, t.number DESC
    `)
    .all();
}

// Файлы, которые можно отдать владельцу по метке: всё, что лежит в storage/digital
function bonusFiles() {
  try {
    return fs.readdirSync(digitalDir).filter((f) => !f.startsWith('.')).sort();
  } catch (_) {
    return [];
  }
}

function render(res, extra = {}) {
  res.render('admin/tags', {
    tags: loadAll(),
    kinds: KINDS,
    nextNumbers: Object.fromEntries(Object.keys(KINDS).map((k) => [k, nextNumber(k)])),
    products: db.prepare('SELECT id, name FROM products WHERE is_digital = 0 ORDER BY name').all(),
    files: bonusFiles(),
    created: null,
    error: null,
    saved: false,
    ...extra,
  });
}

router.get('/', (req, res) => render(res));

// Запись меток с телефона: Web NFC (Chrome на Android) пишет ссылку и читает UID
// прямо из браузера, приложение не нужно. На iPhone Web NFC нет — там NFC Tools.
router.get('/write', (req, res) => {
  const busts = db.prepare('SELECT id, number, code, nfc_uid, kind FROM busts ORDER BY number').all();
  const tags = db
    .prepare('SELECT t.id, t.number, t.code, t.nfc_uid, t.kind, t.label, p.name AS product_name FROM nfc_tags t LEFT JOIN products p ON p.id = t.product_id ORDER BY t.kind, t.number')
    .all();
  res.render('admin/nfc-write', { busts, tags, kinds: KINDS });
});

// Сохранить UID, считанный телефоном, для бюста или метки
router.post('/uid', express.json(), (req, res) => {
  const { table, id, uid } = req.body || {};
  const clean = String(uid || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (!clean || !['busts', 'nfc_tags'].includes(table)) return res.status(400).json({ ok: false, error: 'нет UID' });
  const clash = db.prepare(`SELECT code FROM ${table} WHERE UPPER(nfc_uid) = ? AND id <> ?`).get(clean, Number(id));
  if (clash) return res.status(409).json({ ok: false, error: `UID уже привязан к ${clash.code}` });
  const r = db.prepare(`UPDATE ${table} SET nfc_uid = ? WHERE id = ?`).run(clean, Number(id));
  res.json({ ok: r.changes === 1, uid: clean });
});

// Завести партию меток одного вида
router.post('/batch', (req, res) => {
  const { count, kind, label, productId, targetUrl, bonusFile, bonusLabel, publicNote, note } = req.body;
  if (!Number(count)) return render(res, { error: 'Укажите, сколько меток завести.' });
  try {
    const created = createBatch({ count, kind, label, productId, targetUrl, bonusFile, bonusLabel, publicNote, note });
    render(res, { created });
  } catch (err) {
    render(res, { error: err.message });
  }
});

// Привязать UID и поправить, куда ведёт метка
router.post('/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM nfc_tags WHERE id = ?').get(req.params.id);
  if (!tag) return res.status(404).render('404');
  const { nfcUid, label, productId, targetUrl, bonusFile, bonusLabel, publicNote, note } = req.body;

  const uid = (nfcUid || '').trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  if (uid) {
    const clash = db.prepare('SELECT code FROM nfc_tags WHERE UPPER(nfc_uid) = ? AND id <> ?').get(uid, tag.id);
    if (clash) return render(res, { error: `Эта метка уже привязана к ${clash.code}.` });
  }

  db.prepare(`
    UPDATE nfc_tags SET nfc_uid = ?, label = ?, product_id = ?, target_url = ?, bonus_file = ?,
      bonus_label = ?, public_note = ?, note = ?
    WHERE id = ?
  `).run(
    uid,
    (label || '').trim(),
    productId ? Number(productId) : null,
    (targetUrl || '').trim(),
    (bonusFile || '').trim(),
    (bonusLabel || '').trim(),
    (publicNote || '').trim(),
    (note || '').trim(),
    tag.id
  );
  render(res, { saved: true });
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM nfc_tags WHERE id = ?').run(req.params.id);
  render(res, { saved: true });
});

module.exports = router;
