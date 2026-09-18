// Одноклассники — REST API (api.ok.ru/fb.do), метод mediatopic.post (18.09.2026).
// Нужно приложение в ОК (apiok.ru → «Мои приложения»): публичный ключ приложения,
// секретный ключ и вечный access_token с правами VALUABLE_ACCESS, PHOTO_CONTENT,
// VIDEO_CONTENT (и GROUP_CONTENT, если постим в группу). Подпись запроса:
//   sig = md5( отсортированные "k=v" без разделителей + session_secret_key ),
//   session_secret_key = md5(access_token + application_secret_key)
// (для вечного токена ОК выдаёт session_secret_key сразу — его можно вписать напрямую).
// Пост на профиль (type=USER) или в группу (type=GROUP_THEME, gid). Фото и видео
// заливаются отдельно (photosV2.getUploadUrl / video.getUploadUrl) и прикрепляются.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API = 'https://api.ok.ru/fb.do';
const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'uploads');

const fields = [
  { name: 'applicationKey', label: 'Публичный ключ приложения (application_key)', type: 'text' },
  { name: 'applicationSecretKey', label: 'Секретный ключ приложения (application_secret_key)', type: 'password' },
  { name: 'accessToken', label: 'Вечный access_token из настроек приложения', type: 'password' },
  { name: 'sessionSecretKey', label: 'session_secret_key (если ОК выдал его вместе с токеном; иначе пусто — посчитаем сами)', type: 'password' },
  { name: 'gid', label: 'ID группы — если постим в группу; пусто — на профиль', type: 'text' },
];

const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

function sessionKey(credentials) {
  return credentials.sessionSecretKey || md5(credentials.accessToken + credentials.applicationSecretKey);
}

async function call(method, credentials, params = {}) {
  const all = { application_key: credentials.applicationKey, method, format: 'json', ...params };
  const base = Object.keys(all).sort().map((k) => `${k}=${all[k]}`).join('');
  const body = new URLSearchParams({ ...all, access_token: credentials.accessToken, sig: md5(base + sessionKey(credentials)) });
  const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error(`ОК ${method}: неожиданный ответ ${text.slice(0, 200)}`); }
  if (data && data.error_code) throw new Error(`ОК ${method}: ${data.error_msg || data.error_code}`);
  return data;
}

async function uploadPhoto(credentials, filePath) {
  const params = { count: '1' };
  if (credentials.gid) params.gid = credentials.gid;
  const { upload_url: uploadUrl } = await call('photosV2.getUploadUrl', credentials, params);
  const form = new FormData();
  form.append('pic1', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  const response = await fetch(uploadUrl, { method: 'POST', body: form });
  const data = await response.json();
  const first = data && data.photos && Object.values(data.photos)[0];
  if (!first || !first.token) throw new Error('ОК: фото не загрузилось.');
  return first.token;
}

async function uploadVideo(credentials, filePath, title) {
  const stat = fs.statSync(filePath);
  const params = { file_name: path.basename(filePath), file_size: String(stat.size) };
  if (credentials.gid) params.gid = credentials.gid;
  const { video_id: videoId, upload_url: uploadUrl } = await call('video.getUploadUrl', credentials, params);
  const form = new FormData();
  form.append('video', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  const response = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`ОК: видео не загрузилось (${response.status}).`);
  if (title) {
    try { await call('video.update', credentials, { vid: String(videoId), title: title.slice(0, 100) }); } catch (e) { /* название необязательно */ }
  }
  return videoId;
}

function mediaFiles(post) {
  let items = [];
  try { items = JSON.parse(post.media_items || '[]'); } catch (e) { items = []; }
  if (!items.length && post.media_path) items = [{ path: post.media_path, type: post.media_type }];
  return items
    .map((m) => ({ file: path.join(uploadsDir, path.basename(m.path || '')), type: m.type || post.media_type }))
    .filter((m) => m.file && fs.existsSync(m.file));
}

async function publish(post, credentials) {
  if (!credentials.applicationKey || !credentials.applicationSecretKey || !credentials.accessToken) {
    throw new Error('Не указаны ключи приложения ОК и access_token.');
  }
  const text = String(post.text || '').trim();
  const media = [];
  if (text) media.push({ type: 'text', text });

  const files = mediaFiles(post);
  const photos = [];
  const movies = [];
  for (const f of files.slice(0, 10)) {
    if (f.type === 'video') movies.push({ id: await uploadVideo(credentials, f.file, text.split('\n')[0]) });
    else photos.push({ id: await uploadPhoto(credentials, f.file) });
  }
  if (photos.length) media.push({ type: 'photo', list: photos });
  if (movies.length) media.push({ type: 'movie', list: movies });
  if (post.link_url) media.push({ type: 'link', url: post.link_url });
  if (!media.length) throw new Error('Пустой пост: нет ни текста, ни файлов.');

  const params = { attachment: JSON.stringify({ media }) };
  if (credentials.gid) {
    params.type = 'GROUP_THEME';
    params.gid = credentials.gid;
  } else {
    params.type = 'USER';
  }
  const result = await call('mediatopic.post', credentials, params);
  const topicId = typeof result === 'string' ? result : (result && (result.id || result.topic_id)) || '';
  if (credentials.gid) return { url: topicId ? `https://ok.ru/group/${credentials.gid}/topic/${topicId}` : `https://ok.ru/group/${credentials.gid}` };
  const me = await call('users.getCurrentUser', credentials, { fields: 'uid' }).catch(() => null);
  const uid = me && me.uid;
  return { url: uid && topicId ? `https://ok.ru/profile/${uid}/statuses/${topicId}` : (uid ? `https://ok.ru/profile/${uid}` : 'https://ok.ru/') };
}

module.exports = { key: 'ok', label: 'Одноклассники', fields, publish };
