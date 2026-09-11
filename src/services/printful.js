const db = require('../db');
const { notify } = require('./mail');

/**
 * Печать по требованию через Printful.
 *
 * Printful не берёт деньги с покупателя — он печатает вещь и списывает
 * себестоимость с нашего счёта, поэтому заказ уходит к нему только после
 * оплаты на сайте. Здесь два ограничения, о которых надо помнить:
 *
 * 1. С российского хостинга api.printful.com отвечает 403 (проверено с VPS:
 *    страна IP — RU). Поэтому адрес API берётся из PRINTFUL_API_BASE — туда
 *    ставится наш ретранслятор за пределами РФ, который просто пробрасывает
 *    запрос с тем же путём и заголовками.
 * 2. Пока PRINTFUL_TOKEN не задан, ничего не отправляется: позиции помечаются
 *    «вручную», а на почту уходит письмо — заказ не потеряется, его можно
 *    оформить в кабинете Printful руками.
 *
 * Заказ создаётся черновиком (без confirm): Printful не начнёт печать, пока
 * его не подтвердить в кабинете. На старте это страховка от случайных списаний.
 */
const TOKEN = process.env.PRINTFUL_TOKEN;
const BASE = (process.env.PRINTFUL_API_BASE || 'https://api.printful.com').replace(/\/$/, '');
const STORE_ID = process.env.PRINTFUL_STORE_ID || '';
const isConfigured = Boolean(TOKEN);

// Страну покупатель пишет словами; Printful ждёт код ISO-2.
const COUNTRIES = {
  россия: 'RU', russia: 'RU', казахстан: 'KZ', kazakhstan: 'KZ', беларусь: 'BY', белоруссия: 'BY', belarus: 'BY',
  армения: 'AM', armenia: 'AM', грузия: 'GE', georgia: 'GE', германия: 'DE', germany: 'DE', франция: 'FR', france: 'FR',
  сша: 'US', usa: 'US', 'united states': 'US', великобритания: 'GB', uk: 'GB', 'united kingdom': 'GB', англия: 'GB',
  италия: 'IT', italy: 'IT', испания: 'ES', spain: 'ES', турция: 'TR', turkey: 'TR', оаэ: 'AE', uae: 'AE',
  израиль: 'IL', israel: 'IL', кипр: 'CY', cyprus: 'CY', сербия: 'RS', serbia: 'RS', чехия: 'CZ', czechia: 'CZ',
  польша: 'PL', poland: 'PL', нидерланды: 'NL', netherlands: 'NL', финляндия: 'FI', finland: 'FI', латвия: 'LV',
  литва: 'LT', эстония: 'EE', португалия: 'PT', portugal: 'PT', канада: 'CA', canada: 'CA', австралия: 'AU', australia: 'AU',
  япония: 'JP', japan: 'JP', корея: 'KR', китай: 'CN', china: 'CN', узбекистан: 'UZ', киргизия: 'KG', кыргызстан: 'KG',
};

function toCountryCode(raw) {
  const s = String(raw || '').trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return COUNTRIES[s.toLowerCase()] || '';
}

/**
 * Варианты вещи хранятся текстом в товаре, по строке на размер:
 *   S 4012345678
 *   M — 4012345679
 * Слева подпись, которую видит покупатель, справа sync variant id из Printful.
 */
function parseVariants(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(.+?)\s*[—:\-–]?\s+(\d{6,})$/))
    .filter(Boolean)
    .map((m) => ({ label: m[1].trim(), id: m[2] }));
}

function variantIdFor(product, label) {
  const list = parseVariants(product && product.printful_variants);
  if (!list.length) return '';
  if (!label) return list.length === 1 ? list[0].id : '';
  const hit = list.find((v) => v.label.toLowerCase() === String(label).toLowerCase());
  return hit ? hit.id : '';
}

function printfulItems(orderId) {
  return db.prepare(`
    SELECT oi.*, p.printful_variants, p.fulfillment
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? AND p.fulfillment = 'printful'
  `).all(orderId);
}

function markItems(orderId, status, ref) {
  db.prepare(`
    UPDATE order_items SET fulfillment_status = ?, fulfillment_ref = ?
    WHERE order_id = ? AND product_id IN (SELECT id FROM products WHERE fulfillment = 'printful')
  `).run(status, ref || '', orderId);
}

async function request(path, body) {
  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
  if (STORE_ID) headers['X-PF-Store-Id'] = STORE_ID;
  const response = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Printful ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

/**
 * Отправить в Printful позиции оплаченного заказа. Никогда не бросает наружу:
 * оформление на сайте не должно падать из-за печатника.
 * Возвращает { status, detail } — для админки.
 */
async function submitOrder(orderId) {
  const rows = printfulItems(orderId);
  if (!rows.length) return { status: 'skipped', detail: 'в заказе нет вещей печати по требованию' };

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const admin = `Заказ №${orderId} (${order.customer_name}, ${order.phone})`;

  const items = [];
  for (const row of rows) {
    const id = variantIdFor(row, row.variant);
    if (!id) {
      markItems(orderId, 'manual', '');
      await notify(`Printful: заказ №${orderId} ждёт ручной отправки`,
        `${admin}: у позиции «${row.product_name}» (${row.variant || 'без варианта'}) не найден sync variant id. Оформите в кабинете Printful вручную.`);
      return { status: 'manual', detail: `нет variant id для «${row.product_name}»` };
    }
    items.push({ sync_variant_id: Number(id), quantity: row.qty, retail_price: String(row.price) });
  }

  const country = toCountryCode(order.country);
  if (!country || !order.city || !order.address) {
    markItems(orderId, 'manual', '');
    await notify(`Printful: заказ №${orderId} ждёт ручной отправки`,
      `${admin}: адрес неполный (страна «${order.country}», город «${order.city}», адрес «${order.address}»). Уточните у покупателя и оформите вручную.`);
    return { status: 'manual', detail: 'неполный адрес' };
  }

  if (!isConfigured) {
    markItems(orderId, 'manual', '');
    await notify(`Printful: заказ №${orderId} ждёт ручной отправки`,
      `${admin}: PRINTFUL_TOKEN не задан, автоматическая отправка выключена. Позиции: ${rows.map((r) => `${r.product_name} ${r.variant || ''} ×${r.qty}`).join('; ')}. Адрес: ${order.country}, ${order.zip}, ${order.city}, ${order.address}.`);
    return { status: 'manual', detail: 'PRINTFUL_TOKEN не задан' };
  }

  const payload = {
    external_id: `levkeiser-${orderId}`,
    recipient: {
      name: order.customer_name,
      address1: order.address,
      city: order.city,
      country_code: country,
      zip: order.zip || '',
      phone: order.phone,
      email: order.email || '',
    },
    items,
  };

  try {
    const result = await request('/orders', payload);
    const ref = result && result.result ? String(result.result.id) : '';
    markItems(orderId, 'sent', ref);
    await notify(`Printful: заказ №${orderId} создан черновиком`,
      `${admin}: черновик #${ref} в Printful. Печать начнётся после подтверждения в кабинете.`);
    return { status: 'sent', detail: `черновик #${ref}` };
  } catch (err) {
    markItems(orderId, 'failed', '');
    await notify(`Printful: заказ №${orderId} не отправился`, `${admin}: ${err.message}`);
    return { status: 'failed', detail: err.message };
  }
}

module.exports = { isConfigured, parseVariants, variantIdFor, toCountryCode, submitOrder, printfulItems };
