import json
p = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\0806 (1)\draft_content.json"
d = json.load(open(p, encoding="utf-8"))
print("TOP KEYS:", list(d.keys()))
print("version fields:", {k:v for k,v in d.items() if isinstance(v,(str,int,float,bool))})
mats = d.get("materials", {})
print("MATERIALS KEYS:", list(mats.keys()))
for k in mats:
    if isinstance(mats[k], list):
        print(f"  {k}: {len(mats[k])} items")
tracks = d.get("tracks", [])
print("TRACKS:", len(tracks))
for t in tracks:
    print(f"  type={t.get('type')} segments={len(t.get('segments',[]))} attr={t.get('attribute')}")
