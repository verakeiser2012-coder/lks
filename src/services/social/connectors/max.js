// MAX (мессенджер VK) — канал, куда постит бот-администратор (18.09.2026).
// Тот же бот, что принимает клиентов «Коллегам» (bot/kollegam-bot-max.js): токен один.
// API: https://platform-api2.max.ru, заголовок Authorization: <токен> (без Bearer).
//   POST /uploads?type=image|video → {url}; multipart поле data → {token}
//   POST /messages?chat_id=<id> {text, attachments:[{type, payload:{token}}]}
// chat_id канала API списком больше не отдаёт (GET /chats закрыт с июня 2026) — его
// присылает событие bot_added, когда бота добавляют в канал; бот пишет его в
// <DATA_DIR>/max-chats.json, отсюда коннектор и подставляет.
const fs = require('fs');
const path = require('path');
const { saveCredentials } = require('../instagramToken');

const API = 'https://platform-api2.max.ru';
const ROOT = path.join(__dirname, '..', '..', '..', '..');
const uploadsDir = path.join(ROOT, 'public', 'uploads');
const TEXT_LIMIT = 4000;

const fields = [
  { name: 'token', label: 'Токен бота MAX (тот же, что у бота «Коллегам», MAX_TOKEN в bot/.env)', type: 'password' },
  { name: 'chatId', label: 'chat_id канала — пусто: подставится сам, если бота уже добавили админом в один канал', type: 'text' },
];

async function mx(token, method, urlPath, query, body) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const response = await fetch(`${API}${urlPath}${qs}`, {
    method,
    headers: { Authorization: token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`MAX ${method} ${urlPath}: ${response.status} ${data.message || data.code || ''}`.trim());
  return data;
}

async function upload(token, type, filePath) {
  const { url } = await mx(token, 'POST', '/uploads', { type });
  const form = new FormData();
  form.append('data', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  const response = await fetch(url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`MAX: файл не загрузился (${response.status}).`);
  const data = await response.json().catch(() => ({}));
  if (!data.token) throw new Error('MAX: загрузка не вернула token.');
  return data.token;
}

// Каналы, куда бота добавили админом — пишет бот (bot/kollegam-bot-max.js) по событию bot_added.
function knownChats() {
  let dir = process.env.KOLLEGAM_DATA_DIR || '';
  const envFile = path.join(ROOT, 'bot', '.env');
  if (!dir && fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^\s*DATA_DIR\s*=\s*(.+?)\s*$/m);
    if (m) dir = m[1];
  }
  const file = path.join(dir || path.join(ROOT, 'data-kollegam'), 'max-chats.json');
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return []; }
}

async function onCredentialsSaved(credentials, network) {
  if (!credentials.token) return null;
  if (credentials.chatId) return null;
  const channels = knownChats().filter((c) => c.type === 'channel');
  if (channels.length === 1) {
    credentials.chatId = String(channels[0].chat_id);
    saveCredentials(network && network.key, credentials);
    return `MAX: канал «${channels[0].title || channels[0].chat_id}» подставлен (chat_id ${channels[0].chat_id}).`;
  }
  if (channels.length > 1) {
    return 'MAX: бот состоит в нескольких каналах — впишите chat_id нужного: ' + channels.map((c) => `${c.title || '?'} = ${c.chat_id}`).join('; ');
  }
  return 'MAX: токен сохранён. Добавьте бота администратором в канал — chat_id появится сам после первого события.';
}

function mediaFiles(post) {
  let items = [];
  try { items = JSON.parse(post.media_items || '[]'); } catch (e) { items = []; }
  if (!items.length && post.media_path) items = [{ path: post.media_path, type: post.media_type }];
  return items
    .map((m) => ({ file: path.join(uploadsDir, path.basename(m.path || '')), type: m.type === 'video' ? 'video' : 'image' }))
    .filter((m) => fs.existsSync(m.file));
}

async function publish(post, credentials) {
  const { token } = credentials;
  let { chatId } = credentials;
  if (!token) throw new Error('Не указан токен бота MAX.');
  if (!chatId) {
    const channels = knownChats().filter((c) => c.type === 'channel');
    if (channels.length !== 1) throw new Error('Не указан chat_id канала MAX.');
    chatId = String(channels[0].chat_id);
  }
  const text = String(post.text || '').trim().slice(0, TEXT_LIMIT);
  const attachments = [];
  for (const f of mediaFiles(post).slice(0, 10)) {
    attachments.push({ type: f.type, payload: { token: await upload(token, f.type, f.file) } });
  }
  if (!text && !attachments.length) throw new Error('Пустой пост: нет ни текста, ни файлов.');

  // Видео обрабатывается на стороне MAX; пока не готово — «attachment.not.ready», ждём и повторяем.
  let result;
  for (let i = 0; ; i++) {
    try {
      result = await mx(token, 'POST', '/messages', { chat_id: chatId }, { text: text || undefined, attachments: attachments.length ? attachments : undefined });
      break;
    } catch (e) {
      if (i >= 6 || !/attachment|not\.ready|processing/i.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  const chat = await mx(token, 'GET', `/chats/${chatId}`).catch(() => null);
  const link = chat && chat.link ? chat.link : '';
  const mid = result && result.message && result.message.body && result.message.body.mid;
  return { url: link ? (mid ? `${link}/${mid}` : link) : `max://chat/${chatId}` };
}

module.exports = { key: 'max', label: 'MAX', fields, publish, onCredentialsSaved };
