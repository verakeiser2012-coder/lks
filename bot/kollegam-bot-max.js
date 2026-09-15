// MAX-транспорт бота «Коллегам за копеечку» (мессенджер MAX, Bot API https://dev.max.ru).
// Логика — в core.js, общая с Telegram-версией; клиенты хранятся в тех же DATA_DIR/clients с префиксом max_.
// bot/.env: MAX_TOKEN (от MasterBot в MAX), MAX_ADMIN_ID (узнать /whoami), DATA_DIR
'use strict';

const fs = require('fs');
const path = require('path');
require('dns').setDefaultResultOrder('ipv4first');
const { createBot, COMMANDS, loadEnv, stamp } = require('./core');

loadEnv(path.join(__dirname, '.env'));
const TOKEN = process.env.MAX_TOKEN;
if (!TOKEN) { console.error('MAX_TOKEN не задан'); process.exit(1); }
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data-kollegam');
const API = process.env.MAX_API || 'https://platform-api2.max.ru';

async function mx(method, urlPath, query, body) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null)).toString() : '';
  const res = await fetch(`${API}${urlPath}${qs}`, { method, headers: { Authorization: TOKEN, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${urlPath}: ${res.status} ${data.message || data.raw || ''}`);
  return data;
}
const keyboard = (kb) => (kb ? [{ type: 'inline_keyboard', payload: { buttons: kb.rows.map((r) => r.map((b) => ({ type: 'callback', text: b.text, payload: b.data }))) } }] : undefined);

// после загрузки файла MAX ещё обрабатывает его — отправку повторяем с паузой
async function sendWithRetry(query, body) {
  for (let i = 0; ; i++) {
    try { return await mx('POST', '/messages', query, body); }
    catch (e) { if (i >= 5 || !/attachment|not\.ready|processing/i.test(e.message)) throw e; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
}
async function upload(type, buffer, name) {
  const { url } = await mx('POST', '/uploads', { type });
  const form = new FormData();
  form.append('data', new Blob([buffer]), name);
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  const d = await res.json();
  return d.token;
}

const transport = {
  maxFile: 0,
  send: (chatId, text, kb) => mx('POST', '/messages', { user_id: chatId }, { text, attachments: keyboard(kb) }),
  editKeyboard: (chatId, messageId, kb) => mx('PUT', '/messages', { message_id: messageId }, { attachments: keyboard(kb) }),
  editText: (chatId, messageId, text) => mx('PUT', '/messages', { message_id: messageId }, { text, attachments: [] }),
  async download(file, dest) {
    const res = await fetch(file.ref);
    if (!res.ok) throw new Error(`download ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return fs.statSync(dest).size;
  },
  forwardToAdmin: (msg) => mx('POST', '/messages', { user_id: process.env.MAX_ADMIN_ID }, { link: { type: 'forward', mid: msg.messageId } }),
  answerCallback: (id) => mx('POST', '/answers', { callback_id: id }, { notification: 'Выбрано' }),
  async sendDocument(chatId, file, caption) {
    // у входящего файла есть готовый token — его можно переиспользовать во вложении
    const att = { type: file.type || 'file', payload: { token: file.token } };
    return sendWithRetry({ user_id: chatId }, { text: caption || undefined, attachments: [att] });
  },
};

function fileOf(body) {
  if (!body || !body.attachments) return null;
  for (const a of body.attachments) {
    const p = a.payload || {};
    if (a.type === 'file') return { ref: p.url, token: p.token, type: 'file', name: p.filename || `файл ${stamp()}`, size: p.size };
    if (a.type === 'image') return { ref: p.url, token: p.token, type: 'image', name: `фото ${stamp()}.jpg` };
    if (a.type === 'audio') return { ref: p.url, token: p.token, type: 'audio', name: `аудио ${stamp()}.mp3` };
    if (a.type === 'video') return { ref: p.url, token: p.token, type: 'video', name: `видео ${stamp()}.mp4` };
  }
  return null;
}
function normalize(m) {
  const s = m.sender || {};
  return { chatId: s.user_id, messageId: m.body && m.body.mid, text: (m.body && m.body.text) || '',
    from: { username: s.username, firstName: s.name, lastName: '' },
    file: fileOf(m.body), replyFile: m.link && m.link.type === 'reply' ? fileOf(m.link.message) : null };
}

const bot = createBot({ transport, data: DATA, adminId: process.env.MAX_ADMIN_ID, keyPrefix: 'max_', network: 'max' });

const markerFile = path.join(DATA, 'max-marker');
let marker = fs.existsSync(markerFile) ? Number(fs.readFileSync(markerFile, 'utf8')) || undefined : undefined;
async function loop() {
  for (;;) {
    try {
      const { updates, marker: next } = await mx('GET', '/updates', { marker, timeout: 60, types: 'message_created,message_callback,bot_started' });
      for (const u of updates || []) {
        try {
          if (u.update_type === 'bot_started') {
            const s = u.user || {};
            await bot.onMessage({ chatId: s.user_id, text: '/start', started: true, from: { username: s.username, firstName: s.name } });
          } else if (u.update_type === 'message_created' && u.message && u.message.recipient && u.message.recipient.chat_type === 'dialog') {
            await bot.onMessage(normalize(u.message));
          } else if (u.update_type === 'message_callback') {
            const cb = u.callback || {};
            await bot.onCallback({ chatId: cb.user && cb.user.user_id, messageId: u.message && u.message.body && u.message.body.mid, data: cb.payload, callbackId: cb.callback_id });
          }
        } catch (e) { console.error('update', e); }
      }
      if (next !== undefined && next !== null) { marker = next; fs.writeFileSync(markerFile, String(marker)); }
    } catch (e) {
      console.error('poll', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// Токен бота в MAX начинает работать только после модерации карточки бота (до 48 рабочих
// часов) — до этого API отвечает «Invalid access_token». Не падаем, а пробуем раз в 10 минут.
async function start() {
  for (;;) {
    try {
      const me = await mx('GET', '/me');
      console.log(`MAX bot ${me.username ? '@' + me.username : me.name} started, data: ${DATA}, admin: ${process.env.MAX_ADMIN_ID || 'не задан'}`);
      await mx('PATCH', '/me', null, { commands: COMMANDS.map(([name, description]) => ({ name, description })) }).catch((e) => console.error('commands', e.message));
      return loop();
    } catch (e) {
      console.error(`MAX: ${e.message} — следующая попытка через 10 минут`);
      await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
    }
  }
}
start();
