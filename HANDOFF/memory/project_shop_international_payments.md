---
name: project_shop_international_payments
description: "Research into accepting international payments for the Lev Keiser / DJ Levka shop from Russia — payment gateway options, UAE company cost/risk, and POD setup; DECIDED: Alfa-Bank acquiring (confirmed foreign-card support), not Interkassa"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1503deea-9986-4c83-97be-8132e0ef3ba3
  modified: 2026-08-21T15:25:45.208Z
---

Goal: `levkeiser.shop` (see [[project_site_domains]]) currently only accepts payment via ЮKassa, which is Russia-only —
international customers (Europe/Asia/India/LatAm markets discussed in [[project_music_distribution_djlevka]]'s
wider market-expansion conversation) physically cannot pay. Researched 2026-08-13 how to fix this.

**Why:** Two separate problems get conflated easily — (1) how an *international customer* pays *us*, and (2) how
*we* pay a *foreign supplier* (e.g. a print-on-demand vendor) for production/shipping. Both are blocked by the
same root cause (Russian-issued Visa/Mastercard rejected at the BIN-code level for any international transaction
since 2022) but need separate solutions.

## Platforms ruled out first (before payment-gateway research)
- **Etsy** — Russian sellers fully blocked from registering/operating since 2022 sanctions compliance (OFAC).
- **Shopify Payments** — new signups from Russia suspended, no timeline to lift.
- Conclusion: the earlier "Printful/Printify + Etsy" idea doesn't work — POD services don't handle money at all
  (see below), so the storefront's own payment processor is what actually matters, and the two majors are shut.

## Registering a foreign company — cost/risk reality check
- **UAE:** "under the key" full setup ~18,000–28,000 AED (~$4,900–7,600) registration alone; realistic first-year
  total with a bank account can reach ~25,000–90,000 AED (~$6,800–24,500) depending on fintech vs. classical bank
  (classical banks require a 50,000 AED minimum deposit). **The real risk isn't cost, it's the bank account:**
  6–8 out of 10 new companies with Russian beneficiaries get rejected on first application; self-service open
  time runs 2–4 months even when it works. Not ruled out, but a serious commitment, not a quick fix.
- **Armenia / Georgia / Kyrgyzstan (cheaper CIS alternatives, ~$600–1000 all-in, remote setup):** Cheap and fast,
  but **does not solve the actual goal** — Stripe explicitly does not offer merchant accounts to Georgia or
  other post-Soviet countries, and Armenia's Stripe support is limited to VAT collection, not full payment
  acceptance. These jurisdictions get you a company + local bank account, not a working Stripe/PayPal/Shopify
  Payments integration. Would still need to be paired with something else to actually take card payments.

## Payment intermediary services investigated (no foreign company needed)
| Service | Status | Buyer pays with | Payout to Russia | Verdict |
|---|---|---|---|---|
| **Payeer** | ❌ **Shut down 5 January 2026** (EU 19th sanctions package); user funds not returned, stuck in support limbo | — | — | Dead — some articles still list it as working, they're stale, don't use |
| **Cryptomus** | ✅ Active | Cryptocurrency only (BTC/USDT/ETH/SOL/LTC/DOGE/XMR/BNB) — no confirmed plain Visa/Mastercard checkout for the buyer | RUB, crypto-native, RU-friendly | Cheap fees (0.04–0.4%) but crypto-only checkout is a real adoption barrier for casual merch buyers |
| **Interkassa** | ✅ Active — **chosen, 2026-08-13** | RUB/CIS cards work by default; **foreign cards require contacting a personal manager to enable** (not automatic) | RUB to card/e-wallet/account, no withdrawal limit, only bank fee applies | Closest to normal checkout UX; the one open item is confirming foreign-card acceptance directly with them (user chose not to contact them yet — see below) |
| **Scrile Connect** | ✅ Active | Real cards via Stripe/Cryptomus/other gateways under the hood — genuinely bridges international buyer → RU seller | Via YooKassa-linked RU methods (SberPay, Mir Pay) | 0% revenue commission, but it's a **separate paid white-label platform** (₽7,500/mo Individual tier) with its own site/storage/domain — not a drop-in gateway for the existing `levkeiser.shop` codebase, would mean running a second site |

**Decision 2026-08-13: going with Interkassa.** User explicitly declined (for now) to contact Interkassa about
foreign-card enablement — so this is still an open unknown, not a confirmed yes. Before building the checkout
integration, this needs to be confirmed (by the user directly, or ask Claude to draft another anonymous inquiry
like the one sent to Our Angels in [[project_music_distribution_djlevka]]).

