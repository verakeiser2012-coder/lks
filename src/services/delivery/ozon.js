/**
 * Ozon Доставка для бизнеса — Ozon Delivery API.
 *
 * Не путать с Seller API маркетплейса: там другие ключи (Client-Id + Api-Key)
 * и другие методы, и они отвечают 403 на всё про доставку. Здесь — частное
 * приложение из кабинета доставки: client_id (UUID) и client_secret, токен
 * по OAuth client_credentials. Проверено 13.09.2026: у нашего приложения
 * одобрен только scope delivery-api.all — с ним токен выдаётся, отдельные
 * scope отвечают «not approved», поэтому запрашиваем именно all.
 *
 * Серверы Ozon стоят за testcookie: первый запрос получает 302/307 с
 * Set-Cookie, повторять надо с той же куки — держим её в памяти процесса.
 *
 * Метод доставки (shipment_method_id) заводится в кабинете, раздел «Методы
 * доставки»; номер под штрихкодом — в OZON_DELIVERY_METHOD_ID. Без него
 * можно проверять доступность и список ПВЗ, но нельзя считать стоимость
 * и создавать заказы.
 *
 * Тариф с 04.06.2026 — 30 ₽ за товар за выдачу в ПВЗ; точную стоимость с
 * учётом объёма и страховки отдаёт /v1/order/checkout.
 */
const CLIENT_ID = process.env.OZON_DELIVERY_CLIENT_ID;
const CLIENT_SECRET = process.env.OZON_DELIVERY_CLIENT_SECRET;
const METHOD_ID = Number(process.env.OZON_DELIVERY_METHOD_ID || 0);
const TOKEN_URL = 'https://xapi.ozon.ru/oauth/token';
const BASE = (process.env.OZON_DELIVERY_API_BASE || 'https://api-delivery.ozon.ru').replace(/\/$/, '');
const isConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);
const LABEL = 'Пункт выдачи Ozon';

let token = null;
let tokenUntil = 0;
let cookie = '';

/** POST с обработкой testcookie-редиректа: повторяем запрос по Location с полученной кукой. */
async function post(url, body, headers) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const r = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: JSON.stringify(body),
    });
    if (r.status === 302 || r.status === 307) {
      const set = r.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      url = new URL(r.headers.get('location'), url).toString();
      continue;
    }
    return r;
  }
  throw new Error('Ozon Delivery: не прошли проверку testcookie');
}

async function auth() {
  if (token && Date.now() < tokenUntil) return token;
  const r = await post(TOKEN_URL, {
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials', scope: ['delivery-api.all'],
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`Ozon Delivery: авторизация ${r.status} ${j.message || ''}`);
  token = j.access_token;
  // expires_in у Ozon — абсолютное время в секундах, а не срок жизни.
  const exp = Number(j.expires_in || 0);
  tokenUntil = exp > 1e9 ? exp * 1000 - 60000 : Date.now() + Math.max(60, exp - 60) * 1000;
  return token;
}

async function api(path, body) {
  const t = await auth();
  const r = await post(`${BASE}${path}`, body || {}, { Authorization: `Bearer ${t}` });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Ozon Delivery: ${path} ${r.status} ${(j.error && j.error.message) || j.message || ''}`);
  return j;
}

/** Есть ли у покупателя вообще доставка Ozon: нужен аккаунт Ozon на этот телефон. */
async function checkClient(phone) {
  if (!isConfigured) return null;
  const j = await api('/v1/delivery/check-client', { phone_number: normalizePhone(phone) });
  return Boolean(j.can_be_delivered);
}

/** Пункты выдачи; список на всю страну большой — берём порциями limit/offset. */
async function pickupPoints({ limit = 500, offset = 0 } = {}) {
  if (!isConfigured) return [];
  const j = await api('/v1/delivery-point/list', { pagination: { limit, offset } });
  return j.delivery_points || j.items || j.points || [];
}

/**
 * Предварительный расчёт срока и стоимости (с страховкой) до ПВЗ или до двери.
 * items: [{ qty, weight (г), price (₽) }]. Без метода доставки считать нечего.
 */
async function quote({ items, pointId, address, coordinates }) {
  if (!isConfigured || !METHOD_ID) return null;
  const weight = Math.max(100, (items || []).reduce((s, i) => s + (i.weight || 400) * (i.qty || 1), 0));
  const declared = Math.round((items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0) * 100) / 100;
  const body = {
    shipment_method_id: METHOD_ID,
    postings: [{
      dimensions: { weight_g: weight, length_cm: 30, width_cm: 20, height_cm: 10 },
      declared_value: declared,
    }],
    delivery_type: pointId ? 'pickup' : 'courier',
    ...(pointId ? { pickup: { delivery_point_id: pointId } } : { courier: { address, coordinates } }),
  };
  const j = await api('/v1/order/checkout', body);
  return j;
}

function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return `+${d}`;
}

module.exports = { LABEL, isConfigured, hasMethod: METHOD_ID > 0, checkClient, pickupPoints, quote };
