import json
p = r"C:\Users\User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\0806 (1)\draft_content.json"
d = json.load(open(p, encoding="utf-8"))
mats = d["materials"]
refs = d["tracks"][0]["segments"][0]["extra_material_refs"]
# find each ref id across all material categories
for rid in refs:
    found = False
    for cat, items in mats.items():
        if not isinstance(items, list):
            continue
        for it in items:
            if isinstance(it, dict) and it.get("id") == rid:
                print(f"{rid} -> category={cat}")
                print(json.dumps(it, ensure_ascii=False)[:400])
                print()
                found = True
    if not found:
        print(f"{rid} -> NOT FOUND")
