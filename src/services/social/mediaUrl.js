const { CANONICAL_MAIN } = require('../../config/domains');

function absoluteMediaUrl(mediaPath) {
  return `https://${CANONICAL_MAIN}${mediaPath}`;
}

module.exports = { absoluteMediaUrl };
