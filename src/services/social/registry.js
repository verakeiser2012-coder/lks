const telegram = require('./connectors/telegram');
const vk = require('./connectors/vk');
const manual = require('./connectors/manual');

const connectors = { telegram, vk, manual };

function getConnector(key) {
  return connectors[key] || manual;
}

function listConnectors() {
  return Object.values(connectors);
}

module.exports = { getConnector, listConnectors };
