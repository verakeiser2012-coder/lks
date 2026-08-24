const crypto = require('crypto');

const USERNAME = process.env.ALFA_API_LOGIN;
const PASSWORD = process.env.ALFA_API_PASSWORD;
const TOKEN = process.env.ALFA_API_TOKEN;
// По умолчанию — тестовый (UAT) стенд из официальной документации Альфа-Банка.
// Перед приёмом реальных платежей уточните боевой адрес шлюза в личном кабинете
// партнёра и, если он отличается, пропишите его в ALFA_GATEWAY_URL.
const GATEWAY_URL = process.env.ALFA_GATEWAY_URL || 'https://alfa.rbsuat.com/payment/rest/';
const isConfigured = Boolean(TOKEN || (USERNAME && PASSWORD));

function authParams() {
  return TOKEN ? { token: TOKEN } : { userName: USERNAME, password: PASSWORD };
}

async function gatewayRequest(method, data) {
  const response = await fetch(`${GATEWAY_URL}${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...authParams(), ...data }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ошибка шлюза Альфа-Банка (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Создать платёж для заказа через эквайринг Альфа-Банка (register.do).
 * Пока ALFA_API_TOKEN (или пара ALFA_API_LOGIN/ALFA_API_PASSWORD) не заданы
 * в .env, работает в тестовом (mock) режиме — так же, как yookassa.js,
 * возвращает ссылку на локальную страницу "Тестовая оплата".
 *
 * Когда банк выдаст логин/пароль или токен API, впишите их в .env —
 * функция начнёт создавать реальные платежи через шлюз Альфа-Банка.
 */
async function createPayment(order, baseUrl) {
  if (!isConfigured) {
    return {
      provider: 'alfabank-mock',
      paymentId: `mock_${crypto.randomBytes(8).toString('hex')}`,
      confirmationUrl: `${baseUrl}/checkout/pay/${order.id}`,
    };
  }

  const result = await gatewayRequest('register.do', {
    orderNumber: String(order.id),
    amount: String(Math.round(order.total * 100)), // сумма в копейках
    returnUrl: `${baseUrl}/checkout/success?orderId=${order.id}`,
    // Отдельной страницы для неуспешной оплаты пока нет — TODO при подключении
    // реальных платежей сделать вид checkout с понятным сообщением об ошибке.
    failUrl: `${baseUrl}/checkout`,
    description: `Заказ №${order.id}`,
  });

  if (String(result.errorCode) !== '0') {
    throw new Error(`Ошибка Альфа-Банка (${result.errorCode}): ${result.errorMessage}`);
  }

  return {
    provider: 'alfabank',
    paymentId: result.orderId,
    confirmationUrl: result.formUrl,
  };
}

/**
 * Проверить состояние платежа в шлюзе Альфа-Банка (getOrderStatus.do).
 * OrderStatus === 2 означает, что оплата полностью проведена.
 */
async function checkPaymentStatus(paymentId) {
  const result = await gatewayRequest('getOrderStatus.do', { orderId: paymentId });
  return String(result.OrderStatus) === '2';
}

module.exports = { createPayment, checkPaymentStatus, isConfigured };
