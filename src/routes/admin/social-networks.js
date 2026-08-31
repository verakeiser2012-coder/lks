const express = require('express');
const db = require('../../db');
const { listConnectors, getConnector } = require('../../services/social/registry');
const { parseTimestamp } = require('../../services/social/instagramToken');

const router = express.Router();

function formatDate(value) {
  const time = parseTimestamp(value);
  return time ? new Date(time).toLocaleDateString('ru-RU') : '';
}

// Instagram — единственная сеть с самопродлевающимся токеном: показываем админу его срок.
function tokenStatus(network, credentials) {
  if (network.connector !== 'instagram' || !credentials.accessToken) return '';
  const expires = formatDate(credentials.tokenExpiresAt);
  const refreshed = formatDate(credentials.tokenRefreshedAt);
  if (!expires) return 'Срок действия токена неизвестен — станет виден после первого продления.';
  return `Токен действует до ${expires}` + (refreshed ? `, продлён ${refreshed}.` : '.');
}

function listNetworks() {
  return db.prepare('SELECT * FROM social_networks ORDER BY label').all().map((network) => ({
    ...network,
    tokenStatus: tokenStatus(network, parseCredentials(network)),
  }));
}

function parseCredentials(network) {
  try {
    return JSON.parse(network.credentials || '{}');
  } catch {
    return {};
  }
}

function renderList(res, extra = {}) {
  res.render('admin/social-networks', {
    networks: listNetworks(),
    connectors: listConnectors(),
    error: null,
    notice: null,
    ...extra,
  });
}

router.get('/', (req, res) => {
  renderList(res, { notice: req.query.msg || null, error: req.query.warn || null });
});

router.post('/', (req, res) => {
  const { label, key, connector, category } = req.body;
  if (!label || !key || !connector) {
    return renderList(res, { error: 'Заполните название, ключ и тип коннектора.' });
  }

  const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '-');

  try {
    db.prepare(`
      INSERT INTO social_networks (key, label, connector, credentials, enabled, category)
      VALUES (?, ?, ?, '{}', 0, ?)
    `).run(normalizedKey, label.trim(), connector, ['music', 'shorts', 'general'].includes(category) ? category : 'general');
  } catch (err) {
    return renderList(res, { error: 'Такой ключ уже используется, выберите другой.' });
  }

  res.redirect('/admin/social-networks');
});

router.post('/:id/credentials', async (req, res) => {
  const network = db.prepare('SELECT * FROM social_networks WHERE id = ?').get(req.params.id);
  if (!network) {
    return res.status(404).render('404');
  }

  const connectorDef = listConnectors().find((c) => c.key === network.connector);
  // Служебные значения (ID аккаунта, отметки продления токена) коннектор пишет сам —
  // сохраняем их, а из формы берём только те поля, что показаны админу.
  const previous = parseCredentials(network);
  const credentials = { ...previous };
  if (connectorDef) {
    for (const field of connectorDef.fields) {
      credentials[field.name] = req.body[field.name] || '';
    }
  }

  db.prepare('UPDATE social_networks SET credentials = ? WHERE id = ?').run(
    JSON.stringify(credentials),
    network.id
  );

  // Коннектор может доработать данные сразу после сохранения (Instagram меняет часовой токен на 60-дневный).
  const connector = getConnector(network.connector);
  if (connector && connector.onCredentialsSaved) {
    try {
      const message = await connector.onCredentialsSaved(credentials, network, previous);
      if (message) {
        return res.redirect('/admin/social-networks?msg=' + encodeURIComponent(message));
      }
    } catch (err) {
      return res.redirect('/admin/social-networks?warn=' + encodeURIComponent(err.message || 'Не удалось проверить данные.'));
    }
  }

  res.redirect('/admin/social-networks');
});

router.post('/:id/category', (req, res) => {
  const network = db.prepare('SELECT * FROM social_networks WHERE id = ?').get(req.params.id);
  if (!network) {
    return res.status(404).render('404');
  }
  const category = ['music', 'shorts', 'general'].includes(req.body.category) ? req.body.category : 'general';
  db.prepare('UPDATE social_networks SET category = ? WHERE id = ?').run(category, network.id);
  res.redirect('/admin/social-networks');
});

router.post('/:id/toggle', (req, res) => {
  const network = db.prepare('SELECT * FROM social_networks WHERE id = ?').get(req.params.id);
  if (!network) {
    return res.status(404).render('404');
  }
  db.prepare('UPDATE social_networks SET enabled = ? WHERE id = ?').run(network.enabled ? 0 : 1, network.id);
  res.redirect('/admin/social-networks');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM social_networks WHERE id = ?').run(req.params.id);
  res.redirect('/admin/social-networks');
});

module.exports = router;
