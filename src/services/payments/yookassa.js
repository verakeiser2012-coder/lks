const crypto = require('crypto');

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const isConfigured = Boolean(SHOP_ID && SECRET_KEY);

/**
 * Создать платёж для заказа.
 * Пока YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY не заданы в .env, работает
 * в тестовом (mock) режиме: возвращает ссылку на локальную страницу
 * "Тестовая оплата" вместо реальной ЮKassa.
 *
 * Когда получите ключи от ЮKassa (https://yookassa.ru/), впишите их в .env —
 * функция автоматически начнёт создавать реальные платежи через API ЮKassa.
 */
async function createPayment(order, baseUrl) {
  if (!isConfigured) {
    return {
      provider: 'yookassa-mock',
      paymentId: `mock_${crypto.randomBytes(8).toString('hex')}`,
      confirmationUrl: `${baseUrl}/checkout/pay/${order.id}`,
    };
  }

  // Реальный вызов API ЮKassa: https://yookassa.ru/developers/api
  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': crypto.randomUUID(),
      Authorization: `Basic ${Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: { value: order.total.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${baseUrl}/checkout/success?orderId=${order.id}`,
      },
      description: `Заказ №${order.id}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ошибка ЮKassa (${response.status}): ${text}`);
  }

  const payment = await response.json();
  return {
    provider: 'yookassa',
    paymentId: payment.id,
    confirmationUrl: payment.confirmation.confirmation_url,
  };
}

module.exports = { createPayment, isConfigured };
