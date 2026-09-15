// Telegram-транспорт бота «Коллегам за копеечку». Логика — в core.js, общая с MAX-версией.
// bot/.env: BOT_TOKEN (от @BotFather), ADMIN_CHAT_ID (узнать /whoami), DATA_DIR
'use strict';

const fs = require('fs');
const path = require('path');
require('dns').setDefaultResultOrder('ipv4first'); // IPv6 к api.telegram.org с VPS не отвечает
const { createBot, COMMANDS, loadEnv, stamp } = require('./core');

loadEnv(path.join(__dirname, '.env'));
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error('BOT_TOKEN не задан'); process.exit(1); }
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data-kollegam');
const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}
const keyboard = (kb) => (kb ? { reply_markup: { inline_keyboard: kb.rows.map((r) => r.map((b) => ({ text: b.text, callback_data: b.data }))) } } : {});

const transport = {
  maxFile: 20 * 1024 * 1024, // Bot API не отдаёт файлы больше 20 МБ
  send: (chatId, text, kb) => tg('sendMessage', { chat_id: chatId, text, ...keyboard(kb) }),
  editKeyboard: (chatId, messageId, kb) => tg('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, ...keyboard(kb) }),
  editText: (chatId, messageId, text) => tg('editMessageText', { chat_id: chatId, message_id: messageId, text }),
  async download(file, dest) {
    const info = await tg('getFile', { file_id: file.ref });
    const res = await fetch(`${FILE_API}/${info.file_path}`);
    if (!res.ok) throw new Error(`download ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return fs.statSync(dest).size;
  },
  forwardToAdmin: (msg) => tg('forwardMessage', { chat_id: process.env.ADMIN_CHAT_ID, from_chat_id: msg.chatId, message_id: msg.messageId }),
  answerCallback: (id) => tg('answerCallbackQuery', { callback_query_id: id }),
  sendDocument: (chatId, file, caption) => tg('sendDocument', { chat_id: chatId, document: file.ref, caption }),
};

function fileOf(m) {
  if (!m) return null;
  if (m.document) return { ref: m.document.file_id, name: m.document.file_name || 'document', size: m.document.file_size };
  if (m.photo) { const p = m.photo[m.photo.length - 1]; return { ref: p.file_id, name: `фото ${stamp()}.jpg`, size: p.file_size }; }
  if (m.audio) return { ref: m.audio.file_id, name: m.audio.file_name || `${m.audio.title || 'audio'}.mp3`, size: m.audio.file_size };
  if (m.video) return { ref: m.video.file_id, name: m.video.file_name || `видео ${stamp()}.mp4`, size: m.video.file_size };
  if (m.voice) return { ref: m.voice.file_id, name: `голосовое ${stamp()}.ogg`, size: m.voice.file_size };
  return null;
}
function normalize(m) {
  const from = m.from || {};
  return { chatId: m.chat.id, messageId: m.message_id, text: m.text || m.caption || '',
    from: { username: from.username, firstName: from.first_name, lastName: from.last_name },
    file: fileOf(m), replyFile: fileOf(m.reply_to_message) };
}

const bot = createBot({ transport, data: DATA, adminId: process.env.ADMIN_CHAT_ID, network: 'telegram' });

const offsetFile = path.join(DATA, 'offset');
let offset = fs.existsSync(offsetFile) ? Number(fs.readFileSync(offsetFile, 'utf8')) || 0 : 0;
async function loop() {
  for (;;) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        fs.writeFileSync(offsetFile, String(offset));
        try {
          if (u.message && u.message.chat.type === 'private') await bot.onMessage(normalize(u.message));
          else if (u.callback_query) {
            const q = u.callback_query;
            await bot.onCallback({ chatId: q.message.chat.id, messageId: q.message.message_id, data: q.data, callbackId: q.id });
          }
        } catch (e) { console.error('update', e); }
      }
    } catch (e) {
      console.error('poll', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

tg('getMe').then((me) => {
  console.log(`bot @${me.username} started, data: ${DATA}, admin: ${process.env.ADMIN_CHAT_ID || 'не задан'}`);
  return tg('setMyCommands', { commands: COMMANDS.map(([command, description]) => ({ command, description })) });
}).then(loop).catch((e) => { console.error(e); process.exit(1); });
