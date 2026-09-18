import json
p = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\0806 (1)\draft_content.json"
d = json.load(open(p, encoding="utf-8"))
tracks = d["tracks"]
seg = tracks[0]["segments"][0]
print("SEGMENT 0 KEYS:", list(seg.keys()))
print(json.dumps(seg, indent=2, ensure_ascii=False)[:2500])
print("\n\n--- VIDEO MATERIAL 0 ---")
vid = d["materials"]["videos"][0]
print("VIDEO KEYS:", list(vid.keys()))
print(json.dumps({k:v for k,v in vid.items() if k in ("id","material_name","path","duration","width","height","type")}, indent=2, ensure_ascii=False))
print("\n\n--- second segment for target_timerange pattern ---")
seg1 = tracks[0]["segments"][1]
print("seg0 target:", seg["target_timerange"], "source:", seg["source_timerange"])
print("seg1 target:", seg1["target_timerange"], "source:", seg1["source_timerange"])
print("seg0 material_id:", seg["material_id"], "extra_material_refs:", seg.get("extra_material_refs"))
