const db = require('../../db');

// Долгоживущие токены Instagram Login живут 60 дней — продлеваем раз в неделю.
// Продление возможно только для токена старше 24 часов; свежие пропускаем молча.
async function refreshInstagramTokens() {
  const networks = db.prepare("SELECT * FROM social_networks WHERE connector = 'instagram' AND enabled = 1").all();
  for (const network of networks) {
    let creds;
    try {
      creds = JSON.parse(network.credentials || '{}');
    } catch {
      continue;
    }
    if (!creds.accessToken) continue;

    const lastRefresh = creds.tokenRefreshedAt ? Date.parse(creds.tokenRefreshedAt) : 0;
    if (Date.now() - lastRefresh < 7 * 24 * 60 * 60 * 1000) continue;

    try {
      const response = await fetch(
        'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' +
          encodeURIComponent(creds.accessToken)
      );
      const data = await response.json();
      if (data.access_token) {
        creds.accessToken = data.access_token;
        creds.tokenRefreshedAt = new Date().toISOString();
        db.prepare('UPDATE social_networks SET credentials = ? WHERE id = ?').run(
          JSON.stringify(creds),
          network.id
        );
        console.log(`Instagram-токен продлён для сети "${network.key}".`);
      }
    } catch {
      // Сеть недоступна или токен ещё слишком свежий — попробуем в следующий раз.
    }
  }
}

module.exports = { refreshInstagramTokens };
