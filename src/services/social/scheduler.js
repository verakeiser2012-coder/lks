const { publishDuePosts } = require('./publish');

function start() {
  const run = () => {
    publishDuePosts().catch((err) => console.error('Ошибка автопубликации:', err));
  };
  run();
  setInterval(run, 60 * 1000);
}

module.exports = { start };
