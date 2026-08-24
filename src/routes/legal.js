const express = require('express');

const router = express.Router();

router.get('/oferta', (req, res) => {
  res.render('legal/oferta');
});

router.get('/privacy', (req, res) => {
  res.render('legal/privacy');
});

router.get('/delivery', (req, res) => {
  res.render('legal/delivery');
});

router.get('/returns', (req, res) => {
  res.render('legal/returns');
});

module.exports = router;
