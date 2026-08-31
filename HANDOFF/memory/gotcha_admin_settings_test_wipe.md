---
name: gotcha-admin-settings-test-wipe
description: Never test /admin/settings POST via FormData built from a DOMParser-parsed (detached) HTML document — it silently drops input values and wipes the live settings table
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 27c74004-579a-437e-bfda-6a6ca8ac43fc
  modified: 2026-08-17T15:34:58.078Z
---

When verifying the site's `/admin/settings` save flow (EDITABLE_KEYS pattern in `src/routes/admin/settings.js`), do NOT build the POST body with `new FormData(form)` where `form` came from `new DOMParser().parseFromString(html, 'text/html')`. In this environment `FormData` on a detached, parser-created document does not reliably read `value` attributes — most fields serialize as empty strings even though the HTML clearly shows non-empty `value="..."`.

Because the settings POST handler does `upsert.run(key, req.body[key] || '')` for every key in `EDITABLE_KEYS`, any field missing/empty in the submitted body overwrites the real stored value with `''`. This actually happened once: a verification round-trip wiped `site_name`, `phone`, `email`, `address`, and all social `*_url` fields on the live shared dev DB. Had to reconstruct correct values from what had already been observed earlier in the same session (page reads before the mistake) and re-POST them explicitly.

**How to apply:** When verifying any settings/admin save form in this repo (or similarly structured "whitelist of keys, upsert everything" admin forms), either (a) read current values straight from the DB/API as plain key→value pairs and re-POST them verbatim with only the intended field(s) changed — never via `FormData` on a parsed/detached document — or (b) if a mistake happens, immediately re-check every affected field against values already captured earlier in the conversation/session before assuming data loss, then restore explicitly. This is a shared repo other sessions also read from, so a silent wipe is not just locally embarrassing — it's live-visible.
