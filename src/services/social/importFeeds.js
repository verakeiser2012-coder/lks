// Импорт того, что уже вышло на площадках мимо календаря.
//
// Календарь знал только про то, что публиковал сам. Всё, что выкладывали
// руками — сторис в VK, ролик на YouTube, пост в Telegram — не оставляло
// следа, и «Уже в ленте» показывало половину правды. Здесь раз в час
// читаем публичные ленты и дописываем недостающее.
//
// Читаем только то, что отдаётся без входа: превью Telegram-канала,
// RSS YouTube, открытый API Rutube. VK — когда появится пользовательский
// ключ: групповой стену читать не может. X, Facebook, Instagram и TikTok
// из России не отдают ничего — их ведём через браузер, не отсюда.

const db = require('../../db');
const { getSettings } = require('../../utils/settings');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const LOOKBACK_DAYS = 30; // при первом запуске не тащим всю историю
const TZ = 'Asia/Yekaterinburg';

function credentials(key) {
  const row = db.prepare('SELECT credentials FROM social_networks WHERE key = ? AND enabled = 1').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.credentials || '{}');
  } catch (err) {
    return {};
  }
}

async function text(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// В календаре время хранится по Екатеринбургу без зоны — приводим к нему.
function toLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('sv-SE', { timeZone: TZ }).replace('T', ' ').slice(0, 19);
}

function decode(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n').trim();
}

function alreadyKnown(url) {
  return Boolean(db.prepare('SELECT 1 FROM social_post_targets WHERE published_url = ?').get(url));
}

/**
 * Дописать публикацию в календарь как уже вышедшую.
 * Пост и его площадка появляются вместе или не появляются вовсе.
 */
