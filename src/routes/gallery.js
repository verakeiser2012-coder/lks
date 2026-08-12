const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const items = db
    .prepare('SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC')
    .all();
  res.render('gallery', { items });
});

module.exports = router;
