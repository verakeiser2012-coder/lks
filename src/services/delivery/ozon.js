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
 * Метод доставки (shipment_method_id) заведён в кабинете («лучший», ПВЗ на
 * Московской 251); штрихкода в карточке нет, номер — в адресе страницы
 * редактирования. Хранится в OZON_DELIVERY_METHOD_ID.
 *
 * Интерфейс общий с СДЭК (см. index.js): quote / pickupPoints / createOrder /
 * orderInfo. Ozon возит только в свои ПВЗ и только покупателям с аккаунтом
 * Ozon на этот телефон, поэтому «до двери» здесь нет, а quote без телефона
 * или с телефоном, которого Ozon не знает, отвечает null — вариант просто
 * не показывается.
 */
const crypto = require('crypto');
const points = require('./ozonPoints');
const { parseWeight, packageSize } = require('./cdek');

const CLIENT_ID = process.env.OZON_DELIVERY_CLIENT_ID;
const CLIENT_SECRET = process.env.OZON_DELIVERY_CLIENT_SECRET;
const METHOD_ID = Number(process.env.OZON_DELIVERY_METHOD_ID || 0);
const TOKEN_URL = 'https://xapi.ozon.ru/oauth/token';
const BASE = (process.env.OZON_DELIVERY_API_BASE || 'https://api-delivery.ozon.ru').replace(/\/$/, '');
const isConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && METHOD_ID);
const LABEL = 'Ozon';

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

