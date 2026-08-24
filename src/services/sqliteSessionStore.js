const session = require('express-session');
const db = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

class SqliteSessionStore extends session.Store {
  get(id, callback) {
    try {
      const row = db.prepare('SELECT data, expires_at FROM sessions WHERE id = ?').get(id);
      if (!row) return callback(null, null);
      if (row.expires_at < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  set(id, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : 1000 * 60 * 60 * 24;
      const expiresAt = Date.now() + maxAge;
      db.prepare(`
        INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
      `).run(id, JSON.stringify(sessionData), expiresAt);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  destroy(id, callback) {
    try {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  touch(id, sessionData, callback) {
    this.set(id, sessionData, callback);
  }
}

module.exports = SqliteSessionStore;
