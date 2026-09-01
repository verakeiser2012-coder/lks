const crypto = require('crypto');
const db = require('../db');
const { phraseForNumber } = require('./bustPhrases');

// В коде нет символов, которые путают при переписывании с карточки:
// ноль и буква O, единица и I с L. Человек диктует код по телефону — это важно.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomChunk(length) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function seriesPrefix(series) {
  const clean = String(series || '').replace(/[^a-zA-Zа-яА-Я]/g, '');
  return (clean.slice(0, 2) || 'SS').toUpperCase();
}

/**
 * Код для карточки: SS-007-4K2M.
 * Номер внутри кода — чтобы по карточке было видно экземпляр без базы,
 * случайный хвост — чтобы код нельзя было угадать, зная номер.
 */
function makeCode(series, number) {
  const prefix = seriesPrefix(series);
  const padded = String(number).padStart(3, '0');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `${prefix}-${padded}-${randomChunk(4)}`;
    const exists = db.prepare('SELECT 1 FROM busts WHERE code = ?').get(code);
    if (!exists) return code;
  }
  throw new Error('Не удалось подобрать свободный код');
}

function nextNumber() {
  const row = db.prepare('SELECT MAX(number) AS n FROM busts').get();
  return (row && row.n ? row.n : 0) + 1;
}

/**
 * Отлить партию: создаёт count записей подряд.
 */
function createBatch({ count, series, kind, material, castDate, note }) {
  const total = Math.max(1, Math.min(500, Number(count) || 1));
  const insert = db.prepare(`
    INSERT INTO busts (number, code, series, kind, material, phrase, cast_date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // node:sqlite не даёт обёртки transaction — открываем явно,
  // чтобы при сбое на середине партии не осталось половины номеров
  const created = [];
  db.exec('BEGIN');
  try {
    let number = nextNumber();
    for (let i = 0; i < total; i += 1, number += 1) {
      const code = makeCode(series, number);
      insert.run(
        number,
        code,
        series || 'soundstates',
        kind || '',
        material || '',
        phraseForNumber(number),
        castDate || '',
        note || ''
      );
      created.push(number);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return db
    .prepare(`SELECT * FROM busts WHERE number IN (${created.map(() => '?').join(',')}) ORDER BY number`)
    .all(...created);
}

/**
 * Найти экземпляр и сказать, ЧЕМ его нашли. Это принципиально.
 *
 * Номера идут по порядку, поэтому голый номер угадывает кто угодно — по нему
 * нельзя ни подтверждать подлинность, ни разрешать закрепление, иначе сайт
 * будет заверять подделку с номером на дне и позволит закрепить чужую вещь.
 * Подтверждает подлинность только то, что нельзя угадать: код с карточки
 * (случайный хвост) или UID метки.
 *
 * Возвращает { bust, matchedBy: 'code' | 'nfc' | 'number' }.
 */
function findByKey(rawKey) {
  const key = String(rawKey || '').trim();
  if (!key) return null;

  const upper = key.toUpperCase();

  const byCode = db.prepare('SELECT * FROM busts WHERE UPPER(code) = ?').get(upper);
  if (byCode) return { bust: byCode, matchedBy: 'code' };

  const byUid = db.prepare("SELECT * FROM busts WHERE nfc_uid <> '' AND UPPER(nfc_uid) = ?").get(upper);
  if (byUid) return { bust: byUid, matchedBy: 'nfc' };

  // Хвост кода — то, что люди чаще всего и переписывают с карточки
  if (/^[A-Z0-9]{4}$/.test(upper)) {
    const byTail = db.prepare('SELECT * FROM busts WHERE UPPER(code) LIKE ?').all(`%-${upper}`);
    if (byTail.length === 1) return { bust: byTail[0], matchedBy: 'code' };
  }

  if (/^\d{1,6}$/.test(key)) {
    const byNumber = db.prepare('SELECT * FROM busts WHERE number = ?').get(Number(key));
    if (byNumber) return { bust: byNumber, matchedBy: 'number' };
  }

  return null;
}

function registerOwner(bustId, name, email) {
  db.prepare(`
    UPDATE busts SET owner_name = ?, owner_email = ?, registered_at = datetime('now')
    WHERE id = ? AND registered_at IS NULL
  `).run(name || '', email || '', bustId);
  return db.prepare('SELECT * FROM busts WHERE id = ?').get(bustId);
}

module.exports = { createBatch, findByKey, registerOwner, makeCode, nextNumber };