function record({ key, url, when, body, mediaType }) {
  if (!url || alreadyKnown(url)) return false;
  const localWhen = toLocal(when);
  if (!localWhen) return false;
  const cutoff = toLocal(Date.now() - LOOKBACK_DAYS * 86400000);
  if (localWhen < cutoff) return false;

  db.exec('BEGIN');
  try {
    const info = db
      .prepare(`INSERT INTO social_posts (text, scheduled_at, status, approved, link_url, media_type, sources)
                VALUES (?, ?, 'published', 1, ?, ?, 'импорт с площадки')`)
      .run((body || '').slice(0, 2000) || 'Публикация на площадке', localWhen, url, mediaType || '');
    db.prepare("INSERT INTO social_post_targets (post_id, network_key, status, published_url) VALUES (?, ?, 'published', ?)")
      .run(info.lastInsertRowid, key, url);
    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ── Telegram: публичное превью канала t.me/s/<канал> ──
async function importTelegram() {
  const c = credentials('telegram');
  const channel = String((c && c.chatId) || '').replace(/^@/, '');
  if (!channel) return { key: 'telegram', skipped: 'канал не задан' };

  const html = await text(`https://t.me/s/${channel}`);
  const blocks = html.split('tgme_widget_message_wrap').slice(1);
  let added = 0;
  for (const block of blocks) {
    const id = (block.match(/data-post="([^"]+)"/) || [])[1];
    const when = (block.match(/<time[^>]+datetime="([^"]+)"/) || [])[1];
    const body = (block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/) || [])[1];
    const hasVideo = /tgme_widget_message_video|message_video_player/.test(block);
    const hasPhoto = /tgme_widget_message_photo/.test(block);
    if (!id || !when) continue;
    if (record({
      key: 'telegram',
      url: `https://t.me/${id}`,
      when,
      body: decode(body || ''),
      mediaType: hasVideo ? 'video' : hasPhoto ? 'photo' : '',
    })) added += 1;
  }
  return { key: 'telegram', added, seen: blocks.length };
}

// ── YouTube: RSS канала, без ключей ──
async function importYouTube() {
  const url = String(getSettings().youtube_url || '');
  const channelId = (url.match(/channel\/(UC[\w-]+)/) || [])[1];
  if (!channelId) return { key: 'youtube', skipped: 'в настройках нет ссылки на канал вида /channel/UC…' };

  const xml = await text(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const entries = xml.split('<entry>').slice(1);
  let added = 0;
  for (const e of entries) {
    const videoId = (e.match(/<yt:videoId>([^<]+)</) || [])[1];
    const title = (e.match(/<title>([^<]*)</) || [])[1];
    const when = (e.match(/<published>([^<]+)</) || [])[1];
    if (!videoId || !when) continue;
    if (record({
      key: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      when,
      body: decode(title || ''),
      mediaType: 'video',
    })) added += 1;
  }
  return { key: 'youtube', added, seen: entries.length };
}

// ── Rutube: открытый API канала ──
async function importRutube() {
  const url = String(getSettings().rutube_url || '');
  const personId = (url.match(/channel\/(\d+)/) || [])[1];
  if (!personId) return { key: 'rutube', skipped: 'в настройках нет ссылки на канал вида /channel/<id>' };

  const json = JSON.parse(await text(`https://rutube.ru/api/video/person/${personId}/?page=1`, { Accept: 'application/json' }));
  const items = Array.isArray(json.results) ? json.results : [];
  let added = 0;
  for (const v of items) {
    const link = v.video_url || (v.id ? `https://rutube.ru/video/${v.id}/` : '');
    // Rutube отдаёт время без зоны — «2026-08-17T20:58:01» — и это московское.
    // Без явного смещения сервер прочёл бы его как UTC и сдвинул на пять часов.
    const raw = String(v.publication_ts || v.created_ts || '');
    const when = /[Zz]|[+-]\d\d:?\d\d$/.test(raw) ? raw : raw + '+03:00';
    if (record({
      key: 'rutube',
      url: link,
      when,
      body: decode(v.title || ''),
      mediaType: 'video',
    })) added += 1;
  }
  return { key: 'rutube', added, seen: items.length };
}

// ── VK: стена сообщества, нужен пользовательский ключ ──
async function importVK() {
  const c = credentials('vk');
  if (!c) return { key: 'vk', skipped: 'сеть отключена' };
  const token = c.userToken;
  const groupId = String(c.groupId || '').replace(/^-/, '');
  if (!token) return { key: 'vk', skipped: 'нет пользовательского ключа (userToken): групповой стену читать не может' };
  if (!groupId) return { key: 'vk', skipped: 'не задан groupId' };

  const json = JSON.parse(await text(
    `https://api.vk.com/method/wall.get?owner_id=-${groupId}&count=30&v=5.199&access_token=${encodeURIComponent(token)}`
  ));
  if (json.error) throw new Error('VK: ' + json.error.error_msg);
  const items = json.response && Array.isArray(json.response.items) ? json.response.items : [];
  let added = 0;
  for (const p of items) {
    const hasVideo = (p.attachments || []).some((a) => a.type === 'video');
    const hasPhoto = (p.attachments || []).some((a) => a.type === 'photo');
    if (record({
      key: 'vk',
      url: `https://vk.com/wall-${groupId}_${p.id}`,
      when: p.date * 1000,
      body: p.text || '',
      mediaType: hasVideo ? 'video' : hasPhoto ? 'photo' : '',
    })) added += 1;
  }
  return { key: 'vk', added, seen: items.length };
}

/**
 * Пройти по всем лентам. Ошибка одной площадки не останавливает остальные:
 * упавший Rutube не повод не дочитать Telegram.
 */
async function importFeeds() {
  const results = [];
  for (const fn of [importTelegram, importYouTube, importRutube, importVK]) {
    try {
      results.push(await fn());
    } catch (err) {
      results.push({ key: fn.name.replace('import', '').toLowerCase(), error: err.message });
    }
  }
  const added = results.reduce((s, r) => s + (r.added || 0), 0);
  const line = results
    .map((r) => r.error ? `${r.key}: ошибка — ${r.error}` : r.skipped ? `${r.key}: пропуск — ${r.skipped}` : `${r.key}: +${r.added} из ${r.seen}`)
    .join('; ');
  if (added > 0 || results.some((r) => r.error)) console.log('[импорт лент] ' + line);
  return results;
}

module.exports = { importFeeds };
