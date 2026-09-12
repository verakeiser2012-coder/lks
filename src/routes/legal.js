const express = require('express');

const router = express.Router();

router.get('/oferta', (req, res) => {
  res.render('legal/oferta', { title: 'Публичная оферта', pageDescription: 'Публичная оферта — условия магазина Лев Кейсер (ИП), Екатеринбург.' });
});

router.get('/privacy', (req, res) => {
  res.render('legal/privacy', { title: 'Политика конфиденциальности', pageDescription: 'Политика конфиденциальности — условия магазина Лев Кейсер (ИП), Екатеринбург.' });
});

router.get('/payment', (req, res) => {
  res.render('legal/payment', { title: 'Оплата', pageDescription: 'Оплата — условия магазина Лев Кейсер (ИП), Екатеринбург.' });
});

router.get('/delivery', (req, res) => {
  res.render('legal/delivery', { title: 'Доставка', pageDescription: 'Доставка — условия магазина Лев Кейсер (ИП), Екатеринбург.' });
});

router.get('/returns', (req, res) => {
  res.render('legal/returns', { title: 'Возврат', pageDescription: 'Возврат — условия магазина Лев Кейсер (ИП), Екатеринбург.' });
});

module.exports = router;
