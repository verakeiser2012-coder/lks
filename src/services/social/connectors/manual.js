const fields = [];

async function publish() {
  throw new Error('Эта сеть не подключена к автопубликации — опубликуйте пост вручную.');
}

module.exports = { key: 'manual', label: 'Вручную', fields, publish };
