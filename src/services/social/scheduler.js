const { publishDuePosts } = require('./publish');
const { refreshInstagramTokens } = require('./instagramTokenRefresh');
const { importFeeds } = require('./importFeeds');

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

  // Ленты площадок читаем раз в час. Первый проход — через полминуты
  // после старта: сервер только поднялся, и чужие сайты могут подождать.
  const pull = () => {
    importFeeds().catch((err) => console.error('Ошибка импорта лент:', err));
  };
  setTimeout(pull, 30 * 1000);
  setInterval(pull, 60 * 60 * 1000);
}

module.exports = { start };
