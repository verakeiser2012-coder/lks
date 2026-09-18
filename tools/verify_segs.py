import json
p = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\0806 (1)\draft_content.json"
d = json.load(open(p, encoding="utf-8"))
segs = d["tracks"][0]["segments"]
total = 0
prev_end = 0
ok = True
for i, s in enumerate(segs):
    t = s["target_timerange"]
    if t["start"] != prev_end:
        print(f"GAP/OVERLAP at seg {i}: expected start {prev_end}, got {t['start']}")
        ok = False
    prev_end = t["start"] + t["duration"]
print("Contiguous:", ok, "final end (us):", prev_end, "duration field:", d["duration"])
print("canvas_config:", d["canvas_config"])
print("config keys:", list(d["config"].keys()) if isinstance(d["config"], dict) else d["config"])
