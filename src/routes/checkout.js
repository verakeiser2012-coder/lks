const express = require('express');
const { shopClosedNotice } = require('../utils/shopOpen');
const db = require('../db');
const { getCartDetails, getCart, cartKey } = require('../utils/cart');
const robokassa = require('../services/payments/robokassa');
const { createPayment } = robokassa;
const { cartIsDigitalOnly, cartHasService } = require('../services/digital');
const { onOrderPaid } = require('../services/fulfillment');
const { ensureToken, sendOrderCreated } = require('../services/orderPage');
const delivery = require('../services/delivery');

const router = express.Router();

function hasPrintful(items) {
  return items.some((item) => item.product.fulfillment === 'printful');
}

// Пока магазин закрыт, оформление недоступно: настоящий заказ и тестовая
// страница оплаты вместе выглядели бы как обман.
router.use((req, res, next) => {
  // Уведомления Robokassa о платежах должны доходить и при закрытом магазине:
  // иначе оплаченный перед закрытием заказ так и останется «ожидает оплаты».
  if (req.path.startsWith('/robokassa/')) return next();
  // Расчёт доставки — справочный запрос, заказа не создаёт: пусть работает и до открытия,
  // чтобы проверить тарифы СДЭК на живом сайте.
  if (req.path === '/quote' || req.path === '/pickup-points') return next();
  if (shopClosedNotice()) return res.redirect('/cart');
  next();
});

router.get('/', (req, res) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }
  res.render('checkout', { items, total, error: null, digitalOnly: cartIsDigitalOnly(items), hasService: cartHasService(items), needsPrintful: hasPrintful(items), carriers: delivery.available() });
});

// Список пунктов выдачи по городу/индексу: GET /checkout/pickup-points?carrier=cdek&city=…&postcode=…
router.get('/pickup-points', async (req, res) => {
  const carrier = String(req.query.carrier || 'cdek').replace(/[^a-z]/g, '');
  const city = String(req.query.city || '').trim();
  const postcode = String(req.query.postcode || '').replace(/\D/g, '');
  if (!city && !postcode) return res.json({ points: [] });
  try {
    res.json({ points: await delivery.pickupPoints(carrier, { city, postcode }) });
  } catch (e) {
    console.error('[delivery] пункты выдачи:', e.message);
    res.json({ points: [] });
  }
});

// Расчёт доставки по городу/индексу для формы оформления (СДЭК и другие подключённые службы).
// Тело: { city, postcode } → { quotes: [{ key, label, door: {price, days}, pickup: {price, days} }] }.
router.post('/quote', async (req, res) => {
  const { items } = getCartDetails(req);
  const city = String((req.body && req.body.city) || '').trim();
  const postcode = String((req.body && req.body.postcode) || '').replace(/\D/g, '');
  const phone = String((req.body && req.body.phone) || '').trim();
  if (!items.length || (!city && !postcode)) return res.json({ quotes: [] });
  const quotes = await delivery.quoteAll({ city, postcode, phone, items: items.map((i) => ({ weight: i.product.weight, package_size: i.product.package_size, price: i.product.price, qty: i.qty })) });
  res.json({ quotes });
});

router.post('/', async (req, res, next) => {
  const { items, total } = getCartDetails(req);
  if (items.length === 0) {
    return res.redirect('/cart');
  }

  const digitalOnly = cartIsDigitalOnly(items);
  const hasService = cartHasService(items);
  const needsPrintful = hasPrintful(items);
  const fail = (error) => res.render('checkout', { items, total, error, digitalOnly, hasService, needsPrintful, carriers: delivery.available() });

  const { customerName, phone, email, address, country, city, zip, deliveryMethod, pickupPoint, pickupCode, comment, dataConsent, digitalConsent, shippingChoice } = req.body;
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
    return fail(hasService ? 'Подтвердите, что работа начинается сразу после оплаты.' : 'Подтвердите согласие на получение файлов сразу после оплаты.');
  }
  // Услугу делаем по ссылкам покупателя: пустой комментарий — это заказ, с которым нечего делать.
  if (hasService && !(comment || '').trim()) {
    return fail('Впишите ссылки на свои релизы и соцсети — с них начнём аудит.');
  }

  // Печать по требованию едет почтой из типографии: пункт выдачи не подходит,
  // а адрес нужен по полям — Printful не разбирает строку «город, улица, дом».
  const method = digitalOnly ? 'digital' : (deliveryMethod === 'pickup' && !needsPrintful ? 'pickup' : 'courier');
  if (method === 'pickup' && !pickupPoint) {
    return fail('Выберите пункт выдачи.');
  }
  // Пункт из списка приходит кодом + адресом; в заказ пишем «CDEK YEKB1 · ул. Шаумяна, 93»,
  // чтобы код был виден при оформлении накладной, а адрес — человеку.
  const pickupLabel = method === 'pickup'
    ? (pickupCode ? `${String(pickupCode).replace(/[^A-Za-z0-9_-]/g, '')} · ${pickupPoint}` : pickupPoint)
    : '';
  if (needsPrintful && (!country || !city || !zip || !address)) {
    return fail('Для вещи, которая печатается под заказ, нужны страна, город, индекс и адрес.');
  }

  // Доставка: выбор из формы «cdek:door» / «cdek:pickup» пересчитывается на сервере
  // заново — цене из браузера не верим. Не посчиталось — заказ без доставки, как раньше,
  // стоимость согласуется после оформления.
  let shipping = { carrier: '', tariff: '', cost: 0, days: '' };
  if (method !== 'digital' && shippingChoice && /^[a-z]+:(door|pickup)$/.test(shippingChoice)) {
    const [carrierKey, tariff] = shippingChoice.split(':');
    try {
      const quotes = await delivery.quoteAll({ city: (city || '').trim(), postcode: String(zip || '').replace(/\D/g, ''), phone, items: items.map((i) => ({ weight: i.product.weight, package_size: i.product.package_size, price: i.product.price, qty: i.qty })) });
      const q = quotes.find((x) => x.key === carrierKey);
      if (q && q[tariff]) shipping = { carrier: carrierKey, tariff, cost: q[tariff].price, days: q[tariff].days };
    } catch (e) {
      console.error('[delivery] расчёт при оформлении:', e.message);
    }
  }
  const grandTotal = total + shipping.cost;

  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_name, phone, email, address, country, city, zip, delivery_method, pickup_point, comment, total, shipping_carrier, shipping_tariff, shipping_cost, shipping_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const orderInfo = insertOrder.run(
    customerName,
    phone,
    email || '',
    method === 'courier' ? (address || '') : '',
    (country || '').trim(),
    (city || '').trim(),
    (zip || '').trim(),
    method,
    pickupLabel,
    comment || '',
    grandTotal,
    shipping.carrier,
    shipping.tariff,
    shipping.cost,
    shipping.days
  );
  const orderId = orderInfo.lastInsertRowid;
  ensureToken(orderId);
  // Заказы этого браузера: только им показываем «спасибо» по номеру, остальным — 404
  req.session.myOrders = [...(req.session.myOrders || []), Number(orderId)].slice(-20);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, price, qty, variant)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insertItem.run(orderId, item.product.id, item.product.name, item.product.price, item.qty, item.variant || '');
  }

  // Бесплатный заказ платить нечем: платёжные системы нулевую сумму не принимают.
  // Отмечаем оплаченным сразу и выдаём файлы — это единственный путь для цены 0.
  if (grandTotal === 0) {
    // помечаем провайдером 'free': в отчётах бесплатная выдача не должна
    // выглядеть как успешный платёж через эквайринг
    db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing', payment_provider = 'free' WHERE id = ?").run(orderId);
    await onOrderPaid(orderId);
    req.session.cart = {};
    sendOrderCreated(orderId).catch((err) => console.error('[order] письмо о заказе:', err.message));
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
    sendOrderCreated(orderId).catch((err) => console.error('[order] письмо о заказе:', err.message));
    res.redirect(payment.confirmationUrl);
  } catch (err) {
    next(err);
  }
});

