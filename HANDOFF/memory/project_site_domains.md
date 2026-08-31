---
name: project_site_domains
description: "Domains the user owns for the Lev Keiser / DJ Levka site, with SSL cert type — not yet connected to the app"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1503deea-9986-4c83-97be-8132e0ef3ba3
  modified: 2026-08-13T07:28:01.459Z
---

User owns 18 domains total (each with a GlobalSign SSL DV certificate available/attached) — corrected 2026-08-12, originally thought to be 15:

- DJLEVKA.STORE, DJLEVKA.ONLINE, DJLEVKA.RU, DJLEVKA.COM, DJLEVKA.SHOP
- LEVKEISER.RU, LEVKEISER.COM, LEVKEISER.SHOP, LEVKEISER.STORE, LEVKEISER.ONLINE
- LEVKEYSER.ONLINE, LEVKEYSER.RU, LEVKEYSER.COM, LEVKEYSER.SHOP, LEVKEYSER.STORE (alternate "Keyser" spelling — likely defensive registrations)
- левкейсер.shop, левкейсер.com, левкейсер.рф (Cyrillic variants)

None are yet connected to the site at `C:\Users\User\Desktop\site` (Node/Express/EJS/SQLite, see [[project_site_status]] and [[project_site_lev_keiser]]) — no DNS/hosting/deployment config has been set up in this codebase so far; the app has only been run via local dev preview.

All 15 domains are registered at **nic.ru** (RU-CENTER). Decided approach (2026-08-11): no registrar transfer — keep domains at nic.ru, point DNS at all of them to one hosting server, and use host-based 301-redirect logic in the app so only 3 canonical domains serve real content. User is considering a "Levkeiser"/"Левкейсер" trademark, so the store domain was deliberately consolidated under the brand name — first tried `levkeiser.store` as shop canonical, then user corrected it: **`levkeiser.shop` is canonical, `levkeiser.store` redirects to it** (not the other way around).

**Canonical (serve real content):**
- `levkeiser.com` — main personal/brand site
- `levkeiser.shop` — shop; its `/` immediately redirects (302) to `/catalog`
- `левкейсер.рф` — Russian-audience mirror of the main site

**Redirected (301, path preserved) to one of the above** — implemented in [src/config/domains.js](../../../../Desktop/site/src/config/domains.js) `REDIRECT_MAP`, wired into [src/server.js](../../../../Desktop/site/src/server.js) as the first app.use() middleware:
`djlevka.store/.shop`→shop, `djlevka.online/.ru/.com`→com, `levkeiser.ru`→com, `levkeiser.store`→shop, `levkeiser.online`→com, `levkeyser.online/.ru/.com`→com, `levkeyser.shop/.store`→shop, `левкейсер.shop`→shop, `левкейсер.com`→com. Pattern: `.shop`/`.store` TLDs redirect to the shop canonical, everything else to the main canonical.

