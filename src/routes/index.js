const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 8')
    .all();
  res.render('index', { products });
});

module.exports = router;
