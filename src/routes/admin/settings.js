const express = require('express');
const db = require('../../db');

const router = express.Router();

const EDITABLE_KEYS = [
  'site_name', 'site_alt_name', 'site_tagline', 'phone', 'email', 'address',
  'vk_url', 'telegram_url', 'whatsapp_url', 'instagram_url',
  'youtube_url', 'tiktok_url', 'pinterest_url', 'rutube_url', 'ok_url', 'dzen_url',
  'douyin_url', 'weibo_url', 'wechat_url', 'xiaohongshu_url',
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