Cyrillic hosts are matched via `url.domainToASCII` (Node's built-in punycode conversion) since browsers send the Host header in punycode for IDN domains — no external `punycode` package needed. Verified locally with `curl -H "Host: ..."` against `site-verify` (port 3100): redirects fire with correct Location + query/path preserved, store-domain root goes to `/catalog`, canonical/localhost pass through unaffected. `app.set('trust proxy', true)` was also added so `req.protocol` reports correctly once behind Timeweb's reverse proxy/SSL termination.

**Hosting recommendation given to user:** Timeweb Cloud (Node.js "Apps" platform or VPS) — chosen because SQLite needs a persistent disk (rules out serverless like Vercel/Netlify), and Timeweb is RU-based for low latency to the VK/Telegram audience. Domains stay at nic.ru; DNS can be delegated (NS → Timeweb) or per-domain A/CNAME records added in the nic.ru panel pointing at the Timeweb server IP. SSL: user already has GlobalSign DV certs per domain, but Timeweb's free auto-renewing Let's Encrypt is likely less hassle across 15 domains than manually uploading/renewing 15 GlobalSign certs — flagged as a choice for the user, not decided yet.

**How to apply:** [[project_site_status]] and [[project_site_lev_keiser]] describe the app itself — this file is specifically the domain/hosting/redirect layer.

**Deployed 2026-08-12** (update — plan above executed, with changes):
- GitHub push was abandoned — Git Credential Manager's OAuth browser flow kept dying because commands run through the assistant's tool got killed by its own timeout before the user finished authorizing in the browser (local port 127.0.0.1:xxxxx stopped listening). After repeated failures, pivoted to a plain **Timeweb VPS** (not the git-based "Apps" platform) at **5.42.118.236**, root access via password (SSH key auth was declined at server creation since it's simpler for this user to use the browser console / password + Windows' built-in `ssh`).
- The uploaded cloud-init script (`C:\Users\User\Desktop\site\deploy\cloud-init.sh` / `deploy\cloud-init.sh` in repo) silently did NOT run (`cloud-init status` said "done" but log showed "empty cloud-init" — Timeweb likely didn't actually attach the uploaded script to this server despite accepting it in the UI). Recovered by SSH'ing in as root (via Windows PowerShell's built-in `ssh`, password pasted by the user — the browser-based web console's paste was broken) and running the same setup commands manually.
- Once a root shell was available, the assistant generated its own dedicated SSH keypair, had the user paste only the **public** key into `~/.ssh/authorized_keys` (never touched the root password itself — hard rule), then did the rest hands-free over that key: uploaded `site-for-upload.zip` (`git archive` of the committed tree — code only, no `node_modules`/`.env`/data/uploads), extracted to `/var/www/site`, generated `SESSION_SECRET` and a random `ADMIN_PASSWORD` server-side via `openssl rand`, wrote `.env`, ran `npm install --omit=dev` and `npm run db:seed`, started via `pm2 start src/server.js --name site` + `pm2 save` + `pm2 startup systemd` (enabled, confirmed via `systemctl is-enabled pm2-root`).
- nginx reverse-proxies :80 → :3000 (config matches the cloud-init version). Verified live: `curl http://127.0.0.1:3000/` and `curl http://5.42.118.236/` both 200, page renders (catalog page confirmed via browser tool).
- Admin login: `http://5.42.118.236/admin/login`, user `admin`, password was generated and given to the user in chat (not recorded here — treat as rotated/unknown; if needed, reset via the server, not from this memory).
- **DNS approach changed 2026-08-12:** nic.ru's classic panel made it too hard to find actual A-record management (the "DNS-серверы" page only lets you set NS delegation; the "DNS-записи"/zone-record editor couldn't be located, only an NS-server field and a DNS resolution tester). Pivoted to **delegating all 18 domains' NS records to Timeweb Cloud** instead: `ns1.timeweb.ru`, `ns2.timeweb.ru`, `ns3.timeweb.org`, `ns4.timeweb.org` (per [Timeweb's technical-transfer docs](https://timeweb.cloud/docs/domains/domain-technical-transfer)). User is manually redoing this per-domain on nic.ru's "Указать DNS-серверы самостоятельно" page (`nic.ru/manager/my_domains.cgi?step=nameservers&domain=...`) — confirmed done for at least `levkeyser.com`. Once NS propagates (doc says 3–24h), A-records for each domain get added in the **Timeweb Cloud panel → "Домены и SSL"** instead of nic.ru.
- **Live as of 2026-08-12:** 14 of 18 domains fully resolve to `5.42.118.236`, are covered by one Let's Encrypt SAN certificate (`certbot --cert-name levkeiser --expand`, auto-renews, expires 2026-11-10), and were verified over real HTTPS with curl — redirects confirmed working end-to-end (e.g. `https://djlevka.store` → 301 → `https://levkeiser.shop` → 302 → `/catalog`). The 14: `levkeiser.com`, `levkeiser.shop`, `djlevka.store/.online/.com/.shop`, `levkeiser.store/.online`, `levkeyser.online/.com/.shop/.store`, `левкейсер.shop/.com`.
- **Site taken offline for public visitors 2026-08-12** (user request — "not done yet"): nginx-level HTTP Basic Auth added across all 4 server blocks in `/etc/nginx/sites-enabled/site` (login `preview`, password generated via `openssl rand`, stored in `/etc/nginx/.htpasswd` on the server — not recorded here, ask the user or regenerate with `htpasswd -bc /etc/nginx/.htpasswd preview NEWPASS` if lost). A backup of the pre-auth config is at `/etc/nginx/sites-enabled/site.bak` on the server. To reopen publicly: remove the two `auth_basic`/`auth_basic_user_file` lines from each `location / {` block (or restore from `.bak` and re-run certbot's edits) and `systemctl reload nginx`. **Don't forget this is active** — if the user later asks why the site "isn't working" or asks to test it live, check this first before debugging anything else.
- **Still pending DNS (4 of 18):** `djlevka.ru`, `levkeiser.ru`, `levkeyser.ru`, and **`левкейсер.рф`** (the third canonical — main + shop are live, only the RU-Cyrillic canonical is still stuck on old nic.ru NS/A records as of last check, an unrelated IP `178.210.92.188` was still showing). Once these switch, run the same `certbot --nginx --cert-name levkeiser --expand -d ...` command (see this session's history) adding the newly-resolving hostnames — punycode form of левкейсер.рф is `xn--b1afbatee0ch.xn--p1ai` (use `node -e "console.log(require('url').domainToASCII('левкейсер.рф'))"` to regenerate if needed, don't hand-transliterate).
- A local git repo *does* exist now at `C:\Users\User\Desktop\site` (`git init` + one "Initial commit"), with remote `origin` still pointed at `https://github.com/verakeiser2012-coder/lks.git` — but nothing was ever successfully pushed there. Harmless to leave as-is; not part of the active deploy path.
- The dedicated SSH deploy keypair lives in this session's scratchpad (ephemeral) — a **future session redeploying to this same server will need a new key** (get the user to paste a new public key into `authorized_keys` again, same as this session did) since the scratchpad won't persist.

**Why:** Two personas share the site — Лев Кейсер (personal/fashion/acting) and DJ Levka (music/DJ) — plus a shop, so the domain set covers both names across several TLDs and a defensive misspelling ("Keyser").

**How to apply:** When the user asks to connect a domain, deploy, or configure hosting/DNS, this is the full candidate list — no need to ask what domains exist again. Still confirm which one(s) they want as canonical/primary and where the app will actually be hosted (no hosting/deployment target recorded yet).
