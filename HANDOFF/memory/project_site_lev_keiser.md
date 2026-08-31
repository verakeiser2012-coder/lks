---
name: project_site_lev_keiser
description: "State of the Лев Кейсер / DJ Levka personal site build — social/audience analysis, product strategy, shop features (drops/gigs/redheads/banners), signature video techniques, contest, ad budget, Груша podcast tie-in, what's pending"
metadata:
  node_type: memory
  type: project
  originSessionId: 362aa729-aed5-435c-8611-fafd27ebd7c8
  modified: 2026-08-26T12:57:37.412Z
---

Building/extending a personal Node/Express/EJS/SQLite site at `C:\Users\User\Desktop\site` for Лев Кейсер
(@levkeiser on Instagram — actor/model, 14 years old, Yekaterinburg) and his DJ persona DJ Levka
(@djlevka.music). Site owner (user, midasbk090@gmail.com) is a parent/manager running Lev's online presence.
Target audience being pushed toward: **21–25+ year olds with ambition/life goals** (not the site's current
actual audience, which skews toward parents of child models + tweens) — this reframing drives most recent work.

**Why:** Two creative directions on one site — fashion/acting (Лев Кейсер) and electronic music (DJ Levka) —
plus a shop and a brand-outreach channel. A separate real-world project (`[[project_fleur_abazhury]]`) is
sourcing a custom-lampshade capsule with atelier "Флёр" (Yekaterinburg) that ties directly into this site's shop.

**Analysis artifacts produced this session** (private HTML artifacts, not saved in the repo) — all in one
evolving document at `https://claude.ai/code/artifact/41dd8068-e18c-433f-9208-b44243906a26`, plus an earlier
standalone one:
- "Профили Льва Кейсера — анализ аудитории" (`.../3e651808-4c59-471c-b893-efaa31e5a117`) — original Instagram
  comparison of @levkeiser vs @djlevka.music vs competitor @lev_tumanov_.
- The evolving doc covers, in order added: 6-month posting plan → competitor @dima_pele_ (260K followers,
  Yekaterinburg, dad-managed, TV/festival growth ladder) → full social-platform audit (Telegram/VK/Дзен/Rutube
  found stronger for RU 21-25 audience than Instagram, which needs VPN in Russia; TikTok upload blocked from RU
  but workaround planned) → shop product strategy (incense, vinyl records, Флёр×Лев lamps, Levkeiser apparel) →
  reference-creator lessons (Vlad А4: one signature format; Milana Khametova: creator-house network effect;
  best audience-match found via Forbes list: **Илья Колосовский/Trauma**, same city, funk/electronic, started
  music at 10) → remix plan (official PromoDJ contest "Denis A — Get it!", deadline 2026-09-27; permission
  request drafted for an unofficial remix of «Розовое вино» by Элджей/Feduk — letter saved at
  `scratchpad/remix-permission-letter.txt`, rights contacts found: commercial@sayonaraboy.ru + mgmt@fedukonelove.com).

**Розовое вино rejected 2026-08-17:** Lev himself didn't approve doing a remix of this track — wants something
less "клубное" (club-oriented) for the remix-permission pitch. The drafted letter/rights-contacts above are now
moot for this specific song; need a different source track with a less club-driven vibe before reusing that
outreach approach. Not yet re-sourced — ask before assuming any replacement track.

**Linktree vs BandLink decision 2026-08-17:** these are not competitors, they serve different jobs — don't
migrate one into the other. **Linktree** (`linktr.ee/djlevka.music`) stays as-is: it's the general bio-link hub
already distributed across every profile (Instagram, TikTok, was in the old Audius bio) — breaking it everywhere
it's already posted isn't worth it. **BandLink** (`band.link`) is a separate, RU-specific *smart link* tool made
by **Yandex Music** itself — routes a listener to whichever streaming service they already use, plus a "Сканер"
that shows which Yandex Music editorial playlists a track/artist is in, and ties into Yandex's own algorithmic
visibility (Моя волна, Нитро tech, Chart). It's already in active use for the vinyl-merch research (see below —
band.link pages were the source for pulling real Spotify durations). It's also the literal example destination
named in Our Angels' promo-questionnaire ad-budget template (see `[[project_music_distribution_djlevka]]`) — so
it's the expected tool for release-specific smart links / paid-promo destinations going forward, not a Linktree
replacement. **Practical split: keep Linktree as the general identity/bio link everywhere it already lives; use
a BandLink smart link per new release**, especially whenever running paid promo through Our Angels' format.

