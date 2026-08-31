---
name: project-shop-video-providers
description: "Which video hosting providers the shop's gallery \"video by link\" feature supports and why"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27c74004-579a-437e-bfda-6a6ca8ac43fc
  modified: 2026-08-18T03:34:04.215Z
---

The gallery admin (`/admin/gallery`, type "Видео по ссылке") accepts links from four providers, auto-detected
and converted to an embed URL by [[project_shop_legal_pages]]-adjacent util `src/utils/videoEmbed.js`:
YouTube, Rutube, VK Видео, Vimeo.

**Why:** User asked where's best to upload gallery videos; picked "yes, add link support" but wanted more than
just YouTube. Recommended Rutube/VK Видео as more reliable for the RU audience (YouTube has had access
slowdowns in Russia since 2024), kept YouTube for reach, and added Vimeo on a follow-up ask — useful for
higher-production-value content (showreels, ad campaign cuts) vs. the other three's more casual-clip feel.

**How to apply:** If asked to add another provider (e.g. Dzen Video, OK Video), extend the regex chain in
`src/utils/videoEmbed.js` — no other file needs to change, since rendering/lightbox-skip/storage are already
provider-agnostic (the DB just stores the resolved embed URL in `gallery_items.file_path`, detected at render
time by checking whether it starts with `http`).
