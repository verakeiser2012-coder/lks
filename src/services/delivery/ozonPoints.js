/**
 * Справочник пунктов выдачи Ozon.
 *
 * API отдаёт список только целиком — 86 тысяч точек страницами по сто, без
 * адресов; адрес и часы приходят отдельным вызовом по сотне id. Искать так на
 * каждом оформлении нельзя, поэтому справочник живёт в своей таблице и
 * обновляется фоном раз в сутки (867 + 867 вызовов, около семи минут).
 * Пока первая синхронизация не прошла, Ozon на оформлении просто не
 * предлагается — СДЭК работает как раньше.
 */
const db = require('../../db');

const SYNC_TTL_MS = 24 * 3600 * 1000;
let syncing = false;

db.exec(`
  CREATE TABLE IF NOT EXISTS ozon_points (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    lat REAL, lon REAL,
    hours TEXT NOT NULL DEFAULT '',
    synced_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ozon_points_city ON ozon_points(city);
`);

/** «Россия, Свердловская Область, Екатеринбург, проспект Космонавтов, 52» → «Екатеринбург». */
function cityFromAddress(full) {
  const parts = String(full || '').split(',').map((s) => s.trim()).filter(Boolean);
  // город — первая часть после страны/региона, но не «область/край/республика» и не улица
  for (let i = 1; i < parts.length; i += 1) {
    const p = parts[i];
    if (/область|край|республик|округ|район$/i.test(p)) continue;
    if (/^(ул|улица|пр|просп|проспект|пер|переулок|ш|шоссе|б-р|бульвар|наб|пл|площад|тракт|д\.|дом)\b/i.test(p)) break;
    return p.replace(/^(г\.?|город|посёлок|пос\.|село|с\.|деревня|д\.)\s*/i, '');
  }
  return parts[1] || '';
}

/** Часы на сегодня одной строкой: «09:00–21:00». */
function hoursFromSchedule(schedule) {
  const day = (schedule || [])[0];
  if (!day || !day.periods || !day.periods.length) return '';
  return day.periods.map((p) => `${String(p.from_local).slice(0, 5)}–${String(p.to_local).slice(0, 5)}`).join(', ');
}

/**
 * Полная синхронизация. fetchList(cursor) → {delivery_points, next_cursor},
 * fetchInfo(ids) → {delivery_points}. Пишем во временное имя и меняем местами,
 * чтобы поиск во время синхронизации не видел полупустую таблицу.
 */
async function syncPoints({ fetchList, fetchInfo, log = () => {} }) {
  if (syncing) return { status: 'busy' };
  syncing = true;
  const startedAt = new Date().toISOString();
  try {
    db.exec('DROP TABLE IF EXISTS ozon_points_new; CREATE TABLE ozon_points_new AS SELECT * FROM ozon_points WHERE 0;');
    const ins = db.prepare(`INSERT OR REPLACE INTO ozon_points_new (id, name, number, type, address, city, lat, lon, hours, synced_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    let cursor;
    let total = 0;
    for (let page = 0; page < 2000; page += 1) {
      const list = await fetchList(cursor);
      const ids = (list.delivery_points || []).map((p) => p.delivery_point_id);
      if (!ids.length) break;
      const info = await fetchInfo(ids);
      db.exec('BEGIN');
      try {
        for (const p of info.delivery_points || []) {
          const c = p.coordinates || {};
          ins.run(p.delivery_point_id, p.name || '', p.delivery_point_number || '', p.type || '',
            p.full_address || '', cityFromAddress(p.full_address), c.latitude || null, c.longitude || null,
            hoursFromSchedule(p.schedule), startedAt);
          total += 1;
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      if (page % 100 === 0) log(`ПВЗ Ozon: ${total}…`);
      cursor = list.next_cursor;
      if (!cursor) break;
    }
    if (total < 1000) throw new Error(`получено всего ${total} точек — похоже на обрыв, старый справочник оставлен`);
    db.exec('BEGIN');
    db.exec('DROP TABLE ozon_points; ALTER TABLE ozon_points_new RENAME TO ozon_points; CREATE INDEX IF NOT EXISTS idx_ozon_points_city ON ozon_points(city);');
    db.exec('COMMIT');
    log(`ПВЗ Ozon: синхронизировано ${total}`);
    return { status: 'ok', total };
  } finally {
    syncing = false;
    db.exec('DROP TABLE IF EXISTS ozon_points_new');
  }
}

function isFresh() {
  const r = db.prepare('SELECT MAX(synced_at) AS t, COUNT(*) AS n FROM ozon_points').get();
  return r && r.n > 0 && Date.now() - Date.parse(r.t) < SYNC_TTL_MS;
}
function hasPoints() {
  return db.prepare('SELECT 1 FROM ozon_points LIMIT 1').get() != null;
}

/** Пункты по названию города — форма оформления. Индекс Ozon не знает, только город. */
function searchPoints({ city, limit = 300 }) {
  const c = String(city || '').trim();
  if (!c) return [];
  return db.prepare(`SELECT * FROM ozon_points WHERE city = ? COLLATE NOCASE OR city LIKE ? COLLATE NOCASE
                     ORDER BY CASE type WHEN 'pvz' THEN 0 ELSE 1 END, address LIMIT ?`)
    .all(c, `${c}%`, limit);
}
function pointById(id) {
  return db.prepare('SELECT * FROM ozon_points WHERE id = ?').get(Number(id));
}

module.exports = { syncPoints, searchPoints, pointById, isFresh, hasPoints, cityFromAddress };
