const crypto = require('crypto');
const db = require('../db');
const { notify } = require('./mail');

const SITE = process.env.SITE_URL || 'https://levkeiser.com';

// Сколько живёт ссылка и сколько раз по ней можно скачать.
// Смысл ограничений: ссылка попадает в письмо, письмо легко переслать.
// Тридцати дней и пяти скачиваний хватает покупателю на любые перезаливки,
// но не превращает ссылку в публичную раздачу.
const LINK_DAYS = 30;
const MAX_DOWNLOADS = 5;

/**
 * Есть ли в заказе цифровые товары.
 */
function orderHasDigital(orderId) {
  const row = db
    .prepare(`
      SELECT COUNT(*) AS n FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND p.is_digital = 1 AND p.digital_file <> ''
    `)
    .get(orderId);
  return Boolean(row && row.n > 0);
}

/**
 * Только ли из цифровых товаров состоит корзина.
 * От этого зависит, спрашивать ли адрес доставки на оформлении.
 */
function cartIsDigitalOnly(items) {
  return items.length > 0 && items.every((item) => Number(item.product.is_digital) === 1);
}

/**
 * Выдать ссылки на скачивание по оплаченному заказу.
 * Вызывается после подтверждения оплаты. Повторный вызов ничего не дублирует —
 * вебхук ЮKassa может прийти дважды, и это нормально.
 */
function issueDownloads(orderId) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM downloads WHERE order_id = ?').get(orderId);
  if (existing && existing.n > 0) {
    return db.prepare('SELECT * FROM downloads WHERE order_id = ?').all(orderId);
  }

  const items = db
    .prepare(`
      SELECT oi.product_id, oi.product_name, p.digital_file, p.digital_filename
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? AND p.is_digital = 1 AND p.digital_file <> ''
    `)
    .all(orderId);

  if (items.length === 0) {
    return [];
  }

  const expiresAt = new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  const insert = db.prepare(`
    INSERT INTO downloads (order_id, product_id, product_name, token, file_path, file_name, max_downloads, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insert.run(
      orderId,
      item.product_id,
      item.product_name,
      crypto.randomBytes(24).toString('hex'),
      item.digital_file,
      item.digital_filename || item.product_name,
      MAX_DOWNLOADS,
      expiresAt
    );
  }

  return db.prepare('SELECT * FROM downloads WHERE order_id = ?').all(orderId);
}

/**
 * Письмо покупателю со ссылками. Без письма цифровой товар не доставлен:
 * страница «спасибо» закрывается, а ссылка должна остаться у человека.
 */
async function sendDownloadEmail(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || !order.email) {
    return false;
  }

  const downloads = db.prepare('SELECT * FROM downloads WHERE order_id = ?').all(orderId);
  if (downloads.length === 0) {
    return false;
  }

  const lines = downloads.map((d) => `${d.product_name}\n${SITE}/downloads/${d.token}`);
  const text = [
    `Здравствуйте, ${order.customer_name}!`,
    '',
    `Заказ №${order.id} оплачен, файлы готовы к скачиванию:`,
    '',
    lines.join('\n\n'),
    '',
    `Ссылки действуют ${LINK_DAYS} дней, скачать можно до ${MAX_DOWNLOADS} раз.`,
    'Если что-то не открывается — просто ответьте на это письмо.',
    '',
    'DJ Levka',
  ].join('\n');

  await notify(`Ваш заказ №${order.id} — файлы для скачивания`, text, order.email);
  return true;
}

/**
 * Полный цикл после оплаты: выдать ссылки и отправить письмо.
 *
 * Ссылки выдаются сразу — они и есть доставка: покупатель видит их
 * на странице «спасибо», они же лежат в админке заказа. Письмо только
 * дублирует их, поэтому уходит вдогонку и никого не задерживает.
 *
 * Раньше ответ ждал почтовый сервер. Молчащий SMTP держал покупателя
 * до таймаута, хотя файлы к тому моменту были уже выданы.
 */
async function deliverDigital(orderId) {
  const downloads = issueDownloads(orderId);
  if (downloads.length === 0) {
    return [];
  }
  sendDownloadEmail(orderId).catch((err) => {
    console.error('[digital] Не удалось отправить письмо со ссылками:', err.message);
  });
  return downloads;
}

module.exports = {
  orderHasDigital,
  cartIsDigitalOnly,
  issueDownloads,
  sendDownloadEmail,
  deliverDigital,
  LINK_DAYS,
  MAX_DOWNLOADS,
};
