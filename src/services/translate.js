// Автоперевод текстов на английский для админки.
//
// Основной движок — бесплатная ручка Google Translate, которой пользуется
// расширение Chrome (clients5.google.com, client=dict-chrome-ex). Ключей не нужно,
// принимает несколько абзацев за один POST-запрос, не трогает URL, markdown-ссылки
// вида [текст](url) и HTML-теги. Публичная ручка translate.googleapis.com (client=gtx)
// с домашнего IP отвечает 429 — поэтому она не используется.
// Запасной движок — MyMemory (тоже без ключа, лимит ~5 000 символов в день с IP,
// не больше 500 символов за запрос).
//
// Текст режется на абзацы по переводу строки, каждый абзац переводится отдельной
// строкой массива q, пустые строки сохраняются — структура текста остаётся как была.

const GOOGLE_URL = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex';
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
// Google принимает много текста за раз, но режем пачки, чтобы один упавший запрос
// не ронял весь длинный текст.
const BATCH_CHARS = 4000;
const TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function googleBatch(lines, from, to) {
  const body = new URLSearchParams();
  lines.forEach((l) => body.append('q', l));
  const res = await fetchWithTimeout(`${GOOGLE_URL}&sl=${from}&tl=${to}`, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Google ответил ${res.status}`);
  const data = await res.json();
  // Один q — приходит строка (или [строка, язык]); несколько — массив строк.
  let arr = Array.isArray(data) ? data : [data];
  if (lines.length === 1 && arr.length === 2 && typeof arr[1] === 'string' && /^[a-z]{2}(-[A-Za-z]+)?$/.test(arr[1])) {
    arr = [arr[0]];
  }
  const out = arr.map((item) => (Array.isArray(item) ? item[0] : item));
  if (out.length !== lines.length || out.some((s) => typeof s !== 'string')) {
    throw new Error('Google вернул неожиданный ответ');
  }
  return out;
}

async function myMemoryLine(line, from, to) {
  const url = `${MYMEMORY_URL}?langpair=${from}|${to}&q=${encodeURIComponent(line)}`;
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`MyMemory ответил ${res.status}`);
  const data = await res.json();
  const text = data && data.responseData && data.responseData.translatedText;
  if (data.responseStatus !== 200 || typeof text !== 'string') {
    throw new Error(`MyMemory: ${data.responseDetails || 'нет перевода'}`);
  }
  return text;
}

// Переводит массив строк (абзацев). Пустые строки не отправляются вовсе.
async function translateLines(lines, from, to) {
  const result = new Array(lines.length).fill('');
  const jobs = [];
  lines.forEach((line, i) => { if (line.trim()) jobs.push({ i, line }); });
  if (jobs.length === 0) return result;

  // Режем на пачки по объёму.
  const batches = [];
  let cur = [];
  let curLen = 0;
  for (const job of jobs) {
    if (cur.length && curLen + job.line.length > BATCH_CHARS) {
      batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(job);
    curLen += job.line.length;
  }
  if (cur.length) batches.push(cur);

  for (const batch of batches) {
    let lastError = null;
    try {
      const translated = await googleBatch(batch.map((j) => j.line), from, to);
      batch.forEach((j, k) => { result[j.i] = translated[k]; });
      continue;
    } catch (e) {
      lastError = e;
    }
    // Google не ответил — пробуем MyMemory построчно (у него лимит 500 символов на запрос).
    for (const job of batch) {
      if (job.line.length > 500) throw lastError;
      result[job.i] = await myMemoryLine(job.line, from, to);
    }
  }
  return result;
}

/**
 * Переводит текст с русского на английский, сохраняя абзацы и пустые строки.
 * @param {string} text
 * @param {{from?: string, to?: string}} [opts]
 * @returns {Promise<string>}
 */
async function translateText(text, opts = {}) {
  const from = opts.from || 'ru';
  const to = opts.to || 'en';
  const src = String(text || '');
  if (!src.trim()) return '';
  const lines = src.split(/\r?\n/);
  const translated = await translateLines(lines, from, to);
  return translated.join('\n');
}

/**
 * Переводит несколько текстов разом (заголовок + текст и т. п.).
 * @param {string[]} texts
 * @returns {Promise<string[]>}
 */
async function translateMany(texts, opts = {}) {
  const out = [];
  for (const t of texts) out.push(await translateText(t, opts));
  return out;
}

module.exports = { translateText, translateMany, translateLines };