**Possible replacement for Interkassa, flagged 2026-08-13:** Lev is likely opening an ИП account at **Alfa-Bank**
regardless (general business banking need). Alfa-Bank's internet-acquiring product (эквайринг) is advertised
(via third-party bank-comparison sites, not Alfa's own page — same caveat as Interkassa, needs direct
confirmation) as supporting **foreign-issued bank cards and foreign currency**, 1–5 hour setup, fee 2.6–2.7%
(1% promo for new clients' first 3 months). If confirmed, this would replace Interkassa entirely — a major
established bank instead of a smaller aggregator, no need to specifically request foreign-card enablement from
a manager. **Still only solves the customer→us side** — the separate Printful-billing problem (us→Printful,
needs a foreign-BIN virtual card) is unaffected either way. Confirm foreign-card support directly with Alfa-Bank
when the ИП account is opened before assuming this is settled.

**Confirmed 2026-08-17:** User asked Alfa-Bank vs Россельхозбанк vs ВТБ for the ИП account specifically because
of these goals; recommended Alfa-Bank (matches the flag above — RSHB is agri-sector focused with no relevant
synergy, VTB has no specific advantage here). User will personally confirm the foreign-card/foreign-currency
acquiring support with Alfa-Bank directly when opening the account — this is still the one open unknown blocking
a final Interkassa-vs-Alfa-acquiring decision.

**Update 2026-08-17 (same day):** ИП РКО account at Alfa-Bank is now open ("Лев сделал счёт в альфа банке").

**DECIDED 2026-08-17 — Alfa-Bank acquiring replaces Interkassa:** User confirmed directly with the bank that
their internet-acquiring accepts foreign-issued cards ("да, они принимают иностранные карты"). This was the
last open unknown — the customer→us international-payment problem is now solved via Alfa-Bank's acquiring
instead of Interkassa. Interkassa is no longer needed for this project.

**How to apply / next step:** The site's checkout currently only has a YooKassa service stub
(`src/services/payments/yookassa.js`, RUB-only, domestic). The separate Printful-billing problem
(us→Printful, needs a foreign-BIN virtual card, see below) is unrelated and still unresolved.

**Update 2026-08-18 — `src/services/payments/alfabank.js` written, NOT yet wired into checkout:** User pasted
Alfa-Bank's REST acquiring docs (register.do/getOrderStatus.do gateway, same family as Sberbank/RBS
"webapi/rest" protocol). Built the service module mirroring `yookassa.js`'s mock/real toggle pattern — mock
mode (no `.env` keys) returns the same local test-payment page as YooKassa; real mode calls
`register.do`/`getOrderStatus.do` against `https://alfa.rbsuat.com/payment/rest/` (the UAT/test domain shown
in the bank's own docs — **production domain not yet confirmed**, override via `ALFA_GATEWAY_URL` once known).
Auth via `ALFA_API_TOKEN` or `ALFA_API_LOGIN`+`ALFA_API_PASSWORD` env vars, added to `.env.example`. Login type
is "логин без префикса" (standard, matches the register.do examples) — user hadn't picked one yet, r-логин/
i-логин are for other integration schemes, not needed here.
**Deliberately NOT wired into `checkout.js` yet** — it still calls `yookassa.js`. Don't flip it over until real
Alfa credentials exist and the flow has been tested end-to-end (register → redirect → pay → status check);
this is a live-money path, not safe to swap blind. When credentials arrive: (1) fill `.env`, (2) update
`checkout.js` to call `alfabank.js` instead of/alongside `yookassa.js`, (3) build a real "оплата не прошла"
page for `failUrl` (currently just points back at `/checkout`, which is a UX gap since the cart is already
cleared by that point in the flow), (4) test with a real low-stakes order before opening to customers.

## Print-on-demand (Printify) — separate from the payment-gateway question
Printify (and any POD vendor) **does not handle customer money at all** — it only produces/ships the physical
item and charges *the merchant's own account* for production+shipping cost. The storefront's payment processor
(Interkassa, once confirmed) is what collects money from the customer; Printify is a second, independent expense
paid by us.

**The blocker on that side:** paying Printify from Russia hits the same Visa/Mastercard BIN-code wall as any
other foreign subscription (Netflix, ChatGPT, etc.) — not Printify-specific. **Standard fix:** a RUB-funded
virtual card with a foreign BIN (services like 4you.cards, or similar — same category used for any foreign
subscription payment from Russia, nothing special needs researching per-vendor).

**Printify vs. alternatives (researched 2026-08-13):**
| Platform | Strength | Fit for this project |
|---|---|---|
| **Printful** ✅ chosen 2026-08-13 | Higher print quality and branding options than Printify — user's explicit priority. Open REST API confirmed, JSON-based, dedicated Node.js/TypeScript SDK (`printful-sdk-js-v2` on npm), scoped private tokens via Printful Developers | **Chosen** — same API ease as Printify, better print quality, integrates directly with the custom Node/Express site |
| Printify | Cheapest base prices, widest supplier/catalog choice, open API confirmed too | Ruled out in favor of Printful — user prioritizes print quality over lowest cost |
| Gooten | API-first, deep automation, routes each order to whichever manufacturer is best by location/price — "treats you like a business" once past ~$50k/month | Overkill for current scale; revisit if the shop scales significantly |
| SPOD (Spreadshirt) | Fastest production (48h on 95% of orders, owns its own factories instead of outsourcing) | **Integration concern:** "works best with Shopify and their own API — if your store runs on another platform, integration options are more limited" — a real friction point for our custom Node.js stack specifically |

**Printful setup steps (once Interkassa's foreign-card question is resolved):**
1. Create a free Printful account, build the product catalog (which items — shirts/mugs/etc. — with Lev
   Keiser/DJ Levka designs)
2. Get a private API token: Printful Developers dashboard, set access scopes + optional expiration
3. Set up a RUB-funded foreign-BIN virtual card on the Printful account for production billing (see blocker above
   — this is a prerequisite, Printful won't accept a Russian-issued card, same as any foreign vendor)
4. Build the order-creation flow on our site (can use the `printful-sdk-js-v2` npm package): when Interkassa
   confirms a successful payment on `levkeiser.shop`, the server calls Printful's API with product/variant +
   shipping address; Printful handles production and ships directly to the customer — we never touch the
   physical product. (Printful also offers a free managed-integration service if we ever want them to build this
   part for us instead.)
5. Test the full flow end-to-end with one real low-stakes order before opening it to real customers

**How to apply:** Don't restart this research from scratch in a future session — the payment-gateway comparison
above is final as of 2026-08-13 (Interkassa chosen), only the foreign-card confirmation with Interkassa remains
open. The POD comparison is also settled: **Printful chosen over Printify** specifically for print quality
(user's explicit call, 2026-08-13) — API integration effort is equivalent between the two, so this wasn't a
technical tradeoff, just a quality-vs-cost one.
