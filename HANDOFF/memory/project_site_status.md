---
name: project-site-status
description: "Current state of the Desktop/site project (Лев Кейсер / DJ Levka shop) — brands page, design changes, concurrent-session setup"
metadata: 
  node_type: memory
  type: project
  originSessionId: fa0ee2be-6ebf-4238-aff2-89821f893eca
  modified: 2026-08-26T12:57:15.523Z
---

Site is `C:\Users\User\Desktop\site` — Node.js + Express + EJS + SQLite shop for Лев Кейсер (site persona "DJ Levka", a 14-year-old model/actor/DJ). No git repo.

**Done so far:**
- Added a public `/brands` page ([src/routes/brands.js](../../../../Desktop/site/src/routes/brands.js), [src/views/brands.ejs](../../../../Desktop/site/src/views/brands.ejs)) — a lead form for brands (company name, contact, phone, email, website, message) that saves to a new `brand_requests` table (added in `src/db/init.js`). Admin can view/mark-processed submissions at `/admin/brands`.
- The `/brands` page has a "Что мы предлагаем" section: 10 offer cards (джингл, фотосессия, реклама как модель, подкаст, DJ-сет, видео-обзор, посты/сторис, совместный розыгрыш, амбассадорство, совместный мерч), each with an expanded description and an "example" slot — real photos/video pulled from `about_media`/`gallery_items` tables where available, real links to existing social/music profiles otherwise, and a dashed "Пример скоро добавим" placeholder for offers with no example yet (podcast, giveaway, ambassadorship).
- Site font: was Google Fonts "Unbounded", applied to nav/logo/headings via `--font-display` CSS var, loaded in `partials/header.ejs`. **Updated 2026-08-26**: swapped to "Roboto Slab" (slab serif) to match the new LEVKEYSER brand identity's chosen display font — see [[project_levkeyser_brand_identity]] for why. Given this repo's concurrent-editing pattern, re-check `style.css`'s `--font-display` before assuming this is still the live value.
- Per explicit user request, removed the animated gold-gradient text effect from `.hero h1` and `.logo-name` in `public/css/style.css` — those are now plain solid `var(--color-text)`. Gold accents were intentionally *kept* elsewhere (buttons, shop-nav, top border shimmer) — only the shiny gradient *text* was unwanted.

**Important — concurrent session:**
Another chat session has been actively redesigning this same site in parallel throughout this work (gold/luxury theme with CSS vars `--color-gold-*`, header restructured into `.header-top` + `.site-nav`/`.nav-inner`, added `/admin/calendar` and `/admin/social-networks` admin routes, `site_alt_name` setting, footer newsletter subscribe form, etc.). Files can change between reads — always re-read a file immediately before editing it, expect `Edit` to occasionally fail with "modified since read" and require a re-read+retry.

**Dev server / preview setup:**
`.claude/launch.json` has two configs, both with `"autoPort": true` (needed because the other session's `npm run dev` on port 3000 is usually already running and this session can't stop it):
- `"site"` — `npm start`, default port 3000 (falls back to a random port via autoPort)
- `"site-verify"` — `node src/server.js`, default port 3100 (also autoPort)

`server.js` reads `PORT` from env with no hardcoded CLI flags, so autoPort works cleanly. When verifying changes, start via `preview_start({name: "site-verify"})` (or `"site"`), check the assigned port in the result, and clean up any test data written to the shared `data/shop.db` (e.g. test `brand_requests` rows) afterward since the DB file is shared with the other live session.
