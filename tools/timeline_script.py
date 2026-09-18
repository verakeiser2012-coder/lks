# -*- coding: utf-8 -*-
"""Print the current CapCut timeline with the camera-B transcript mapped onto it."""
import json, io, os, sys, glob

DRAFT = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Груша_v5_правки\draft_content.json"
AUD = r"C:\Users\User\Desktop\site\tools\grusha_audio"
TR = r"C:\Users\User\Desktop\site\tools\grusha_transcript"

sync = json.load(open(os.path.join(AUD, "sync_offsets.json")))
tr = {}
for f in glob.glob(os.path.join(TR, "B_*.json")):
    tr[os.path.basename(f)[2:-5]] = json.load(io.open(f, encoding="utf-8"))

d = json.load(io.open(DRAFT, encoding="utf-8"))
mats = {m["id"]: m for m in d["materials"]["videos"]}
vt = [t for t in d["tracks"] if t["type"] == "video"][0]
out = []
for i, s in enumerate(vt["segments"]):
    m = mats[s["material_id"]]
    name = os.path.basename(m["path"])
    base = name.rsplit(".", 1)[0]
    t0 = s["target_timerange"]["start"] / 1e6
    du = s["target_timerange"]["duration"] / 1e6
    ss = s["source_timerange"]["start"] / 1e6
    vert = m["height"] > m["width"]
    tag = "VERT" if vert else ("GOPRO" if base in sync else "OTHER")
    out.append(f"\n### [{i}] tl {t0:8.2f} +{du:6.2f}  {name}  src {ss:.2f}  {tag}")
    if base in sync:
        B = sync[base]["B"]; off = sync[base]["offset"]
        b0 = ss + off; b1 = b0 + du
        for seg in tr.get(B, []):
            if seg["end"] > b0 and seg["start"] < b1:
                tl = t0 + (seg["start"] - b0)
                out.append(f"   {tl:8.2f}  {seg['text']}")
        if B not in tr:
            out.append("   (transcript pending)")
io.open(sys.argv[1] if len(sys.argv) > 1 else "timeline_script.txt", "w", encoding="utf-8").write("\n".join(out))
print("segments", len(vt["segments"]))
