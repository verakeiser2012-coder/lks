---
name: project_music_distribution_djlevka
description: "DJ Levka music distribution audit — Sundesire's gaps (no TikTok CML / Meta Sound Collection), Our Angels confirmed as leading fix (RU-friendly payout, TikTok/Meta/Beatport/Traxsource all yes, pending demo approval), Amuse as fallback, platform-by-platform verdict for Winamp/Bridger/Beatport/Beatstars/Bandcamp/SoundCloud"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6cb3aa28-bf98-4737-a742-425b08f8cc6d
  modified: 2026-08-13T16:11:04.535Z
---

Distribution research done 2026-08-13 for DJ Levka (see [[project_site_lev_keiser]] for the broader site/brand context).
User flagged that DJ Levka's music is missing from Instagram's music library, TikTok's Commercial Music Library
(CML), Facebook, and other platforms, and asked whether current distributor **Sundesire Media** is underperforming.

**Root cause found:** Sundesire Media (RU/international distributor, est. 2007) delivers to major streaming stores
(Spotify, Apple Music, Beatport, Yandex Music, VK, Deezer, etc.) but is **not listed as a partner in TikTok's
Artist Impact Program** (the program that gates CML — confirmed partner list: 411 Music Group, Amadeus Code,
Amuse, Believe, Blowout, Create Music Group, Danal, DistroKid, Downtown, Epidemic Sound, Falcon Music, Fuse,
Heavy Duty, JK Records, Mound Media, Music & New Co, PT Musica, Score a Score, Songtradr, Stem Disintermedia,
SoundOn, Sub Pop, Thematic, Two AM Music Global, Vydia). Sundesire also does not advertise Meta Sound Collection
(Instagram/Facebook Reels commercial library) delivery as a service, unlike major distributors. This is a
structural gap, not a quality/moderation problem — no amount of waiting will fix it.

**Decision/plan:** Don't migrate the existing back catalog off Sundesire (a proper switch requires keeping the
same ISRC/UPC, ~30–45 days, and shouldn't be done on tracks under 30 days old since it disrupts algorithmic
push). Instead, route **future new releases** through **Amuse** (free tier, confirmed TikTok CML partner,
explicitly supports Instagram/Facebook Sound Collection delivery) rather than TuneCore — user already tried
TuneCore and disliked it, so it's ruled out. DistroKid was the paid alternative considered (also a CML partner,
explicit Instagram/Facebook opt-in in upload flow, no extra charge, 5–14 day indexing) but Amuse fits the
budget better for this project.

