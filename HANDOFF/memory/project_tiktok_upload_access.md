---
name: project_tiktok_upload_access
description: "Plan to restore TikTok video-upload access for an RU-based account via VPN + a relative's French phone number/SIM, since account is currently view-only due to Russia restrictions"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-26T12:48:39.704Z
  originSessionId: df3a38c0-1474-4307-adf4-3afdceb2f9b1
---

TikTok has blocked video uploads/full "For You" feed/monetization for Russia-linked accounts since March 2022
(view-only mode). User is working around this with a relative in France. Full plan also saved as a project file
at `C:\Users\User\Desktop\site\notes\tiktok-access-plan.md` (site project, since this connects to [[project_music_distribution_djlevka]] —
TikTok CML/upload access matters for DJ Levka's promotion).

**Why it's blocked — TikTok checks multiple independent region signals**, not just one:
1. IP address (VPN fixes this)
2. Account region via phone/email at registration (VPN does NOT fix this)
3. SIM card's own country code (MCC/MNC) read from the device (VPN does NOT fix this)
4. App Store/Google Play region the app was installed from (VPN does NOT fix this)
5. Prior account history if previously tied to Russia

**Decided approach (in order, cheapest/simplest first):**
1. Try VPN (French IP) + reinstall TikTok from a non-Russian app store region first — free, fast to test, works
   for some users but not all (since it only fixes signal #1).
2. Use a relative's **existing** French phone number to receive the SMS verification code when registering/
   changing the number on the TikTok account — simpler than buying a new SIM, and an already-aged number may
   look more natural to anti-fraud checks than a freshly bought prepaid one. This fixes signal #2 only.
3. If still not enough, buy a Lebara/Lycamobile prepaid French SIM (French law requires ID registration since
   2011, no anonymous purchase) as a fallback — this SIM would ideally need to physically travel to Russia and
   sit in the device running TikTok to also fix signal #3, which the relative's-number-only approach can't reach.

**How to apply:** When the user reports back on results, note that VPN-only fixes are unreliable specifically
because of signals #2-4, not a general VPN failure — troubleshoot by checking which signal is still exposing the
Russian region rather than assuming VPN itself is broken.
