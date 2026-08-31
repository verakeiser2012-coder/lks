---
name: project_levkeyser_brand_identity
description: "LEVKEYSER personal merch-brand identity for Лев Кейсер — wordmark, 'Дикий лев' palette, mark, slab-serif font (also applied to the live site), plus local Yekaterinburg brand scouting/partnership research"
metadata:
  node_type: memory
  type: project
  originSessionId: b19de9a3-d0fb-480d-ab1f-7d426b0780c0
  modified: 2026-08-26T12:52:55.719Z
---

Separate from the site-build work in [[project_site_lev_keiser]] — this is Lev's own **personal creative/merch brand**
(distinct from "Лев Кейсер" the site persona name), built out over several sessions as an evolving brandboard
artifact rather than in the repo.

**Identity decided (locked in, in this order):**
- **Wordmark**: `LEVKEYSER` (latin, solid one-word streetwear-style lockup) / `левкейсер` (cyrillic, lowercase).
  Chose solid one-word capitalization deliberately — reads as a logo block, not a name, matching how streetwear
  brands (VETEMENTS, CORTEIZ, OFFWHITE) set wordmarks.
- **Palette "Дикий лев" (Wild Lion)** — savanna/earth tones, not the site's own gold/imperial palette (those are
  two separate visual systems for two separate things). Current 7 colors: Грива `#B4601C` (primary/mane),
  Закат `#D99A2B` (amber highlight), Пыль `#DCCBA0` (background/dust), Смола `#211A12` (ink/dark surfaces),
  Ржавчина `#7A2E1B` (rare accent/CTA), Акация `#6FA83C` (bright accent — **updated 2026-08-26** from a muted
  `#707A3D` to this brighter shade per explicit request), Сумерки `#6B4E7D` (dusk/night accent). Dark-theme
  variants defined too (brighter versions of each, e.g. Акация → `#93D654`). "Дроп-пары" (loud/vivid duotone
  combos like сумерки×закат, ржавчина×акация) reserved only for limited merch drops, not the core palette.
- **Mark**: after presenting 3 concepts (А·Портрет fill-curl face, Б·Печать circular bust-emblem/coin-stamp,
  В·Завиток abstract curl-only), user **picked Б (Печать)** — a bust silhouette in a circle, styled like a
  coin/stamp emblem, good for patches/stickers/avatars. Curls are drawn as small filled loop shapes on top of
  the head. **Curl color is orange** (`var(--mane)`, i.e. Грива), not green — user explicitly corrected this:
  an earlier standalone "curl-green" accent token was removed entirely and merged into the general-palette
  green (Акация got brightened instead, see above) rather than keeping a mark-only special color. The mark is
  based on Lev's actual curly hair + headphones (a DJ-personal signifier), deliberately chosen over a literal
  lion-mane icon since the curls **are** his real recognizable silhouette across reference images he provided.
- **Typography**: display font is a **slab serif** — `Rockwell, 'Roboto Slab', 'Arial Black', Georgia, serif`.
  Landed here after explicitly comparing world-brand references at the user's request: (1) the original poster-
  condensed direction (Impact-style, "боксёрские афиши"), (2) a geometric-grotesque-oblique direction modeled on
  **Futura Heavy Oblique / Supreme's box logo** (streetwear drop-culture reference), (3) the winning slab-serif,
  styled after **safari-expedition/western-signage lettering** — closer to the "Дикий лев" savanna narrative
  than to generic streetwear. **This choice was also applied to the live site**, not just the brandboard (see
  below).
