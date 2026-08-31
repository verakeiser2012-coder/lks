---
name: gotcha_dev_server_no_autoreload
description: "In the site project, `npm start` runs plain node with no hot-reload — must restart the preview server after editing backend files or changes won't show up"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 362aa729-aed5-435c-8611-fafd27ebd7c8
  modified: 2026-08-11T16:06:40.745Z
---

In `C:\Users\User\Desktop\site`, `.claude/launch.json` runs the preview via `npm start`, which is
`node src/server.js` — no nodemon, no hot-reload, even though nodemon is listed as a devDependency and an
unused `npm run dev` script exists for it.

**Why:** Editing routes/views/`db/init.js`/`server.js` while the preview server is already running does nothing
until the process restarts. This caused a real debugging detour once — a newly-registered `/brands` route kept
404ing purely because the running process predated the file change, not because of an actual code bug. Wasted a
round of log-reading before realizing the fix was just a restart.

**How to apply:** After editing any server-side file in this project (routes, `db/*.js`, `server.js`,
middleware), always `preview_stop` + `preview_start` before testing in the browser — never assume live-reload
picked up the change. Pure view/CSS/static-asset edits don't need a restart since Express reads those fresh per
request, but anything that gets `require()`-cached does.
