const express = require('express');
const db = require('../db');
const { getCartDetails, getCart } = require('../utils/cart');
const { createPayment } = require('../services/payments/yookassa');
const { cartIsDigitalOnly, deliverDigital } = require('../services/digital');

const router = express.Router();

router.get('/', (req, res) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }
  res.render('checkout', { items, total, error: null, digitalOnly: cartIsDigitalOnly(items) });
});

router.post('/', async (req, res, next) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }

  const digitalOnly = cartIsDigitalOnly(items);
  const fail = (error) => res.render('checkout', { items, total, error, digitalOnly });

  const { customerName, phone, email, address, deliveryMethod, pickupPoint, comment, dataConsent, digitalConsent } = req.body;
  if (!customerName || !phone) {
    return fail('Заполните имя и телефон.');
  }
  if (!dataConsent) {
    return fail('Подтвердите согласие с офертой и обработкой персональных данных.');
  }

  // Цифровой заказ доставляется письмом, поэтому почта обязательна,
  // а адрес и пункт выдачи не нужны вовсе.
  if (digitalOnly && !email) {
    return fail('Укажите почту — на неё придут ссылки на файлы.');
  }
  // Без явного согласия на немедленный доступ оговорка в оферте не работает:
  // покупатель сохраняет право отказаться уже после скачивания файла
  if (digitalOnly && !digitalConsent) {
    return fail('Подтвердите согласие на получение файлов сразу после оплаты.');
  }

  const method = digitalOnly ? 'digital' : (deliveryMethod === 'pickup' ? 'pickup' : 'courier');
  if (method === 'pickup' && !pickupPoint) {
    return fail('Укажите город и удобный пункт выдачи.');
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_name, phone, email, address, delivery_method, pickup_point, comment, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const orderInfo = insertOrder.run(
    customerName,
    phone,
    email || '',
    method === 'courier' ? (address || '') : '',
    method,
    method === 'pickup' ? pickupPoint : '',
    comment || '',
    total
  );
  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, qty)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insertItem.run(orderId, item.product.id, item.product.name, item.product.price, item.qty);
  }

  // Бесплатный заказ платить нечем: платёжные системы нулевую сумму не принимают.
  // Отмечаем оплаченным сразу и выдаём файлы — это единственный путь для цены 0.
  if (total === 0) {
    // помечаем провайдером 'free': в отчётах бесплатная выдача не должна
    // выглядеть как успешный платёж через эквайринг
    db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing', payment_provider = 'free' WHERE id = ?").run(orderId);
    await deliverDigital(orderId);
    req.session.cart = {};
    return res.redirect(`/checkout/success?orderId=${orderId}`);
  }

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const payment = await createPayment(order, baseUrl);

    db.prepare('UPDATE orders SET payment_provider = ?, payment_id = ? WHERE id = ?').run(
      payment.provider,
      payment.paymentId,
      orderId
    );

    req.session.cart = {};
    res.redirect(payment.confirmationUrl);
  } catch (err) {
    next(err);
  }
});

// Тестовая (mock) страница оплаты — используется, пока не подключены реальные ключи ЮKassa
router.get('/pay/:orderId', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    return res.status(404).render('404');
  }
  res.render('payment-mock', { order });
});

router.post('/pay/:orderId/confirm', async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    return res.status(404).render('404');
  }
  db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?").run(order.id);
  await deliverDigital(order.id);
  res.redirect(`/checkout/success?orderId=${order.id}`);
});

router.get('/success', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.query.orderId);
  // Ссылки показываем прямо на странице: письмо может дойти не сразу
  // или уехать в спам, а человек уже заплатил.
  const downloads = order
    ? db.prepare('SELECT * FROM downloads WHERE order_id = ? ORDER BY id').all(order.id)
    : [];
  res.render('checkout-success', { order: order || null, downloads });
});

// Вебхук для реальных уведомлений от ЮKassa об изменении статуса платежа.
// Используется только когда в .env заданы YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY.
router.post('/webhook/yookassa', async (req, res) => {
  const event = req.body;
  const payment = event && event.object;
  if (payment && payment.id) {
    const order = db.prepare('SELECT * FROM orders WHERE payment_id = ?').get(payment.id);
    if (order && payment.status === 'succeeded') {
      db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?").run(order.id);
      // Повторный вебхук не выдаст вторых ссылок — issueDownloads это учитывает
      await deliverDigital(order.id);
    }
  }
  res.sendStatus(200);
});

module.exports = router;
