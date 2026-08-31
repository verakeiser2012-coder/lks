---
name: project-shop-legal-pages
description: "Russian-law legal pages (oferta, privacy, delivery, returns) added to the shop; seller is an ИП; real requisites still need to be filled in"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27c74004-579a-437e-bfda-6a6ca8ac43fc
  modified: 2026-08-17T15:35:26.904Z
---

Added the four legal pages required for a Russian online shop run by an individual entrepreneur (ИП):
`/legal/oferta` (public offer), `/legal/privacy` (152-ФЗ personal data policy), `/legal/delivery`,
`/legal/returns` (consumer protection law, with an explicit carve-out for print-on-demand/custom items —
those can only be returned for defects, not "changed my mind", since POD merch is made to individual order).

**Why:** User asked to add "all necessary user rights, delivery, returns and whatever else Russian law
requires" for the shop. Confirmed via [[gotcha_admin_settings_test_wipe]]-adjacent session: seller status
is ИП (not самозанятый, not ООО); contact channel for claims should be Telegram/site form only, not
phone/email/physical address publicly.

**How to apply:** The actual ИП requisites (ФИО, ИНН, ОГРНИП) are stored as settings keys
(`legal_ip_name`, `legal_inn`, `legal_ogrnip`, `legal_address`, `legal_doc_date`), editable via
`/admin/settings` — they were left empty on purpose (never fabricate legal registration numbers). The
legal pages render "реквизиты уточняются" until filled in. Before accepting real payments, remind the user
to (a) fill in those fields, and (b) have the four pages reviewed by an actual lawyer — they're a
reasonable standard template, not a substitute for legal review. Consent checkboxes (linking to
`/legal/privacy`, and to `/legal/oferta` on checkout) were added to checkout, brands, redheads, contest,
and the footer newsletter form, each with matching server-side validation.
