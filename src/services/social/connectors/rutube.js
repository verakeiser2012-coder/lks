// Rutube — публикация через старый, но живой API v1 (18.09.2026):
//   POST https://rutube.ru/api/accounts/token_auth/ {username, password} → {token}
//   POST https://rutube.ru/api/video/ {url, title, description, is_hidden, category_id}
//     с заголовком Authorization: Token <token> — Rutube сам скачивает файл по ссылке.
// Ссылка на файл должна открываться без пароля: /uploads/ на сервере выведен из-под
// basic auth (nginx), поэтому берём абсолютный адрес нашего файла.
// Пароль в базе не держим: после сохранения он обменивается на токен и стирается.
// Проверено 18.09: token_auth современные аккаунты Multipass не принимает (400 «Unable to
// login»), зато тот же /api/video/ работает с cookie-сессией сайта: из панели с входом
// загрузка по ссылке → {video_id, track_id}, статус 200, DELETE 204. Нужная cookie —
// HttpOnly, из document.cookie её не взять; поэтому второй способ входа — целая строка
// Cookie из DevTools (F12 → Network → любой запрос к api → Request Headers → Cookie).
// Сессия живёт около месяца (psid2), когда протухнет — админка скажет.
const { absoluteMediaUrl } = require('../mediaUrl');
const { saveCredentials } = require('../instagramToken');

const API = 'https://rutube.ru/api';
// Категории: GET https://rutube.ru/api/video/category/ — «Музыка» = 6, «Разное» = 13.
const DEFAULT_CATEGORY = '6';

const fields = [
  { name: 'username', label: 'Логин Rutube (почта аккаунта; вход по телефону/VK ID не подходит — задайте пароль в профиле Rutube)', type: 'text' },
  { name: 'password', label: 'Пароль Rutube — нужен один раз, чтобы получить токен; в базе не хранится', type: 'password' },
  { name: 'token', label: 'API-токен (заполняется сам после сохранения логина и пароля, либо выдан поддержкой Rutube)', type: 'password' },
  { name: 'cookie', label: 'Или строка Cookie целиком из DevTools браузера, где выполнен вход на rutube.ru (F12 → Network → запрос к api → Request Headers → Cookie)', type: 'password' },
  { name: 'categoryId', label: 'Категория (номер; 6 — Музыка, 13 — Разное, список: rutube.ru/api/video/category/)', type: 'text' },
];

// Заголовки входа: токен, а без него — cookie-сессия сайта.
function authHeaders(credentials) {
  if (credentials.token) return { Authorization: `Token ${credentials.token}` };
  const cookie = String(credentials.cookie || '').trim();
  if (cookie) {
    const csrf = (cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/) || [])[1] || '';
    return {
      Cookie: cookie,
      'X-CSRFToken': csrf,
      Referer: 'https://rutube.ru/',
      Origin: 'https://rutube.ru',
    };
  }
  return {};
}

async function call(method, path, auth, body) {
  const headers = { Accept: 'application/json', 'User-Agent': 'levkeiser.com', ...(auth || {}) };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!response.ok) {
    const detail = data && typeof data === 'object'
      ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ')
      : text.slice(0, 200);
    throw new Error(`Rutube ${response.status}: ${detail || 'без ответа'}`);
  }
  return data;
}

async function fetchToken(username, password) {
  const data = await call('POST', '/accounts/token_auth/', null, { username, password });
  if (!data || !data.token) throw new Error('Rutube не вернул токен.');
  return data.token;
}

// После сохранения: логин + пароль → токен; пароль стираем.
// Сессия жива? Пустой POST /api/video/ отвечает 400 «url обязательное поле», когда вход
// принят, и 401, когда нет — так проверяем, ничего не загружая.
async function checkSession(credentials) {
  try {
    await call('POST', '/video/', authHeaders(credentials), {});
  } catch (e) {
    if (/Rutube 400/.test(e.message)) return true;
    if (/Rutube 401|Rutube 403/.test(e.message)) return false;
    throw e;
  }
  return true;
}

async function onCredentialsSaved(credentials, network) {
  if (!credentials.password) {
    if (credentials.cookie && !credentials.token) {
      const ok = await checkSession(credentials);
      if (!ok) throw new Error('Rutube не принял cookie: скопируйте свежую строку Cookie из DevTools браузера, где выполнен вход на rutube.ru (F12 → Network → запрос к api → Cookie).');
      return 'Rutube: cookie-сессия принята, публикация по API работает.';
    }
    return null;
  }
  if (!credentials.username) throw new Error('Укажите логин Rutube вместе с паролем.');
  // Пароль стираем в любом случае — и когда Rutube его не принял: в базе ему не место.
  const password = credentials.password;
  credentials.password = '';
  saveCredentials(network && network.key, credentials);
  let token;
  try {
    token = await fetchToken(credentials.username, password);
  } catch (e) {
    if (/Unable to login|non_field_errors/i.test(e.message)) {
      throw new Error('Rutube не принял логин и пароль. Логин — почта аккаунта (телефон не подходит); пароль задаётся в профиле Rutube → Безопасность. Пароль в базе не сохранён.');
    }
    throw e;
  }
  credentials.token = token;
  saveCredentials(network && network.key, credentials);
  return 'Rutube: токен получен, пароль из базы удалён.';
}

async function publish(post, credentials) {
  if (!credentials.token && !credentials.cookie) throw new Error('Нет входа в Rutube: нужен API-токен или строка Cookie из браузера с входом.');
  if (post.media_type !== 'video' || !post.media_path) {
    throw new Error('Rutube принимает только видео.');
  }
  const text = String(post.text || '').trim();
  const firstLine = text.split('\n')[0].trim();
  const title = (firstLine || 'DJ Levka').slice(0, 100);
  const categoryId = String(credentials.categoryId || '').trim() || DEFAULT_CATEGORY;

  const data = await call('POST', '/video/', authHeaders(credentials), {
    url: absoluteMediaUrl(post.media_path),
    title,
    description: text,
    is_hidden: 0,
    category_id: Number(categoryId),
  });
  const id = data && (data.video_id || data.id || (data.result && data.result.id));
  if (!id) throw new Error('Rutube принял видео, но не вернул id: ' + JSON.stringify(data).slice(0, 200));
  // Ролик обрабатывается несколько минут; ссылка становится рабочей после обработки.
  return { url: `https://rutube.ru/video/${id}/` };
}

// Удаление — для проверки связки (скрытый тестовый ролик) и на будущее.
async function remove(videoId, credentials) {
  return call('DELETE', `/video/${videoId}/`, authHeaders(credentials));
}

module.exports = { key: 'rutube', label: 'Rutube', fields, publish, onCredentialsSaved, checkSession, remove, call, authHeaders };