- **Two "modes"** for applying the system: **Громкий** (loud — drops/posters/prints, halftone-dot duotone
  texture, vertical stacked type either side of the mark) vs. **Тихий** (quiet — covers/captions/tracklists,
  plain monospace, modeled visually on Lev's actual "Flowers EP" tracklist).

**Brandboard artifact** (living document, redeployed to the same URL across the whole design process — always
re-read/redeploy this URL rather than creating a new one if continuing this thread):
`https://claude.ai/code/artifact/4544f7af-30d0-43e3-9849-0c959e94c141` — favicon 🦁. Contains the full palette
swatch strip (click-to-copy hex), the finalized mark, the loud/quiet mode examples, and merch mockups (hang
tag, patch, hoodie print) all re-skinned to match the current decisions above.

**Site font swap (2026-08-26, this session):** applied the same slab-serif choice to the actual live site's
`--font-display` CSS var — `public/css/style.css` line ~14 (was `'Unbounded'`, Google-Fonts-loaded) → now
`'Roboto Slab', Rockwell, 'Arial Black', Georgia, serif`, with the Google Fonts `<link>` in
`src/views/partials/header.ejs` swapped from `family=Unbounded:wght@500;600;700;800` to
`family=Roboto+Slab:wght@500;600;700;800`. Verified live (own preview instance, port 3000) across home, catalog,
about, music, style, video, gallery, news, brands, cart, gigs — all 200, font loads (`document.fonts` confirmed
all 4 weights `loaded`), no overflow on nav/shop-nav/logo. **Note**: [[project_site_lev_keiser]] (09-day-old
entry, may be stale) separately mentions a "Roboto Slab font swap" already landing via a concurrent session back
on 2026-08-13 — by the time this session started, the live `--font-display` was back to `'Unbounded'` (either
reverted by yet another concurrent session, or that earlier mention referred to something that didn't stick).
Given the repo's heavy concurrent-editing pattern, **don't assume this font choice is still live without
re-checking `style.css` first** — re-verify before building on it.

**Local Yekaterinburg brand scouting (2026-08-24 to 08-25, this session)** — done at user's request to find
potential collab/cross-promotion partners for LEVKEYSER, prompted by an upcoming local-brands festival:

- **«Маркет Маркета»** — Yandex Market's regional-brand summer festival, one of 4 cities (also Kazan, SPb,
  Nizhny Novgorod). Yekaterinburg date: **30 августа 2026, 13:00–21:00, УГМК-Арена** (ул. Степана Разина, 15),
  free entry via the Yandex Market app. 60+ local brands (2025's edition had 52, 90k visitors), selection
  criteria = own production + regional origin + textiles/ceramics/clothing/accessories/home/beauty categories —
  i.e. directly overlaps LEVKEYSER's planned merch categories (textiles/apparel, candles, jewelry, home decor).
  Corporate partner zones named (Яндекс Пэй, ДоброFON, Level Travel, Авито Авто, VIVO, T2, Лавки Лавки, Яндекс
  Go), headliners IOWA + О! Марго — but **the actual 60+ vendor list was still not public as of 2026-08-25**,
  only one confirmed individual brand found: **HERE TO FEEL** (Анна Никифорова) — craft candles, body fragrance,
  textile sprays, bath bombs, solid perfume; directly relevant to LEVKEYSER's candle merch plans.
- **A one-time scheduled routine was created** to re-check for the published vendor list closer to the date:
  `trig_01RF3VXauygEdnwmxJyaRUya`, fires **2026-08-29 05:00 UTC (10:00 Yekaterinburg)**, self-contained prompt
  (web-search only, no repo access) — result will land in that routine's own session
  (`https://claude.ai/code/routines/trig_01RF3VXauygEdnwmxJyaRUya`), check there if picking this up after that
  date, don't re-run the same search from scratch without checking first.
- **Broader Yekaterinburg-wide brand scan** (not festival-specific) surfaced better matches, ranked by fit with
  LEVKEYSER's aesthetic/merch categories:
  - **Avgvst** (jewelry, since 2014, corner in ЦУМ) — minimalist chains/rings, "украшения для тех, кто не носит
    украшения" — **top match**, directly overlaps the planned signet-ring/chain jewelry line.
  - **Прекрасная Зелёная** (`b-green.ru`) — handmade double-fired ceramics + soy-wax candles in ceramic holders
    — **top match** for the earthy/handmade "Дикий лев" texture.
  - Streetwear-tier peers (closest stylistic neighbors, not necessarily collab targets, more competitive
    reference): **Urals** (locally-themed graphic tees), **МОЕ/Made On Earth** (eco streetwear, ironic-slogan
    hoodies), **Check Ya Head** (knit beanies/balaclavas — good merch-category adjacency for future drops),
    **Animals** (playful animal-print sportswear — thematic animal overlap but tonally softer/cuter than "Дикий
    лев"'s rugged register).
  - **12Storeez** — noted only as a scale reference (how big a Yekaterinburg-origin brand *can* get), not a
    collab-target peer — already luxury/national scale.
  - Lower-fit, noted but deprioritized: **Prosto** (silver mono-earrings — too delicate/feminine-minimalist vs.
    LEVKEYSER's masculine statement-jewelry direction).

**How to apply:** If resuming this thread, start from the live brandboard artifact URL above (redeploy the same
file/URL, don't fork a new one) rather than re-deriving the palette/mark/font from scratch — those decisions are
locked in per user confirmation at each step (wordmark → palette → mark variant → curl color → font). The local-
brand research is exploratory/scouting-stage — no outreach has actually happened yet, these are candidates to
approach, not confirmed partners. See [[project_site_lev_keiser]] for the unrelated site-persona/audience-
strategy work, and `HANDOFF/HANDOFF.md` in the repo root for a cross-session continuity summary (this file's
content is also mirrored into `HANDOFF/memory/` for account-portability, per the user's 2026-08-26 request).