**Site features built 2026-08-12** (in addition to the 2026-08-11 baseline — see that section below):
- `/gigs` ("Выступления") — DJ Levka booking page (genres + mailto contact), reuses the `page_links`/section-intro
  pattern, admin-editable at `/admin/pages/gigs`.
- `/music` now has a "Сейчас" featured-release hero block above the streaming embeds (Tame Impala–style), driven
  by new settings `music_featured_title/note/url`, editable at `/admin/pages/music`.
- `/drops` + `/drops/:slug` — a Golf Wang–style chronological archive of named capsule "drops", backed by a new
  `collections` table + `products.collection_id` column. Admin CRUD at `/admin/collections`; products can be
  assigned to a collection from the product form. Seeded with one drop: "Флёр × Лев" (no real products attached
  yet — page is live as a teaser).
- Fixed along the way: the `page_links` seed for new sections was silently skipped because it shared one
  `pageLinksCount === 0` guard with the already-seeded music/style/video rows — new sections need their own
  independent seed guard. Also: adding a 4th item to `.shop-nav` broke mobile layout (no wrap) — fixed with a
  `flex-wrap` media-query rule.

**Baseline built 2026-08-11:** `/music`, `/style`, `/video` (DB-backed intro text + grouped `page_links`,
admin-editable), header nav split into personal cluster vs. shop pill (Каталог/Дропы/Брендам/Корзина), dual-name
header logo with verified-badge icons, `/brands` lead form (built by a concurrent session, not me).

**Site features built 2026-08-13:**
- `/redheads` ("Рыжие, которые вдохновляют") — Lev is a natural redhead (confirmed via his own Pinterest bio).
  Curated showcase (`redhead_spotlights` table), **not** open registration — deliberate choice after discussing
  moderation/safety risk of open sign-up on a minor's site. Public submission form posts to
  `redhead_submissions` (status new/approved/rejected), reviewed at `/admin/redheads/submissions` before
  anything goes live. Seeded with Lev as spotlight #1.
- Reusable cross-page **promo banner system** (`promo_banners` table, keyed by `page_key`, admin CRUD at
  `/admin/banners`, partial at `views/partials/banner.ejs`) — used to surface `/redheads` as a subsection banner
  on `/style` and `/news` instead of (later re-added by a concurrent session) a top-nav link.
  Design inspiration pulled from real reference sites: Feduk (tour-date hub + contact modal → became `/gigs`),
  Tame Impala (hero release banner → became the `/music` "Сейчас" block), Golf Wang (chronological named-drop
  archive → became `/drops`).
  Brand pitch loop closed 2026-08-13: `/brands` got a new offer "Реклама с рыжими" (pitch brands on booking
  people from the redhead showcase for campaigns), and `/redheads`' submission form now tells applicants that
  being featured can lead to real brand-campaign invites — the two funnels reference each other.
