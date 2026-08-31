const db = require('../../db');

// Общая работа с токеном Instagram Login (graph.instagram.com) — используется
// и коннектором при публикации, и суточным фоновым продлением в планировщике.
const GRAPH = 'https://graph.instagram.com';
const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // токен живёт 60 дней, продлеваем раз в неделю
const RETRY_AFTER_FAILURE = 24 * 60 * 60 * 1000;

// Отметки времени раньше писались то числом (Date.now()), то ISO-строкой — читаем оба формата.
function parseTimestamp(value) {
  if (!value) return 0;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function saveCredentials(networkKey, credentials) {
  if (!networkKey) return;
  db.prepare('UPDATE social_networks SET credentials = ? WHERE key = ?').run(
    JSON.stringify(credentials),
    networkKey
  );
}

function applyToken(credentials, data) {
  credentials.accessToken = data.access_token;
  credentials.tokenRefreshedAt = new Date().toISOString();
  credentials.tokenRefreshFailedAt = '';
  credentials.tokenExpiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
    : '';
}

// Токен, который отдаёт Instagram Login после авторизации, живёт час.
// Меняем его на 60-дневный — для этого нужен секрет приложения из Meta-консоли.
async function exchangeForLongLivedToken(credentials, networkKey) {
  if (!credentials.accessToken) throw new Error('Не указан токен Instagram.');
  if (!credentials.appSecret) {
    throw new Error('Для обмена токена нужен секрет приложения (Meta App Secret).');
  }

  const res = await fetch(
    GRAPH +
      '/access_token?grant_type=ig_exchange_token&client_secret=' +
      encodeURIComponent(credentials.appSecret) +
      '&access_token=' +
      encodeURIComponent(credentials.accessToken)
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error((data.error && data.error.message) || 'Instagram не обменял токен на долгоживущий.');
  }

  applyToken(credentials, data);
  saveCredentials(networkKey, credentials);
  return credentials.accessToken;
}

// Продление возможно только для токена старше суток; неудачную попытку не повторяем целый день.
async function ensureFreshToken(credentials, networkKey, options = {}) {
  if (!credentials.accessToken) throw new Error('Не указан токен Instagram.');

  const refreshedAt = parseTimestamp(credentials.tokenRefreshedAt);
  const failedAt = parseTimestamp(credentials.tokenRefreshFailedAt);
  const now = Date.now();

  if (!options.force) {
    if (refreshedAt && now - refreshedAt < REFRESH_INTERVAL) return credentials.accessToken;
    if (failedAt && now - failedAt < RETRY_AFTER_FAILURE) return credentials.accessToken;
  }

  try {
    const res = await fetch(
      GRAPH + '/refresh_access_token?grant_type=ig_refresh_token&access_token=' +
        encodeURIComponent(credentials.accessToken)
    );
    const data = await res.json();
    if (data.access_token) {
      applyToken(credentials, data);
      saveCredentials(networkKey, credentials);
      return credentials.accessToken;
    }
    credentials.tokenRefreshFailedAt = new Date().toISOString();
    saveCredentials(networkKey, credentials);
  } catch {
    // Сеть недоступна — публикуем текущим токеном, попробуем продлить в следующий раз.
  }
  return credentials.accessToken;
}

module.exports = { ensureFreshToken, exchangeForLongLivedToken, saveCredentials, parseTimestamp };
