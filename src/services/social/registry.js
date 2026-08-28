const telegram = require('./connectors/telegram');
const vk = require('./connectors/vk');
const youtube = require('./connectors/youtube');
const instagram = require('./connectors/instagram');
const pinterest = require('./connectors/pinterest');
const tiktok = require('./connectors/tiktok');
const manual = require('./connectors/manual');
const siteNews = require('./connectors/siteNews');

const connectors = { telegram, vk, youtube, instagram, pinterest, tiktok, news: siteNews, manual };

function getConnector(key) {
  return connectors[key] || manual;
}

function listConnectors() {
  return Object.values(connectors);
}

module.exports = { getConnector, listConnectors };
