/**
 * СДЭК, API v2. Ключи — «Account» и «Secure password» из кабинета
 * (Интеграция → API), не логин от кабинета. Пока их нет, isConfigured=false
 * и модуль ничего не делает.
 *
 * Тарифы (проверено по /calculator/tarifflist 13.09.2026): 136 — посылка
 * склад–склад (до пункта выдачи), 137 — склад–дверь. Наш склад — город
 * отправителя из CDEK_FROM_CITY (код города СДЭК, Екатеринбург = 250).
 */
const ACCOUNT = process.env.CDEK_ACCOUNT;
const SECURE = process.env.CDEK_SECURE_PASSWORD;
const BASE = (process.env.CDEK_API_BASE || 'https://api.cdek.ru/v2').replace(/\/$/, '');
const FROM_CITY = Number(process.env.CDEK_FROM_CITY || 250);
const isConfigured = Boolean(ACCOUNT && SECURE);
const LABEL = 'СДЭК';

let token = null;
let tokenUntil = 0;

async function auth() {
  if (token && Date.now() < tokenUntil) return token;
  const r = await fetch(`${BASE}/oauth/token?parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ACCOUNT, client_secret: SECURE }),
  });
  if (!r.ok) throw new Error(`СДЭК: авторизация ${r.status}`);
  const j = await r.json();
  token = j.access_token;
  tokenUntil = Date.now() + Math.max(60, (j.expires_in || 3600) - 60) * 1000;
  return token;
}

async function api(path, body) {
  const t = await auth();
  const r = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`СДЭК: ${path} ${r.status}`);
  return r.json();
}

/** Вес из текста карточки («150 г», «1,4 кг», «~25 г») в граммах; пусто — 400 г по умолчанию. */
function parseWeight(text) {
  const m = String(text || '').replace(',', '.').match(/([\d.]+)\s*(кг|kg|г|g)/i);
  if (!m) return 400;
  const n = parseFloat(m[1]);
  return Math.round(/кг|kg/i.test(m[2]) ? n * 1000 : n);
}

// Код города СДЭК по названию: калькулятор не понимает строку «Санкт-Петербург»,
// только code или индекс. Кэш на процесс — справочник городов не меняется.
const cityCodes = new Map();
async function cityCode(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  if (cityCodes.has(key)) return cityCodes.get(key);
  const list = await api(`/location/suggest/cities?name=${encodeURIComponent(key)}&country_code=RU`);
  // Подсказка возвращает ближайшее совпадение даже для чепухи — берём только точное по названию.
  const exact = Array.isArray(list) ? list.find((c) => String(c.full_name || '').split(',')[0].trim().toLowerCase() === key) : null;
  const hit = exact ? exact.code : null;
  cityCodes.set(key, hit);
  return hit;
}

/** Стоимость и срок до двери и до ПВЗ по городу/индексу. */
async function quote({ city, postcode, items }) {
  if (!isConfigured) return null;
  const packages = [{ weight: Math.max(300, (items || []).reduce((s, i) => s + parseWeight(i.weight) * (i.qty || 1), 0)) }];
  let to;
  if (postcode) to = { postal_code: String(postcode) };
  else {
    const code = await cityCode(city);
    if (!code) return null;
    to = { code };
  }
  const out = {};
  for (const [name, code] of [['door', 137], ['pickup', 136]]) {
    const j = await api('/calculator/tariff', {
      tariff_code: code, from_location: { code: FROM_CITY }, to_location: to, packages,
    });
    out[name] = { price: Math.round(j.total_sum), days: `${j.period_min}–${j.period_max}` };
  }
  return out;
}

/** Пункты выдачи по коду города — для выбора при оформлении. */
async function pickupPoints(cityCode) {
  if (!isConfigured) return [];
  return api(`/deliverypoints?city_code=${encodeURIComponent(cityCode)}&type=PVZ`);
}

module.exports = { LABEL, isConfigured, quote, pickupPoints, parseWeight };
