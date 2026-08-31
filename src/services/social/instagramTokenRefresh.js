const db = require('../../db');
const { ensureFreshToken } = require('./instagramToken');

// Долгоживущие токены Instagram Login живут 60 дней. Планировщик заходит сюда раз в сутки,
// а решение «пора ли продлевать» принимает ensureFreshToken (не чаще раза в неделю).
async function refreshInstagramTokens() {
  const networks = db.prepare("SELECT * FROM social_networks WHERE connector = 'instagram' AND enabled = 1").all();
  for (const network of networks) {
    let credentials;
    try {
      credentials = JSON.parse(network.credentials || '{}');
    } catch {
      continue;
    }
    if (!credentials.accessToken) continue;

    const before = credentials.accessToken;
    try {
      await ensureFreshToken(credentials, network.key);
      if (credentials.accessToken !== before) {
        console.log(`Instagram-токен продлён для сети "${network.key}".`);
      }
    } catch (err) {
      console.error(`Не удалось продлить Instagram-токен для сети "${network.key}":`, err.message);
    }
  }
}

module.exports = { refreshInstagramTokens };
