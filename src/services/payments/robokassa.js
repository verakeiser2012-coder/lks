const crypto = require('crypto');
const db = require('../../db');

const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN;
const PASSWORD1 = process.env.ROBOKASSA_PASSWORD1;
const PASSWORD2 = process.env.ROBOKASSA_PASSWORD2;
// Алгоритм из «Технических настроек» магазина в кабинете Robokassa (MD5 по умолчанию).
const HASH = (process.env.ROBOKASSA_HASH || 'md5').toLowerCase();
// Тестовый режим Robokassa: платежи не проводятся, деньги не списываются.
const IS_TEST = process.env.ROBOKASSA_TEST === '1';
// Система налогообложения для чека — пусто значит «как в кабинете».
const SNO = process.env.ROBOKASSA_SNO || '';
// ИП на УСН без НДС — ставка «none» на каждую позицию.
const TAX = process.env.ROBOKASSA_TAX || 'none';
const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';
const STATUS_URL = 'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt';

const isConfigured = Boolean(MERCHANT_LOGIN && PASSWORD1 && PASSWORD2);

function hash(str) {
  return crypto.createHash(HASH).update(str, 'utf8').digest('hex');
}

function formatSum(value) {
  return Number(value).toFixed(2);
}

// Чек для Робочеков: Robokassa сама пробивает его как платёжный агент,
// но номенклатуру должны передать мы, и сумма позиций обязана совпасть
// с суммой платежа копейка в копейку.
function buildReceipt(order) {
  const rows = db.prepare(`
    SELECT oi.product_name, oi.price, oi.qty, oi.variant, p.is_digital
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(order.id);

  const items = rows.map((row) => {
    const name = `${row.product_name}${row.variant ? ` (${row.variant})` : ''}`
      .replace(/["'<>&]/g, ' ')
      .slice(0, 128);
    const digital = Number(row.is_digital) === 1;
    return {
      name,
      quantity: row.qty,
      sum: Number(formatSum(row.price * row.qty)),
      // Файлы отдаём сразу после оплаты — полный расчёт; вещь едет позже —
      // предоплата (второй чек при отгрузке — см. notes/robokassa.md).
      payment_method: digital ? 'full_payment' : 'full_prepayment',
      payment_object: digital ? 'intellectual_activity' : 'commodity',
      tax: TAX,
    };
  });

  // Если в заказе есть надбавка сверх позиций (доставка), она тоже идёт в чек.
  const itemsSum = items.reduce((sum, item) => sum + item.sum, 0);
  const rest = Number(formatSum(order.total - itemsSum));
  if (rest > 0) {
    items.push({ name: 'Доставка', quantity: 1, sum: rest, payment_method: 'full_prepayment', payment_object: 'service', tax: TAX });
  }

  const receipt = { items };
  if (SNO) receipt.sno = SNO;
  return receipt;
}

/**
 * Создать платёж для заказа: вернуть ссылку на страницу оплаты Robokassa.
 * Пока ROBOKASSA_MERCHANT_LOGIN / PASSWORD1 / PASSWORD2 не заданы в .env,
 * работает в тестовом (mock) режиме — как yookassa.js, отдаёт ссылку на
 * локальную страницу «Тестовая оплата».
 *
 * Robokassa не требует серверного запроса на создание платежа: магазин
 * собирает параметры, подписывает их Паролем №1 и отправляет покупателя
 * на auth.robokassa.ru. Подтверждение оплаты приходит на ResultURL.
 */
async function createPayment(order, baseUrl) {
  if (!isConfigured) {
    return {
      provider: 'robokassa-mock',
      paymentId: `mock_${crypto.randomBytes(8).toString('hex')}`,
      confirmationUrl: `${baseUrl}/checkout/pay/${order.id}`,
    };
  }

  const outSum = formatSum(order.total);
  const invId = String(order.id);
  // Receipt в подписи участвует уже URL-кодированным; URLSearchParams закодирует
  // его второй раз для передачи — именно так в примере документации.
  const receipt = encodeURIComponent(JSON.stringify(buildReceipt(order)));
  const signature = hash(`${MERCHANT_LOGIN}:${outSum}:${invId}:${receipt}:${PASSWORD1}`);

  const params = new URLSearchParams({
    MerchantLogin: MERCHANT_LOGIN,
    OutSum: outSum,
    InvId: invId,
    Description: `Заказ №${order.id}`,
    Receipt: receipt,
    SignatureValue: signature,
    Culture: 'ru',
    Encoding: 'utf-8',
  });
  if (order.email) params.set('Email', order.email);
  if (IS_TEST) params.set('IsTest', '1');

  return {
    provider: IS_TEST ? 'robokassa-test' : 'robokassa',
    paymentId: invId,
    confirmationUrl: `${PAYMENT_URL}?${params.toString()}`,
  };
}

function signaturesMatch(expected, received) {
  return String(received || '').toLowerCase() === expected.toLowerCase();
}

/**
 * Проверить уведомление на ResultURL (Пароль №2). OutSum сверяется той же
 * строкой, что прислала Robokassa — в бою там шесть знаков после запятой.
 */
function verifyResultNotification(params) {
  const { OutSum, InvId, SignatureValue } = params;
  const expected = hash(`${OutSum}:${InvId}:${PASSWORD2}`);
  return { ok: signaturesMatch(expected, SignatureValue), orderId: Number(InvId), outSum: Number(OutSum) };
}

/** Проверить параметры возврата покупателя на SuccessURL (Пароль №1). */
function verifySuccessRedirect(params) {
  const { OutSum, InvId, SignatureValue } = params;
  const expected = hash(`${OutSum}:${InvId}:${PASSWORD1}`);
  return { ok: signaturesMatch(expected, SignatureValue), orderId: Number(InvId) };
}

/**
 * Спросить состояние платежа (OpStateExt). State.Code 100 — оплата проведена.
 * Работает только в боевом режиме: тестовые платежи этим методом не видны.
 */
async function checkPaymentStatus(orderId) {
  const signature = hash(`${MERCHANT_LOGIN}:${orderId}:${PASSWORD2}`);
  const url = `${STATUS_URL}?${new URLSearchParams({ MerchantLogin: MERCHANT_LOGIN, InvoiceID: String(orderId), Signature: signature })}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка Robokassa OpStateExt (${response.status})`);
  }
  const xml = await response.text();
  const resultCode = (xml.match(/<Result>\s*<Code>(\d+)<\/Code>/) || [])[1];
  if (resultCode !== '0') {
    throw new Error(`Robokassa OpStateExt: код результата ${resultCode || '?'}`);
  }
  const stateCode = (xml.match(/<State>\s*<Code>(\d+)<\/Code>/) || [])[1];
  return stateCode === '100';
}

module.exports = {
  createPayment,
  verifyResultNotification,
  verifySuccessRedirect,
  checkPaymentStatus,
  buildReceipt,
  isConfigured,
  isTest: IS_TEST,
};