// Тестовая (mock) страница оплаты — используется, пока не подключены реальные ключи Robokassa
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
  await onOrderPaid(order.id);
  res.redirect(`/checkout/success?orderId=${order.id}`);
});

// «Спасибо» — это страница заказа по личному токену. По одному номеру заказ
// не отдаём: раньше любой мог открыть чужой success?orderId= и увидеть файлы.
router.get('/success', (req, res) => {
  const orderId = Number(req.query.orderId);
  const mine = (req.session.myOrders || []).includes(orderId);
  const order = mine ? db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) : null;
  if (!order) return res.render('checkout-success', { order: null, downloads: [] });
  res.redirect(`/order/${ensureToken(order.id)}?thanks=1`);
});

// Вернуть вещи заказа в корзину — покупатель отказался от оплаты
// или она не прошла, а корзину мы уже очистили при переходе к оплате.
function restoreCart(req, orderId) {
  const cart = {};
  db.prepare('SELECT product_id, qty, variant FROM order_items WHERE order_id = ?').all(orderId)
    .forEach((row) => { cart[cartKey(row.product_id, row.variant)] = row.qty; });
  req.session.cart = cart;
}

async function markPaid(orderId) {
  db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing' WHERE id = ?").run(orderId);
  // Повторное уведомление не выдаст вторых ссылок — issueDownloads это учитывает
  await onOrderPaid(orderId);
}

// ResultURL Robokassa: серверное уведомление об оплате, подписано Паролем №2.
// Адрес прописывается в «Технических настройках» магазина; метод — POST.
// Ответ обязан быть ровно «OK{InvId}», иначе Robokassa будет слать повторы.
// Пока сайт под паролем nginx, этот путь надо вывести из-под auth_basic.
router.post('/robokassa/result', async (req, res) => {
  const check = robokassa.verifyResultNotification(req.body);
  if (!check.ok) return res.status(400).send('bad sign');
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(check.orderId);
  if (!order) return res.status(404).send('no order');
  // Сумму сверяем числом: в бою OutSum приходит с шестью знаками после запятой
  if (Math.abs(Number(order.total) - check.outSum) > 0.005) return res.status(400).send('bad sum');
  if (order.payment_status !== 'paid') await markPaid(order.id);
  res.type('text/plain').send(`OK${order.id}`);
});

// SuccessURL: покупатель вернулся после оплаты (подпись Паролем №1).
// Статус ставит ResultURL; здесь только показываем страницу «спасибо».
router.get('/robokassa/success', (req, res) => {
  const check = robokassa.verifySuccessRedirect(req.query);
  if (!check.ok) return res.redirect('/cart');
  req.session.cart = {};
  res.redirect(`/checkout/success?orderId=${check.orderId}`);
});

// FailURL: оплата не прошла или покупатель передумал — возвращаем корзину.
router.get('/robokassa/fail', (req, res) => {
  const orderId = Number(req.query.InvId);
  const order = orderId ? db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) : null;
  if (order && order.payment_status !== 'paid') restoreCart(req, order.id);
  res.render('payment-failed', { order: order || null });
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
      await onOrderPaid(order.id);
    }
  }
  res.sendStatus(200);
});

module.exports = router;
