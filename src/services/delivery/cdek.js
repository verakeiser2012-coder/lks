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

/**
 * Габариты упаковки «30 × 22 × 12» (см) → {length,width,height}; пусто или мусор — null.
 * Для нескольких вещей в заказе берём место, в которое влезают все: наибольшие длина
 * и ширина, высоты складываем (вещи кладутся стопкой).
 */
function parseSize(text) {
  const m = String(text || '').replace(/,/g, '.').match(/([\d.]+)\s*[x×хX*]\s*([\d.]+)\s*[x×хX*]\s*([\d.]+)/);
  if (!m) return null;
  const [l, w, h] = [m[1], m[2], m[3]].map((v) => Math.max(1, Math.round(parseFloat(v))));
  return { length: l, width: w, height: h };
}
function packageSize(items) {
  const sizes = items.map((i) => parseSize(i.package_size)).filter(Boolean);
  if (!sizes.length) return { length: 25, width: 20, height: 15 };
  const out = { length: 0, width: 0, height: 0 };
  items.forEach((i) => {
    const s = parseSize(i.package_size) || { length: 25, width: 20, height: 15 };
    out.length = Math.max(out.length, s.length);
    out.width = Math.max(out.width, s.width);
    out.height += s.height * (i.qty || 1);
  });
  return out;
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

/**
 * Пункты выдачи для выбора при оформлении: по индексу или по названию города.
 * Отдаём компактный список — код, адрес, часы, ориентир; постаматы тоже
 * (в них не примерить, но забирать удобнее). Кэш на 6 часов: список меняется редко.
 */
const pointsCache = new Map();
async function pickupPoints({ city, postcode }) {
  if (!isConfigured) return [];
  let query;
  if (postcode) query = `postal_code=${encodeURIComponent(postcode)}`;
  else {
    const code = await cityCode(city);
    if (!code) return [];
    query = `city_code=${code}`;
  }
  const cached = pointsCache.get(query);
  if (cached && Date.now() - cached.at < 6 * 3600 * 1000) return cached.list;
  const raw = await api(`/deliverypoints?${query}&country_code=RU`);
  const list = (Array.isArray(raw) ? raw : [])
    .filter((p) => p.type === 'PVZ' || p.type === 'POSTAMAT')
    .map((p) => ({
      code: p.code,
      type: p.type === 'POSTAMAT' ? 'постамат' : 'пункт выдачи',
      address: (p.location && p.location.address) || '',
      city: (p.location && p.location.city) || '',
      hours: p.work_time || '',
      landmark: p.nearest_station || '',
      fitting: Boolean(p.is_dressing_room),
    }))
    .sort((a, b) => (a.type === b.type ? a.address.localeCompare(b.address, 'ru') : a.type === 'пункт выдачи' ? -1 : 1));
  pointsCache.set(query, { at: Date.now(), list });
  return list;
}

/**
 * Создать заказ (накладную) в СДЭК по оплаченному заказу сайта.
 * Тариф из orders.shipping_tariff: pickup → 136 до пункта выдачи (код пункта из
 * pickup_point «CODE · адрес»), door → 137 до двери (адрес покупателя).
 * Отправитель — ИП из настроек сайта, склад = CDEK_FROM_CITY (или пункт
 * сдачи CDEK_SHIPMENT_POINT, если задан). Стоимость вещей — как объявленная
 * ценность; наложенного платежа нет, заказ уже оплачен.
 * Возвращает { uuid }; номер накладной СДЭК присваивает чуть позже — orderInfo(uuid).
 */
async function createOrder({ order, items, sender }) {
  if (!isConfigured) throw new Error('СДЭК не подключён');
  const isPickup = order.shipping_tariff === 'pickup';
  const pickupCode = isPickup ? (String(order.pickup_point || '').match(/^([A-Za-z0-9_-]+)\s·/) || [])[1] : '';
  if (isPickup && !pickupCode) throw new Error('пункт выдачи выбран не из списка — накладную оформите вручную');
  let toLocation;
  if (!isPickup) {
    if (order.zip) toLocation = { postal_code: String(order.zip), city: order.city || undefined, address: order.address };
    else {
      const code = await cityCode(order.city);
      if (!code) throw new Error('не определён город получателя');
      toLocation = { code, address: order.address };
    }
  }
  const weight = Math.max(300, items.reduce((s, i) => s + parseWeight(i.weight) * (i.qty || 1), 0));
  const shipmentPoint = process.env.CDEK_SHIPMENT_POINT || '';
  const body = {
    type: 1,
    number: `site-${order.id}`,
    tariff_code: isPickup ? 136 : 137,
    comment: order.comment ? String(order.comment).slice(0, 250) : undefined,
    shipment_point: shipmentPoint || undefined,
    from_location: shipmentPoint ? undefined : { code: FROM_CITY, address: sender.address || 'склад' },
    delivery_point: isPickup ? pickupCode : undefined,
    to_location: toLocation,
    sender: { company: sender.company, name: sender.name, phones: [{ number: sender.phone }] },
    recipient: { name: order.customer_name, phones: [{ number: String(order.phone).replace(/[^\d+]/g, '') }], email: order.email || undefined },
    // Доставка уже оплачена на сайте — получателю ничего не доплачивать.
    delivery_recipient_cost: { value: 0 },
    packages: [{
      number: `site-${order.id}-1`,
      weight,
      // Габариты из карточек товаров (поле «Габариты упаковки»); без них — 25×20×15.
      ...packageSize(items),
      items: items.map((i, n) => ({
        name: String(i.product_name).slice(0, 255),
        ware_key: String(i.product_id || n + 1),
        payment: { value: 0 },
        cost: Number(i.price) || 0,
        weight: parseWeight(i.weight),
        amount: i.qty || 1,
      })),
    }],
  };
  const j = await api('/orders', body);
  const bad = (j.requests || []).find((r) => r.state === 'INVALID');
  if (bad) throw new Error('СДЭК: ' + (bad.errors || []).map((e) => e.message).join('; '));
  if (!j.entity || !j.entity.uuid) throw new Error('СДЭК: ответ без uuid');
  return { uuid: j.entity.uuid };
}

/** Номер накладной и текущий статус по uuid заказа СДЭК. */
async function orderInfo(uuid) {
  const j = await api(`/orders/${encodeURIComponent(uuid)}`);
  const e = j.entity || {};
  const st = (e.statuses || [])[0] || {};
  const error = (j.requests || []).filter((r) => r.state === 'INVALID').map((r) => (r.errors || []).map((x) => x.message).join('; ')).join('; ');
  return { track: e.cdek_number || '', status: st.name || st.code || '', error };
}

module.exports = { LABEL, isConfigured, quote, pickupPoints, parseWeight, parseSize, packageSize, createOrder, orderInfo };
