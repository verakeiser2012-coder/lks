const express = require('express');
const db = require('../../db');
const { groupLinks } = require('../../utils/links');

const router = express.Router();

const SECTIONS = {
  home: 'Главная',
  music: 'Музыка',
  style: 'Стиль',
  video: 'Видео',
  gigs: 'Выступления',
};

const FEATURED_KEYS = {
  title: 'music_featured_title',
  note: 'music_featured_note',
  url: 'music_featured_url',
};

// Анонс подкаста на главной (routes/index.js читает те же ключи).
const PODCAST_KEYS = {
  title: 'podcast_title',
  guest: 'podcast_guest',
  note: 'podcast_note',
  date: 'podcast_date',
  url: 'podcast_url',
  cover: 'podcast_cover',
};

function loadSectionData(section) {
  const introRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(`${section}_intro`);
  const links = db
    .prepare('SELECT * FROM page_links WHERE section = ? ORDER BY sort_order ASC, id ASC')
    .all(section);
  const data = { intro: introRow ? introRow.value : '', links, groups: groupLinks(links), featured: null, podcast: null };

  if (section === 'home') {
    const keys = Object.values(PODCAST_KEYS);
    const rows = db
      .prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`)
      .all(...keys);
    const map = {};
    for (const row of rows) map[row.key] = row.value;
    data.podcast = {};
    for (const [field, key] of Object.entries(PODCAST_KEYS)) data.podcast[field] = map[key] || '';
  }

  if (section === 'music') {
    const rows = db
      .prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)')
      .all(FEATURED_KEYS.title, FEATURED_KEYS.note, FEATURED_KEYS.url);
    const map = {};
    for (const row of rows) map[row.key] = row.value;
    data.featured = {
      title: map[FEATURED_KEYS.title] || '',
      note: map[FEATURED_KEYS.note] || '',
      url: map[FEATURED_KEYS.url] || '',
    };
  }

  return data;
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
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  upsert.run(`${section}_intro`, req.body.intro || '');

  if (section === 'music') {
    upsert.run(FEATURED_KEYS.title, req.body.featuredTitle || '');
    upsert.run(FEATURED_KEYS.note, req.body.featuredNote || '');
    upsert.run(FEATURED_KEYS.url, req.body.featuredUrl || '');
  }
  if (section === 'home') {
    for (const [field, key] of Object.entries(PODCAST_KEYS)) {
      const formField = `podcast${field[0].toUpperCase()}${field.slice(1)}`;
      upsert.run(key, (req.body[formField] || '').trim());
    }
  }

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
