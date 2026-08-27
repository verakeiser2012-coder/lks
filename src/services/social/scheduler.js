const { publishDuePosts } = require('./publish');
const { refreshInstagramTokens } = require('./instagramTokenRefresh');

function start() {
  const run = () => {
    publishDuePosts().catch((err) => console.error('Ошибка автопубликации:', err));
  };
  run();
  setInterval(run, 60 * 1000);

  const refreshTokens = () => {
    refreshInstagramTokens().catch((err) => console.error('Ошибка продления Instagram-токена:', err));
  };
  refreshTokens();
  setInterval(refreshTokens, 24 * 60 * 60 * 1000);
}

module.exports = { start };
