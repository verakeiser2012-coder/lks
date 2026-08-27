const express = require('express');
const db = require('../../db');
const { listConnectors } = require('../../services/social/registry');

const router = express.Router();

function listNetworks() {
  return db.prepare('SELECT * FROM social_networks ORDER BY label').all();
}

router.get('/', (req, res) => {
  res.render('admin/social-networks', {
    networks: listNetworks(),
    connectors: listConnectors(),
    error: null,
  });
});

router.post('/', (req, res) => {
  const { label, key, connector, category } = req.body;
  if (!label || !key || !connector) {
    return res.render('admin/social-networks', {
      networks: listNetworks(),
      connectors: listConnectors(),
      error: 'Заполните название, ключ и тип коннектора.',
    });
  }

  const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '-');

  try {
    db.prepare(`
      INSERT INTO social_networks (key, label, connector, credentials, enabled, category)
      VALUES (?, ?, ?, '{}', 0, ?)
    `).run(normalizedKey, label.trim(), connector, category === 'music' ? 'music' : 'general');
  } catch (err) {
    return res.render('admin/social-networks', {
      networks: listNetworks(),
      connectors: listConnectors(),
      error: 'Такой ключ уже используется, выберите другой.',
    });
  }

  res.redirect('/admin/social-networks');
});

router.post('/:id/credentials', (req, res) => {
  const network = db.prepare('SELECT * FROM social_networks WHERE id = ?').get(req.params.id);
  if (!network) {
    return res.status(404).render('404');
  }

  const connectorDef = listConnectors().find((c) => c.key === network.connector);
  const credentials = {};
  if (connectorDef) {
    for (const field of connectorDef.fields) {
      credentials[field.name] = req.body[field.name] || '';
    }
  }

  db.prepare('UPDATE social_networks SET credentials = ? WHERE id = ?').run(
    JSON.stringify(credentials),
    network.id
  );
  res.redirect('/admin/social-networks');
});

router.post('/:id/category', (req, res) => {
  const network = db.prepare('SELECT * FROM social_networks WHERE id = ?').get(req.params.id);
  if (!network) {
    return res.status(404).render('404');
  }
  const category = req.body.category === 'music' ? 'music' : 'general';
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
