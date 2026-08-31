---
name: project-podcast-grusha-edit
description: "Status of the \"Груша\" podcast (31 июля 2026) video edit — source files, tools, decisions made, and what's pending"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2220ce80-4677-4e46-8b17-9aecf1fa7ae7
  modified: 2026-08-26T12:51:24.482Z
---

Editing a podcast recorded 2026-07-31 ("Груша" — incense/perfume maker interviewing musician guest **Lev**, who is the user himself / DJ Levka). Source files live at `E:\КАРЬЕРА!!!!!\2026\подкаст Груша 31 июля 2026\`.

## Current deliverable (READ THIS FIRST)

**The project pivoted away from ffmpeg-rendered MP4s to a native CapCut project.** Stop rendering full MP4s with ffmpeg for further edits — it's slow (0.2x-13x realtime, wildly variable on this machine) and fragile (see gotchas below). Instead:

**`Груша_v5_правки`** — a CapCut draft project at
`C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Груша_v5_правки\`
(shows up in CapCut's own project list under that name; the original untouched source project is the sibling folder `0806 (1)` in the same directory — never edit that one directly, it's the user's own original rough cut).

This draft encodes the full edit programmatically (cuts, reorder, B-roll inserts, Dream-track audio mix) by directly manipulating `draft_content.json` — see "How the CapCut draft was built" below. User opens it in CapCut, fine-tunes visually, exports from there. **This is far more reliable than my ffmpeg pipeline** since CapCut does its own rendering.

**Two things in this draft are unverified and should be checked first when the user opens it:**
1. The Dream-track audio segment (mixed in around the "Dream" track-name mention, ~53.7s into the timeline) — its JSON schema was hand-guessed by analogy to video segments since this draft had zero audio materials/tracks before, so no real example to copy from. If it looks broken/missing in CapCut, that's the segment to redo (simplest: delete it, drag `d-r-e-a-m-DJ-Levka.mp3` from `C:\Users\User\Desktop\soundstates album\mp3\` onto the timeline at ~53.7s manually, ~18s, low volume).
2. B-roll insert crop-fill scaling on portrait-orientation source clips — computed via `scale = max(canvas_w/eff_w, canvas_h/eff_h)` with rotation guessed from ffprobe side-data, but never visually confirmed in actual CapCut (I can't open CapCut myself). Eyeball each vertical insert for correct fill/rotation.

## Superseded: earlier ffmpeg-rendered versions (kept for reference only)

- `edit\grusha_cut_v1.mp4` (E:, 40:51) — silence/dead-air trimming, base cuts.
- `edit\grusha_cut_v2.mp4` (E:, 41:13) — + title card + instrument-duet intro.
- `edit\grusha_cut_v3.mp4` (E:, 41:59) — + 12 B-roll cutaways (B&W letterbox style, now abandoned — see style change below).
- `render_out\grusha_cut_v4.mp4` (C:, also copied to E:`\готовое\`, 41:59) — + 10 more B-roll inserts (22 total), same B&W style.
- `render_out\grusha_cut_v5.mp4` (C:, 91:42 — **this file is WRONG**, a leftover/duplicate-content render, ignore it; the real v5 edit only exists as the CapCut draft, never got a clean ffmpeg render).

These mp4s are all superseded by the CapCut draft. Don't delete them without asking (E: drive has been chronically full this whole project — see gotchas — freeing space by deleting v1/v2 was discussed and partially done by the user already).

## Full edit decisions (all applied in the CapCut draft)

- **Reordered opening**: greeting → album chat (cut the "бардак"/messy-room aside, ~12–18s) → Dream-track mention (mp3 mixed in low under dialogue through Lev's "рад что моя музыка вдохновляет" line) → "где мы находимся" (moved BEFORE) → "хочешь руками попробовать" (moved AFTER, reversed from original order) → "чем занимаешься" monologue.
- **Handpan solo clip** (Lev alone, orig ~40:18–41:03 in the 51-min base, a brief cutaway to a different room within the GoPro footage) — cut from the body, its most dynamic ~6s (orig 2444–2450s) moved to the very front, right after the title card and right before the existing Груша+Lev instrument-duet intro clip (`VID_20260731_131015.mp4`, now trimmed to a shorter 12s instead of 18s).
- **Cabinet/oils-shelf B&W insert removed** — user flagged it as out of place.
- **One insert relocated**: `VID_20260731_111222.mp4` moved from its old (wrong) spot to the "почему называется Груша" origin-story moment.
- **New insert added**: `VID_20260731_111149.mp4` under Груша's ("Yulia's") voice during the "чем занимаешься" mission monologue.
- **Style change — supersedes the old B&W/letterbox decision**: ALL B-roll inserts (portrait and landscape alike) are now full-screen color crop-fill (scale to cover canvas, crop excess) — no more black-and-white desaturation, no more letterboxing. User's words: "по-прежнему на весь экран, просто без ЧБ/леттербокса."
- Statue/album-cover conversation and the Ural-bakhur/pricing story sections remain **fully intact**, no cuts inside — this constraint still holds.
- Preserve **Lev's** lines over Груша's monologue when trimming — still the guiding principle.
- Final good-quality audio track still pending from the user, to swap in eventually for the placeholder CapCut-export audio.

## Pickup shoot list (phrases Lev still needs to record — user said "по фразам напишу позже")

Discussed and drafted together, not yet recorded/inserted:
- Reaction to Груша's mission monologue (3 options drafted, e.g. "Это откликается, в музыке я делаю то же самое")
- His own version of how they met (e.g. "Да у меня примерно так же всё случайно получилось")
- "Да, мы такие, пытаемся успевать многое" — either spoken or as on-screen text with a knowing nod
- New clearer line replacing the vague "да, конечно" about the planned single: "Напишу шаманский джингл для Груши, чтобы вы почувствовали атмосферу алхимии, не химии"
- Lev clearly naming the album's genre styles to camera (referencing the statue-comparison moment)
- "Откуда здесь наушники" + Груша's answer — standalone vertical promo bit
- General note: reshoot Груша's own key lines too wherever they're the load-bearing ones, not just Lev's
- A batch of "Lev echoes Груша's best quotes" ideas for vertical/promo cutdowns (космическое путешествие сквозь время; хочется донести людям то что забыли; жажда матриархата; если бы я сама знала чем занимаюсь; аромат это как музыка; у каждой семьи есть свой рецепт; каждый аромат — это история, я пишу сказки; всё как с музыкой; мы привыкли к синтетике; берёшь аромат и проводишь через тело)
- Closing line: **already exists in the original recording, no new shoot needed** — right after Груша's farewell thanks, there's a genuine closing summary (orig 3046–3066s): *"Сегодня мы пришли к тому, что музыка и благовония очень близки по своему течению, по своему искусству и подобному"* — feature this prominently as the outro, it just gets lost in the tail currently.

## How the CapCut draft was built (for resuming/extending this approach)

- Installed `pyJianYingDraft` via pip (ended up not using its API directly — hand-rolled the JSON instead, once the real schema was understood from the user's own existing draft).
- CapCut/Jianying draft format: `draft_content.json` inside a project folder under `...\Projects\com.lveditor.draft\<name>\`. Top-level has `tracks` (each `{id,type,segments,...}`) and `materials` (dict of ~50 category arrays: `videos`, `audios`, `canvases`, `speeds`, etc.). Each segment references one `material_id` (the actual video/audio file) plus a list of 7 `extra_material_refs` IDs — one each into `material_animations`, `placeholder_infos`, `canvases`, `material_colors`, `sound_channel_mappings`, `speeds`, `vocal_separations` — these are per-segment default/boilerplate records (trivial content, always fresh, one set per segment, safe to clone with new UUIDs). Times are **microseconds**, not seconds.
- `d["tracks"][0]["segments"]` must stay perfectly contiguous (each `target_timerange.start` == previous segment's start+duration) — verified this holds in the real example project before touching anything.
- **The safe approach**: copy the user's real, working draft folder (`0806 (1)`) to a new name rather than building from scratch — inherits a proven-valid schema/version (`version: 360000, new_version: "179.0.0"` — CapCut version-specific, don't assume this generalizes to other CapCut installs/versions). Then just rewrite the segments array + add new tracks/materials for inserts, title card, and the Dream audio.
- Also must add a matching entry to `root_meta_info.json` (`...\Projects\com.lveditor.draft\root_meta_info.json`, one level up) — this is CapCut's shared project-list manifest across ALL the user's drafts (57+ entries) — **back it up before touching it** (I did: `C:\Users\User\Desktop\site\tools\root_meta_info.json.backup`). Without a new entry there, the copied folder might not show up correctly in CapCut's own project browser. Also update `draft_meta_info.json` inside the new folder (`draft_name`, `draft_fold_path`, `draft_id` — generate a fresh UUID, don't reuse the source project's id) since the naive folder copy leaves these pointing at the old project name/path.
- Scripts (on `C:\Users\User\Desktop\site\tools\`): `build_capcut_draft.py` (main build — cut-list logic ported straight from the earlier ffmpeg-based `build_editlist.py`/`build_full_edit.py` in the session scratchpad, same silence.log + CONTENT_CUTS/PROTECTED_ZONES approach, just emitting JSON segments instead of ffmpeg calls), `fix_meta.py` (patches `draft_meta_info.json` + `root_meta_info.json`), `check_dims.py`/`inspect_draft.py`/`inspect_segment.py`/`inspect_refs.py` (one-off schema exploration, kept for reference), `title_bg.jpg`/`title_card.mp4` (pre-rendered title card, imported as a regular video material — simplest way to get styled text into CapCut without fighting its text-layer JSON schema).
- ffmpeg gotcha hit again here: `fontfile=C:/Windows/Fonts/...` breaks ffmpeg's filtergraph parser because of the bare `C:` colon — must escape as `fontfile=C\:/Windows/...` even inside quotes.

## General gotchas from this whole project (still relevant)

1. `ffmpeg -c copy` concat demuxer silently corrupts duration/timestamps if joined clips don't share identical fps/timebase/audio-samplerate. Re-encode every piece with matching `-r 30 -fps_mode cfr -ar 44100 -ac 2 -pix_fmt yuv420p` before concatenating.
2. concat-list `file '...'` paths must be Windows-style (`C:/Users/...`), not git-bash `/c/...`.
3. A single ffmpeg `-filter_complex select` expression with 100+ OR'd `between()` terms crashes the parser ("Cannot allocate memory") — extract segments individually instead.
4. **E: drive (all source/output files) has repeatedly filled to 100% and has also physically disconnected mid-session more than once** — if tools suddenly can't see `E:\...` paths or a render fails with no clear error, check physical connection and `df -h` before assuming a code bug.
5. PowerShell tool intermittently fails to spawn (EPERM) on this machine for no clear reason — Bash (git-bash) has been the reliable fallback throughout.
6. Encode speed on this machine varies wildly run to run (13x realtime some days, 0.2x-0.6x others) — check `wmic cpu get loadpercentage` / free memory before assuming something's broken.
7. An orphaned background ffmpeg process can keep running detached after a session ends and silently corrupt output if a retry writes to the same path — always decode-check a leftover file from a previous session rather than trusting it.