**Platform-by-platform verdict for extra placements** (beyond the core distributor):
- **Beatport** — yes, essential for DJ/electronic credibility and charts; requires a distributor that feeds
  Beatport (can't upload directly); apply to the free Beatport Next program; chart position is driven by
  first-week sales velocity, so promotion should be concentrated at release, not spread out.
- **SoundCloud** — yes, essential for the DJ/producer scene culture (reposts, community feedback). **Never buy
  reposts/plays/playlist placement** — SoundCloud/Spotify fraud detection can take down the entire catalog, not
  just one track (Spotify removed 75M+ spammy tracks in the year to Sept 2025), which is a bigger risk than
  usual given the artist is a minor and this is a managed account.
- **Bandcamp** — yes, fits the existing vinyl/merch strategy well (~80–85% revenue share, ~95% on Bandcamp
  Fridays: 2026 dates Aug 7, Sep 4, Oct 2, Nov 6, Dec 4). It's a direct-sales layer on top of audience you
  already built elsewhere, not a discovery engine — no paid-promotion mechanism exists on Bandcamp itself.
- **Winamp for Creators** — low priority but low risk; relaunched 2024, added site builder/fanzone/merch tools
  in 2026, ~10 business day review. Small audience so far — worth adding for free if the distributor supports
  it, not worth budget yet.
- **Beatstars** — skip; it's a beat-marketplace for producers selling instrumentals to other artists, not a fit
  unless Lev starts selling beats to other artists rather than releasing his own finished tracks.
- **Bridger** (bridgermusic.io) — clarified this is what the user meant by "briger". It's a free royalty/rights
  *collection* add-on (PRO-alternative, catches mechanical/performance royalties distributors miss, artist keeps
  90%, can claim up to 2 years retroactively), not a music hosting platform — can be added in parallel to
  Sundesire/Amuse with no conflict since it doesn't touch platform delivery.

**Beatport specifics clarified:**
- Beatport Greenroom (free hub launched 2026-06-30) is profile/analytics management only (bio, images, team
  access, catalogue analytics, event listings) — it does **not** let artists upload/deliver music themselves.
- Beatport does own a full distribution product, **Ampsuite** (acquired 2022), which delivers everywhere
  (Beatport, Bandcamp, SoundCloud, Spotify, Apple Music, TikTok, YouTube) plus Meta/YouTube monetization —
  but it charges a **permanent ~20% revenue share** and onboarding is "request a quote," clearly aimed at
  labels managing a roster, not a solo artist. Worse economics than Amuse for DJ Levka's case — not recommended
  unless a real multi-artist label forms around him later.
- **Confirmed: Amuse does distribute to Beatport.** Same underlying Beatport requirement applies (label must be
  pre-approved, at least one valid EDM genre, release-schedule info) — but unlike Sundesire (where you manually
  file the "My Labels → Beatport Application" yourself), **Amuse submits the label application to Beatport on
  your behalf** when you pick Beatport as a store at upload; approval just takes a bit longer than other stores.
  Beatport artist photo requirement (if claiming profile via Greenroom): 590×404px JPG/PNG. Beatport *label*
  logo (needed for the label entity used to deliver, whether via Sundesire or Amuse): square, JPG/PNG, non-transparent.
- This closes all three original gaps (TikTok CML, Meta Sound Collection, Beatport) through one distributor
  (Amuse) — but same rule as before: **only for new releases uploaded through Amuse going forward**, not
  retroactive for tracks already live via Sundesire (same ISRC-duplication/rights-conflict risk as any other
  cross-distributor move).

**Beatport-friendly genres for the next album (researched 2026-08-13):** Beatport's hottest categories right
now are Tech House (overall sales leader), Afro House (sustained #1 chart momentum, e.g. Hugel), Melodic
House & Techno, and Latin electronic/Brazilian funk (baile funk — a different genre than the "funk" already in
DJ Levka's brand, don't conflate). Recommendation given his existing funk/electronic identity (see
[[project_site_lev_keiser]] competitor reference to Илья Колосовский/Trauma): make **Funky House / Nu-Disco**
the album's core identity (directly matches the "funk" branding, smaller but actively-curated Beatport category
— e.g. "Summer Sounds" compilations — so less competition for a chart spot), and produce 1–2 **Afro House**
tracks as the promotional singles (rhythm/percussion-driven, fits a funk producer naturally, currently the
single strongest-charting genre on the platform). Avoid chasing pure Tech House or Hard/Psy-Techno/UKG/Jungle —
too far from the established sound to be worth the pivot.

**Audius — investigated in depth 2026-08-13, decision: delete/don't invest.** Checked directly via Audius's
public API (api.audius.co): DJ Levka's existing profile (handle `djlevka`, id V5ppa, created 2022-04-27) is
real/matches official Linktree+socials, not an impersonation — but totally dormant: 13 followers, 5 tracks,
**31 total plays across all tracks combined** (as of 2026-08-13), monetization not even enabled on any track.
AUDIO token down 99.7% from ATH ($4.95→$0.013), so even at scale the payouts are "minuscule" per industry
coverage — not a case of "people streaming for free without paying," just near-zero traffic overall. One
uploaded track ("Haggstrom lofi remix") is an unauthorized-looking remix of C418's Minecraft track — a
copyright risk (3 strikes = account suspension) if kept. Only genuinely useful feature found: Audius is TikTok's
official partner for its (non-commercial) **Sounds library**, with a one-click "Share to TikTok" button — free
and fast, but only reaches TikTok's regular sound library, not the Commercial Music Library gated by the Artist
Impact Program (that gap is still closed via Amuse, see above). Audius also runs **remix contests** (real cash
prizes, e.g. NGHTMRE's $1500/$500/$250, official stems so no rights-clearance issue) and occasional DJ
competitions with festival-slot prizes (e.g. Symmetry Festival 2026 x Magnetic Magazine) — but nothing in
funk/house/disco was open as of this check, it's genre-lottery. **Decision: delete the Audius profile.** Verdict
was that LabelRadar is the better home for contest-hunting going forward (already tied to the Beatport strategy —
e.g. the Groove Cruise x Beatport x LabelRadar contest, ~700 entries, prize a Groove Cruise Miami performance
slot) rather than keeping a dormant Audius account alive on the chance a matching contest appears; re-creating
an Audius account later takes ~10 minutes if a good genre-fit contest shows up.

**Amuse pricing correction (2026-08-13):** Amuse killed its free tier in March 2024 — current plans are Artist
$23.99/yr (~$1.99/mo, one artist profile, unlimited releases, major DSPs, basic analytics), Artist Plus
$39.99/yr, Professional $59.99/yr. **Gotcha: cancelling the subscription doesn't just stop new uploads — it
retroactively applies a 25% royalty commission on all releases** until resubscribed, so it needs to stay paid
continuously, not just once. Still much better economics than Ampsuite's permanent 20% cut, so the plan to route
new releases through Amuse stands — just correct the "free" framing to "$1.99/mo, keep it paid continuously."

**Traxsource investigated 2026-08-13:** a boutique download store leaning house/soul/funk/disco/nu-disco — a
better genre match than Beatport's more EDM-leaning catalog for DJ Levka's sound. Good news: **doesn't require
switching to Amuse** — Sundesire already supports it via a manual request (email yury@sundesiremedia.com with
label name + label's SoundCloud link) and this can be applied to the *existing* catalog immediately, no
migration needed, unlike the Beatport/TikTok/Meta situation. Amuse is also a confirmed approved Traxsource
distributor if needed later. Traxsource's own requirements: WAV, 3000×3000px artwork, submit 3–4 weeks ahead of
release date, genre must genuinely fit house/soul/funk/disco.

**Our Angels (ourangels.ru) — CONFIRMED via direct anonymous inquiry 2026-08-13, now the leading candidate,
ahead of Amuse.** User sent the anonymous question set themselves via Telegram (@ourangelsofficial); Claude has
no email/Telegram-sending tool so drafted the text only, did not send it. Their reply confirmed:
- **Payout:** flexible — ФЛ (individual)/ИП/СЗ (self-employed), "any form of cooperation possible." No
  international payout rail needed at all, unlike Amuse (PayPal or SWIFT wire — both broken/unreliable for RU
  residents post-2022) or TuneCore (Payoneer-only, confirmed dead for RU since Dec 2022, funds stuck with no
  alternative). This resolves the single biggest practical risk for a Russia-based artist.
- **India (JioSaavn, Gaana):** confirmed yes.
- **TikTok Commercial Music Library AND Meta Sound Collection (Instagram/Facebook):** confirmed yes for both —
  matches Amuse's coverage exactly, closing all three original gaps (TikTok CML, Meta, Beatport — see below).
  Standard caveat given: third-party delivery terms can change over time — normal industry disclaimer, not a
  red flag specific to them.
- **Beatport AND Traxsource:** both confirmed yes — Traxsource coverage is a bonus beyond what was confirmed for
  Amuse (Amuse: Beatport confirmed, Traxsource not separately verified).
- **Pricing durability:** asked directly what happens to already-placed tracks if Our Angels changes its
  underlying distributor relationships (Believe/Zvonko/Kanjian) later — answer: nothing changes for the artist,
  the track stays placed even through a backend catalog migration between distributors. Makes the flat one-time
  fee (₽1500/single, ₽3000/EP-album, no subscription) look genuinely durable, not a bait-and-switch.
- **Not fully self-serve:** their first reply opened with "we'd like to hear the music first, we don't work with
  just anything" — there's a curation/audition step via their "Выслать демо" (send demo) page before they'll
  take on an artist. Next step if proceeding: submit DJ Levka tracks there, not the paid consultation or the
  "submit a release" form (that one is for artists already accepted).
- Still true from the earlier caution: no independent reviews found (Trustpilot, rmmedia.ru, i-m-i.ru) — only
  their own marketing site and now this direct Q&A. The Q&A materially de-risks it, but track record still can't
  be externally verified the way Sundesire's could.

**Recommendation update:** Our Angels now beats the earlier Amuse plan on economics (one-time ₽1500–3000 vs.
Amuse's $1.99+/mo *forever* — cancel and it retroactively claws back 25% commission on everything) and on
payout simplicity (no international rail needed at all vs. Amuse's PayPal/wire that likely doesn't even work for
RU residents). Same platform coverage (TikTok CML, Meta, Beatport) plus Traxsource as a bonus. **Still pending:**
demo submission and their acceptance decision — this isn't guaranteed yet like Amuse would be (self-serve, no
gatekeeping). If accepted, Our Angels should become the default for new releases instead of Amuse.

**Consolidated upload-path table (2026-08-13)** — who actually uploads for each platform:

| Платформа | Кто грузит музыку | Статус для DJ Levka |
|---|---|---|
| Sundesire | Артист → Sundesire (текущий дистрибьютор) → сторы | Действует, держит бэк-каталог; не покрывает TikTok CML/Meta |
| Amuse | Артист → Amuse → сторы | Рекомендован для всех новых релизов вперёд |
| Beatport | Нельзя напрямую — только через дистрибьютора (Sundesire ручная заявка, или Amuse автоматически) | Обязателен; Greenroom — не загрузка, только профиль/аналитика |
| Traxsource | Нельзя напрямую — через Sundesire (email yury@sundesiremedia.com) или Amuse | Стоит подключить сейчас, подходит по жанру лучше Beatport |
| SoundCloud | Артист сам, напрямую | Обязателен, без покупки репостов/плеев |
| Bandcamp | Артист сам, напрямую | Да — под винил/мерч-стратегию |
| Winamp for Creators | Артист сам, напрямую (сам является дистрибьютором дальше) | Низкий приоритет, бесплатно |
| Beatstars | Артист сам, напрямую | Пропустить — не тот формат (маркетплейс битов) |
| Bridger | Артист сам регистрирует права напрямую | Можно добавить параллельно, не конфликтует ни с чем |
| LabelRadar | Артист сам грузит демо (это не дистрибуция, а питчинг лейблам/конкурсам) | Да — основной канал для конкурсов и заявок в лейблы |
| Mixcloud | Артист сам, напрямую | Да — для DJ-сетов |
| NTS Radio / Rinse FM | Артист сам подаёт заявку/сет напрямую | Долгосрочная цель на репутацию, не про треки |
| Audius | Было — артист сам, напрямую, без модерации | Удалено, решение принято |
| Our Angels | Артист → Our Angels (реселлер) → Believe/Zvonko/Kanjian → сторы | TikTok CML/Meta/Beatport/Traxsource подтверждены, выплата гибкая (ФЛ/ИП/СЗ) — лидирует над Amuse; ждём отправки демо и решения об одобрении |
| PromoDJ | Артист сам, напрямую | Приоритет — активное RU-комьюнити, без явного возрастного барьера |
| DJ.ru | Профиль/директория — сам; конкурсы ремиксов — недоступны | Директория/радио можно, конкурсы ремиксов закрыты для несовершеннолетних |

**PromoDJ (promodj.com) investigated 2026-08-13:** RU-native SoundCloud-equivalent for the electronic scene —
direct self-upload, own charts/community, built-in track sales monetization, plus paid add-ons (mastering,
distribution). Two contest angles:
- **Entering as a remixer:** the already-known "Denis A — Get it!" contest (deadline 2026-09-27) is real and
  active — dozens of entries across genres including Tech House (matches the Beatport-trending-genre finding
  above). No explicit age restriction found for PromoDJ contest entrants (unlike DJ.ru, see below) — worth
  entering.
- **Hosting your own contest** (paid service, 4 tiers Fast/Standard/Branded/Special, contact via Telegram/VK
  @andystock or WhatsApp): Standard-tier prize pool ~₽30k/20k/10k + gear, reach up to 600k banner impressions +
  175-400k-recipient email blasts. Credible — past hosts include Ханна, Ольга Бузова, and even Dua Lipa ("Be the
  One"). But this is a tool for a track that already has organic traction to extend its reach, not a discovery
  tool for a still-small audience — revisit once a single gets real organic pickup, not now.

**DJ.ru investigated 2026-08-13:** three features — TOP100DJ (the most-cited annual CIS DJ ranking, voted by
clubbers), a 24/7 radio section (mixtapes/live sets from top DJs), and a searchable DJ/producer directory by
city/style (relevant to the existing /gigs booking page). **Critical finding: DJ.ru's remix-contest rules
explicitly require entrants to be Russian citizens 18+** — Lev is 14, so he's currently ineligible for that
specific program (not a workaround situation, just wait until he ages into it). Contest winners also grant DJ.ru
exclusive worldwide rights to the remix forever as compensation — stricter than PromoDJ's or Audius's terms.
The directory/radio/TOP100 features carry no stated age restriction and remain worth pursuing for
visibility/booking, independent of the contest program.

**Our Angels approved — submission requirements (2026-08-13):** Our Angels accepted the demo application; agreed
DJ Levka's next single goes through them. They sent a questionnaire doc ("Анкета OA DISTRIB.docx", saved at
`C:\Users\User\Desktop\Анкета OA DISTRIB.docx`) with two parts:
1. **Core release files** (send via cloud link — Яндекс.Диск/Google Disk — to info@ourangels.ru): WAV + MP3 of
   the track, cover art, a signed offer agreement (договор оферты), and a text doc with artist name, lyrics,
   full legal name of the lyrics/music author, social links, video snippets if any.
2. **"Анкета для дополнительного продвижения"** (promo/pitching questionnaire) — fields: artist name/alias,
   positioning (e.g. independent artist), country/city, genre, release title, release "mood" (one evocative
   phrase, their examples: "aesthetics of the 60s," "old-school hip-hop"), release concept/idea, a 4-6 sentence
   artist+release description, cloud links to photos (2x)/listen (prefer MP3 over WAV/FLAC)/video preview, social
   links, and optional marketing-budget info in their specified format if running paid promo alongside the release.
- Pre-fillable now: artist alias **DJ Levka**, positioning **независимый артист**, city **Екатеринбург, Россия**,
  genre **Funky House / Nu-Disco** (or Afro House, depending on which planned track ships as the lead single —
  see the Beatport-friendly-genres section above), social links (Instagram djlevka.music, TikTok djlevka).
- **Deferred until the single is actually finished:** release title, mood phrase, concept, description, and all
  file/cloud links — user explicitly said to come back to this once the single is ready, not now.
- Same practical constraint as the earlier Our Angels inquiry: user has no email-sending tool, so the finished
  package (files + filled questionnaire) will need to be sent by the user themselves to info@ourangels.ru.

**General risk flagged across all platforms:** any "guaranteed streams/followers/playlist placement" service is
a hard no — bots get detected and can zero out an entire artist catalog, not just refund badly. The only safe
paid promotion is targeted ads to real audiences via the channels already in use (Instagram/Telegram/VK).

**How to apply:** Send DJ Levka demo tracks to Our Angels ("Выслать демо" page) first — if accepted, route new
releases through them (not Sundesire, not TuneCore, and now not Amuse either — Our Angels has better economics
and RU-friendly payout with equal/better platform coverage) so it lands in TikTok CML + Meta Sound Collection +
Beatport + Traxsource from day one. If Our Angels declines the demo, fall back to the Amuse plan described above.
Submit to Beatport Next around release day for chart eligibility; post to Bandcamp/SoundCloud as usual. Existing
Sundesire catalog stays put unless the user explicitly decides to do the full migration later.