- Redhead Days festival (Roodharigendag, Tilburg NL, 28–30 Aug 2026, world's largest redhead gathering) used as
  a real-world news hook: published a site news post (`/news/poka-v-niderlandah-festival-ryzhih-u-nas-novyy-razdel`)
  with two CC-BY-SA-licensed photos from Wikimedia Commons (downloaded + resized from ~13MB/6.4MB originals down
  to ~530KB/350KB with a temporary `sharp` install — not a permanent dependency), attribution given in the post
  text (Bart Redhead Days, Vysotsky). Drafted a long-form Дзен article (`scratchpad/dzen-redhead-days-article.md`,
  not yet posted — no Дзен publishing integration, article was handed to the user as a file). Scheduled both in
  `/admin/calendar`: Дзен entry for 2026-08-28 (festival start), VK/Telegram announce for 2026-08-14.
- Researched Schengen visa reality for next year's festival (2027): **Netherlands has not accepted direct
  tourist-visa applications from Russian citizens since April 2022** — practical path is a Schengen visa via a
  more lenient country's consulate (Spain/France/Italy/Austria/Portugal/Croatia), valid Schengen-wide. Since
  2025-11-07, Russians only get **single-entry** visas (no multi-entry). A minor needs their own visa: birth
  certificate + notarized consent from the non-traveling parent (≤12 months old, Schengen-wide) + insurance.
  Apply 4–6 weeks ahead; festival is peak season (May–Sept) so consulates are slower.
- Bug fixes made along the way: `renderLinkedText` (`src/utils/text.js`) only linkified `https?://` URLs —
  internal `[text](/path)` links silently failed to render as `<a>` tags; now also matches paths starting with
  `/`. `.hero h1` had no mobile font-size rule — a long heading ("Рыжие, которые вдохновляют") overflowed at
  375px where short ones ("Музыка") never had, fixed with a `max-width:480px` media query (benefits all pages).
- Committed to git in three commits (`c78460c`, `d38e36d`, `4fd432c`) — everything above plus the whole 08-12
  feature set (page_links sections, drops/collections, gigs, banners, domain-redirect config). Added
  `data/*.db-shm` and `data/*.db-wal` to `.gitignore` (were untracked SQLite WAL files, shouldn't be committed).
  Not pushed to any remote — repo has no remote configured as of this session.
- Defined **5 signature visual techniques** for Lev's video/photo content (recorded in the plan artifact, not
  yet in the repo as a doc): проходка (model walk), slow-motion accent, camera push-in + wind-blown hair
  (cheap fan prop, ~1000-2000₽), "spotting"/peeking-around-corner eyeline (natural segue into a shop product),
  exchanging glances. User's explicit correction: **not all 5 per video** — 1-2 per piece is enough, just make
  sure every video/photo uses at least one; this doubles as a technique library for planning shoots, not a rigid
  shot sequence. Each technique mapped to both video AND still-photo equivalents.
- Planned a UGC contest **"Пройдись как Лев"**: film your own model walk to any DJ Levka track, safe public
  location. User correction: age **0+** (not 18+) — deliberately opens it to the existing parents-of-child-models
  audience segment, not just the 21-25 target; safety rules (public/safe locations, no stunts, guardian consent
  for minors) stay non-negotiable. Brand reps can judge the contest — added as a new `/brands` offer card
  "Судейство в конкурсах" (commit `4fd432c`).
- Ad budget reality check: **Meta and TikTok ad platforms don't work for Russia-based advertisers** since 2022 —
  not a choice, a technical constraint. User set a real combined budget (contest + general shop promo):
  **30,000-40,000 ₽/month**, RF-only channels. Working allocation at the 35k midpoint: VK Реклама 45%
  (~15,750₽), Telegram Ads/placements 35% (~12,250₽), Яндекс Директ 20% (~7,000₽) — shift toward VK/Telegram in
  contest-launch months, toward Директ in steady months.
- Pulled in the key facts from a **sibling but separate session's** music-distribution research
  (`[[project_music_distribution_djlevka]]`, different originSessionId — not done by me) into the plan artifact,
  because it directly gates the contest: old distributor Sundesire doesn't deliver to TikTok Commercial Music
  Library or Meta Sound Collection; new distributor **Our Angels** (demo accepted, RU-friendly flat-fee payout)
  confirmed both — without CML coverage, "Пройдись как Лев" entrants can't just pick the track as sound, they'd
  have to manually overlay audio, which kills the mechanic. Practical takeaway added to the plan: hold the
  contest launch until at least one track is actually live through Our Angels in TikTok CML. Also noted:
  DJ.ru remix contests require RU citizenship + 18 — Lev doesn't qualify yet, not a bug to route around, just
  wait; and the Beatport-genre recommendation (Funky House/Nu-Disco core, Afro House promo singles) for context
  on future releases.
- **Checked 2026-08-13: a concurrent session already fully built the "Пройдись как Лев" contest** — NOT built by
  me, don't rebuild. Committed by me at the user's request in `517a241` (bundled with the rest of that session's
  uncommitted batch: mail.js notifications, mobile nav toggle, Roboto Slab font swap — all were sitting
  uncommitted together, so went in as one commit). What exists: public `/contest` page (rules + prize text, already filled in: winner picks
  either shop merch or a cash prize) with a submission form that takes a **link to an already-posted video**
  (YouTube/TikTok/VK/Instagram — platform-agnostic) rather than a file upload, same 18+/guardian-consent
  checkbox pattern as `/redheads`; admin at `/admin/contest` (edit rules/prize) and `/admin/contest/submissions`
  (review + status change). Verified live via a second preview instance (port 3000 was already taken by the
  other session's server; mine ran on autoPort 52028 against the same working-tree files) — page renders, no
  server errors. Also new: `src/services/mail.js` — Gmail email notifications (via `nodemailer`, now a real
  dependency) on brand/redhead/contest submissions to djlevka2012@gmail.com, degrades to console.log if
  GMAIL_USER/GMAIL_APP_PASSWORD aren't set in `.env` (see `.env.example`) — doesn't break anything unconfigured.
  Gaps noticed: nothing verifies the submitted video actually uses a DJ Levka track (manual-moderation-only);
  no explicit participant-age text field even though the contest is 0+ (only the yes/no consent checkbox) — the
  plan's "как решить до запуска" list can now drop "приз" as resolved but should still flag these two gaps if
  asked to review it further.
- Classified every platform as **subscription-driven** (growth = pure consistency; Telegram, Rutube, YouTube
  long-form, Дзен) vs **feed/algorithm-driven** (a single piece can break out regardless of follower count; VK
  Клипы, Instagram Reels, YouTube Shorts, TikTok). Conclusion for the feed-driven group, including TikTok
  specifically: still don't chase virality per-video — craft a strong hook (first 1-3s) into every piece via the
  signature techniques, but treat frequency as the controllable lever and virality as an occasional side-effect,
  not the goal. Folded into the Month-6 review phase of the roadmap.
- **Груша podcast context connected to the shop plan**: confirmed the incense/благовония product line (planned
  back on 2026-08-12) will actually come from Груша, the podcast guest — the podcast itself is being framed as
  "how the collab happened" origin-story content. A Флёр podcast (the lampshade atelier already tied to the
  `/drops` "Флёр × Лев" capsule) is planned next, then more — this is becoming a recurring format: brand-partner
  podcast → origin story → real product in the shop. See `[[project_podcast_grusha_edit.md]]` for edit status
  (v3 delivered 2026-08-13, ~42min, still needs the user's final audio track swapped in before anything else).
  Vertical promo cuts from it are planned but **paused** — user wants the main edit finished (with real audio)
  before cutting; only 2 of the 5 signature techniques fit a seated-interview format naturally (переглядывание —
  already baked into the existing B-roll reaction inserts; slow-motion — fits the handpan/lute duet moment).
  Проходка and the wind/push-in technique don't fit interview footage organically — reserved for a bumper/bookend
  clip instead. Plan when resumed: pull 3-5 vertical clips (hook = Ural-bakhur pricing story, music duet w/
  slow-mo, statue/album-cover story, B&W process montage), each bridging to an actual shot of the incense product
  so the "conversation → real product" causality is visible, not just implied.

**Груша × Лев incense product finalized 2026-08-17 (separate session, not yet reflected in repo):**
- Two SKUs decided for the "Груша × Лев" drop: (1) a passive (non-burning) scented wax tablet with an
  embedded hanging-loop (cord knotted into the wax before pouring), packaged in a mini vinyl-record-style
  cardstock sleeve; (2) a **flagship collectible** — a solid wax pour into a silicone mold cast from an
  existing 10cm "soundstates"-branded 3D-printed bust (two mold detail levels exist, user leaning toward the
  less-detailed/more-robust one since fine curls are prone to breaking in a resin-heavy wax mix). Confirmed by
  user: **this bust is the literal payoff of the "statue/album-cover" story from the Груша podcast** — closes
  the loop the vertical-promo-clip plan already earmarked (see the podcast section above: "statue/album-cover
  story" was one of the 3-5 planned clip hooks bridging conversation → real product).
- Full fragrance formula (oriental-gourmand: frankincense/amber/labdanum resinoids, vanilla-rum reduction,
  benzoin, tonka, nutmeg, neroli, ambroxan, musk, jojoba) and gram-level ratios were worked out in that session's
  chat, not saved as a file — tablet uses 65% wax / 35% aromatic (bumped from 62/38 for loop-anchor strength),
  bust uses 68% wax / 32% aromatic (bumped further for handling/shipping durability). Raw-material cost ~79₽/g
  at full concentration — flagship bust estimated **8,000-14,000₽ in materials alone** pending an actual mold-volume
  measurement (user hadn't measured it as of 2026-08-17; recommended method: fill mold with water, weigh in
  grams = ml). User confirmed price is not a constraint for the flagship piece — full-concentration formula, no
  cost-driven dilution.
- Packaging concept for the tablet SKU explicitly reuses the DJ Levka vinyl-record association already planned
  for the shop (vinyl records were in the original shop product-strategy list).
- **Flagship bust gets 4 added functional features (user approved all, 2026-08-17):** (1) jewelry-holder hooks
  on the shoulders — best added by modifying the 3D model before the silicone mother-mold is cast; if the mold
  already exists, fall back to embedding small metal jewelry findings into the wax during pour, same anchoring
  technique as the tablet's hanging loop. (2) An NFC chip embedded in the base during pour (laid flat near an
  edge, thin wax layer over it for reliable phone read range), linking to the podcast's statue/album-cover
  story clip. (3) A QR code was considered but rejected as wax-molded (fine print doesn't hold detail/contrast
  reliably in wax) — recommended instead as a printed card in the packaging, separate from the NFC-in-wax.
  (4) A wick embedded centrally during pour (wick tab anchored at the mold base) so the bust *can* optionally
  be burned as a candle later. **This explicitly reverses the earlier "exclude all burning/воскурение" decision
  — but the reversal is scoped only to this flagship bust SKU, not the tablet and not the product line's
  general design intent.** Don't silently extend burning-capability back into the tablet SKU without a separate
  explicit decision.

**Груша identity correction (2026-08-17):** Груша's real name is **Юлия**, Telegram `@lyulialyulia` (personal contact, not a channel — no public post feed visible without login). User is looking for a Yekaterinburg gallery for her **first author/solo exhibition as a visual artist** — she has no personal exhibitions yet. Important: the "Soundstates by DJ Levka" album cover art (collage/mixed-media bust-in-cosmos piece, found in `Desktop\Soundstates\`) is **NOT her work** — an earlier assumption in this same session wrongly attributed it to her when researching gallery fits; don't reuse that visual style as a proxy for her actual medium again. Her actual artistic medium/style is still unconfirmed as of this note — ask before recommending style-specific venues. Gallery shortlist compiled (via web search, not personally vetted) for a debut exhibition in Yekaterinburg: top pick **«Ателье» (Atelierë)**, ul. Студенческая 11 — explicitly prioritizes artists without prior personal exhibitions, this recommendation holds regardless of medium. Runner-ups pulled from a "15 galleries in Yekaterinburg" roundup (choice-media.ru) but were style-matched to the wrong (collage) assumption and should be re-evaluated once her real medium is known: 11.ART (same building, young Ural artists), PoLe Gallery (пр. Ленина 50ж, experimental/community), Sabina-Art (ул. Радищева 33, beginner-friendly).

**DJ Levka vinyl-record merch researched 2026-08-17 (this session):** actual shop product from the original
"пластинки" idea in the shop product strategy list — turning DJ Levka's 3 real EPs into physical vinyl.
- Pulled real durations from Spotify (via band.link → open.spotify.com album pages, found by extracting
  embedded script URLs since band.link is a JS SPA WebFetch can't read directly): **Ikigai** (2024, 5 tracks,
  10:17), **Flowers** (2025, 5 tracks, 13:55), **Soundstates** (2026, 5 tracks, 12:57) — combined **37:09**.
  Found and reported a real bug along the way: band.link/ikigai's Spotify link pointed at the wrong album
  (Flowers' ID) — user fixed it same session, verified corrected.
- Designed a gatefold-style packaging concept: 4-panel/3-hinge accordion jacket, each fold-open revealing one
  album in chronological order (closed cover → Ikigai → Flowers → Soundstates+full tracklist/barcode on the
  final back panel), record pockets on the first spread for everyday access. Spec'd as an artifact:
  `https://claude.ai/code/artifact/cd188069-0780-49b8-8311-3853803c3113` ("Виниловый трифолд DJ Levka") — panel
  dimensions (314×314mm each, standard LP jacket size, folds down to one-panel footprint), track listings,
  materials notes, and an explicit caveat that this is a brief for a packaging vendor, not a die-cut-ready file.
- **Vendor pricing researched, real numbers not estimates:**
  - **instaholst** (Instagram, user's own contact) — real playable transparent vinyl, from 1 unit. 7"=6990₽
    (std 4min/side, max 6min/side), 10"=8990₽ (std 8min/side, max 14min/side), 12"=11990₽ (std 12min/side, max
    21min/side); extensions +200₽/min beyond standard; color vinyl +2500-3500₽ depending on size.
  - **Vinylium** (Санкт-Петербург, vinylium.ru) — 7"=4000₽, 12" black=8900₽, custom jacket printing 1700₽(12"),
    custom jacket design +2000₽. Most promising lead for a custom trifold since they explicitly offer bespoke
    jacket design (others don't).
  - **Vinyl-Record.ru** (Москва, direct-cut tech, from 1 unit) — cheapest base prices: 7"=4250₽, 10"=5750₽,
    12"=6450₽. No explicit gatefold/trifold offering mentioned.
  - **Recordsman** (Москва) — ruled out for this use case, MOQ 100+ units, not viable for a single custom piece.
  - **No Yekaterinburg-local vendor found** for single-unit custom vinyl or trifold printing — niche is
    concentrated in Moscow/SPb only.
- **Cost math worked out (using instaholst's real per-minute pricing) — one combined record beats three
  separate ones by nearly 2x, even with MOQ no longer a factor:** one 12" with all 3 albums (37:09, split
  ~18:30/side, within instaholst's 21min/side max) ≈ 14,620₽ clear / 18,120₽ colored. Three separate records
  (Ikigai on 7", Flowers+Soundstates each on 10") ≈ 25,430₽ clear / 33,430₽ colored. The economics now come from
  each disc paying its own ~7-9k₽ base fee regardless of length, not from minimum-order tiers.
- **User's next step (as of this session):** contacting Vinylium directly with the trifold brief/artifact to
  ask whether they can produce the 4-panel accordion design. Not yet confirmed feasible by any vendor.

**English/international site decision + bilingual news shipped (2026-08-17):** User asked whether to build an
English site version and buy country-specific domains. Resolved: **no new country domains** — use the existing
`levkeiser.com` (already the canonical international domain per `[[project_site_domains]]`) for English content
instead. Implemented real bilingual (RU/EN) news end-to-end: `news` table got a `lang` column (migration-guarded
in `src/db/init.js`), `src/routes/news.js` became a `createNewsRouter(lang)` factory mounted twice
(`/news` = ru, `/en/news` = en) in `src/server.js`, admin news form got a language select, and
`renderLinkedText()` (`src/utils/text.js`) was extended to linkify internal `/path` links, not just
`https?://` ones. Published a real cross-linked RU/EN post pair about the Soundstates Spotify editorial
playlist placement (next to Moby/Moderat/Röyksopp). Committed in `c05afea` together with the contest work.

**Professional email set up (2026-08-17):** Replaced both `djlevka2012@gmail.com` (site notify address) and
`dj.levka.music@gmail.com` (DJ booking contact) with Yandex 360-hosted mailboxes on `levkeiser.com`: user bought
the Yandex 360 "Минимальный" tariff (159₽/мес on her actual signup screen), verified domain ownership via a DNS
TXT record (`yandex-verification: ...`, host `@`, added through the Timeweb Cloud DNS panel — works even though
the site itself is still password-protected, since TXT verification doesn't require the Yandex bot to load the
page), then created **three separate real mailboxes** (not aliases as I'd suggested for cost — she went with 3
paid mailboxes instead, that's fine, just means routing had to happen at the app level):
`info@levkeiser.com` (general/default notify), `brand@levkeiser.com` (brand inquiries), `booking@levkeiser.com`
(DJ Levka bookings, replaces the old gigs mailto).
- Site code updated to match: `src/services/mail.js` switched from the Gmail-specific `nodemailer` transport
  (`service: 'gmail'`) to generic SMTP (`smtp.yandex.ru:465`), env vars renamed `GMAIL_USER`/`GMAIL_APP_PASSWORD`
  → `SMTP_USER`/`SMTP_PASSWORD`; `notify()` now takes an optional `to` override. `src/routes/brands.js` passes
  `'brand@levkeiser.com'` explicitly; `/redheads` and `/contest` submissions still fall through to the
  `NOTIFY_EMAIL` default, now `info@levkeiser.com`. The `/gigs` page's `page_links` mailto row (id 32) and its
  `src/db/init.js` seed default were both updated from `dj.levka.music@gmail.com` to `booking@levkeiser.com`.
  Verified live in a fresh preview instance (autoPort, since a concurrent session already had one running) —
  `/gigs` renders the new mailto link correctly.
- **Update 2026-08-26: mail login is fully blocked, unresolved.** User supplied a mailbox password
  (`djlevkeiser2103`) which is now saved in `.env`'s `SMTP_PASSWORD`. Test send from this dev machine failed —
  `smtp.yandex.ru` on ports 465/587/993 all connection-timeout even with `family: 4` forced, while `yandex.ru:443`
  and unrelated hosts connect fine — looks like this dev environment's network blocks outbound mail ports
  specifically, not a code/credential bug (confirmed via raw `net.createConnection` probes, not just nodemailer).
  Separately, on the user's own Android phone, `info@levkeiser.com` could not be added via: (1) manual IMAP/SMTP
  entry in the phone's stock "Другая почта" flow (`imap.yandex.ru:993`/`smtp.yandex.ru:465`, SSL on, settings
  all correct) — error "Такого сервера нет или к нему не удалось подключиться"; (2) the same error again inside
  mail.yandex.ru's own **"Сборщик почты"** (mail-collector) feature, tried from her existing personal Yandex
  session — this is a different mechanism than logging in as `info@` directly, it never actually tested a direct
  login. **Direct login as `info@levkeiser.com` in a clean/incognito browser tab was recommended as the next
  diagnostic step but not yet confirmed done or its result reported.** Full state + step-by-step next actions
  written to `EMAIL-SETUP.md` (repo root, not committed — gitignored-adjacent working note) for continuity.
  Open hypotheses, in order of likelihood, not yet tested: (a) IMAP toggle or 2FA/app-password requirement
  specific to `info@` in its own mailbox settings; (b) `brand@`/`booking@` may have been provisioned as Yandex
  360 **"общие ящики" (shared mailboxes)** rather than personal logins — those don't take a direct
  password/IMAP login at all, access is granted to an org member via admin.yandex.ru instead, which would also
  explain persistent generic "can't connect" errors if she's trying password-based login on them; (c) MX/SPF/DKIM
  inbound-routing records were never reached in the Yandex 360 setup wizard (only domain-ownership TXT + mailbox
  creation done) — unclear whether that gates outbound protocol login too, untested. **Next session picking this
  up should start by asking whether the incognito direct-login test was ever tried/what it showed**, before
  repeating earlier troubleshooting.

**Pending / not yet done:**
- Instagram bios/highlights, Telegram/VK/Rutube content changes — all still just recommendations, nothing
  applied on the actual social accounts yet. The Дзен article text exists but hasn't actually been posted to
  Дзен (no API integration — was handed to the user as a file to post manually).
- The remix permission letter hasn't been sent; needs real band.link/YouTube/social links filled in before sending.
- Флёр × Лев drop has zero real products attached — needs actual lamp SKUs once sourcing (see
  `[[project_fleur_abazhury]]`) finishes.
- No media-kit page or brand rate card built yet.
- Shop launch timing (the plan assumes ~October 2026) not confirmed against real production/inventory status.
- 2027 Netherlands trip is only researched, not booked/started — visa prep should realistically begin by
  spring 2027 given the 4-6-week (peak-season-slower) processing window.
- "Пройдись как Лев" contest is only planned, not launched: still needs a prize fund decided, judging criteria
  finalized, 2-3 seed videos from Lev filmed first, and the ad budget actually set up on VK/Telegram/Директ.
- The 5 signature techniques aren't written up anywhere in the repo itself (only in the artifact) — if the user
  wants a standing reference for shoot planning, it should probably become a real page or admin-editable note.

**LEVKEYSER personal merch-brand identity (2026-08-24 to 08-26, separate session):** a distinct sub-project —
wordmark, "Дикий лев" color palette, mark, and a slab-serif display font (also applied to this site's own
`--font-display`), plus local Yekaterinburg brand-partnership scouting. Full details in
[[project_levkeyser_brand_identity]] — not duplicated here since it's a fairly self-contained design-decisions
thread with its own living artifact.

**How to apply:** Concurrent-session editing is a recurring pattern on this repo — re-read files immediately
before editing, expect occasional "modified since read" conflicts. Re-read `header.ejs`/`style.css` before
color- or nav-dependent changes rather than trusting this summary — e.g. the "Рыжие" nav link was removed by me
on 08-13 then put back by a concurrent session same day; don't assume either state without checking.
See `[[gotcha_dev_server_no_autoreload]]` and the sibling memory `project_site_status.md` (autoPort dev-server
setup, shared `data/shop.db`) before testing. Per `[[project_site_domains]]`, the site is now deployed live on a
VPS (5.42.118.236, SSL) but still password-protected/not public — local commits here don't auto-deploy there;
check that memory before assuming local work is what's actually live.
