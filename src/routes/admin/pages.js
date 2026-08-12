const express = require('express');
const db = require('../../db');
const { groupLinks } = require('../../utils/links');

const router = express.Router();

const SECTIONS = {
  music: 'Музыка',
  style: 'Стиль',
  video: 'Видео',
};

function loadSectionData(section) {
  const introRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(`${section}_intro`);
  const links = db
    .prepare('SELECT * FROM page_links WHERE section = ? ORDER BY sort_order ASC, id ASC')
    .all(section);
  return { intro: introRow ? introRow.value : '', links, groups: groupLinks(links) };
}

router.param('section', (req, res, next, section) => {
  if (!SECTIONS[section]) return res.status(404).render('404');
  next();
});

router.get('/:section', (req, res) => {
  const { section } = req.params;
  res.render('admin/page-links', {
    section,
    sectionLabel: SECTIONS[section],
    ...loadSectionData(section),
    saved: false,
    error: null,
  });
});

router.post('/:section', (req, res) => {
  const { section } = req.params;
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(`${section}_intro`, req.body.intro || '');

  res.render('admin/page-links', {
    section,
    sectionLabel: SECTIONS[section],
    ...loadSectionData(section),
    saved: true,
    error: null,
  });
});

router.post('/:section/links', (req, res) => {
  const { section } = req.params;
  const { groupName, label, url, sortOrder } = req.body;

  if (!label || !url) {
    return res.render('admin/page-links', {
      section,
      sectionLabel: SECTIONS[section],
      ...loadSectionData(section),
      saved: false,
      error: 'Укажите текст ссылки и URL.',
    });
  }

  db.prepare(`
    INSERT INTO page_links (section, group_name, label, url, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(section, groupName || '', label, url, Number(sortOrder) || 0);

  res.redirect(`/admin/pages/${section}`);
});

router.post('/:section/links/:id', (req, res) => {
  const { section, id } = req.params;
  const { groupName, label, url, sortOrder } = req.body;

  if (!label || !url) {
    return res.render('admin/page-links', {
      section,
      sectionLabel: SECTIONS[section],
      ...loadSectionData(section),
      saved: false,
      error: 'Укажите текст ссылки и URL.',
    });
  }

  db.prepare(`
    UPDATE page_links SET group_name = ?, label = ?, url = ?, sort_order = ?
    WHERE id = ? AND section = ?
  `).run(groupName || '', label, url, Number(sortOrder) || 0, id, section);

  res.redirect(`/admin/pages/${section}`);
});

router.post('/:section/links/:id/delete', (req, res) => {
  const { section, id } = req.params;
  db.prepare('DELETE FROM page_links WHERE id = ? AND section = ?').run(id, section);
  res.redirect(`/admin/pages/${section}`);
});

module.exports = router;
