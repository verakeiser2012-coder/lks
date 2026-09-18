// Rutube — публикация через старый, но живой API v1 (18.09.2026):
//   POST https://rutube.ru/api/accounts/token_auth/ {username, password} → {token}
//   POST https://rutube.ru/api/video/ {url, title, description, is_hidden, category_id}
//     с заголовком Authorization: Token <token> — Rutube сам скачивает файл по ссылке.
// Ссылка на файл должна открываться без пароля: /uploads/ на сервере выведен из-под
// basic auth (nginx), поэтому берём абсолютный адрес нашего файла.
// Пароль в базе не держим: после сохранения он обменивается на токен и стирается.
const { absoluteMediaUrl } = require('../mediaUrl');
const { saveCredentials } = require('../instagramToken');

const API = 'https://rutube.ru/api';
// Категории: GET https://rutube.ru/api/video/category/ — «Музыка» = 6, «Разное» = 13.
const DEFAULT_CATEGORY = '6';

const fields = [
  { name: 'username', label: 'Логин Rutube (почта аккаунта; вход по телефону/VK ID не подходит — задайте пароль в профиле Rutube)', type: 'text' },
  { name: 'password', label: 'Пароль Rutube — нужен один раз, чтобы получить токен; в базе не хранится', type: 'password' },
  { name: 'token', label: 'API-токен (заполняется сам после сохранения логина и пароля)', type: 'password' },
  { name: 'categoryId', label: 'Категория (номер; 6 — Музыка, 13 — Разное, список: rutube.ru/api/video/category/)', type: 'text' },
];

async function call(method, path, token, body) {
  const headers = { Accept: 'application/json', 'User-Agent': 'levkeiser.com' };
  if (token) headers.Authorization = `Token ${token}`;
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
async function onCredentialsSaved(credentials, network) {
  if (!credentials.password) return null;
  if (!credentials.username) throw new Error('Укажите логин Rutube вместе с паролем.');
  const token = await fetchToken(credentials.username, credentials.password);
  credentials.token = token;
  credentials.password = '';
  saveCredentials(network && network.key, credentials);
  return 'Rutube: токен получен, пароль из базы удалён.';
}

async function publish(post, credentials) {
  const token = credentials.token;
  if (!token) throw new Error('Нет токена Rutube: сохраните логин и пароль, токен появится сам.');
  if (post.media_type !== 'video' || !post.media_path) {
    throw new Error('Rutube принимает только видео.');
  }
  const text = String(post.text || '').trim();
  const firstLine = text.split('\n')[0].trim();
  const title = (firstLine || 'DJ Levka').slice(0, 100);
  const categoryId = String(credentials.categoryId || '').trim() || DEFAULT_CATEGORY;

  const data = await call('POST', '/video/', token, {
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

module.exports = { key: 'rutube', label: 'Rutube', fields, publish, onCredentialsSaved };
