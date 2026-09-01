const express = require('express');
const db = require('../../db');
const { createBatch, nextNumber } = require('../../utils/busts');

const router = express.Router();

function loadAll() {
  return db.prepare('SELECT * FROM busts ORDER BY number DESC').all();
}

function render(res, extra = {}) {
  res.render('admin/busts', {
    busts: loadAll(),
    nextNumber: nextNumber(),
    created: null,
    error: null,
    saved: false,
    ...extra,
  });
}

router.get('/', (req, res) => render(res));

// Отлили партию — завести номера
router.post('/batch', (req, res) => {
  const { count, series, kind, material, castDate, note } = req.body;
  const n = Number(count);
  if (!n || n < 1) {
    return render(res, { error: 'Укажите, сколько экземпляров завести.' });
  }
  try {
    const created = createBatch({ count: n, series, kind, material, castDate, note });
    render(res, { created });
  } catch (err) {
    render(res, { error: err.message });
  }
});

// Привязать UID метки и поправить данные экземпляра
router.post('/:id', (req, res) => {
  const bust = db.prepare('SELECT * FROM busts WHERE id = ?').get(req.params.id);
  if (!bust) {
    return res.status(404).render('404');
  }
  const { nfcUid, kind, material, castDate, phrase, note } = req.body;

  if (nfcUid && nfcUid.trim()) {
    const clash = db
      .prepare('SELECT number FROM busts WHERE UPPER(nfc_uid) = ? AND id <> ?')
      .get(nfcUid.trim().toUpperCase(), bust.id);
    if (clash) {
      return render(res, { error: `Эта метка уже привязана к экземпляру №${clash.number}.` });
    }
  }

  db.prepare(`
    UPDATE busts SET nfc_uid = ?, kind = ?, material = ?, cast_date = ?, phrase = ?, note = ?
    WHERE id = ?
  `).run(
    (nfcUid || '').trim(),
    kind || '',
    material || '',
    castDate || '',
    phrase || '',
    note || '',
    bust.id
  );
  render(res, { saved: true });
});

module.exports = router;