async function api(path, body, extraHeaders) {
  const t = await auth();
  const r = await post(`${BASE}${path}`, body || {}, { Authorization: `Bearer ${t}`, ...extraHeaders });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Ozon Delivery: ${path} ${r.status} ${(j.error && j.error.message) || j.message || ''}`);
  return j;
}

/** Детерминированный UUID из строки: повтор запроса по тому же заказу не создаст второй. */
function uuidFor(str) {
  const h = crypto.createHash('md5').update(str).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return d ? `+${d}` : '';
}

/** Есть ли у покупателя вообще доставка Ozon: нужен аккаунт Ozon на этот телефон. */
async function checkClient(phone) {
  if (!isConfigured) return null;
  const p = normalizePhone(phone);
  if (!/^\+7\d{10}$/.test(p)) return false;
  const j = await api('/v1/delivery/check-client', { phone_number: p });
  return Boolean(j.can_be_delivered);
}

function postingFor(items) {
  const weight = Math.max(100, (items || []).reduce((s, i) => s + parseWeight(i.weight) * (i.qty || 1), 0));
  const size = packageSize(items || []);
  const declared = Math.round((items || []).reduce((s, i) => s + (Number(i.price) || 0) * (i.qty || 1), 0) * 100) / 100;
  return {
    request_id: 1,
    shipment_method_id: METHOD_ID,
    declared_value: { amount: declared.toFixed(2), currency_code: 'RUB' },
    dimensions: { weight_g: weight, length_mm: size.length * 10, width_mm: size.width * 10, height_mm: size.height * 10 },
  };
}

/**
 * Предварительный расчёт «до пункта выдачи» по городу. Точную стоимость Ozon
 * считает только до конкретного ПВЗ, поэтому берём первый пункт города как
 * представителя: внутри города цена одна. Телефон обязателен — без аккаунта
 * Ozon у покупателя доставки нет, и предлагать её нечестно.
 */
async function quote({ city, items, phone }) {
  if (!isConfigured) return null;
  if (!phone || !(await checkClient(phone))) return null;
  const sample = points.searchPoints({ city, limit: 1 })[0];
  if (!sample) return null;
  const j = await api('/v1/order/checkout', {
    recipient: { phone_number: normalizePhone(phone) },
    postings: [postingFor(items)],
    delivery: { delivery_point: { delivery_point_id: sample.id } },
  });
  const res = ((j.results || [])[0] || {});
  if (!res.posting) return null;
  const price = Number(res.posting.estimated_delivery_cost && res.posting.estimated_delivery_cost.amount || 0)
    + Number(res.posting.estimated_insurance_cost && res.posting.estimated_insurance_cost.amount || 0);
  return { pickup: { price: Math.round(price), days: String(res.posting.estimated_delivery_days || '') } };
}

/** Пункты выдачи в том же виде, что у СДЭК: code, type, address, city, hours. */
async function pickupPoints({ city }) {
  if (!isConfigured) return [];
  return points.searchPoints({ city }).map((p) => ({
    code: String(p.id),
    type: p.type === 'postamat' ? 'постамат' : 'пункт выдачи',
    address: p.address.replace(/^Россия,\s*/, ''),
    city: p.city,
    hours: p.hours,
    landmark: p.number ? `Ozon ${p.number}` : '',
    fitting: false,
  }));
}

/**
 * Заказ в Ozon после оплаты и сразу подтверждение сборки: Ozon проверяет баланс
 * кабинета доставки — при нуле подтверждение отклоняется, заказ остаётся
 * «в ручную» с понятной причиной. Возвращаем номер отправления как uuid.
 */
async function createOrder({ order, items }) {
  if (!isConfigured) throw new Error('Ozon Доставка не подключена');
  const pointId = (String(order.pickup_point || '').match(/^(\d+)\s·/) || [])[1];
  if (!pointId) throw new Error('пункт выдачи Ozon выбран не из списка — оформите отправление вручную');
  const phone = normalizePhone(order.phone);
  const posting = postingFor(items);
  posting.posting_external_id = `site-${order.id}-1`;
  posting.description = items.map((i) => `${i.product_name} × ${i.qty || 1}`).join(', ').slice(0, 250);
  const j = await api('/v1/order/create', {
    order_external_id: `site-${order.id}`,
    recipient: { phone_number: phone, full_name: order.customer_name },
    delivery: { delivery_point: { delivery_point_id: Number(pointId) } },
    postings: [posting],
  }, { 'Idempotency-Key': uuidFor(`site-order-${order.id}`) });
  const first = (j.postings || [])[0] || {};
  const postingNumber = first.posting_number || first.number || '';
  if (!postingNumber) throw new Error('Ozon: ответ без номера отправления');
  try {
    await api('/v1/posting/approve', { posting_number: postingNumber });
  } catch (e) {
    // Заказ уже создан; сборку подтвердим из админки, когда пополнится баланс.
    return { uuid: postingNumber, warning: `отправление создано, но сборка не подтверждена: ${e.message}` };
  }
  return { uuid: postingNumber };
}

/** Статус отправления по его номеру (то, что мы храним как uuid). */
async function orderInfo(postingNumber) {
  const j = await api('/v1/posting/info', { posting_number: postingNumber });
  const p = j.posting || j;
  return { track: p.posting_number || postingNumber, status: p.status || '', error: '' };
}

/** Этикетка PDF для передачи отправления в ПВЗ. */
async function label(postingNumber) {
  const t = await auth();
  const r = await post(`${BASE}/v1/posting/label`, { posting_number: postingNumber }, { Authorization: `Bearer ${t}` });
  if (!r.ok) throw new Error(`Ozon: этикетка ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Синхронизация справочника ПВЗ: раз в сутки в фоне. Первую можно дёрнуть
 * руками: node -e "require('./src/services/delivery/ozon').syncPoints()".
 */
async function syncPoints(log = (m) => console.log('[ozon]', m)) {
  if (!isConfigured) return { status: 'skipped' };
  return points.syncPoints({
    fetchList: (cursor) => api('/v1/delivery-point/list', { pagination: { limit: 100, ...(cursor ? { cursor } : {}) } }),
    fetchInfo: (ids) => api('/v1/delivery-point/info', { delivery_point_ids: ids }),
    log,
  });
}

/** Запускается из server.js: если справочник пустой или старше суток — обновить, не мешая запуску. */
function scheduleSync() {
  if (!isConfigured) return;
  const tick = () => {
    if (points.isFresh()) return;
    syncPoints().catch((e) => console.error('[ozon] синхронизация ПВЗ:', e.message));
  };
  setTimeout(tick, 15000);
  setInterval(tick, 6 * 3600 * 1000);
}

module.exports = { LABEL, isConfigured, checkClient, quote, pickupPoints, createOrder, orderInfo, label, syncPoints, scheduleSync, hasPoints: points.hasPoints };
