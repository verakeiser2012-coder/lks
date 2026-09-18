const telegram = require('./connectors/telegram');
const vk = require('./connectors/vk');
const youtube = require('./connectors/youtube');
const instagram = require('./connectors/instagram');
const tiktok = require('./connectors/tiktok');
const manual = require('./connectors/manual');
const siteNews = require('./connectors/siteNews');

// Pinterest здесь нет нарочно (решение владельца 18.09.2026): их API (developers.pinterest.com)
// не используем вообще, пины ставятся руками через планировщик Pinterest. Импорт ленты
// через публичный RSS профиля (importFeeds) к API не относится и остаётся.
const connectors = { telegram, vk, youtube, instagram, tiktok, news: siteNews, manual };

function getConnector(key) {
  return connectors[key] || manual;
}

function listConnectors() {
  return Object.values(connectors);
}

module.exports = { getConnector, listConnectors };
