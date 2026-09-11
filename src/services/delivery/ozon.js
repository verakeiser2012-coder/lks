/**
 * Ozon Доставка для сторонних магазинов (не Seller API маркетплейса).
 *
 * Ключи — client_id и client_secret частного приложения из кабинета
 * dostavka.ozon.ru (Настройки → Управление частными приложениями), плюс ID
 * метода доставки из раздела «Методы доставки». В приложении должны быть
 * отмечены четыре доступа по отдельности: delivery-api.delivery,
 * delivery-api.delivery-point, delivery-api.order, delivery-api.posting —
 * одного delivery-api.all мало, API отвечает 400.
 *
 * Тариф с 04.06.2026 — 30 ₽ за товар за выдачу в ПВЗ, фиксированно.
 * Стоимость не считается без телефона получателя.
 *
 * Адреса методов у Ozon меняются; базовый URL и пути берутся из .env,
 * чтобы поправить без правки кода при подключении.
 */
const CLIENT_ID = process.env.OZON_DELIVERY_CLIENT_ID;
const CLIENT_SECRET = process.env.OZON_DELIVERY_CLIENT_SECRET;
const METHOD_ID = process.env.OZON_DELIVERY_METHOD_ID;
const BASE = (process.env.OZON_DELIVERY_API_BASE || 'https://api-delivery.ozon.ru').replace(/\/$/, '');
const isConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && METHOD_ID);
const LABEL = 'Пункт выдачи Ozon';

let token = null;
let tokenUntil = 0;

async function auth() {
  if (token && Date.now() < tokenUntil) return token;
  const r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`Ozon Доставка: авторизация ${r.status}`);
  const j = await r.json();
  token = j.access_token;
  tokenUntil = Date.now() + Math.max(60, (j.expires_in || 3600) - 60) * 1000;
  return token;
}

async function api(path, body) {
  const t = await auth();
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(`Ozon Доставка: ${path} ${r.status}`);
  return r.json();
}

/** Доступность и срок выдачи в ПВЗ Ozon по городу. */
async function quote({ city, items }) {
  if (!isConfigured) return null;
  const j = await api('/v1/delivery/check', {
    delivery_method_id: Number(METHOD_ID),
    city: String(city || ''),
    items: (items || []).map((i) => ({ quantity: i.qty || 1, weight: i.weight || 400 })),
  });
  // Тариф фиксированный на товар — считаем сами, ответ API уточняет только доступность и срок.
  const units = (items || []).reduce((s, i) => s + (i.qty || 1), 0);
  return { pickup: { price: 30 * units, days: j.delivery_days || j.days || '', available: j.available !== false } };
}

/** Пункты выдачи Ozon по городу. */
async function pickupPoints(city) {
  if (!isConfigured) return [];
  const j = await api('/v1/delivery-point/list', { city: String(city || '') });
  return j.items || j.delivery_points || [];
}

module.exports = { LABEL, isConfigured, quote, pickupPoints };
