const express = require('express');
const db = require('../db');
const { groupLinks } = require('../utils/links');
const { getGalleryItems } = require('../utils/gallery');

const router = express.Router();

router.get('/', (req, res) => {
  const introRow = db.prepare("SELECT value FROM settings WHERE key = 'music_intro'").get();
  const links = db.prepare(
    "SELECT * FROM page_links WHERE section = 'music' ORDER BY sort_order ASC, id ASC"
  ).all();
  const featuredRows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('music_featured_title', 'music_featured_note', 'music_featured_url')")
    .all();
  const featuredMap = {};
  for (const row of featuredRows) featuredMap[row.key] = row.value;

  const releases = db
    .prepare('SELECT * FROM releases WHERE is_published = 1 ORDER BY sort_order ASC, created_at DESC')
    .all();
  const trackCounts = db
    .prepare('SELECT release_id, COUNT(*) AS c FROM tracks WHERE is_published = 1 AND release_id IS NOT NULL GROUP BY release_id')
    .all();
  const countMap = {};
  for (const row of trackCounts) countMap[row.release_id] = row.c;

  const looseTracks = db
    .prepare('SELECT * FROM tracks WHERE is_published = 1 AND release_id IS NULL ORDER BY sort_order ASC, created_at DESC')
    .all();

  res.render('music', {
    intro: introRow ? introRow.value : '',
    groups: groupLinks(links),
    featured: {
      title: featuredMap.music_featured_title || '',
      note: featuredMap.music_featured_note || '',
      url: featuredMap.music_featured_url || '',
    },
    releases: releases.map((r) => ({ ...r, trackCount: countMap[r.id] || 0 })),
    tracks: looseTracks,
    galleryItems: getGalleryItems('music'),
  });
});

router.get('/:releaseSlug', (req, res, next) => {
  const release = db
    .prepare('SELECT * FROM releases WHERE slug = ? AND is_published = 1')
    .get(req.params.releaseSlug);
  if (!release) return next();

  const tracks = db
    .prepare('SELECT * FROM tracks WHERE release_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(release.id);

  res.render('release', { release, tracks });
});

router.get('/:releaseSlug/:trackSlug', (req, res, next) => {
  const release = db
    .prepare('SELECT * FROM releases WHERE slug = ? AND is_published = 1')
    .get(req.params.releaseSlug);
  if (!release) return next();

  const track = db
    .prepare('SELECT * FROM tracks WHERE release_id = ? AND slug = ? AND is_published = 1')
    .get(release.id, req.params.trackSlug);
  if (!track) return next();

  const siblings = db
    .prepare('SELECT id, title, slug FROM tracks WHERE release_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(release.id);
  const index = siblings.findIndex((t) => t.id === track.id);
  const prevTrack = index > 0 ? siblings[index - 1] : null;
  const nextTrack = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const trackGalleryItems = db
    .prepare('SELECT * FROM gallery_items WHERE track_id = ? ORDER BY sort_order ASC, created_at DESC')
    .all(track.id);

  res.render('track', { release, track, prevTrack, nextTrack, trackGalleryItems });
});

module.exports = router;
