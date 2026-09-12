// Английская версия сайта: страница рендерится по-русски как обычно, а перед
// отдачей под /en/... её HTML прогоняется через этот модуль. Текст режется на
// фразы (абзац, заголовок, пункт меню, подпись к картинке…), каждая фраза
// переводится один раз движком из translate.js и кладётся в таблицу
// page_translations. Дальше страница собирается из кэша без обращений наружу.
// В админке (/admin/translations) любой перевод можно поправить руками —
// такая фраза помечается edited и больше не перезаписывается.
//
// Что не переводится: <script>, <style>, <svg>, <code>, <pre>, <textarea>,
// всё внутри translate="no" / class="notranslate", фразы без кириллицы
// (названия треков, бренды, английские тексты новостей).
//
// Строчные теги (<a>, <b>, <span>, <img>…) остаются внутри фразы, чтобы не
// рвать предложение: перед отправкой они заменяются на <a data-t="1">, после —
// восстанавливаются с исходными атрибутами. Закрывающие теги атрибутов не
// имеют, они уходят как есть.

const crypto = require('crypto');
const db = require('../db');
const { translateLines } = require('./translate');

const INLINE = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'data', 'del', 'dfn', 'em', 'i', 'img', 'ins',
  'mark', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'wbr',
]);
// Элементы, внутрь которых не заходим (с вложенными тегами).
const SKIP = new Set(['svg', 'code', 'pre', 'noscript', 'template', 'iframe', 'object', 'math', 'samp', 'var', 'canvas', 'map']);
// Элементы с «сырым» содержимым: ищем закрывающий тег текстом.
const RAW_TEXT = new Set(['script', 'style', 'textarea']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
// Атрибуты с человеческим текстом.
const TEXT_ATTRS = new Set(['alt', 'title', 'placeholder', 'aria-label']);
// <meta content="…"> переводим только у описаний/заголовков страницы.
const META_CONTENT_RE = /\s(?:name|property)\s*=\s*["'](?:description|og:title|og:description|twitter:title|twitter:description)["']/i;

// Имена и бренды, которые машинный перевод пишет по-своему. Применяется к каждому
// переводу до сохранения в кэш; поправленные руками фразы не трогаем.
const GLOSSARY = [
  [/\bLev Keyser\b/g, 'Lev Keiser'],
  [/\bKeyser\b/g, 'Keiser'],
  [/\bLeo(?=['’]s\b|\b)/g, 'Lev'],
  [/\bDJ Lyovka\b/gi, 'DJ Levka'],
  // «Лев» без фамилии Google переводит как животное.
  [/\b(?:the )?Lion(?=['’]s\b|\b)/g, 'Lev'],
  // Бренды-партнёры: мастерская благовоний «Груша», не фрукт.
  [/\bPear(?=['’]s\b|\b)/g, 'Grusha'],
  [/\bpears?\b/g, 'Grusha'],
  // «Брендам» транслитерируется, «выступления» становятся речами.
  [/\bBrendam\b/g, 'For brands'],
  [/\bspeeches\b/g, 'performances'],
  [/\bSpeeches\b/g, 'Performances'],
  // Фирменная фраза — «Slow in a fast world», без «fast-paced».
  [/\bfast-paced world\b/g, 'fast world'],
  // Дзен — площадка, а не дзен-буддизм; «Кадры к записи» — кадры из этой записи.
  [/\bin Zen\b/g, 'on Dzen'],
  [/\bZen\b/g, 'Dzen'],
  [/\bFrames for recording\b/g, 'Frames from this entry'],
  // Раздел «Кино» — фильмы, а не «Movie».
  [/^Movie$/, 'Film'],
];
function applyGlossary(s) {
  return GLOSSARY.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

const CYRILLIC_RE = /[А-Яа-яЁё]/;
const TOKEN_RE = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+|</g;
const ATTR_RE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

// Пути, которые не получают префикс /en (файлы, админка, служебные адреса).
const NO_PREFIX = ['/admin', '/uploads', '/css', '/js', '/audio', '/video', '/img', '/data', '/favicon', '/downloads', '/health', '/robots.txt', '/sitemap.xml', '/checkout/robokassa', '/checkout/yookassa', '/en'];

function isNoPrefixPath(path) {
  return NO_PREFIX.some((p) => path === p || path.startsWith(p + '/') || (p.includes('.') && path === p));
}

/** Добавляет /en к внутреннему адресу: '/' → '/en', '/catalog?x' → '/en/catalog?x'. */
function withEnPrefix(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return url;
  const path = url.split(/[?#]/)[0];
  if (isNoPrefixPath(path)) return url;
  return '/en' + (url === '/' ? '' : url);
}

function decodeAttr(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function encodeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function normKey(s) {
  return s.replace(/\s+/g, ' ').trim();
}
function hashKey(key) {
  return crypto.createHash('sha1').update(key).digest('hex');
}

// ---------- кэш переводов ----------

const cache = new Map(); // key -> dst
let cacheLoaded = false;
const inflight = new Map(); // key -> Promise
let lastFailureLoggedAt = 0;

function loadCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  // Словарь мог пополниться после того, как фраза попала в кэш — применяем его
  // к автопереводам заново; правленные руками не трогаем.
  const fix = db.prepare("UPDATE page_translations SET dst = ?, updated_at = datetime('now') WHERE id = ? AND edited = 0");
  for (const row of db.prepare("SELECT id, src, dst, edited FROM page_translations WHERE lang = 'en'").all()) {
    let dst = row.dst;
    if (!row.edited) {
      const fixed = applyGlossary(dst);
      if (fixed !== dst) { dst = fixed; fix.run(dst, row.id); }
    }
    cache.set(row.src, dst);
  }
}

const insertStmt = () => db.prepare(`
  INSERT INTO page_translations (key_hash, lang, src, dst) VALUES (?, 'en', ?, ?)
  ON CONFLICT(key_hash) DO UPDATE SET dst = excluded.dst, updated_at = datetime('now') WHERE edited = 0
`);

/** Ищет переводы для набора фраз; чего нет в кэше — переводит и сохраняет. */
async function lookupMany(keys) {
  loadCache();
  const result = new Map();
  const missing = [];
  for (const key of keys) {
    if (cache.has(key)) result.set(key, cache.get(key));
    else if (!missing.includes(key)) missing.push(key);
  }
  if (missing.length === 0) return result;

  const waiting = [];
  const toFetch = [];
  for (const key of missing) {
    if (inflight.has(key)) waiting.push(inflight.get(key).then((dst) => result.set(key, dst)));
    else toFetch.push(key);
  }
  if (toFetch.length) {
    const p = translateLines(toFetch, 'ru', 'en')
      .then((dsts) => {
        const ins = insertStmt();
        const out = new Map();
        toFetch.forEach((key, i) => {
          const dst = applyGlossary((dsts[i] || '').trim());
          if (!dst) return;
          out.set(key, dst);
          cache.set(key, dst);
          try { ins.run(hashKey(key), key, dst); } catch (e) { console.error('[page-translate] save:', e.message); }
        });
        return out;
      })
      .catch((e) => {
        if (Date.now() - lastFailureLoggedAt > 60000) {
          lastFailureLoggedAt = Date.now();
          console.error('[page-translate] переводчик не ответил:', e.message);
        }
        return new Map();
      })
      .finally(() => toFetch.forEach((key) => inflight.delete(key)));
    toFetch.forEach((key) => inflight.set(key, p.then((m) => m.get(key))));
    waiting.push(p.then((m) => m.forEach((dst, key) => result.set(key, dst))));
  }
  await Promise.all(waiting);
  return result;
}

/** Ручная правка из админки: фраза помечается edited и не перезаписывается. */
function setManual(id, dst) {
  const row = db.prepare('SELECT src FROM page_translations WHERE id = ?').get(id);
  if (!row) return false;
  db.prepare("UPDATE page_translations SET dst = ?, edited = 1, updated_at = datetime('now') WHERE id = ?").run(dst, id);
  cache.set(row.src, dst);
  scriptCache.clear();
  return true;
}

/** Сброс: строка удаляется, при следующем показе страницы переведётся заново. */
function resetTranslation(id) {
  const row = db.prepare('SELECT src FROM page_translations WHERE id = ?').get(id);
  if (!row) return false;
  db.prepare('DELETE FROM page_translations WHERE id = ?').run(id);
  cache.delete(row.src);
  scriptCache.clear();
  return true;
}

// ---------- разбор HTML ----------

function parseAttrs(attrString) {
  const attrs = [];
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(attrString))) {
    if (m.index === ATTR_RE.lastIndex) ATTR_RE.lastIndex++;
    const value = m[2] != null ? m[2] : (m[3] != null ? m[3] : (m[4] != null ? m[4] : null));
    attrs.push({ name: m[1].toLowerCase(), value });
  }
  return attrs;
}

function hasNoTranslate(attrs) {
  return attrs.some((a) =>
    (a.name === 'translate' && String(a.value).toLowerCase() === 'no') ||
    (a.name === 'class' && /(^|\s)notranslate(\s|$)/.test(a.value || '')));
}

// Тег с переводимыми атрибутами: { raw, attrs: [{name, key}] }.
function makeTagItem(raw, name, attrs) {
  const translatable = [];
  for (const a of attrs) {
    if (a.value == null) continue;
    const isText = TEXT_ATTRS.has(a.name)
      || (name === 'meta' && a.name === 'content' && META_CONTENT_RE.test(raw))
      || (name === 'input' && a.name === 'value' && /\stype\s*=\s*["']?(submit|button|reset)/i.test(raw));
    if (!isText) continue;
    const key = normKey(decodeAttr(a.value));
    if (key && CYRILLIC_RE.test(key)) translatable.push({ name: a.name, key });
  }
  return { raw, attrs: translatable };
}

function renderTag(item, lookup) {
  let out = item.raw;
  for (const a of item.attrs) {
    const dst = lookup.get(a.key);
    if (!dst) continue;
    const re = new RegExp('(\\s' + a.name.replace(/[-]/g, '\\-') + '\\s*=\\s*)(?:"[^"]*"|\'[^\']*\')', 'i');
    out = out.replace(re, (m, pre) => pre + '"' + encodeAttr(dst) + '"');
  }
  return out;
}

/**
 * Разбирает HTML на список элементов: строка | {seg} | {tag}.
 * seg: { lead, trail, key, restore: {n: tagItem} } — фраза с плейсхолдерами.
 */
function parse(html) {
  const items = [];
  const skipStack = [];
  let seg = null;

  function flush() {
    if (!seg) return;
    // Собираем ключ: текст + плейсхолдеры. Ведущие/замыкающие пробелы — отдельно.
    const body = seg.parts.join('');
    const lead = (body.match(/^\s*/) || [''])[0];
    const trail = body.length > lead.length ? (body.match(/\s*$/) || [''])[0] : '';
    const key = normKey(body);
    const textOnly = key.replace(/<[^>]*>/g, '');
    if (key && CYRILLIC_RE.test(textOnly)) {
      items.push({ seg: true, lead, trail, key, restore: seg.restore });
    } else {
      // Нечего переводить — отдаём как было, но атрибуты строчных тегов всё же переводим.
      items.push({ rawParts: seg.rawParts });
    }
    seg = null;
  }
  function ensureSeg() {
    if (!seg) seg = { parts: [], rawParts: [], restore: {}, n: 0 };
  }

  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(html))) {
    const raw = m[0];
    const tagName = m[1] ? m[1].toLowerCase() : null;

    if (skipStack.length) {
      items.push(raw);
      if (tagName) {
        const top = skipStack[skipStack.length - 1];
        const isClose = raw.startsWith('</');
        if (tagName === top.name && !VOID.has(tagName)) {
          if (isClose) { top.depth--; if (top.depth === 0) skipStack.pop(); }
          else if (!raw.endsWith('/>')) top.depth++;
        }
      }
      continue;
    }

    if (!tagName) {
      if (raw.startsWith('<!')) { flush(); items.push(raw); continue; }
      // Текст
      ensureSeg();
      seg.parts.push(raw);
      seg.rawParts.push(raw);
      continue;
    }

    const isClose = raw.startsWith('</');
    const attrs = isClose ? [] : parseAttrs(m[2] || '');

    if (!isClose && RAW_TEXT.has(tagName)) {
      flush();
      const closeRe = new RegExp('</' + tagName + '\\s*>', 'i');
      closeRe.lastIndex = 0;
      const rest = html.slice(TOKEN_RE.lastIndex);
      const cm = closeRe.exec(rest);
      const end = cm ? cm.index + cm[0].length : rest.length;
      items.push(raw + rest.slice(0, end));
      TOKEN_RE.lastIndex += end;
      continue;
    }

    if (!isClose && (SKIP.has(tagName) || hasNoTranslate(attrs))) {
      flush();
      items.push(raw);
      if (!VOID.has(tagName) && !raw.endsWith('/>')) skipStack.push({ name: tagName, depth: 1 });
      continue;
    }

    if (INLINE.has(tagName)) {
      ensureSeg();
      if (isClose) {
        seg.parts.push('</' + tagName + '>');
        seg.rawParts.push(raw);
      } else {
        const item = makeTagItem(raw, tagName, attrs);
        seg.n += 1;
        seg.restore[seg.n] = item;
        seg.parts.push('<' + tagName + ' data-t="' + seg.n + '">');
        seg.rawParts.push(item);
      }
      continue;
    }

    // Блочный тег — граница фразы.
    flush();
    items.push(isClose ? raw : makeTagItem(raw, tagName, attrs));
  }
  flush();
  return items;
}

function collectKeys(items) {
  const keys = new Set();
  for (const it of items) {
    if (typeof it === 'string') continue;
    if (it.seg) {
      keys.add(it.key);
      for (const n of Object.keys(it.restore)) it.restore[n].attrs.forEach((a) => keys.add(a.key));
    } else if (it.rawParts) {
      for (const p of it.rawParts) if (typeof p !== 'string') p.attrs.forEach((a) => keys.add(a.key));
    } else if (it.attrs) {
      it.attrs.forEach((a) => keys.add(a.key));
    }
  }
  return [...keys];
}

function countPlaceholders(s) {
  return (s.match(/<[a-z0-9-]+ data-t="\d+">/gi) || []).length;
}

function renderSeg(it, lookup) {
  let dst = lookup.get(it.key);
  if (!dst || countPlaceholders(dst) !== countPlaceholders(it.key)) dst = it.key;
  const out = dst.replace(/<([a-z0-9-]+) data-t="(\d+)">/gi, (m, name, n) => {
    const item = it.restore[n];
    return item ? renderTag(item, lookup) : m;
  });
  return it.lead + out + it.trail;
}

function assemble(items, lookup) {
  let out = '';
  for (const it of items) {
    if (typeof it === 'string') out += it;
    else if (it.seg) out += renderSeg(it, lookup);
    else if (it.rawParts) for (const p of it.rawParts) out += typeof p === 'string' ? p : renderTag(p, lookup);
    else out += renderTag(it, lookup);
  }
  return out;
}

/** Ссылки и формы на внутренние адреса получают префикс /en (кроме помеченных hreflang). */
function rewriteLinks(html) {
  return html
    .replace(/<(a|form)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi, (m, tag, attrs) => {
      if (/\shreflang\s*=/i.test(attrs)) return m;
      return m.replace(/(\s(?:href|action)\s*=\s*)(["'])(\/[^"']*)\2/i, (mm, pre, q, url) => pre + q + withEnPrefix(url) + q);
    })
    // Скрипты сайта отдаются под /en/js/… с переведёнными строками (translateScript).
    .replace(/(<script\b[^>]*\ssrc\s*=\s*["'])\/js\/([\w-]+\.js)(["'])/gi, '$1/en/js/$2$3');
}

// ---------- перевод скриптов ----------
// Часть текста рисует JavaScript (баннер cookie, плеер, игры). Под /en/js/<файл>
// отдаём тот же файл, где строковые литералы с кириллицей переведены тем же
// кэшем фраз. Разбор: комментарии, строки, шаблонные строки и регулярки
// пропускаются как единое целое, чтобы кавычка внутри регулярки не сбивала разбор.

const fs = require('fs');
const path = require('path');
const JS_DIR = path.join(__dirname, '..', '..', 'public', 'js');
const scriptCache = new Map(); // имя файла -> { mtime, out }
const REGEX_BEFORE = /[(,=:[!&|?{};+\-*%<>~^]\s*$|\breturn\s*$|\btypeof\s*$|^\s*$/;

function tokenizeJs(src) {
  const tokens = []; // { kind: 'code'|'string'|'template', text, quote }
  let i = 0;
  let code = '';
  const pushCode = () => { if (code) { tokens.push({ kind: 'code', text: code }); code = ''; } };
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const j = end === -1 ? src.length : end;
      code += src.slice(i, j); i = j; continue;
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const j = end === -1 ? src.length : end + 2;
      code += src.slice(i, j); i = j; continue;
    }
    if (ch === '/' && REGEX_BEFORE.test(code.slice(-20))) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) { j++; break; }
        j++;
      }
      while (j < src.length && /[gimsuy]/.test(src[j])) j++;
      code += src.slice(i, j); i = j; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ch) break;
        if (ch !== '`' && src[j] === '\n') break;
        j++;
      }
      pushCode();
      tokens.push({ kind: ch === '`' ? 'template' : 'string', text: src.slice(i + 1, j), quote: ch });
      i = j + 1; continue;
    }
    code += ch; i++;
  }
  pushCode();
  return tokens;
}

function unescapeJs(s) {
  return s.replace(/\\(n|t|'|"|\\|`)/g, (m, c) => ({ n: '\n', t: '\t', "'": "'", '"': '"', '\\': '\\', '`': '`' }[c]));
}
function escapeJs(s, quote) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').split(quote).join('\\' + quote);
}

// Куски строки, которые переводим: для шаблонных строк — текст между ${…}.
function chunksOf(token) {
  if (token.kind === 'string') return [token.text];
  return token.text.split(/(\$\{[^}]*\})/);
}

async function translateJsSource(src) {
  const tokens = tokenizeJs(src);
  const units = []; // { token, idx, lead, trail, key }
  for (const token of tokens) {
    if (token.kind === 'code') continue;
    chunksOf(token).forEach((chunk, idx) => {
      if (chunk.startsWith('${') || !CYRILLIC_RE.test(chunk)) return;
      const text = unescapeJs(chunk);
      const lead = (text.match(/^\s*/) || [''])[0];
      const trail = text.length > lead.length ? (text.match(/\s*$/) || [''])[0] : '';
      units.push({ token, idx, lead, trail, key: normKey(text) });
    });
  }
  if (units.length === 0) return src;
  const lookup = await lookupMany(units.map((u) => u.key));
  const byToken = new Map();
  for (const u of units) {
    if (!byToken.has(u.token)) byToken.set(u.token, new Map());
    const dst = lookup.get(u.key);
    if (dst) byToken.get(u.token).set(u.idx, u.lead + rewriteLinks(dst) + u.trail);
  }
  let out = '';
  for (const token of tokens) {
    if (token.kind === 'code') { out += token.text; continue; }
    const repl = byToken.get(token);
    if (!repl || repl.size === 0) { out += token.quote + token.text + token.quote; continue; }
    const chunks = chunksOf(token).map((chunk, idx) => (repl.has(idx) ? escapeJs(repl.get(idx), token.quote) : chunk));
    out += token.quote + chunks.join('') + token.quote;
  }
  return out;
}

/** Отдаёт public/js/<name> с переведёнными строками; null — файла нет. */
async function translateScript(name) {
  if (!/^[\w-]+\.js$/.test(name)) return null;
  const file = path.join(JS_DIR, name);
  let stat;
  try { stat = fs.statSync(file); } catch (e) { return null; }
  const cached = scriptCache.get(name);
  if (cached && cached.mtime === stat.mtimeMs) return cached.out;
  const out = await translateJsSource(fs.readFileSync(file, 'utf8'));
  scriptCache.set(name, { mtime: stat.mtimeMs, out });
  return out;
}

/**
 * Переводит готовую HTML-страницу на английский.
 * @param {string} html
 * @returns {Promise<string>}
 */
async function translatePage(html) {
  const items = parse(html);
  const keys = collectKeys(items);
  const lookup = keys.length ? await lookupMany(keys) : new Map();
  let out = assemble(items, lookup);
  out = out.replace(/<html\b([^>]*)\slang\s*=\s*["']ru["']/i, '<html$1 lang="en"');
  out = out.replace(/(<meta\s+property\s*=\s*["']og:locale["']\s+content\s*=\s*["'])ru_RU(["'])/i, '$1en_US$2');
  return rewriteLinks(out);
}

module.exports = { translatePage, translateScript, withEnPrefix, isNoPrefixPath, setManual, resetTranslation, lookupMany };
