const db = require('../db');

// Ссылки на соцсети хранятся в social_networks.url (админка → Соцсети) и
// подмешиваются сюда как раньше: settings.vk_url, settings.telegram_url,
// settings.instagram_djlevka_url (ключ сети + «_url», дефис → подчёркивание).
// Шаблоны и письма продолжают читать settings.*_url, ничего не переписывая.
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  for (const n of db.prepare("SELECT key, url FROM social_networks WHERE url <> ''").all()) {
    settings[n.key.replace(/-/g, '_') + '_url'] = n.url;
  }
  return settings;
}

module.exports = { getSettings };
