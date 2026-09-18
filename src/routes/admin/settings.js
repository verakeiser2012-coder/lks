const express = require('express');
const db = require('../../db');

const router = express.Router();

const EDITABLE_KEYS = [
  'site_name', 'site_alt_name', 'site_tagline', 'phone', 'email', 'address',
  'metrika_id', 'meta_description', 'og_image',
  'ipex_showcase_url',
  'services_public', // «1» — услуга «Коллегам» видна посетителям; пусто — только по прямой ссылке для админа
  'services_en_public', // «1» — английское предложение «For artists» видно под /en (пункт меню, /en/services, карта сайта)
  // Ссылки на соцсети (vk_url, telegram_url, …) больше не здесь: они лежат
  // в social_networks.url и подмешиваются в settings через utils/settings.js.
  'legal_ip_name', 'legal_inn', 'legal_ogrnip', 'legal_address', 'legal_doc_date',
  'legal_bank_name', 'legal_bank_account', 'legal_bank_bik', 'legal_bank_corr_account',
];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsMap = {};
  for (const row of rows) settingsMap[row.key] = row.value;
  res.render('admin/settings', { settingsMap, saved: false });
});

router.post('/', (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const key of EDITABLE_KEYS) {
    upsert.run(key, req.body[key] || '');
  }

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsMap = {};
  for (const row of rows) settingsMap[row.key] = row.value;
  res.render('admin/settings', { settingsMap, saved: true });
});

module.exports = router;
