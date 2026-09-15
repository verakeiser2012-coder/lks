// Админ-консоль бота «Коллегам за копеечку» — запускается на VPS рядом с ботом и делит с ним DATA_DIR.
//   node bot/admin.js clients                  список клиентов, этап, файлы
//   node bot/admin.js log <id> [n]             последние n записей журнала клиента
//   node bot/admin.js stage <id> <текст>       сменить этап и уведомить клиента
//   node bot/admin.js msg <id> <текст>         написать клиенту от бота
//   node bot/admin.js send <id> <файл> [подпись]   отправить клиенту документ
//   node bot/admin.js tracks <id> <файл.txt>   задать список треков для кнопок
'use strict';
const fs = require('fs');
const path = require('path');
require('dns').setDefaultResultOrder('ipv4first');

for (const line of fs.existsSync(path.join(__dirname, '.env')) ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/) : []) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const TOKEN = process.env.BOT_TOKEN;
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data-kollegam');
const API = `https://api.telegram.org/bot${TOKEN}`;
const MAX_API = process.env.MAX_API || 'https://platform-api2.max.ru';

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json(); if (!d.ok) throw new Error(`${method}: ${d.description}`); return d.result;
}
async function mx(method, urlPath, query, body) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${MAX_API}${urlPath}${qs}`, { method, headers: { Authorization: process.env.MAX_TOKEN, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await res.json().catch(() => ({})); if (!res.ok) throw new Error(`${method} ${urlPath}: ${res.status} ${d.message || ''}`); return d;
}
// клиент из MAX — id вида max_<user_id>, у него network = 'max'
const isMax = (c) => c.network === 'max';
const rawId = (c) => String(c.id);
async function sendText(c, text) {
  return isMax(c) ? mx('POST', '/messages', { user_id: rawId(c) }, { text }) : tg('sendMessage', { chat_id: c.id, text });
}
async function sendDoc(c, file, caption) {
  const buf = fs.readFileSync(file); const name = path.basename(file);
  if (isMax(c)) {
    const { url } = await mx('POST', '/uploads', { type: 'file' });
    const form = new FormData(); form.append('data', new Blob([buf]), name);
    const up = await fetch(url, { method: 'POST', body: form }); const { token } = await up.json();
    for (let i = 0; ; i++) {
      try { return await mx('POST', '/messages', { user_id: rawId(c) }, { text: caption, attachments: [{ type: 'file', payload: { token } }] }); }
      catch (e) { if (i >= 5) throw e; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
    }
  }
  const form = new FormData();
  form.append('chat_id', String(c.id));
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([buf]), name);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  const d = await res.json(); if (!d.ok) throw new Error(d.description);
  return d.result;
}
const dir = (id) => path.join(DATA, 'clients', String(id));
const load = (id) => { const f = path.join(dir(id), 'profile.json'); if (!fs.existsSync(f)) throw new Error(`нет клиента ${id}`); const c = JSON.parse(fs.readFileSync(f, 'utf8')); Object.defineProperty(c, '_key', { value: String(id) }); return c; };
const save = (c) => fs.writeFileSync(path.join(dir(c._key), 'profile.json'), JSON.stringify(c, null, 2));
const log = (c, e) => fs.appendFileSync(path.join(dir(c._key), 'log.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
const label = (c) => `${[c.firstName, c.lastName].filter(Boolean).join(' ')}${c.username ? ' @' + c.username : ''} (id ${c._key})`;
function files(c) {
  const root = path.join(dir(c._key), 'files'); if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => ({ track: d.name, files: fs.readdirSync(path.join(root, d.name)) }));
}

(async () => {
  const [cmd, id, ...rest] = process.argv.slice(2);
  if (cmd === 'clients') {
    const root = path.join(DATA, 'clients');
    for (const d of fs.existsSync(root) ? fs.readdirSync(root) : []) {
      const c = load(d); const f = files(c);
      console.log(`${label(c)}\n  с ${c.created.slice(0, 10)}; этап: ${c.stage}\n  анкета: ${c.step === null ? 'заполнена' : 'вопрос ' + (c.step + 1)}; треков в списке: ${c.tracks.length}; файлов: ${f.reduce((s, t) => s + t.files.length, 0)} в ${f.length} папках`);
      for (const [k, v] of Object.entries(c.answers || {})) console.log(`    ${k}: ${String(v).replace(/\n/g, ' | ')}`);
      for (const t of f) console.log(`    ${t.track}: ${t.files.join(', ')}`);
    }
    return;
  }
  const c = load(id);
  if (cmd === 'log') {
    const n = Number(rest[0] || 20);
    const f = path.join(dir(c._key), 'log.jsonl');
    console.log(fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').slice(-n).join('\n') : 'пусто');
  } else if (cmd === 'stage') {
    c.stage = rest.join(' '); save(c); log(c, { type: 'stage', stage: c.stage });
    await sendText(c, `📊 Обновление по вашему оформлению: ${c.stage}`);
    console.log('этап обновлён и отправлен');
  } else if (cmd === 'msg') {
    const text = rest.join(' ');
    await sendText(c, text); log(c, { type: 'admin_msg', text });
    console.log('отправлено');
  } else if (cmd === 'send') {
    const [file, ...cap] = rest;
    await sendDoc(c, file, cap.length ? cap.join(' ') : undefined);
    log(c, { type: 'admin_file', name: path.basename(file) });
    console.log('файл отправлен:', path.basename(file));
  } else if (cmd === 'tracks') {
    const names = fs.readFileSync(rest[0], 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    c.tracks = Array.from(new Set([...names, ...c.tracks])); save(c);
    await sendText(c, `📋 Загружен список ваших треков (${c.tracks.length}). Теперь файлы можно относить к треку кнопкой — /треки.`);
    console.log(`треков: ${c.tracks.length}`);
  } else {
    console.log('команды: clients | log <id> [n] | stage <id> <текст> | msg <id> <текст> | send <id> <файл> [подпись] | tracks <id> <файл.txt>');
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
