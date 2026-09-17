const crypto = require('crypto');
const db = require('../db');

// Тот же алфавит, что у кодов бюстов: без 0/O и 1/I/L — код диктуют по телефону.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

// Что бывает на метке. Префикс попадает в код, чтобы по карточке было видно,
// к какой вещи он относится, без базы.
const KINDS = {
  vinyl: { label: 'Пластинка', prefix: 'VN' },
  flag: { label: 'Флаг', prefix: 'FL' },
  cover: { label: 'Чехол', prefix: 'CH' },
  other: { label: 'Другое', prefix: 'TG' },
};

function randomChunk(length) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function kindInfo(kind) {
  return KINDS[kind] || KINDS.other;
}

function nextNumber(kind) {
  const row = db.prepare('SELECT MAX(number) AS n FROM nfc_tags WHERE kind = ?').get(kind);
  return (row && row.n ? row.n : 0) + 1;
}

// Код вида VN-003-7K2M: вид вещи, номер экземпляра, случайный хвост.
function makeCode(kind, number) {
  const prefix = kindInfo(kind).prefix;
  const padded = String(number).padStart(3, '0');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `${prefix}-${padded}-${randomChunk(4)}`;
    if (!db.prepare('SELECT 1 FROM nfc_tags WHERE code = ?').get(code)) return code;
  }
  throw new Error('Не удалось подобрать свободный код');
}

/**
 * Завести партию меток одного вида. Номера идут сквозняком внутри вида.
 */
function createBatch({ count, kind, label, productId, targetUrl, bonusFile, bonusLabel, publicNote, note }) {
  const total = Math.max(1, Math.min(500, Number(count) || 1));
  const k = KINDS[kind] ? kind : 'other';
  const insert = db.prepare(`
    INSERT INTO nfc_tags (number, code, kind, label, product_id, target_url, bonus_file, bonus_label, public_note, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const created = [];
  db.exec('BEGIN');
  try {
    let number = nextNumber(k);
    for (let i = 0; i < total; i += 1, number += 1) {
      const code = makeCode(k, number);
      insert.run(
        number,
        code,
        k,
        (label || '').trim(),
        productId ? Number(productId) : null,
        (targetUrl || '').trim(),
        (bonusFile || '').trim(),
        (bonusLabel || '').trim(),
        (publicNote || '').trim(),
        (note || '').trim()
      );
      created.push(code);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return db
    .prepare(`SELECT * FROM nfc_tags WHERE code IN (${created.map(() => '?').join(',')}) ORDER BY number`)
    .all(...created);
}

/**
 * Найти метку и сказать, чем нашли: 'code' | 'nfc'. Номер сам по себе
 * ничего не подтверждает, поэтому по голому номеру здесь не ищем вовсе.
 */
function findByKey(rawKey) {
  const key = String(rawKey || '').trim().toUpperCase();
  if (!key) return null;

  const byCode = db.prepare('SELECT * FROM nfc_tags WHERE UPPER(code) = ?').get(key);
  if (byCode) return { tag: byCode, matchedBy: 'code' };

  const byUid = db.prepare("SELECT * FROM nfc_tags WHERE nfc_uid <> '' AND UPPER(nfc_uid) = ?").get(key);
  if (byUid) return { tag: byUid, matchedBy: 'nfc' };

  if (/^[A-Z0-9]{4}$/.test(key)) {
    const byTail = db.prepare('SELECT * FROM nfc_tags WHERE UPPER(code) LIKE ?').all(`%-${key}`);
    if (byTail.length === 1) return { tag: byTail[0], matchedBy: 'code' };
  }
  return null;
}

function countScan(id) {
  db.prepare("UPDATE nfc_tags SET scans = scans + 1, last_scan_at = datetime('now') WHERE id = ?").run(id);
}

function registerOwner(id, name, email) {
  db.prepare(`
    UPDATE nfc_tags SET owner_name = ?, owner_email = ?, registered_at = datetime('now')
    WHERE id = ? AND registered_at IS NULL
  `).run(name || '', email || '', id);
  return db.prepare('SELECT * FROM nfc_tags WHERE id = ?').get(id);
}

module.exports = { KINDS, kindInfo, createBatch, findByKey, countScan, registerOwner, nextNumber };
