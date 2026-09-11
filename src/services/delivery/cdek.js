/**
 * СДЭК, API v2. Ключи — «Account» и «Secure password» из кабинета
 * (Интеграция → API), не логин от кабинета. Пока их нет, isConfigured=false
 * и модуль ничего не делает.
 *
 * Тарифы: 136 — посылка склад–дверь, 137 — склад–склад (ПВЗ). Наш склад —
 * город отправителя из CDEK_FROM_CITY (код города СДЭК, Екатеринбург = 250).
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

/** Стоимость и срок до двери и до ПВЗ по городу/индексу. */
async function quote({ city, postcode, items }) {
  if (!isConfigured) return null;
  const packages = [{ weight: Math.max(300, (items || []).reduce((s, i) => s + (i.weight || 400) * (i.qty || 1), 0)) }];
  const to = postcode ? { postal_code: String(postcode) } : { city: String(city || '') };
  const out = {};
  for (const [name, code] of [['door', 136], ['pickup', 137]]) {
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

module.exports = { LABEL, isConfigured, quote, pickupPoints };
