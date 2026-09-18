/**
 * Кабинет без пароля (18.09.2026).
 *
 * Пароля, регистрации и профиля нет нарочно: магазин небольшой, а база паролей —
 * это утечки и восстановления. Вместо этого — ссылка из письма: человек вводит
 * почту, получает ссылку /my/<токен>, она ставит cookie на 30 дней, и дальше
 * «Мой кабинет» открывается без письма. Кабинет есть у любой почты, не только у
 * покупателей: там же рецепты с карты ароматов и рассылка.
 *
 * Токен — 32 hex-символа, перебор бессмысленен; живёт 30 дней с выдачи, по
 * истечении письмо запрашивается заново. Cookie httpOnly, чужой скрипт её не
 * прочитает; Secure ставится под https.
 */
const crypto = require('crypto');
const db = require('../db');

const COOKIE = 'lk_my';
const TTL_DAYS = 30;

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function findLink(token) {
  if (!/^[a-f0-9]{32}$/.test(String(token || ''))) return null;
  const row = db.prepare('SELECT * FROM account_links WHERE token = ?').get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

/** Новая ссылка для почты; старые ссылки той же почты остаются рабочими до своего срока. */
function issueLink(email) {
  const token = crypto.randomBytes(16).toString('hex');
  const expires = new Date(Date.now() + TTL_DAYS * 24 * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO account_links (email, token, expires_at) VALUES (?, ?, ?)').run(email.toLowerCase(), token, expires);
  // Просроченные — подчищаем заодно, чтобы таблица не росла.
  db.prepare("DELETE FROM account_links WHERE expires_at < datetime('now', '-7 day')").run();
  return token;
}

/** Middleware: по cookie определяет почту кабинета — res.locals.account = { email } либо null. */
function middleware(req, res, next) {
  res.locals.account = null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    const link = findLink(token);
    if (link) {
      res.locals.account = { email: link.email, token };
      // last_seen обновляем не чаще раза в час — иначе запись на каждый запрос.
      if (!link.last_seen_at || Date.now() - new Date(link.last_seen_at).getTime() > 3600 * 1000) {
        db.prepare("UPDATE account_links SET last_seen_at = datetime('now') WHERE id = ?").run(link.id);
      }
    } else {
      clearCookie(res);
    }
  }
  next();
}

function setCookie(req, res, token) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${TTL_DAYS * 24 * 3600}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

module.exports = { COOKIE, TTL_DAYS, findLink, issueLink, middleware, setCookie, clearCookie };
